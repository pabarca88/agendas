import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import {
  buildSessionExpiry,
  createSessionToken,
  hashPassword,
  hashSessionToken,
  serializeUser,
  verifyPassword,
} from './lib/auth.js';
import {
  findAgendaRecord,
  normalizeAgendaPayload,
  serializeAgenda,
  toAgendaStatus,
  writeAgendaGraph,
} from './lib/agendas.js';
import { normalizeRut, normalizeText, parseDotacionWorkbook } from './lib/hr.js';
import { construirResumenMinisterial, PLANTAS_PROFESIONALES, tokensNombre, coincideNombre } from './lib/resumenMinisterial.js';
import { parsePabellonWorkbook, resolveServiciosDesdeTexto } from './lib/pabellon.js';
import { applyAgendaImport, parseAgendaWorkbook, validateAgendaImport } from './lib/agendaImport.js';

// Grilla día×bloque-30min compartida entre /api/pabellon/summary y /api/pabellon/capacidad —
// misma estructura (Lunes-Sábado, 08:00-20:00) que usa el heatmap de "Distribución horaria" en
// el frontend, para que la capacidad real de pabellón se pueda cruzar celda a celda con lo
// programado.
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORA_INICIO_GRID = 8;
const HORA_FIN_GRID = 20;
const BLOQUES_GRID = [];
for (let m = HORA_INICIO_GRID * 60; m < HORA_FIN_GRID * 60; m += 30) {
  BLOQUES_GRID.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
}
// Ventana estándar asumida por jornada (la planilla de pabellón no trae hora exacta de
// inicio/término, solo "Mañana"/"Tarde") — se usa únicamente para dibujar el bloque asignado y
// estimar horas asignadas; es una aproximación declarada como tal en la UI.
const VENTANA_JORNADA = { 'Mañana': [8 * 60, 13 * 60], 'Tarde': [14 * 60, 18 * 60] };

function gridVacia() {
  const g = {};
  DIAS_SEMANA.forEach((dia) => { g[dia] = {}; BLOQUES_GRID.forEach((b) => { g[dia][b] = 0; }); });
  return g;
}

function agregarAGrid(grid, dia, inicioMin, finMin, valorPorBloque) {
  if (!grid[dia]) return;
  BLOQUES_GRID.forEach((label, idx) => {
    const cellStart = HORA_INICIO_GRID * 60 + idx * 30;
    const cellEnd = cellStart + 30;
    const overlap = Math.min(finMin, cellEnd) - Math.max(inicioMin, cellStart);
    if (overlap > 0) grid[dia][label] += typeof valorPorBloque === 'function' ? valorPorBloque(overlap) : valorPorBloque;
  });
}

const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 10000,
    timeout: 20000,
  },
});

// Sin este handler, una promesa rechazada sin capturar (p. ej. una transacción de Prisma
// que expira) tumba todo el proceso de Node y deja el servidor caído para todos los usuarios.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const ROLE_LABELS = {
  admin: 'Administrador',
  jefe_servicio: 'Jefe de Servicio',
  referente_programacion: 'Referente de Programacion',
  admision: 'Admision',
  subdirector: 'Subdireccion',
};

const CORE_PROCESSES = ['Ambulatorio', 'Hospitalizado', 'Quirúrgico', 'Urgencia'];
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HEATMAP_START_HOUR = 8;
const HEATMAP_END_HOUR = 20;

function buildHeatmapLabels() {
  const labels = [];
  for (let minutes = HEATMAP_START_HOUR * 60; minutes < HEATMAP_END_HOUR * 60; minutes += 30) {
    const startHour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const startMinute = String(minutes % 60).padStart(2, '0');
    const end = minutes + 30;
    const endHour = String(Math.floor(end / 60)).padStart(2, '0');
    const endMinute = String(end % 60).padStart(2, '0');
    labels.push(`${startHour}:${startMinute}–${endHour}:${endMinute}`);
  }
  return labels;
}

const HEATMAP_LABELS = buildHeatmapLabels();

function parseBooleanParam(value, fallback = false) {
  if (typeof value !== 'string') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseOptionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nowLabel() {
  return new Date().toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isPrivilegedRole(role) {
  return ['admin', 'referente_programacion', 'admision', 'subdirector'].includes(role);
}

function buildEmptyHours() {
  return Object.fromEntries(CORE_PROCESSES.map((process) => [process, 0]));
}

function buildEmptyDistribution() {
  const distribution = {};
  for (const day of DAYS) {
    distribution[day] = {};
    for (const label of HEATMAP_LABELS) {
      distribution[day][label] = 0;
    }
  }
  return distribution;
}

function computeHoursFromBlocks(blocks) {
  const hours = buildEmptyHours();
  for (const block of blocks) {
    if (block.isShift) continue;
    if (!block.process || !(block.process in hours)) continue;
    hours[block.process] += block.durationMinutes / 60;
  }
  return hours;
}

function computeDistributionFromBlocks(blocks) {
  const distribution = buildEmptyDistribution();
  for (const block of blocks) {
    if (block.isShift) continue;
    if (!distribution[block.day]) continue;
    const start = block.startMinutes;
    const end = block.startMinutes + block.durationMinutes;
    HEATMAP_LABELS.forEach((label, index) => {
      const cellStart = HEATMAP_START_HOUR * 60 + index * 30;
      const cellEnd = cellStart + 30;
      const overlap = Math.min(end, cellEnd) - Math.max(start, cellStart);
      if (overlap > 0) {
        distribution[block.day][label] += overlap / 60;
      }
    });
  }
  return distribution;
}

function dateOnlyUTC(date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// Calcula quién corresponde en una rotación de turno para una fecha dada: primero busca un
// override puntual para esa fecha exacta; si no hay, deriva la posición del ciclo con
// (fecha - anchorDate) mod cycleDays (doble módulo para cubrir fechas anteriores al ancla).
// Devuelve un arreglo (1 o 2 elementos) en vez de un solo resuelto: un override "dividido"
// (cobertura de feriado legal por 2 personas) reemplaza el turno completo de 24h por dos
// sub-turnos de 12h (día 08:00-20:00 / noche 20:00-08:00), cada uno con su propio profesional.
// El resto de la app (roster, conteos, cruce con jornada) itera este arreglo sin distinguir si
// hubo split o no — cada entrada ya trae su propio startMinutes/durationMinutes.
const SPLIT_DIA_START = 8 * 60;
const SPLIT_DIA_DURACION = 12 * 60;
const SPLIT_NOCHE_START = 20 * 60;
const SPLIT_NOCHE_DURACION = 12 * 60;

function resolveShiftForDate(rotation, date) {
  const target = dateOnlyUTC(date);
  const override = rotation.overrides.find((o) => dateOnlyUTC(o.date) === target);
  if (override) {
    if (override.splitProfessionalId || override.splitProfessionalName) {
      return [
        {
          professionalId: override.professionalId,
          professionalName: override.professionalName,
          isOverride: true,
          startMinutes: SPLIT_DIA_START,
          durationMinutes: SPLIT_DIA_DURACION,
          tramoSplit: 'dia',
        },
        {
          professionalId: override.splitProfessionalId,
          professionalName: override.splitProfessionalName,
          isOverride: true,
          startMinutes: SPLIT_NOCHE_START,
          durationMinutes: SPLIT_NOCHE_DURACION,
          tramoSplit: 'noche',
        },
      ];
    }
    return [{
      professionalId: override.professionalId,
      professionalName: override.professionalName,
      isOverride: true,
      startMinutes: rotation.startMinutes,
      durationMinutes: rotation.durationMinutes,
    }];
  }
  const anchor = dateOnlyUTC(rotation.anchorDate);
  const diffDays = Math.round((target - anchor) / (24 * 60 * 60 * 1000));
  const position = ((diffDays % rotation.cycleDays) + rotation.cycleDays) % rotation.cycleDays;
  const member = rotation.members.find((m) => m.position === position);
  if (!member) return [];
  return [{
    professionalId: member.professionalId,
    professionalName: member.professionalName,
    isOverride: false,
    startMinutes: rotation.startMinutes,
    durationMinutes: rotation.durationMinutes,
  }];
}

function mapCatalogActivity(row) {
  return {
    id: row.id,
    sourceId: row.sourceId,
    process: row.process,
    profession: row.profession,
    specialty: row.specialty,
    activity: row.activity,
    isClinical: row.isClinical,
    hasPerformance: row.hasPerformance,
  };
}

async function resolveSpecialty({ serviceId, serviceName, specialty }) {
  if (typeof specialty === 'string' && specialty.trim()) {
    return specialty.trim();
  }

  if (typeof serviceId === 'string' && serviceId.trim()) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId.trim() },
      select: { specialtyCatalog: true },
    });
    return service?.specialtyCatalog ?? null;
  }

  if (typeof serviceName === 'string' && serviceName.trim()) {
    const service = await prisma.service.findUnique({
      where: { name: serviceName.trim() },
      select: { specialtyCatalog: true },
    });
    return service?.specialtyCatalog ?? null;
  }

  return null;
}

// Un jefe_servicio normalmente ve solo su propio servicio (serviceIds = [serviceId]). Si su
// servicio tiene groupName (ej. Pediatría y sus subespecialidades comparten un mismo jefe), ve
// TODOS los servicios de ese grupo. Se usa tanto en authMiddleware (para las rutas) como en las
// respuestas de login/demo-login/me (para que el frontend sepa qué agendas filtrar a mostrar).
async function computeServiceAccess(user) {
  if (user.role !== 'jefe_servicio') return { serviceIds: [], serviceNames: [] };
  if (user.service?.groupName) {
    const grupo = await prisma.service.findMany({
      where: { groupName: user.service.groupName },
      select: { id: true, name: true },
    });
    return { serviceIds: grupo.map((s) => s.id), serviceNames: grupo.map((s) => s.name) };
  }
  return {
    serviceIds: user.serviceId ? [user.serviceId] : [],
    serviceNames: user.service ? [user.service.name] : [],
  };
}

async function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    req.authUser = null;
    req.sessionId = null;
    next();
    return;
  }

  const token = authHeader.slice('Bearer '.length);
  const tokenHash = hashSessionToken(token);
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: { service: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    req.authUser = null;
    req.sessionId = null;
    next();
    return;
  }

  req.authUser = session.user;
  const access = await computeServiceAccess(req.authUser);
  req.authUser.serviceIds = access.serviceIds;
  req.authUser.serviceNames = access.serviceNames;
  req.sessionId = session.id;
  next();
}

function requireAuth(req, res) {
  if (req.authUser) return true;
  res.status(401).json({ error: 'Sesion requerida.' });
  return false;
}

function requireRoles(req, res, roles) {
  if (!requireAuth(req, res)) return false;
  if (roles.includes(req.authUser.role)) return true;
  res.status(403).json({ error: 'No autorizado para esta accion.' });
  return false;
}

function ensureValidDateRange(validFrom, validTo) {
  if (!validFrom || !validTo) return true;
  return validTo.getTime() >= validFrom.getTime();
}

function buildAgendaWhereForUser(user, query) {
  const where = {};
  if (typeof query.service === 'string' && query.service) {
    where.serviceName = query.service;
  }
  if (typeof query.status === 'string' && query.status) {
    where.status = toAgendaStatus(query.status);
  }
  if (user.role === 'jefe_servicio') {
    where.serviceId = { in: user.serviceIds?.length ? user.serviceIds : ['__no_service__'] };
  }
  return where;
}

async function loadAgendaOr404(externalId, res) {
  const agenda = await findAgendaRecord(prisma, externalId);
  if (!agenda) {
    res.status(404).json({ error: 'Agenda no encontrada.' });
    return null;
  }
  return agenda;
}

function canViewAgenda(user, agenda) {
  return isPrivilegedRole(user.role) || (user.role === 'jefe_servicio' && !!user.serviceIds?.includes(agenda.serviceId));
}

function canEditAgenda(user, agenda) {
  return user.role === 'admin'
    || (user.role === 'jefe_servicio' && !!user.serviceIds?.includes(agenda.serviceId) && ['borrador', 'rechazada'].includes(agenda.status))
    // El referente de programación puede corregir directamente una agenda que el servicio le
    // envió (antes de aprobarla o rechazarla). Cada cambio queda en AgendaAudit con su usuario.
    || (user.role === 'referente_programacion' && agenda.status === 'enviada');
}

async function createAudit(tx, agendaId, actorUser, action, entityType, entityId, payload) {
  await tx.agendaAudit.create({
    data: {
      agendaId,
      actorUserId: actorUser?.id ?? null,
      userName: actorUser?.name ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      payloadJson: payload ? JSON.stringify(payload) : null,
    },
  });
}

async function createHistory(tx, agendaId, actorUser, action, { comment = null, fromStatus = null, toStatus = null, eventType = null } = {}) {
  const sortOrder = await tx.agendaHistory.count({ where: { agendaId } });
  await tx.agendaHistory.create({
    data: {
      agendaId,
      externalId: randomUUID(),
      actorUserId: actorUser?.id ?? null,
      dateLabel: nowLabel(),
      eventType,
      action,
      fromStatus,
      toStatus,
      userName: actorUser?.name ?? '',
      comment,
      sortOrder,
    },
  });
}

async function createNotification(tx, { agendaId = null, destinationRole = null, userId = null, text }) {
  await tx.notification.create({
    data: {
      agendaId,
      destinationRole,
      userId,
      text,
    },
  });
}

// Días antes del término de vigencia en los que se debe avisar, y el nombre del flag
// en el modelo Agenda que evita reenviar el mismo aviso más de una vez.
const VIGENCIA_ALERT_MILESTONES = [
  { days: 15, field: 'vigenciaAlerta15dEnviada', label: 'faltan 15 días' },
  { days: 5, field: 'vigenciaAlerta5dEnviada', label: 'faltan 5 días' },
  { days: 0, field: 'vigenciaAlerta0dEnviada', label: 'vence hoy' },
];

function daysUntil(date, from) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((b - a) / msPerDay);
}

// Revisa las agendas aprobadas y vigentes cuya vigenciaHasta se acerca (15, 5 o 0 días) y
// notifica al jefe de servicio y a referente de programación, preguntando si desean extender
// la vigencia. Cada hito se envía una sola vez por agenda gracias a los flags vigenciaAlertaXdEnviada.
async function checkVigenciaAlerts() {
  try {
    const now = new Date();
    const agendas = await prisma.agenda.findMany({
      where: {
        status: 'aprobada',
        validTo: { not: null },
        OR: [
          { vigenciaAlerta15dEnviada: false },
          { vigenciaAlerta5dEnviada: false },
          { vigenciaAlerta0dEnviada: false },
        ],
      },
    });

    for (const agenda of agendas) {
      const diff = daysUntil(agenda.validTo, now);
      const milestone = VIGENCIA_ALERT_MILESTONES.find((m) => m.days === diff);
      if (!milestone || agenda[milestone.field]) continue;

      const vigenciaHastaLabel = agenda.validTo.toISOString().slice(0, 10);
      const text = `La vigencia de ${agenda.serviceName} (${milestone.label}, vence el ${vigenciaHastaLabel}). ¿Desea extender la vigencia?`;

      await prisma.$transaction(async (tx) => {
        if (agenda.chiefUserId) {
          await createNotification(tx, { agendaId: agenda.id, userId: agenda.chiefUserId, text });
        }
        await createNotification(tx, { agendaId: agenda.id, destinationRole: 'referente_programacion', text });
        await tx.agenda.update({ where: { id: agenda.id }, data: { [milestone.field]: true } });
      });
    }
  } catch (error) {
    console.error('Error revisando avisos de vigencia:', error);
  }
}

// Especialidad efectiva de un profesional: la suya propia si la tiene (agendas que agrupan varias
// especialidades, ej. CESAM adulto + infanto-juvenil), si no la del servicio de la agenda.
function effectiveSpecialty(agenda, professional) {
  return professional?.specialtyCatalog || agenda?.serviceSpecialty || null;
}

async function resolveCatalogActivityForBlock(tx, specialty, profession, blockInput) {
  const process = blockInput.process ?? blockInput.proceso ?? null;
  const activity = blockInput.activity ?? blockInput.actividad ?? null;
  if (!process || !activity) return null;
  const specialties = specialty ? [specialty, 'No Aplica'] : ['No Aplica'];
  const rows = await tx.catalogActivity.findMany({
    where: {
      process,
      profession,
      specialty: { in: specialties },
      activity,
    },
  });

  rows.sort((a, b) => {
    const aScore = a.specialty === specialty ? 0 : 1;
    const bScore = b.specialty === specialty ? 0 : 1;
    return aScore - bScore;
  });

  return rows[0] ?? null;
}

async function resolveSuggestedPerformance(tx, specialty, blockInput) {
  const process = blockInput.process ?? blockInput.proceso ?? null;
  const activity = blockInput.activity ?? blockInput.actividad ?? null;
  if (!activity || !process || !specialty) {
    return { suggestedPerformance: null, performanceSource: null };
  }
  const row = await tx.referencePerformance.findUnique({
    where: {
      process_activity_specialty: {
        process,
        activity,
        specialty,
      },
    },
  });

  if (!row) return { suggestedPerformance: null, performanceSource: null };

  return {
    suggestedPerformance: row.localValue ?? row.nationalValue ?? null,
    performanceSource: row.localValue != null ? 'local' : row.nationalValue != null ? 'national' : null,
  };
}

async function recomputeAgendaDerivedData(tx, agendaId) {
  const blocks = await tx.agendaBlock.findMany({
    where: { agendaId },
    select: {
      day: true,
      startMinutes: true,
      durationMinutes: true,
      process: true,
      isShift: true,
    },
  });

  const hours = computeHoursFromBlocks(blocks);
  const distribution = computeDistributionFromBlocks(blocks);

  await tx.agenda.update({
    where: { id: agendaId },
    data: {
      hoursJson: JSON.stringify(hours),
      distributionJson: JSON.stringify(distribution),
      lastUpdated: BigInt(Date.now()),
    },
  });
}

async function resolveProfessionalOr404(tx, agendaId, professionalId, res) {
  const professional = await tx.agendaProfessional.findFirst({
    where: {
      agendaId,
      OR: [{ externalId: String(professionalId) }, { id: String(professionalId) }],
    },
  });
  if (!professional) {
    res.status(404).json({ error: 'Profesional no encontrado.' });
    return null;
  }
  return professional;
}

async function resolveBlockOr404(tx, agendaId, blockId, res) {
  const block = await tx.agendaBlock.findFirst({
    where: {
      agendaId,
      OR: [{ externalId: String(blockId) }, { id: String(blockId) }],
    },
  });
  if (!block) {
    res.status(404).json({ error: 'Bloque no encontrado.' });
    return null;
  }
  return block;
}

function transitionDefinition(targetStatus) {
  return {
    enviada: {
      roles: ['jefe_servicio', 'admin'],
      from: ['borrador', 'rechazada'],
      notificationRole: 'referente_programacion',
      action: 'Enviada a Referente',
      eventType: 'workflow',
    },
    aprobada: {
      roles: ['referente_programacion', 'subdirector', 'admin'],
      from: ['enviada', 'escalada'],
      notificationRole: 'admision',
      action: 'Aprobada',
      eventType: 'workflow',
    },
    rechazada: {
      roles: ['referente_programacion', 'subdirector', 'admin'],
      from: ['enviada', 'escalada'],
      notificationRole: 'jefe_servicio',
      action: 'Rechazada',
      eventType: 'workflow',
      requiresComment: true,
    },
    escalada: {
      roles: ['referente_programacion', 'admin'],
      from: ['enviada'],
      notificationRole: 'subdirector',
      action: 'Escalada a Subdirección',
      eventType: 'workflow',
    },
    subida_alma: {
      roles: ['admision', 'admin'],
      from: ['aprobada'],
      notificationRole: null,
      action: 'Subida a sistema ALMA',
      eventType: 'workflow',
    },
  }[targetStatus] ?? null;
}

app.use(authMiddleware);

app.get('/healthz', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'agenda-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', async (_req, res) => {
  const [serviceCount, agendaCount, professionalCount, blockCount] = await Promise.all([
    prisma.service.count(),
    prisma.agenda.count(),
    prisma.agendaProfessional.count(),
    prisma.agendaBlock.count(),
  ]);

  res.json({
    ok: true,
    database: 'postgresql',
    serviceCount,
    agendaCount,
    professionalCount,
    blockCount,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/bootstrap', async (_req, res) => {
  const [services, users] = await Promise.all([
    prisma.service.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ include: { service: true }, orderBy: { name: 'asc' } }),
  ]);

  res.json({
    roles: Object.entries(ROLE_LABELS).map(([id, label]) => ({ id, label })),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      chiefName: service.chiefName,
      specialtyCatalog: service.specialtyCatalog,
    })),
    users: users.map(serializeUser),
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email y password son obligatorios.' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { service: true },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: 'Credenciales invalidas.' });
    return;
  }

  const token = createSessionToken();
  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: buildSessionExpiry(),
    },
  });

  res.json({ token, user: serializeUser(user, await computeServiceAccess(user)) });
});

app.post('/api/auth/demo-login', async (req, res) => {
  const role = req.body?.role;
  const fallbackRole = typeof role === 'string' && role ? role : 'jefe_servicio';

  const user = await prisma.user.findFirst({
    where: { role: fallbackRole },
    include: { service: true },
    orderBy: { name: 'asc' },
  });

  if (!user) {
    res.status(404).json({ error: 'Usuario demo no encontrado.' });
    return;
  }

  const token = createSessionToken();
  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: buildSessionExpiry(),
    },
  });

  res.json({ token, password: 'demo123', user: serializeUser(user, await computeServiceAccess(user)) });
});

app.get('/api/auth/me', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const user = await prisma.user.findUnique({
    where: { id: req.authUser.id },
    include: { service: true },
  });

  res.json({ user: serializeUser(user, await computeServiceAccess(user)) });
});

app.post('/api/auth/logout', async (req, res) => {
  if (!requireAuth(req, res)) return;
  if (req.sessionId) {
    await prisma.authSession.delete({ where: { id: req.sessionId } });
  }
  res.status(204).send();
});

app.get('/api/users', async (req, res) => {
  if (!requireRoles(req, res, ['admin'])) return;

  const users = await prisma.user.findMany({
    include: { service: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  res.json(users.map(serializeUser));
});

app.post('/api/users', async (req, res) => {
  if (!requireRoles(req, res, ['admin'])) return;

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const role = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const serviceId = typeof req.body?.serviceId === 'string' && req.body.serviceId.trim() ? req.body.serviceId.trim() : null;

  if (!name || !email || !role || !password) {
    res.status(400).json({ error: 'name, email, role y password son obligatorios.' });
    return;
  }
  if (!Object.keys(ROLE_LABELS).includes(role) && role !== 'admin') {
    res.status(400).json({ error: 'Rol inválido.' });
    return;
  }
  if (role === 'jefe_servicio' && !serviceId) {
    res.status(400).json({ error: 'serviceId es obligatorio para Jefe de Servicio.' });
    return;
  }

  const service = serviceId ? await prisma.service.findUnique({ where: { id: serviceId } }) : null;
  if (serviceId && !service) {
    res.status(400).json({ error: 'Servicio no encontrado.' });
    return;
  }

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash: hashPassword(password),
        serviceId: role === 'jefe_servicio' ? serviceId : null,
      },
      include: { service: true },
    });
    res.status(201).json(serializeUser(user));
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
      return;
    }
    throw error;
  }
});

const HR_ROLES = ['admin', 'subdirector', 'referente_programacion'];
const hrUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

app.post('/api/hr/import', hrUpload.single('file'), async (req, res) => {
  if (!requireRoles(req, res, HR_ROLES)) return;
  if (!req.file) {
    res.status(400).json({ error: 'Falta el archivo.' });
    return;
  }

  let parsed;
  try {
    parsed = parseDotacionWorkbook(req.file.buffer);
  } catch (error) {
    res.status(400).json({ error: `No se pudo leer el archivo: ${error.message}` });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.hrContract.deleteMany({});
    if (parsed.contracts.length > 0) {
      await tx.hrContract.createMany({ data: parsed.contracts });
    }
  }, { timeout: 60000, maxWait: 20000 });

  res.status(201).json({
    hoja: parsed.sheetName,
    filasImportadas: parsed.contracts.length,
    importadoEn: new Date().toISOString(),
  });
});

// Búsqueda liviana de personas en la dotación (RRHH), para vincular un profesional de la agenda
// a su ficha de RUT/cargo/unidad en vez de escribir el nombre a mano. A diferencia de
// /api/hr/summary, esto lo puede usar cualquier usuario autenticado (no solo HR_ROLES) porque
// un jefe de servicio necesita poder buscar dotación al armar su propia agenda.
app.get('/api/hr/personas', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) {
    res.json({ items: [] });
    return;
  }
  const planta = typeof req.query.planta === 'string' && req.query.planta.trim()
    ? req.query.planta.trim().toUpperCase()
    : 'MEDICOS';
  const qNorm = normalizeText(q);

  const contracts = await prisma.hrContract.findMany({ where: { planta } });
  const now = new Date();
  const porRut = new Map();
  for (const c of contracts) {
    if (!normalizeText(c.nombreFuncionario).includes(qNorm)) continue;
    if (!porRut.has(c.rut)) {
      porRut.set(c.rut, {
        rut: c.rut, dv: c.dv, nombreFuncionario: c.nombreFuncionario,
        cargos: new Set(), unidades: new Set(), horasContratadas: 0,
      });
    }
    const p = porRut.get(c.rut);
    if (c.cargo) p.cargos.add(c.cargo);
    if (c.unidadDescripcion) p.unidades.add(c.unidadDescripcion);
    const vigente = (!c.fechaInicioContrato || c.fechaInicioContrato <= now) && (!c.fechaTerminoContrato || c.fechaTerminoContrato >= now);
    if (c.ley === 'LEY 19.664' && vigente) p.horasContratadas += c.numeroHoras || 0;
  }

  const items = [...porRut.values()]
    .map((p) => ({
      rut: p.rut,
      dv: p.dv,
      nombreFuncionario: p.nombreFuncionario,
      cargo: [...p.cargos].join(' / '),
      unidad: [...p.unidades].join(' / '),
      horasContratadas: Math.round(p.horasContratadas * 10) / 10,
    }))
    .sort((a, b) => a.nombreFuncionario.localeCompare(b.nombreFuncionario))
    .slice(0, 20);

  res.json({ items });
});

// Periodo de programación pedido (?periodo=2027). Sin parámetro se usa el periodo más reciente
// con agendas cargadas, para que los cruces nunca sumen dos periodos a la vez.
async function resolvePeriodo(req) {
  const n = Number(req.query?.periodo);
  if (Number.isInteger(n) && n > 2000) return n;
  const agg = await prisma.agenda.aggregate({ _max: { planningPeriod: true } });
  return agg._max.planningPeriod ?? new Date().getFullYear();
}

// Resumen de programación en formato ministerial (Excel con hojas Médicos / No médicos /
// Odontólogos). ?periodo=2027&servicios=A|B (vacío = todos los visibles). Un jefe de servicio solo
// obtiene sus propios servicios.
app.get('/api/reports/resumen-ministerial', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const periodo = await resolvePeriodo(req);
  const pedidos = typeof req.query.servicios === 'string' && req.query.servicios.trim()
    ? req.query.servicios.split('|').map((s) => s.trim()).filter(Boolean)
    : null;
  const where = { planningPeriod: periodo };
  if (req.authUser.role === 'jefe_servicio') {
    where.serviceId = { in: req.authUser.serviceIds || [] };
  } else if (!HR_ROLES.includes(req.authUser.role)) {
    res.status(403).json({ error: 'No autorizado para esta accion.' });
    return;
  }
  if (pedidos) where.serviceName = { in: pedidos };

  const [agendas, contratos, catalogo] = await Promise.all([
    prisma.agenda.findMany({
      where,
      select: {
        serviceName: true,
        serviceSpecialty: true,
        professionals: { select: { id: true, name: true, type: true, rut: true, specialtyCatalog: true } },
        blocks: {
          select: {
            professionalId: true, process: true, activity: true, durationMinutes: true, isShift: true,
            hasPerformance: true, performance: true, isClinical: true,
            catalogActivity: { select: { specialty: true, activity: true, rawType: true, rawPerformanceFlag: true, isClinical: true, hasPerformance: true } },
          },
        },
      },
    }),
    prisma.hrContract.findMany(),
    prisma.catalogActivity.findMany({
      select: { process: true, profession: true, specialty: true, activity: true, rawType: true, rawPerformanceFlag: true, isClinical: true, hasPerformance: true },
    }),
  ]);

  const { buffer } = construirResumenMinisterial({ agendas, contratos, catalogo });
  const sufijo = pedidos && pedidos.length === 1 ? `_${normalizeText(pedidos[0]).replace(/[^A-Z0-9]+/g, '_')}` : '';
  const nombre = `Resumen_programacion_${periodo}${sufijo}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  res.send(buffer);
});

app.get('/api/hr/summary', async (req, res) => {
  if (!requireRoles(req, res, HR_ROLES)) return;
  const periodo = await resolvePeriodo(req);

  // Lineamiento: se programa a todos los profesionales y solo a ellos, así que la nómina se limita
  // a las plantas profesionales. TODAS = las cuatro juntas.
  const plantaPedida = typeof req.query.planta === 'string' && req.query.planta.trim()
    ? req.query.planta.trim().toUpperCase()
    : 'TODAS';
  const planta = plantaPedida === 'TODAS' || PLANTAS_PROFESIONALES.includes(plantaPedida) ? plantaPedida : 'TODAS';
  const plantas = planta === 'TODAS' ? PLANTAS_PROFESIONALES : [planta];

  const [contracts, lastImport] = await Promise.all([
    prisma.hrContract.findMany({ where: { planta: { in: plantas } } }),
    prisma.hrContract.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ]);

  const now = new Date();
  const porRut = new Map(); // rut -> { nombre, cargo, unidad, horasContratadas, tieneTurno, dv }
  for (const c of contracts) {
    // Solo contratos vigentes: quien ya no tiene contrato no debe aparecer como pendiente.
    const vigente = (!c.fechaInicioContrato || c.fechaInicioContrato <= now) && (!c.fechaTerminoContrato || c.fechaTerminoContrato >= now);
    if (!vigente) continue;
    if (!porRut.has(c.rut)) {
      porRut.set(c.rut, {
        rut: c.rut, dv: c.dv, nombre: c.nombreFuncionario, cargos: new Set(), unidades: new Set(),
        plantas: new Set(), correlativos: new Set(), horasContratadas: 0, tieneTurno: false,
      });
    }
    const acc = porRut.get(c.rut);
    acc.plantas.add(c.planta);
    if (c.cargo) acc.cargos.add(c.cargo);
    if (c.unidadDescripcion) acc.unidades.add(c.unidadDescripcion);
    if (c.correlativo) acc.correlativos.add(c.correlativo);
    // Ley 15.076 = turno (Art. 15): no es jornada programable en agenda.
    if (c.ley === 'LEY 15.076') { acc.tieneTurno = true; continue; }
    acc.horasContratadas += c.numeroHoras || 0;
  }

  // Todos los profesionales ya cargados (de cualquier servicio) con sus horas de jornada
  // programadas (excluye turno) y en qué agenda(s) aparecen — se cruza en memoria porque el
  // universo de profesionales es chico (unos cientos), no miles.
  const professionals = await prisma.agendaProfessional.findMany({
    where: { agenda: { planningPeriod: periodo } },
    select: {
      id: true, name: true, rut: true,
      agenda: { select: { serviceName: true } },
      blocks: { where: { isShift: false }, select: { durationMinutes: true } },
    },
  });

  // Cruce por nombre solo para quienes aún no tienen RUT en la agenda: Dotación usa
  // "APELLIDOS NOMBRES" y la agenda suele usar "Nombre Apellido", así que se compara por palabras.
  const sinRut = professionals.filter((p) => !p.rut).map((p) => ({ p, tokens: tokensNombre(p.name) }));

  const resultado = [];
  for (const acc of porRut.values()) {
    let matches = professionals.filter((p) => p.rut && p.rut === acc.rut);
    let coincidenciaPorNombre = false;
    if (matches.length === 0) {
      const tokensDot = tokensNombre(acc.nombre);
      matches = sinRut.filter((x) => coincideNombre(x.tokens, tokensDot)).map((x) => x.p);
      coincidenciaPorNombre = matches.length > 0;
    }
    const horasProgramadas = matches.reduce(
      (sum, p) => sum + p.blocks.reduce((s, b) => s + b.durationMinutes, 0) / 60,
      0
    );
    const servicios = [...new Set(matches.map((p) => p.agenda.serviceName))];
    resultado.push({
      rut: acc.rut,
      dv: acc.dv,
      nombre: acc.nombre,
      cargo: [...acc.cargos].join(' / '),
      unidad: [...acc.unidades].join(' / '),
      cargos: [...acc.cargos].sort(),
      unidades: [...acc.unidades].sort(),
      planta: [...acc.plantas].join(' / '),
      correlativos: [...acc.correlativos].sort(),
      tieneTurno: acc.tieneTurno,
      horasContratadas: Math.round(acc.horasContratadas * 10) / 10,
      horasProgramadas: Math.round(horasProgramadas * 10) / 10,
      horasPendientes: Math.round((acc.horasContratadas - horasProgramadas) * 10) / 10,
      servicios,
      coincidenciaPorNombre,
      sinAgendar: matches.length === 0,
    });
  }

  resultado.sort((a, b) => b.horasPendientes - a.horasPendientes);

  res.json({
    planta,
    periodo,
    ultimaImportacion: lastImport?.createdAt ?? null,
    total: resultado.length,
    items: resultado,
  });
});

app.post('/api/pabellon/import', hrUpload.single('file'), async (req, res) => {
  if (!requireRoles(req, res, HR_ROLES)) return;
  if (!req.file) {
    res.status(400).json({ error: 'Falta el archivo.' });
    return;
  }

  let parsed;
  try {
    parsed = parsePabellonWorkbook(req.file.buffer);
  } catch (error) {
    res.status(400).json({ error: `No se pudo leer el archivo: ${error.message}` });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.pabellonAllocation.deleteMany({});
    if (parsed.allocations.length > 0) {
      await tx.pabellonAllocation.createMany({ data: parsed.allocations });
    }
  }, { timeout: 60000, maxWait: 20000 });

  res.status(201).json({
    hoja: parsed.sheetName,
    filasImportadas: parsed.allocations.length,
    importadoEn: new Date().toISOString(),
  });
});

app.get('/api/pabellon/summary', async (req, res) => {
  if (!requireRoles(req, res, HR_ROLES)) return;
  const periodo = await resolvePeriodo(req);

  const [allocations, services, lastImport] = await Promise.all([
    prisma.pabellonAllocation.findMany(),
    prisma.service.findMany({ select: { id: true, name: true } }),
    prisma.pabellonAllocation.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ]);

  const serviceIdByName = new Map(services.map((s) => [s.name, s.id]));

  // Sesiones asignadas: una celda de la grilla puede resolver a más de un servicio (uso
  // compartido, ej. "Cir. A. /Oftalmologia") — cada uno de esos servicios suma una sesión
  // asignada, no se reparte. Se guarda también el detalle (qué pabellón/jornada/día) para poder
  // mostrarlo en la app, no solo el total.
  const asignadasPorServicio = new Map();
  for (const a of allocations) {
    for (const servicio of resolveServiciosDesdeTexto(a.especialidadTexto)) {
      if (!asignadasPorServicio.has(servicio)) asignadasPorServicio.set(servicio, []);
      asignadasPorServicio.get(servicio).push({ grupo: a.grupo, pabellon: a.pabellon, jornada: a.jornada, dia: a.dia });
    }
  }

  // Comparación en HORAS, no en "pabellones simultáneos": un mismo pabellón puede operar
  // legítimamente con 2-3 cirujanos a la vez (pabellón compartido), así que contar "profesionales
  // en paralelo" como si cada uno ocupara un pabellón distinto sobreestima la necesidad de
  // infraestructura. En horas esa concurrencia ya no es un problema — las horas de cada
  // profesional simplemente se suman — y el número de profesionales en paralelo se muestra aparte
  // en la grilla para que quede a la vista (no escondido) y el usuario juzgue si es normal.

  // Suma un bloque de agenda a un par de grillas (horas + paralelos) de un grupo específico.
  function agregarBloqueAGrupo(gridProgramado, gridParalelos, paralelosSets, b) {
    const fin = b.startMinutes + b.durationMinutes;
    agregarAGrid(gridProgramado, b.day, b.startMinutes, fin, (overlapMin) => overlapMin / 60);
    BLOQUES_GRID.forEach((label, i) => {
      const cellStart = HORA_INICIO_GRID * 60 + i * 30;
      const cellEnd = cellStart + 30;
      if (Math.min(fin, cellEnd) - Math.max(b.startMinutes, cellStart) > 0) {
        paralelosSets[b.day][label] += 1;
      }
    });
  }

  const resultado = [];
  for (const [servicio, detalleAsignadas] of asignadasPorServicio) {
    const serviceId = serviceIdByName.get(servicio);

    // Segmenta por "grupo" (ej. Pabellón Cirugía Mayor vs. Pabellón Cirugía Mayor Ambulatoria /
    // UCA) para poder comparar cada uno por separado — son físicamente distintos, no tiene
    // sentido sumarlos como si fueran el mismo pabellón.
    const nombresGrupo = [...new Set(detalleAsignadas.map((a) => a.grupo))];

    const blocks = serviceId
      ? await prisma.agendaBlock.findMany({
          where: {
            isShift: false,
            activity: { contains: 'Pabellon', mode: 'insensitive' },
            agenda: { serviceId, planningPeriod: periodo },
          },
          select: { day: true, startMinutes: true, durationMinutes: true, activity: true },
        }).then((rows) => rows.filter((b) => DIAS_SEMANA.includes(b.day)))
      : [];

    const gruposResultado = [];
    let horasAsignadas = 0;
    let horasProgramadas = 0;

    for (const grupo of nombresGrupo) {
      const asignadasGrupo = detalleAsignadas.filter((a) => a.grupo === grupo);
      const gridAsignado = gridVacia();
      let horasAsignadasGrupo = 0;
      for (const a of asignadasGrupo) {
        const ventana = VENTANA_JORNADA[a.jornada];
        if (!ventana) continue;
        const [inicio, fin] = ventana;
        horasAsignadasGrupo += (fin - inicio) / 60;
        // Cantidad de pabellones asignados por celda de 30 min (conteo entero, igual a como se
        // cuenta a mano en la planilla) — no una conversión a horas, que confundía la lectura.
        agregarAGrid(gridAsignado, a.dia, inicio, fin, 1);
      }

      // El texto de actividad de la agenda ("Pabellon Cirugía Mayor", "Pabellon Cirugía Mayor
      // Ambulatoria") coincide con el nombre del grupo de la planilla salvo tildes/mayúsculas —
      // se usa ese cruce para saber qué horas programadas corresponden a CADA pabellón físico,
      // en vez de sumarlas todas juntas bajo un solo "Pabellon" genérico.
      const blocksGrupo = blocks.filter((b) => normalizeText(b.activity) === normalizeText(grupo));
      const gridProgramado = gridVacia();
      const gridParalelos = gridVacia();
      const paralelosSets = {};
      DIAS_SEMANA.forEach((dia) => { paralelosSets[dia] = {}; BLOQUES_GRID.forEach((b) => { paralelosSets[dia][b] = 0; }); });
      let horasProgramadasGrupo = 0;
      for (const b of blocksGrupo) {
        horasProgramadasGrupo += b.durationMinutes / 60;
        agregarBloqueAGrupo(gridProgramado, gridParalelos, paralelosSets, b);
      }
      DIAS_SEMANA.forEach((dia) => { BLOQUES_GRID.forEach((bq) => { gridParalelos[dia][bq] = paralelosSets[dia][bq]; }); });

      horasAsignadas += horasAsignadasGrupo;
      horasProgramadas += horasProgramadasGrupo;
      gruposResultado.push({
        grupo,
        horasAsignadas: Math.round(horasAsignadasGrupo * 10) / 10,
        horasProgramadas: Math.round(horasProgramadasGrupo * 10) / 10,
        diferenciaHoras: Math.round((horasProgramadasGrupo - horasAsignadasGrupo) * 10) / 10,
        gridAsignado,
        gridProgramado,
        gridParalelos,
      });
    }

    // Horas programadas bajo actividad "Pabellon..." que no calzan con NINGÚN grupo conocido de
    // la planilla (nombre de actividad distinto al de la planilla) — se informan aparte para que
    // no desaparezcan silenciosamente de la comparación.
    const horasSinGrupo = blocks
      .filter((b) => !nombresGrupo.some((g) => normalizeText(b.activity) === normalizeText(g)))
      .reduce((s, b) => s + b.durationMinutes / 60, 0);

    resultado.push({
      servicio,
      cargado: !!serviceId,
      horasAsignadas: Math.round(horasAsignadas * 10) / 10,
      horasProgramadas: Math.round(horasProgramadas * 10) / 10,
      diferenciaHoras: Math.round((horasProgramadas - horasAsignadas) * 10) / 10,
      horasProgramadasSinGrupo: Math.round(horasSinGrupo * 10) / 10,
      grupos: gruposResultado,
    });
  }

  resultado.sort((a, b) => Math.abs(b.diferenciaHoras) - Math.abs(a.diferenciaHoras));

  // Grilla para mostrar la planificación tal cual viene de la planilla (agrupada por
  // "grupo" — ej. Cirugía Mayor Ambulatoria / Cirugía Mayor — con pabellón+jornada como fila y
  // día como columna, igual a como se ve en el Excel original).
  const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const gruposMap = new Map();
  for (const a of allocations) {
    if (!gruposMap.has(a.grupo)) gruposMap.set(a.grupo, { pabellones: new Set(), dias: new Set(), celdas: {} });
    const g = gruposMap.get(a.grupo);
    g.pabellones.add(a.pabellon);
    g.dias.add(a.dia);
    const key = `${a.pabellon}|||${a.jornada}`;
    if (!g.celdas[key]) g.celdas[key] = {};
    g.celdas[key][a.dia] = a.especialidadTexto;
  }
  const grid = [...gruposMap.entries()].map(([grupo, g]) => ({
    grupo,
    pabellones: [...g.pabellones].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
    dias: DIAS_ORDEN.filter((d) => g.dias.has(d)),
    celdas: g.celdas,
  }));

  res.json({
    ultimaImportacion: lastImport?.createdAt ?? null,
    total: resultado.length,
    items: resultado,
    grid,
    dias: DIAS_SEMANA,
    bloques: BLOQUES_GRID,
  });
});

// Versión liviana de la grilla "asignado" de pabellón para UN servicio, pensada para incrustarse
// en el heatmap de "Distribución horaria" del resumen de esa agenda (no el módulo completo de
// Infraestructura, que compara todos los servicios y requiere rol de RRHH). Un jefe_servicio
// puede consultar la capacidad de pabellón de su propio servicio; los roles de RRHH pueden
// consultar cualquiera.
app.get('/api/pabellon/capacidad', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const servicio = typeof req.query.servicio === 'string' ? req.query.servicio.trim() : '';
  if (!servicio) {
    res.status(400).json({ error: 'Falta el parámetro servicio.' });
    return;
  }
  const esRolRrhh = HR_ROLES.includes(req.authUser.role);
  const tieneAcceso = esRolRrhh || (req.authUser.role === 'jefe_servicio' && req.authUser.serviceNames?.includes(servicio));
  if (!tieneAcceso) {
    res.status(403).json({ error: 'No autorizado para consultar la capacidad de este servicio.' });
    return;
  }

  const [allocations, lastImport] = await Promise.all([
    prisma.pabellonAllocation.findMany(),
    prisma.pabellonAllocation.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ]);

  const grid = gridVacia();
  let cargado = false;
  for (const a of allocations) {
    if (!resolveServiciosDesdeTexto(a.especialidadTexto).includes(servicio)) continue;
    const ventana = VENTANA_JORNADA[a.jornada];
    if (!ventana) continue;
    cargado = true;
    agregarAGrid(grid, a.dia, ventana[0], ventana[1], 1);
  }

  res.json({
    servicio,
    cargado,
    ultimaImportacion: lastImport?.createdAt ?? null,
    dias: DIAS_SEMANA,
    bloques: BLOQUES_GRID,
    grid,
  });
});

app.get('/api/agendas', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const agendas = await prisma.agenda.findMany({
    where: buildAgendaWhereForUser(req.authUser, req.query),
    include: {
      professionals: true,
      blocks: true,
      historyEntries: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(agendas.map(serializeAgenda));
});

app.get('/api/agendas/:externalId', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canViewAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para ver esta agenda.' });
    return;
  }

  res.json(serializeAgenda(agenda));
});

app.post('/api/agendas', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const payload = normalizeAgendaPayload(req.body);
  // Un jefe_servicio con varios servicios (groupName) elige a cual pertenece la agenda nueva
  // vía el nombre en el payload; si no lo manda o no es uno de los suyos, cae a su servicio
  // principal (el que tiene asignado directamente en su cuenta).
  const service = req.authUser.role === 'jefe_servicio'
    ? (payload.servicio && req.authUser.serviceNames?.includes(payload.servicio)
        ? await prisma.service.findUnique({ where: { name: payload.servicio } })
        : req.authUser.service)
    : payload.servicio
      ? await prisma.service.findUnique({ where: { name: payload.servicio } })
      : null;

  if (!service) {
    res.status(400).json({ error: 'Servicio invalido para crear agenda.' });
    return;
  }

  const validFrom = parseOptionalDate(payload.vigenciaDesde);
  const validTo = parseOptionalDate(payload.vigenciaHasta);
  if (!ensureValidDateRange(validFrom, validTo)) {
    res.status(400).json({ error: 'vigenciaHasta no puede ser anterior a vigenciaDesde.' });
    return;
  }

  // writeAgendaGraph crea profesionales y bloques uno por uno (no en lote), así que clonar una
  // agenda con cientos de bloques ("comenzar desde la última versión") puede tardar más que el
  // timeout por defecto de una transacción interactiva de Prisma (5s) — con la latencia de Neon
  // eso basta para que la transacción expire (P2028) y la creación parezca "no hacer nada".
  const created = await prisma.$transaction(async (tx) => {
    const record = await writeAgendaGraph(
      tx,
      {
        ...payload,
        servicio: service.name,
        jefe: req.authUser.role === 'jefe_servicio' ? req.authUser.name : payload.jefe,
        vigenciaDesde: payload.vigenciaDesde,
        vigenciaHasta: payload.vigenciaHasta,
        chiefUserId: req.authUser.role === 'jefe_servicio' ? req.authUser.id : null,
      },
      null
    );

    await createAudit(tx, record.id, req.authUser, 'create', 'agenda', record.externalId, payload);
    if (!payload.pendienteConfirmar) {
      await createHistory(tx, record.id, req.authUser, 'Creada', {
        eventType: 'agenda',
        toStatus: payload.estado,
      });
    }
    return record;
  }, { timeout: 60000, maxWait: 20000 });

  const hydrated = await findAgendaRecord(prisma, created.externalId);
  res.status(201).json(serializeAgenda(hydrated));
});

app.put('/api/agendas/:externalId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const existing = await loadAgendaOr404(req.params.externalId, res);
  if (!existing) return;
  if (!canEditAgenda(req.authUser, existing)) {
    res.status(403).json({ error: 'No autorizado para editar esta agenda.' });
    return;
  }

  const payload = normalizeAgendaPayload(req.body);
  const validFrom = parseOptionalDate(payload.vigenciaDesde);
  const validTo = parseOptionalDate(payload.vigenciaHasta);
  if (!ensureValidDateRange(validFrom, validTo)) {
    res.status(400).json({ error: 'vigenciaHasta no puede ser anterior a vigenciaDesde.' });
    return;
  }

  const record = await prisma.$transaction(async (tx) => {
    const updated = await writeAgendaGraph(
      tx,
      {
        ...payload,
        id: req.params.externalId,
        servicio: existing.serviceName,
        jefe: existing.chiefName,
      },
      existing.id
    );
    await createAudit(tx, existing.id, req.authUser, 'update', 'agenda', existing.externalId, payload);
    return updated;
  }, { timeout: 60000, maxWait: 20000 });

  const hydrated = await findAgendaRecord(prisma, record.externalId);
  res.json(serializeAgenda(hydrated));
});

// Edición liviana de campos sueltos del encabezado de la agenda (%CNE, atenciones, distribución
// horaria manual) — a diferencia del PUT completo de arriba, esto NO toca profesionales/bloques
// (writeAgendaGraph los borra y recrea enteros, innecesario y lento para cambiar un solo número).
// Existe porque estos 3 campos se editaban SOLO en el estado local de React sin ningún llamado a
// la API — se veían guardados en la pantalla pero se perdían apenas se recargaba la página.
app.patch('/api/agendas/:externalId/fields', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin', 'referente_programacion'])) return;

  const existing = await loadAgendaOr404(req.params.externalId, res);
  if (!existing) return;
  if (!canEditAgenda(req.authUser, existing)) {
    res.status(403).json({ error: 'No autorizado para editar esta agenda.' });
    return;
  }

  const data = {};
  if (req.body?.cnePct !== undefined) data.cnePct = Number(req.body.cnePct) || 0;
  if (req.body?.atenciones !== undefined) data.appointments = Number(req.body.atenciones) || 0;
  if (req.body?.distribucionHoraria !== undefined) data.distributionJson = JSON.stringify(req.body.distribucionHoraria ?? {});
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Nada que actualizar.' });
    return;
  }
  data.lastUpdated = BigInt(Date.now());

  await prisma.agenda.update({ where: { id: existing.id }, data });

  const hydrated = await findAgendaRecord(prisma, existing.externalId);
  res.json(serializeAgenda(hydrated));
});

app.post('/api/agendas/:externalId/actions/confirm-draft', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const existing = await loadAgendaOr404(req.params.externalId, res);
  if (!existing) return;
  if (!canEditAgenda(req.authUser, existing)) {
    res.status(403).json({ error: 'No autorizado para confirmar esta agenda.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.agenda.update({
      where: { id: existing.id },
      data: {
        pendingConfirm: false,
        lastUpdated: BigInt(Date.now()),
      },
    });
    await createHistory(tx, existing.id, req.authUser, 'Guardada como borrador', {
      eventType: 'agenda',
      toStatus: existing.status,
    });
    await createAudit(tx, existing.id, req.authUser, 'confirm_draft', 'agenda', existing.externalId, null);
  });

  const hydrated = await findAgendaRecord(prisma, existing.externalId);
  res.json(serializeAgenda(hydrated));
});

app.post('/api/agendas/:externalId/actions/transition', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const targetStatus = toAgendaStatus(req.body?.targetStatus);
  const definition = transitionDefinition(targetStatus);
  if (!definition) {
    res.status(400).json({ error: 'Transicion no soportada.' });
    return;
  }
  if (!definition.roles.includes(req.authUser.role)) {
    res.status(403).json({ error: 'Rol no autorizado para esta transicion.' });
    return;
  }

  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!definition.from.includes(agenda.status)) {
    res.status(400).json({ error: `No se puede pasar de ${agenda.status} a ${targetStatus}.` });
    return;
  }
  if (req.authUser.role === 'jefe_servicio' && !req.authUser.serviceIds?.includes(agenda.serviceId)) {
    res.status(403).json({ error: 'No autorizado para esta agenda.' });
    return;
  }

  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  if (definition.requiresComment && !comment) {
    res.status(400).json({ error: 'comment es obligatorio para esta transicion.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const nextVersion = agenda.status === 'rechazada' && targetStatus === 'enviada'
      ? agenda.version + 1
      : agenda.version;

    await tx.agenda.update({
      where: { id: agenda.id },
      data: {
        status: targetStatus,
        version: nextVersion,
        pendingConfirm: false,
        rejectionReason: targetStatus === 'rechazada' ? comment : null,
        lastUpdated: BigInt(Date.now()),
      },
    });

    await createHistory(tx, agenda.id, req.authUser, definition.action, {
      eventType: definition.eventType,
      fromStatus: agenda.status,
      toStatus: targetStatus,
      comment: comment || null,
    });
    await createAudit(tx, agenda.id, req.authUser, 'transition', 'agenda', agenda.externalId, {
      fromStatus: agenda.status,
      toStatus: targetStatus,
      comment: comment || null,
    });

    if (definition.notificationRole) {
      await createNotification(tx, {
        agendaId: agenda.id,
        destinationRole: definition.notificationRole,
        text: `${agenda.serviceName} fue ${definition.action.toLowerCase()} por ${req.authUser.name}.`,
      });
    }

    // Al aprobarse una nueva versión de la agenda de un servicio, cualquier otra versión
    // previamente aprobada del mismo servicio deja de estar vigente (se cierra su vigencia),
    // para que no queden dos versiones "aprobadas" vigentes al mismo tiempo.
    if (targetStatus === 'aprobada' && agenda.serviceId) {
      const now = new Date();
      const cutoff = agenda.validFrom && agenda.validFrom.getTime() > now.getTime()
        ? new Date(agenda.validFrom.getTime() - 24 * 60 * 60 * 1000)
        : now;

      const siblings = await tx.agenda.findMany({
        where: {
          serviceId: agenda.serviceId,
          status: 'aprobada',
          id: { not: agenda.id },
          OR: [{ validTo: null }, { validTo: { gt: cutoff } }],
        },
      });

      for (const sibling of siblings) {
        await tx.agenda.update({
          where: { id: sibling.id },
          data: { validTo: cutoff },
        });
        await createHistory(tx, sibling.id, req.authUser, 'Vigencia finalizada', {
          eventType: 'workflow',
          comment: `Reemplazada por la nueva versión aprobada (${agenda.monthLabel}).`,
        });
      }
    }
  });

  const hydrated = await findAgendaRecord(prisma, agenda.externalId);
  res.json(serializeAgenda(hydrated));
});

app.post('/api/agendas/:externalId/actions/extend-vigencia', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'referente_programacion', 'admin'])) return;

  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (agenda.status !== 'aprobada') {
    res.status(400).json({ error: 'Solo se puede extender la vigencia de una agenda aprobada.' });
    return;
  }
  if (req.authUser.role === 'jefe_servicio' && !req.authUser.serviceIds?.includes(agenda.serviceId)) {
    res.status(403).json({ error: 'No autorizado para esta agenda.' });
    return;
  }

  const nuevaVigenciaHasta = parseOptionalDate(req.body?.vigenciaHasta);
  if (!nuevaVigenciaHasta) {
    res.status(400).json({ error: 'vigenciaHasta es obligatorio.' });
    return;
  }
  if (agenda.validTo && nuevaVigenciaHasta.getTime() <= agenda.validTo.getTime()) {
    res.status(400).json({ error: 'La nueva vigenciaHasta debe ser posterior a la actual.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.agenda.update({
      where: { id: agenda.id },
      data: {
        validTo: nuevaVigenciaHasta,
        lastUpdated: BigInt(Date.now()),
        // Al mover la fecha de término, los avisos de vencimiento deben poder volver a
        // dispararse relativos a la nueva fecha.
        vigenciaAlerta15dEnviada: false,
        vigenciaAlerta5dEnviada: false,
        vigenciaAlerta0dEnviada: false,
      },
    });
    await createHistory(tx, agenda.id, req.authUser, 'Vigencia extendida', {
      eventType: 'workflow',
      comment: `Nueva fecha de término: ${nuevaVigenciaHasta.toISOString().slice(0, 10)}.`,
    });
    await createAudit(tx, agenda.id, req.authUser, 'extend_vigencia', 'agenda', agenda.externalId, {
      vigenciaHastaAnterior: agenda.validTo ? agenda.validTo.toISOString().slice(0, 10) : null,
      vigenciaHastaNueva: nuevaVigenciaHasta.toISOString().slice(0, 10),
    });
  });

  const hydrated = await findAgendaRecord(prisma, agenda.externalId);
  res.json(serializeAgenda(hydrated));
});

app.post('/api/agendas/sync', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const agendas = Array.isArray(req.body?.agendas) ? req.body.agendas.map(normalizeAgendaPayload) : [];

  await prisma.$transaction(async (tx) => {
    const existing = await tx.agenda.findMany({ select: { id: true, externalId: true } });
    const existingMap = new Map(existing.map((agenda) => [agenda.externalId, agenda.id]));

    for (const agenda of agendas) {
      if (req.authUser.role === 'jefe_servicio' && !req.authUser.serviceNames?.includes(agenda.servicio)) {
        continue;
      }
      await writeAgendaGraph(tx, agenda, existingMap.get(String(agenda.id)) ?? null);
      existingMap.delete(String(agenda.id));
    }
  }, { timeout: 120000, maxWait: 20000 });

  const stored = await prisma.agenda.findMany({
    where: buildAgendaWhereForUser(req.authUser, {}),
    include: {
      professionals: true,
      blocks: true,
      historyEntries: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ ok: true, agendas: stored.map(serializeAgenda) });
});

// Carga de agendas completas desde un Excel (menú "Cargar agenda" del tablero) — restringido a
// admin/referente_programacion porque exige que quien sube el archivo ya conozca el texto exacto
// del catálogo (no hay corrección de sinónimos/tipeos automática, a diferencia de las
// importaciones puntuales hechas a mano durante esta sesión: acá si algo no calza se rechaza con
// el detalle, no se adivina un fallback). Dos pasos: /preview (solo valida) y /apply (escribe).
const AGENDA_IMPORT_ROLES = ['admin', 'referente_programacion'];
const agendaImportUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function slugifyExternalId(serviceName) {
  const base = normalizeText(serviceName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return `${base}-${new Date().getFullYear()}`;
}

async function runAgendaImportValidation(req, res) {
  if (!requireRoles(req, res, AGENDA_IMPORT_ROLES)) return null;
  if (!req.file) {
    res.status(400).json({ error: 'Falta el archivo Excel.' });
    return null;
  }
  const mode = req.body?.mode === 'create' ? 'create' : 'update';
  const profession = typeof req.body?.profession === 'string' ? req.body.profession.trim() : '';
  const specialty = typeof req.body?.specialty === 'string' ? req.body.specialty.trim() : '';
  if (!profession || !specialty) {
    res.status(400).json({ error: 'profession y specialty son obligatorios.' });
    return null;
  }

  let existingAgenda = null;
  let nuevaAgendaConfig = null;
  if (mode === 'update') {
    const externalId = typeof req.body?.externalId === 'string' ? req.body.externalId.trim() : '';
    if (!externalId) {
      res.status(400).json({ error: 'externalId es obligatorio en modo actualizar.' });
      return null;
    }
    existingAgenda = await prisma.agenda.findUnique({ where: { externalId } });
    if (!existingAgenda) {
      res.status(404).json({ error: `No se encontró la agenda ${externalId}.` });
      return null;
    }
  } else {
    const serviceName = typeof req.body?.serviceName === 'string' ? req.body.serviceName.trim() : '';
    if (!serviceName) {
      res.status(400).json({ error: 'serviceName es obligatorio en modo crear.' });
      return null;
    }
    const existeServicio = await prisma.service.findUnique({ where: { name: serviceName } });
    if (existeServicio) {
      res.status(409).json({ error: `Ya existe un servicio llamado "${serviceName}".` });
      return null;
    }
    nuevaAgendaConfig = {
      serviceName,
      externalId: slugifyExternalId(serviceName),
      chiefName: typeof req.body?.chiefName === 'string' ? req.body.chiefName.trim() : '',
      groupName: typeof req.body?.groupName === 'string' ? req.body.groupName.trim() : '',
      monthLabel: typeof req.body?.monthLabel === 'string' && req.body.monthLabel.trim() ? req.body.monthLabel.trim() : 'Sin mes',
      validFrom: typeof req.body?.validFrom === 'string' && req.body.validFrom.trim() ? req.body.validFrom.trim() : null,
      validTo: typeof req.body?.validTo === 'string' && req.body.validTo.trim() ? req.body.validTo.trim() : null,
    };
    const yaExisteExternalId = await prisma.agenda.findUnique({ where: { externalId: nuevaAgendaConfig.externalId } });
    if (yaExisteExternalId) {
      res.status(409).json({ error: `Ya existe una agenda con el identificador "${nuevaAgendaConfig.externalId}" — elige otro nombre de servicio.` });
      return null;
    }
  }

  let parsed;
  try {
    parsed = parseAgendaWorkbook(req.file.buffer);
  } catch (error) {
    res.status(400).json({ error: `No se pudo leer el archivo: ${error.message}` });
    return null;
  }
  if (parsed.profesionales.length === 0) {
    res.status(400).json({ error: 'No se encontró ninguna hoja con formato de horario reconocible (RUT/NOMBRE/ESPECIALIDAD + grilla DIA/DESDE/HASTA/ACTIVIDAD).' });
    return null;
  }

  let overrides = {};
  if (typeof req.body?.overrides === 'string' && req.body.overrides.trim()) {
    try {
      overrides = JSON.parse(req.body.overrides);
    } catch (_error) {
      res.status(400).json({ error: 'overrides no es un JSON válido.' });
      return null;
    }
  }

  const { catalogMap, errores } = await validateAgendaImport(prisma, parsed.profesionales, { profession, specialty, overrides });

  return { mode, profession, specialty, existingAgenda, nuevaAgendaConfig, parsed, catalogMap, errores };
}

function summarizeImportPreview(ctx) {
  let totalBloques = 0;
  const profesionales = ctx.parsed.profesionales.map((p) => {
    totalBloques += p.bloques.length;
    return { sheet: p.sheet, nombre: p.nombre, rut: p.rut, especialidad: p.especialidad, bloques: p.bloques.length, advertencias: p.advertencias };
  });
  return {
    mode: ctx.mode,
    profesionales,
    omitidas: ctx.parsed.omitidas,
    erroresValidacion: ctx.errores,
    totalProfesionales: profesionales.length,
    totalBloques,
    puedeAplicar: ctx.errores.length === 0,
  };
}

app.post('/api/agendas/import-excel/preview', agendaImportUpload.single('file'), async (req, res) => {
  const ctx = await runAgendaImportValidation(req, res);
  if (!ctx) return;
  res.json(summarizeImportPreview(ctx));
});

app.post('/api/agendas/import-excel/apply', agendaImportUpload.single('file'), async (req, res) => {
  const ctx = await runAgendaImportValidation(req, res);
  if (!ctx) return;
  if (ctx.errores.length > 0) {
    res.status(400).json({ error: 'Hay actividades sin match en el catálogo, no se puede aplicar.', ...summarizeImportPreview(ctx) });
    return;
  }

  const resultado = await prisma.$transaction(
    (tx) => applyAgendaImport(tx, {
      mode: ctx.mode,
      profession: ctx.profession,
      specialty: ctx.specialty,
      profesionales: ctx.parsed.profesionales,
      catalogMap: ctx.catalogMap,
      existingAgenda: ctx.existingAgenda,
      nuevaAgendaConfig: ctx.nuevaAgendaConfig,
    }),
    { timeout: 120000, maxWait: 20000 },
  );

  await createAudit(prisma, resultado.agendaId, req.authUser, ctx.mode === 'update' ? 'update' : 'create', 'agenda', resultado.externalId, {
    origen: 'import-excel',
    profesionales: resultado.profesionales,
    bloques: resultado.bloques,
  });

  res.status(201).json(resultado);
});

app.delete('/api/agendas/:externalId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return;

  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para eliminar esta agenda.' });
    return;
  }

  await prisma.agenda.delete({ where: { id: agenda.id } });
  res.status(204).send();
});

app.get('/api/agendas/:externalId/professionals', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canViewAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para ver esta agenda.' });
    return;
  }
  res.json(
    agenda.professionals
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((professional) => ({
        id: professional.externalId || professional.id,
        nombre: professional.name,
        tipo: professional.type,
        nivelFormacion: professional.trainingLevel,
        especialidad: professional.specialtyCatalog ?? null,
      }))
  );
});

// '' o null en el body = volver a la especialidad del servicio; undefined = no tocar.
function parseEspecialidadInput(value) {
  if (value === undefined) return undefined;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

app.post('/api/agendas/:externalId/professionals', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin', 'referente_programacion'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar profesionales.' });
    return;
  }

  const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
  const tipo = typeof req.body?.tipo === 'string' ? req.body.tipo.trim() : '';
  if (!nombre || !tipo) {
    res.status(400).json({ error: 'nombre y tipo son obligatorios.' });
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    const currentCount = await tx.agendaProfessional.count({ where: { agendaId: agenda.id } });
    const professional = await tx.agendaProfessional.create({
      data: {
        agendaId: agenda.id,
        externalId: String(req.body?.id || randomUUID()),
        name: nombre,
        type: tipo,
        professionCatalog: tipo,
        trainingLevel: typeof req.body?.nivelFormacion === 'string' ? req.body.nivelFormacion.trim() || null : null,
        hasTurno: Boolean(req.body?.tieneTurno ?? false),
        isShiftOnly: Boolean(req.body?.esSoloTurno ?? false),
        rut: normalizeRut(req.body?.rut) || null,
        specialtyCatalog: parseEspecialidadInput(req.body?.especialidad) ?? null,
        sortOrder: currentCount,
      },
    });
    await createAudit(tx, agenda.id, req.authUser, 'create', 'professional', professional.externalId, req.body);
    await recomputeAgendaDerivedData(tx, agenda.id);
    return professional;
  });

  res.status(201).json({
    id: created.externalId || created.id,
    nombre: created.name,
    tipo: created.type,
    nivelFormacion: created.trainingLevel,
    tieneTurno: created.hasTurno,
    esSoloTurno: created.isShiftOnly,
    rut: created.rut,
    especialidad: created.specialtyCatalog ?? null,
  });
});

app.put('/api/agendas/:externalId/professionals/:professionalId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin', 'referente_programacion'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar profesionales.' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const professional = await resolveProfessionalOr404(tx, agenda.id, req.params.professionalId, res);
    if (!professional) return null;
    const next = await tx.agendaProfessional.update({
      where: { id: professional.id },
      data: {
        name: typeof req.body?.nombre === 'string' ? req.body.nombre.trim() || professional.name : professional.name,
        type: typeof req.body?.tipo === 'string' ? req.body.tipo.trim() || professional.type : professional.type,
        professionCatalog: typeof req.body?.tipo === 'string' ? req.body.tipo.trim() || professional.type : professional.type,
        trainingLevel: req.body?.nivelFormacion !== undefined ? (typeof req.body.nivelFormacion === 'string' ? req.body.nivelFormacion.trim() || null : null) : professional.trainingLevel,
        hasTurno: req.body?.tieneTurno !== undefined ? Boolean(req.body.tieneTurno) : professional.hasTurno,
        isShiftOnly: req.body?.esSoloTurno !== undefined ? Boolean(req.body.esSoloTurno) : professional.isShiftOnly,
        rut: req.body?.rut !== undefined ? (normalizeRut(req.body.rut) || null) : professional.rut,
        specialtyCatalog: parseEspecialidadInput(req.body?.especialidad) !== undefined
          ? parseEspecialidadInput(req.body.especialidad)
          : professional.specialtyCatalog,
      },
    });
    await createAudit(tx, agenda.id, req.authUser, 'update', 'professional', professional.externalId || professional.id, req.body);
    return next;
  });
  if (!updated) return;

  res.json({
    id: updated.externalId || updated.id,
    nombre: updated.name,
    tipo: updated.type,
    nivelFormacion: updated.trainingLevel,
    tieneTurno: updated.hasTurno,
    esSoloTurno: updated.isShiftOnly,
    rut: updated.rut,
    especialidad: updated.specialtyCatalog ?? null,
  });
});

app.delete('/api/agendas/:externalId/professionals/:professionalId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin', 'referente_programacion'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar profesionales.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const professional = await resolveProfessionalOr404(tx, agenda.id, req.params.professionalId, res);
    if (!professional) return;
    await tx.agendaProfessional.delete({ where: { id: professional.id } });
    await createAudit(tx, agenda.id, req.authUser, 'delete', 'professional', professional.externalId || professional.id, null);
    await recomputeAgendaDerivedData(tx, agenda.id);
  });

  res.status(204).send();
});

app.get('/api/agendas/:externalId/blocks', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canViewAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para ver esta agenda.' });
    return;
  }
  res.json(
    agenda.blocks.map((block) => ({
      id: block.externalId || block.id,
      profesionalId: agenda.professionals.find((p) => p.id === block.professionalId)?.externalId || block.professionalId,
      dia: block.day,
      inicioMin: block.startMinutes,
      duracionMin: block.durationMinutes,
      proceso: block.process,
      actividad: block.activity,
      clinica: block.isClinical,
      tieneRendimiento: block.hasPerformance,
      rendimiento: block.performance,
      rendimientoSugerido: block.suggestedPerformance,
      fuenteRendimiento: block.performanceSource,
      box: block.box,
      observaciones: block.observations,
    }))
  );
});

app.post('/api/agendas/:externalId/blocks', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin', 'referente_programacion'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar bloques.' });
    return;
  }

  const professional = await prisma.agendaProfessional.findFirst({
    where: {
      agendaId: agenda.id,
      OR: [{ externalId: String(req.body?.profesionalId) }, { id: String(req.body?.profesionalId) }],
    },
  });
  if (!professional) {
    res.status(404).json({ error: 'Profesional no encontrado para este bloque.' });
    return;
  }

  const block = await prisma.$transaction(async (tx) => {
    const freshAgenda = await tx.agenda.findUnique({ where: { id: agenda.id } });
    const specialty = effectiveSpecialty(freshAgenda, professional);
    const catalogActivity = await resolveCatalogActivityForBlock(tx, specialty, professional.type, req.body);
    if (req.body?.activity && !catalogActivity) {
      throw new Error('ACTIVITY_NOT_ALLOWED');
    }
    const perf = await resolveSuggestedPerformance(tx, specialty, req.body);
    const created = await tx.agendaBlock.create({
      data: {
        agendaId: agenda.id,
        professionalId: professional.id,
        externalId: String(req.body?.id || randomUUID()),
        catalogActivityId: catalogActivity?.id ?? null,
        day: String(req.body?.dia || 'Lunes'),
        startMinutes: Number(req.body?.inicioMin ?? 480),
        durationMinutes: Number(req.body?.duracionMin ?? 30),
        process: req.body?.proceso ?? null,
        activity: req.body?.actividad ?? null,
        isClinical: req.body?.clinica ?? catalogActivity?.isClinical ?? true,
        hasPerformance: req.body?.tieneRendimiento ?? catalogActivity?.hasPerformance ?? true,
        performance: Number(req.body?.rendimiento ?? perf.suggestedPerformance ?? 0),
        suggestedPerformance: perf.suggestedPerformance,
        performanceSource: perf.performanceSource,
        box: req.body?.box ?? null,
        observations: req.body?.observaciones ?? null,
        isShift: Boolean(req.body?.esTurno ?? false),
      },
    });
    await recomputeAgendaDerivedData(tx, agenda.id);
    await createAudit(tx, agenda.id, req.authUser, 'create', 'block', created.externalId || created.id, req.body);
    return created;
  }).catch((error) => {
    if (error.message === 'ACTIVITY_NOT_ALLOWED') {
      res.status(400).json({ error: 'La actividad no existe en el catalogo para esa profesion y especialidad.' });
      return null;
    }
    throw error;
  });

  if (!block) return;
  res.status(201).json({
    id: block.externalId || block.id,
    profesionalId: req.body?.profesionalId,
    dia: block.day,
    inicioMin: block.startMinutes,
    duracionMin: block.durationMinutes,
    proceso: block.process,
    actividad: block.activity,
    clinica: block.isClinical,
    tieneRendimiento: block.hasPerformance,
    rendimiento: block.performance,
    rendimientoSugerido: block.suggestedPerformance,
    fuenteRendimiento: block.performanceSource,
    box: block.box,
    observaciones: block.observations,
  });
});

app.put('/api/agendas/:externalId/blocks/:blockId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin', 'referente_programacion'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar bloques.' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const block = await resolveBlockOr404(tx, agenda.id, req.params.blockId, res);
    if (!block) return null;
    // `null` explícito borra la prestación (ej. al marcar un bloque como turno); `undefined` la conserva.
    const nextInput = {
      proceso: req.body?.proceso !== undefined ? req.body.proceso : block.process,
      actividad: req.body?.actividad !== undefined ? req.body.actividad : block.activity,
    };
    // Solo se vuelve a consultar el catálogo y el rendimiento sugerido si cambió la prestación.
    // Cambios de día, horas, cupos, box, observaciones o turno no lo necesitan, y cada consulta
    // es un viaje de ida y vuelta a la base (Neon, en EE.UU.) que hacía lento cada guardado.
    const cambiaPrestacion = req.body?.proceso !== undefined || req.body?.actividad !== undefined;
    let catalogActivity = null;
    let perf = { suggestedPerformance: block.suggestedPerformance, performanceSource: block.performanceSource };
    if (cambiaPrestacion) {
      const professional = await tx.agendaProfessional.findUnique({ where: { id: block.professionalId } });
      const specialty = effectiveSpecialty(agenda, professional);
      catalogActivity = await resolveCatalogActivityForBlock(tx, specialty, professional.type, nextInput);
      if (nextInput.actividad && !catalogActivity) {
        throw new Error('ACTIVITY_NOT_ALLOWED');
      }
      perf = await resolveSuggestedPerformance(tx, specialty, {
        process: nextInput.proceso,
        activity: nextInput.actividad,
      });
    }
    const next = await tx.agendaBlock.update({
      where: { id: block.id },
      data: {
        catalogActivityId: cambiaPrestacion ? (catalogActivity?.id ?? null) : block.catalogActivityId,
        day: typeof req.body?.dia === 'string' ? req.body.dia : block.day,
        startMinutes: req.body?.inicioMin != null ? Number(req.body.inicioMin) : block.startMinutes,
        durationMinutes: req.body?.duracionMin != null ? Number(req.body.duracionMin) : block.durationMinutes,
        process: nextInput.proceso,
        activity: nextInput.actividad,
        isClinical: req.body?.clinica ?? catalogActivity?.isClinical ?? block.isClinical,
        hasPerformance: req.body?.tieneRendimiento ?? catalogActivity?.hasPerformance ?? block.hasPerformance,
        performance: req.body?.rendimiento != null ? Number(req.body.rendimiento) : block.performance,
        suggestedPerformance: perf.suggestedPerformance,
        performanceSource: perf.performanceSource,
        box: req.body?.box !== undefined ? req.body.box : block.box,
        observations: req.body?.observaciones !== undefined ? req.body.observaciones : block.observations,
        // Un bloque de turno no tiene actividad de catálogo: si al editarlo se le asigna una
        // (ej. "Turno Hospitalizados" -> "Atención en sala"), pasa a ser jornada, salvo que se
        // indique explícitamente esTurno. Si no, seguiría excluido de horas y mapa de calor.
        isShift: req.body?.esTurno !== undefined
          ? Boolean(req.body.esTurno)
          : (req.body?.actividad !== undefined && catalogActivity ? false : block.isShift),
      },
    });
    await recomputeAgendaDerivedData(tx, agenda.id);
    await createAudit(tx, agenda.id, req.authUser, 'update', 'block', block.externalId || block.id, req.body);
    return next;
  }).catch((error) => {
    if (error.message === 'ACTIVITY_NOT_ALLOWED') {
      res.status(400).json({ error: 'La actividad no existe en el catalogo para esa profesion y especialidad.' });
      return null;
    }
    throw error;
  });

  if (!updated) return;
  res.json({
    id: updated.externalId || updated.id,
    dia: updated.day,
    inicioMin: updated.startMinutes,
    duracionMin: updated.durationMinutes,
    proceso: updated.process,
    actividad: updated.activity,
    clinica: updated.isClinical,
    tieneRendimiento: updated.hasPerformance,
    rendimiento: updated.performance,
    rendimientoSugerido: updated.suggestedPerformance,
    fuenteRendimiento: updated.performanceSource,
    box: updated.box,
    observaciones: updated.observations,
  });
});

app.delete('/api/agendas/:externalId/blocks/:blockId', async (req, res) => {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin', 'referente_programacion'])) return;
  const agenda = await loadAgendaOr404(req.params.externalId, res);
  if (!agenda) return;
  if (!canEditAgenda(req.authUser, agenda)) {
    res.status(403).json({ error: 'No autorizado para editar bloques.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const block = await resolveBlockOr404(tx, agenda.id, req.params.blockId, res);
    if (!block) return;
    await tx.agendaBlock.delete({ where: { id: block.id } });
    await recomputeAgendaDerivedData(tx, agenda.id);
    await createAudit(tx, agenda.id, req.authUser, 'delete', 'block', block.externalId || block.id, null);
  });

  res.status(204).send();
});

app.get('/api/profesionales', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const periodo = await resolvePeriodo(req);
  const where = req.authUser.role === 'jefe_servicio'
    ? { agenda: { planningPeriod: periodo, serviceId: { in: req.authUser.serviceIds?.length ? req.authUser.serviceIds : ['__no_service__'] } } }
    : { agenda: { planningPeriod: periodo } };

  const professionals = await prisma.agendaProfessional.findMany({
    where,
    include: {
      agenda: {
        select: {
          externalId: true,
          serviceName: true,
          monthLabel: true,
        },
      },
    },
    orderBy: [{ name: 'asc' }],
  });

  res.json(
    professionals.map((professional) => ({
      id: professional.externalId || professional.id,
      nombre: professional.name,
      tipo: professional.type,
      agendaId: professional.agenda.externalId,
      servicio: professional.agenda.serviceName,
      mes: professional.agenda.monthLabel,
    }))
  );
});

app.get('/api/catalog/activities', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const profession = typeof req.query.profession === 'string' ? req.query.profession.trim() : '';
  if (!profession) {
    res.status(400).json({ error: 'profession es obligatorio.' });
    return;
  }

  const specialty = await resolveSpecialty({
    serviceId: req.query.serviceId,
    serviceName: req.query.serviceName,
    specialty: req.query.specialty,
  });
  const includeTransversal = parseBooleanParam(req.query.includeTransversal, true);
  const process = typeof req.query.process === 'string' && req.query.process.trim()
    ? req.query.process.trim()
    : null;
  const clinicalOnly = parseBooleanParam(req.query.clinicalOnly, false);
  const performanceOnly = parseBooleanParam(req.query.performanceOnly, false);

  const specialtyFilter = specialty
    ? includeTransversal
      ? { in: [specialty, 'No Aplica'] }
      : specialty
    : includeTransversal
      ? { in: ['No Aplica'] }
      : undefined;

  const rows = await prisma.catalogActivity.findMany({
    where: {
      profession,
      ...(specialtyFilter ? { specialty: specialtyFilter } : {}),
      ...(process ? { process } : {}),
      ...(clinicalOnly ? { isClinical: true } : {}),
      ...(performanceOnly ? { hasPerformance: true } : {}),
    },
    orderBy: [{ process: 'asc' }, { specialty: 'asc' }, { activity: 'asc' }],
  });

  res.json({
    profession,
    specialty: specialty ?? null,
    includeTransversal,
    process,
    total: rows.length,
    items: rows.map(mapCatalogActivity),
  });
});

app.get('/api/catalog/processes', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const profession = typeof req.query.profession === 'string' ? req.query.profession.trim() : '';
  const specialty = await resolveSpecialty({
    serviceId: req.query.serviceId,
    serviceName: req.query.serviceName,
    specialty: req.query.specialty,
  });

  const rows = await prisma.catalogActivity.findMany({
    where: {
      ...(profession ? { profession } : {}),
      ...(specialty ? { specialty: { in: [specialty, 'No Aplica'] } } : {}),
    },
    distinct: ['process'],
    select: { process: true },
    orderBy: { process: 'asc' },
  });

  res.json(rows.map((row) => row.process));
});

app.get('/api/catalog/professions', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const rows = await prisma.catalogActivity.findMany({
    distinct: ['profession'],
    select: { profession: true },
    orderBy: { profession: 'asc' },
  });

  res.json(rows.map((row) => row.profession));
});

// Especialidades reales disponibles en el catálogo para una profesión — se usa para poblar el
// selector de "Cargar agenda (Excel)": solo se puede crear/actualizar una agenda contra una
// especialidad que ya tenga actividades catalogadas (si no existe, primero hay que ampliar el
// catálogo, igual que el bloqueo ya conocido de SEO/odontología).
app.get('/api/catalog/specialties', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const profession = typeof req.query.profession === 'string' ? req.query.profession.trim() : '';
  if (!profession) {
    res.status(400).json({ error: 'profession es obligatorio.' });
    return;
  }

  const rows = await prisma.catalogActivity.findMany({
    where: { profession },
    distinct: ['specialty'],
    select: { specialty: true },
    orderBy: { specialty: 'asc' },
  });

  res.json(rows.map((row) => row.specialty));
});

app.get('/api/catalog/reference-performance', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const activity = typeof req.query.activity === 'string' ? req.query.activity.trim() : '';
  if (!activity) {
    res.status(400).json({ error: 'activity es obligatorio.' });
    return;
  }

  const specialty = await resolveSpecialty({
    serviceId: req.query.serviceId,
    serviceName: req.query.serviceName,
    specialty: req.query.specialty,
  });
  const process = typeof req.query.process === 'string' && req.query.process.trim()
    ? req.query.process.trim()
    : 'Ambulatorio';

  if (!specialty) {
    res.json({
      activity,
      process,
      specialty: null,
      suggestion: null,
      source: null,
      nationalValue: null,
      localValue: null,
    });
    return;
  }

  const row = await prisma.referencePerformance.findUnique({
    where: {
      process_activity_specialty: {
        process,
        activity,
        specialty,
      },
    },
  });

  res.json({
    activity,
    process,
    specialty,
    suggestion: row?.localValue ?? row?.nationalValue ?? null,
    source: row?.localValue != null ? 'local' : row?.nationalValue != null ? 'national' : null,
    nationalValue: row?.nationalValue ?? null,
    localValue: row?.localValue ?? null,
    notes: row?.notes ?? null,
  });
});

app.get('/api/notifications', async (req, res) => {
  if (!requireAuth(req, res)) return;

  const where = isPrivilegedRole(req.authUser.role)
    ? { OR: [{ destinationRole: req.authUser.role }, { userId: req.authUser.id }] }
    : { OR: [{ destinationRole: req.authUser.role }, { userId: req.authUser.id }] };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  res.json(
    notifications.map((item) => ({
      id: item.id,
      agendaId: item.agendaId,
      destinoRol: item.destinationRole,
      texto: item.text,
      leida: item.read,
      fecha: item.createdAt.toISOString(),
    }))
  );
});

app.get('/api/services/:serviceId/shift-roster', async (req, res) => {
  if (!requireAuth(req, res)) return;
  const { serviceId } = req.params;
  if (!isPrivilegedRole(req.authUser.role) && !req.authUser.serviceIds?.includes(serviceId)) {
    res.status(403).json({ error: 'No autorizado para el turno de este servicio.' });
    return;
  }

  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const from = parseOptionalDate(req.query.from) ?? defaultFrom;
  const to = parseOptionalDate(req.query.to) ?? defaultTo;

  const rotations = await prisma.shiftRotation.findMany({
    where: { serviceId, active: true },
    include: { members: true, overrides: true },
  });

  // Turnos fijos semanales cargados en la agenda (bloques isShift, ej. "Turno Hospitalizados" los
  // miércoles): se muestran en el calendario en cada fecha de ese día de semana, tomando la
  // agenda del servicio vigente en esa fecha (la 2026 hasta diciembre, la 2027 desde enero).
  // Son de solo lectura aquí — se editan en la agenda, no en las rotaciones.
  const agendasServicio = await prisma.agenda.findMany({
    where: {
      serviceId,
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: to } }] },
        { OR: [{ validTo: null }, { validTo: { gte: from } }] },
      ],
    },
    select: { id: true, externalId: true, validFrom: true, validTo: true, planningPeriod: true },
  });
  const turnosFijos = agendasServicio.length
    ? await prisma.agendaBlock.findMany({
        where: { agendaId: { in: agendasServicio.map((a) => a.id) }, isShift: true },
        select: { agendaId: true, day: true, startMinutes: true, durationMinutes: true, activity: true, professional: { select: { id: true, name: true } } },
      })
    : [];
  const DIA_POR_JS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  // Agendas vigentes en esa fecha. Un servicio puede tener varias agendas en el mismo periodo
  // (ej. Ginecología y Obstetricia): se consideran todas las del periodo más reciente.
  const agendasVigentesEn = (date) => {
    const vigentes = agendasServicio.filter((a) => (!a.validFrom || a.validFrom <= date) && (!a.validTo || a.validTo >= date));
    if (!vigentes.length) return new Set();
    const periodoMax = Math.max(...vigentes.map((a) => a.planningPeriod));
    return new Set(vigentes.filter((a) => a.planningPeriod === periodoMax).map((a) => a.id));
  };
  const puestosFijos = Array.from(new Set(turnosFijos.map((b) => b.activity || 'Turno')));

  const days = [];
  for (let t = dateOnlyUTC(from); t <= dateOnlyUTC(to); t += 24 * 60 * 60 * 1000) {
    const date = new Date(t);
    const agendasDia = agendasVigentesEn(date);
    const fijos = agendasDia.size
      ? turnosFijos
          .filter((b) => agendasDia.has(b.agendaId) && b.day === DIA_POR_JS[date.getUTCDay()])
          .map((b) => ({
            unidad: 'Agenda',
            puesto: b.activity || 'Turno',
            startMinutes: b.startMinutes,
            durationMinutes: b.durationMinutes,
            professionalId: b.professional.id,
            professionalName: b.professional.name,
            esSustitucion: false,
            tramoSplit: null,
            origen: 'agenda',
            agendaId: agendasServicio.find((x) => x.id === b.agendaId)?.externalId || null,
          }))
      : [];
    const entries = fijos.concat(rotations.flatMap((rotation) => {
      const resolved = resolveShiftForDate(rotation, date);
      return resolved.map((r) => ({
        unidad: rotation.unidad,
        puesto: rotation.puesto,
        startMinutes: r.startMinutes,
        durationMinutes: r.durationMinutes,
        professionalId: r.professionalId,
        professionalName: r.professionalName,
        esSustitucion: r.isOverride,
        tramoSplit: r.tramoSplit ?? null,
      }));
    }));
    days.push({ date: date.toISOString().slice(0, 10), entries });
  }

  const windowStart = new Date(dateOnlyUTC(now) - 30 * 24 * 60 * 60 * 1000);
  const countsMap = new Map();
  for (let t = dateOnlyUTC(windowStart); t <= dateOnlyUTC(now); t += 24 * 60 * 60 * 1000) {
    const date = new Date(t);
    for (const rotation of rotations) {
      const resolved = resolveShiftForDate(rotation, date);
      for (const r of resolved) {
        if (!r.professionalName) continue;
        countsMap.set(r.professionalName, (countsMap.get(r.professionalName) || 0) + 1);
      }
    }
  }

  // Proyección de agenda efectiva: para cada profesional de la rotación, cruza su plantilla de
  // jornada (AgendaBlock, por día de semana, sin bloques de turno fijo) contra las fechas reales
  // en que el ciclo calculado le pone turno — asume que un día con turno de 24h desplaza por
  // completo la jornada de ese mismo día. No modifica AgendaBlock ni la jornada en absoluto,
  // es una lectura cruzada de dos datos que ya existen por separado.
  const WEEKDAY_BY_JS_DAY = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: null };
  const professionalIds = new Set();
  const nombrePorId = new Map();
  for (const rotation of rotations) {
    for (const m of rotation.members) {
      if (m.professionalId) {
        professionalIds.add(m.professionalId);
        nombrePorId.set(m.professionalId, m.professionalName);
      }
    }
    for (const o of rotation.overrides) {
      if (o.professionalId) {
        professionalIds.add(o.professionalId);
        nombrePorId.set(o.professionalId, o.professionalName);
      }
      if (o.splitProfessionalId) {
        professionalIds.add(o.splitProfessionalId);
        nombrePorId.set(o.splitProfessionalId, o.splitProfessionalName);
      }
    }
  }

  const proyeccion = [];
  if (professionalIds.size > 0) {
    const blocks = await prisma.agendaBlock.findMany({
      where: { professionalId: { in: [...professionalIds] }, isShift: false },
      select: { professionalId: true, day: true, startMinutes: true, durationMinutes: true },
    });
    // Bloques de jornada por profesional y día de semana (lista, no solo el total — se necesita
    // el horario exacto de cada bloque para calcular superposición real contra el turno).
    const jornadaPorDiaPorProf = new Map();
    for (const b of blocks) {
      if (!jornadaPorDiaPorProf.has(b.professionalId)) jornadaPorDiaPorProf.set(b.professionalId, new Map());
      const porDia = jornadaPorDiaPorProf.get(b.professionalId);
      if (!porDia.has(b.day)) porDia.set(b.day, []);
      porDia.get(b.day).push({ startMinutes: b.startMinutes, durationMinutes: b.durationMinutes });
    }

    const acumulador = new Map();
    const dayIndexFrom = dateOnlyUTC(from) / 86400000;
    const dayIndexTo = dateOnlyUTC(to) / 86400000;

    // Cuántas veces cae cada día de la semana dentro del rango — se usa para promediar la
    // pérdida mensual por bloque a una cifra "semanal" comparable con la plantilla de jornada.
    const weekdayOccurrences = {};
    for (let t = dateOnlyUTC(from); t <= dateOnlyUTC(to); t += 24 * 60 * 60 * 1000) {
      const weekday = WEEKDAY_BY_JS_DAY[new Date(t).getUTCDay()];
      if (weekday) weekdayOccurrences[weekday] = (weekdayOccurrences[weekday] || 0) + 1;
    }

    // Pérdida acumulada por bloque específico (mismo día/horario/duración de la plantilla), para
    // que el frontend pueda mostrar cupos/horas "efectivos" desglosados por prestación y no solo
    // como un total por profesional.
    const perdidaPorBloqueAcc = new Map(); // key: profId|||dia|||startMinutes -> minutos totales perdidos en el rango
    const perdidaPorBloqueMeta = new Map(); // misma key -> durationMinutes original del bloque (solo para mostrar)

    // Nominal: total de horas de jornada que la plantilla semanal produciría en el rango, sin
    // relación al turno — independiente de la superposición.
    for (let t = dateOnlyUTC(from); t <= dateOnlyUTC(to); t += 24 * 60 * 60 * 1000) {
      const weekday = WEEKDAY_BY_JS_DAY[new Date(t).getUTCDay()];
      for (const profId of professionalIds) {
        const bloquesDia = weekday ? (jornadaPorDiaPorProf.get(profId)?.get(weekday) || []) : [];
        const minutos = bloquesDia.reduce((s, b) => s + b.durationMinutes, 0);
        if (!acumulador.has(profId)) acumulador.set(profId, { nominal: 0, perdidas: 0, detalle: [] });
        acumulador.get(profId).nominal += minutos;
      }
    }

    // Perdidas: superposición real de minutos entre el turno (que puede cruzar medianoche, ej.
    // 12h nocturno) y cada bloque de jornada individual — un turno diurno de 12h solo afecta el
    // mismo día; uno nocturno de 12h típicamente afecta la mañana del día SIGUIENTE, no el día
    // en que empieza. Se recorre un día extra antes de "from" para capturar un turno que haya
    // empezado el día anterior y siga vigente al entrar al rango.
    for (let dayIndex = dayIndexFrom - 1; dayIndex <= dayIndexTo; dayIndex += 1) {
      const date = new Date(dayIndex * 86400000);
      for (const rotation of rotations) {
        if (!rotation.affectsJornada) continue;
        const resueltos = resolveShiftForDate(rotation, date);
        for (const resolved of resueltos) {
          if (!resolved?.professionalId) continue;
          const profId = resolved.professionalId;
          // Cada sub-turno (día/noche si hubo split) trae su propio horario — ya no se asume
          // que todos duran lo mismo que la rotación base (24h).
          const turnoAbsStart = dayIndex * 1440 + resolved.startMinutes;
          const turnoAbsEnd = turnoAbsStart + resolved.durationMinutes;

          // El turno puede superponerse con la jornada del mismo día (dayIndex) o del día
          // siguiente (dayIndex+1) si cruza medianoche.
          for (const diaAfectado of [dayIndex, dayIndex + 1]) {
            if (diaAfectado < dayIndexFrom || diaAfectado > dayIndexTo) continue;
            const weekday = WEEKDAY_BY_JS_DAY[new Date(diaAfectado * 86400000).getUTCDay()];
            if (!weekday) continue;
            const bloquesDia = jornadaPorDiaPorProf.get(profId)?.get(weekday) || [];
            let perdidasEseDia = 0;
            for (const b of bloquesDia) {
              const blockAbsStart = diaAfectado * 1440 + b.startMinutes;
              const blockAbsEnd = blockAbsStart + b.durationMinutes;
              const overlap = Math.min(turnoAbsEnd, blockAbsEnd) - Math.max(turnoAbsStart, blockAbsStart);
              if (overlap > 0) {
                perdidasEseDia += overlap;
                // La clave NO incluye la duración del bloque: el frontend recalcula bloques
                // "efectivos" con duración reducida y necesita poder volver a encontrar la misma
                // entrada usando esa duración ya ajustada, así que el bloque se identifica solo
                // por profesional + día + hora de inicio (suficiente en la práctica: un mismo
                // profesional no tiene dos bloques distintos que empiecen exactamente a la misma
                // hora el mismo día de la semana).
                const bloqueKey = `${profId}|||${weekday}|||${b.startMinutes}`;
                perdidaPorBloqueAcc.set(bloqueKey, (perdidaPorBloqueAcc.get(bloqueKey) || 0) + overlap);
                if (!perdidaPorBloqueMeta.has(bloqueKey)) perdidaPorBloqueMeta.set(bloqueKey, b.durationMinutes);
              }
            }
            if (perdidasEseDia > 0) {
              if (!acumulador.has(profId)) acumulador.set(profId, { nominal: 0, perdidas: 0, detalle: [] });
              const acc = acumulador.get(profId);
              acc.perdidas += perdidasEseDia;
              acc.detalle.push({
                date: new Date(diaAfectado * 86400000).toISOString().slice(0, 10),
                weekday,
                horas: Math.round((perdidasEseDia / 60) * 10) / 10,
              });
            }
          }
        }
      }
    }

    // Reagrupa la pérdida acumulada por bloque (clave profId|||dia|||inicio|||duracion) en un
    // arreglo por profesional, promediando por cuántas veces cayó ese día de semana en el rango
    // para obtener una cifra "por semana" directamente comparable a la duración del bloque en
    // la plantilla de jornada.
    const perdidaPorBloquePorProf = new Map();
    for (const [key, minutosTotales] of perdidaPorBloqueAcc) {
      const [profId, dia, startMinutesStr] = key.split('|||');
      const ocurrencias = weekdayOccurrences[dia] || 1;
      if (!perdidaPorBloquePorProf.has(profId)) perdidaPorBloquePorProf.set(profId, []);
      perdidaPorBloquePorProf.get(profId).push({
        dia,
        inicioMin: Number(startMinutesStr),
        duracionMin: perdidaPorBloqueMeta.get(key) ?? null,
        minutosPerdidosPromedioSemanal: Math.round(minutosTotales / ocurrencias),
      });
    }

    for (const [profId, acc] of acumulador) {
      if (acc.nominal === 0 && acc.perdidas === 0) continue;
      proyeccion.push({
        professionalId: profId,
        professionalName: nombrePorId.get(profId) || '(desconocido)',
        horasJornadaNominal: Math.round((acc.nominal / 60) * 10) / 10,
        horasPerdidasPorTurno: Math.round((acc.perdidas / 60) * 10) / 10,
        horasEfectivas: Math.round(((acc.nominal - acc.perdidas) / 60) * 10) / 10,
        detalle: acc.detalle,
        perdidaPorBloque: perdidaPorBloquePorProf.get(profId) || [],
      });
    }
    proyeccion.sort((a, b) => b.horasPerdidasPorTurno - a.horasPerdidasPorTurno);
  }

  res.json({
    unidades: Array.from(new Set(rotations.map((r) => r.unidad))),
    puestos: Array.from(new Set([...rotations.map((r) => r.puesto), ...puestosFijos])),
    puestosFijosAgenda: puestosFijos,
    dias: days,
    turnosUltimos30Dias: Array.from(countsMap.entries()).map(([professionalName, count]) => ({ professionalName, count })),
    proyeccion,
    rotaciones: rotations.map((r) => ({
      id: r.id,
      unidad: r.unidad,
      puesto: r.puesto,
      cycleDays: r.cycleDays,
      anchorDate: r.anchorDate.toISOString().slice(0, 10),
      startMinutes: r.startMinutes,
      durationMinutes: r.durationMinutes,
      affectsJornada: r.affectsJornada,
      members: [...r.members].sort((a, b) => a.position - b.position).map((m) => ({
        position: m.position,
        professionalId: m.professionalId,
        professionalName: m.professionalName,
      })),
      overrides: r.overrides.map((o) => ({
        id: o.id,
        date: o.date.toISOString().slice(0, 10),
        professionalId: o.professionalId,
        professionalName: o.professionalName,
        note: o.note,
      })),
    })),
  });
});

// El frontend siempre maneja el id "público" de un profesional (externalId, o el id interno si
// no tiene uno) — nunca el id interno de Prisma en crudo. Como ShiftRotationMember/Override
// referencian AgendaProfessional.id (el interno) por FK, hay que resolverlo igual que en
// resolveProfessionalOr404 antes de guardar, o la constraint de FK falla.
async function resolveInternalProfessionalId(tx, professionalIdOrExternal) {
  if (!professionalIdOrExternal) return null;
  const professional = await tx.agendaProfessional.findFirst({
    where: { OR: [{ id: String(professionalIdOrExternal) }, { externalId: String(professionalIdOrExternal) }] },
  });
  return professional?.id ?? null;
}

function canManageShiftRoster(req, res, serviceId) {
  if (!requireRoles(req, res, ['jefe_servicio', 'admin'])) return false;
  if (!isPrivilegedRole(req.authUser.role) && !req.authUser.serviceIds?.includes(serviceId)) {
    res.status(403).json({ error: 'No autorizado para el turno de este servicio.' });
    return false;
  }
  return true;
}

app.post('/api/services/:serviceId/shift-rotations', async (req, res) => {
  const { serviceId } = req.params;
  if (!canManageShiftRoster(req, res, serviceId)) return;

  const unidad = typeof req.body?.unidad === 'string' ? req.body.unidad.trim() : '';
  const puesto = typeof req.body?.puesto === 'string' ? req.body.puesto.trim() : '';
  const cycleDays = Number(req.body?.cycleDays);
  const anchorDate = parseOptionalDate(req.body?.anchorDate);
  const members = Array.isArray(req.body?.members) ? req.body.members : [];
  if (!unidad || !puesto || !Number.isInteger(cycleDays) || cycleDays < 1 || !anchorDate) {
    res.status(400).json({ error: 'unidad, puesto, cycleDays y anchorDate son obligatorios.' });
    return;
  }

  try {
    const rotation = await prisma.$transaction(async (tx) => {
      const created = await tx.shiftRotation.create({
        data: {
          serviceId,
          unidad,
          puesto,
          cycleDays,
          anchorDate,
          startMinutes: Number.isFinite(Number(req.body?.startMinutes)) ? Number(req.body.startMinutes) : 480,
          durationMinutes: Number.isFinite(Number(req.body?.durationMinutes)) ? Number(req.body.durationMinutes) : 1440,
          affectsJornada: req.body?.affectsJornada !== undefined ? Boolean(req.body.affectsJornada) : true,
        },
      });
      for (const m of members) {
        await tx.shiftRotationMember.create({
          data: {
            rotationId: created.id,
            position: Number(m.position),
            professionalId: await resolveInternalProfessionalId(tx, m.professionalId),
            professionalName: String(m.professionalName || '').trim(),
          },
        });
      }
      return created;
    });
    res.status(201).json({ id: rotation.id });
  } catch (error) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Ya existe una rotación para esa unidad y puesto en este servicio.' });
      return;
    }
    throw error;
  }
});

app.put('/api/services/:serviceId/shift-rotations/:rotationId', async (req, res) => {
  const { serviceId, rotationId } = req.params;
  if (!canManageShiftRoster(req, res, serviceId)) return;

  const existing = await prisma.shiftRotation.findUnique({ where: { id: rotationId } });
  if (!existing || existing.serviceId !== serviceId) {
    res.status(404).json({ error: 'Rotación no encontrada.' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.shiftRotation.update({
      where: { id: rotationId },
      data: {
        unidad: typeof req.body?.unidad === 'string' ? req.body.unidad.trim() || existing.unidad : existing.unidad,
        puesto: typeof req.body?.puesto === 'string' ? req.body.puesto.trim() || existing.puesto : existing.puesto,
        cycleDays: Number.isInteger(Number(req.body?.cycleDays)) && Number(req.body?.cycleDays) > 0 ? Number(req.body.cycleDays) : existing.cycleDays,
        anchorDate: parseOptionalDate(req.body?.anchorDate) ?? existing.anchorDate,
        startMinutes: Number.isFinite(Number(req.body?.startMinutes)) ? Number(req.body.startMinutes) : existing.startMinutes,
        durationMinutes: Number.isFinite(Number(req.body?.durationMinutes)) ? Number(req.body.durationMinutes) : existing.durationMinutes,
        active: req.body?.active !== undefined ? Boolean(req.body.active) : existing.active,
        affectsJornada: req.body?.affectsJornada !== undefined ? Boolean(req.body.affectsJornada) : existing.affectsJornada,
      },
    });
    if (Array.isArray(req.body?.members)) {
      await tx.shiftRotationMember.deleteMany({ where: { rotationId } });
      for (const m of req.body.members) {
        await tx.shiftRotationMember.create({
          data: {
            rotationId,
            position: Number(m.position),
            professionalId: await resolveInternalProfessionalId(tx, m.professionalId),
            professionalName: String(m.professionalName || '').trim(),
          },
        });
      }
    }
  });

  res.json({ ok: true });
});

app.delete('/api/services/:serviceId/shift-rotations/:rotationId', async (req, res) => {
  const { serviceId, rotationId } = req.params;
  if (!canManageShiftRoster(req, res, serviceId)) return;

  const existing = await prisma.shiftRotation.findUnique({ where: { id: rotationId } });
  if (!existing || existing.serviceId !== serviceId) {
    res.status(404).json({ error: 'Rotación no encontrada.' });
    return;
  }
  await prisma.shiftRotation.update({ where: { id: rotationId }, data: { active: false } });
  res.status(204).end();
});

app.post('/api/services/:serviceId/shift-rotations/:rotationId/overrides', async (req, res) => {
  const { serviceId, rotationId } = req.params;
  if (!canManageShiftRoster(req, res, serviceId)) return;

  const existing = await prisma.shiftRotation.findUnique({ where: { id: rotationId } });
  if (!existing || existing.serviceId !== serviceId) {
    res.status(404).json({ error: 'Rotación no encontrada.' });
    return;
  }
  const date = parseOptionalDate(req.body?.date);
  const professionalName = typeof req.body?.professionalName === 'string' ? req.body.professionalName.trim() : '';
  if (!date || !professionalName) {
    res.status(400).json({ error: 'date y professionalName son obligatorios.' });
    return;
  }

  const resolvedProfessionalId = await resolveInternalProfessionalId(prisma, req.body?.professionalId);

  // Cobertura dividida (feriado legal cubierto por 2 personas, día/noche): splitProfessionalName
  // es opcional — si viene, el override representa dos sub-turnos de 12h en vez de reemplazar el
  // turno completo de la rotación por una sola persona.
  const splitProfessionalName = typeof req.body?.splitProfessionalName === 'string' ? req.body.splitProfessionalName.trim() : '';
  const resolvedSplitProfessionalId = splitProfessionalName
    ? await resolveInternalProfessionalId(prisma, req.body?.splitProfessionalId)
    : null;

  const override = await prisma.shiftRotationOverride.upsert({
    where: { rotationId_date: { rotationId, date } },
    create: {
      rotationId,
      date,
      professionalId: resolvedProfessionalId,
      professionalName,
      note: typeof req.body?.note === 'string' ? req.body.note.trim() || null : null,
      splitProfessionalId: resolvedSplitProfessionalId,
      splitProfessionalName: splitProfessionalName || null,
    },
    update: {
      professionalId: resolvedProfessionalId,
      professionalName,
      note: typeof req.body?.note === 'string' ? req.body.note.trim() || null : null,
      splitProfessionalId: resolvedSplitProfessionalId,
      splitProfessionalName: splitProfessionalName || null,
    },
  });
  res.status(201).json({ id: override.id });
});

app.delete('/api/services/:serviceId/shift-rotations/:rotationId/overrides/:overrideId', async (req, res) => {
  const { serviceId, rotationId, overrideId } = req.params;
  if (!canManageShiftRoster(req, res, serviceId)) return;

  const rotation = await prisma.shiftRotation.findUnique({ where: { id: rotationId } });
  if (!rotation || rotation.serviceId !== serviceId) {
    res.status(404).json({ error: 'Rotación no encontrada.' });
    return;
  }
  const override = await prisma.shiftRotationOverride.findUnique({ where: { id: overrideId } });
  if (!override || override.rotationId !== rotationId) {
    res.status(404).json({ error: 'Sustitución no encontrada.' });
    return;
  }
  await prisma.shiftRotationOverride.delete({ where: { id: overrideId } });
  res.status(204).end();
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, host, () => {
  console.log(`API listening on http://${host}:${port}`);
});

// Revisa vencimientos de vigencia al iniciar y luego cada 6 horas — suficiente para un
// aviso que solo necesita precisión de día, sin depender de un cron externo.
checkVigenciaAlerts();
setInterval(checkVigenciaAlerts, 6 * 60 * 60 * 1000);
