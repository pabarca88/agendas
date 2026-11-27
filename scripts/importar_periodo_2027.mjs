// Carga las agendas del periodo de programación 2027 desde las planillas de la carpeta
// "Programación 2027\Agendas de Especialidades 2027", como agendas NUEVAS (planningPeriod 2027)
// de los servicios existentes. Las agendas 2026 no se tocan.
//
// Uso:
//   node scripts/importar_periodo_2027.mjs --carpeta "<ruta>"            simulación (no guarda)
//   node scripts/importar_periodo_2027.mjs --carpeta "<ruta>" --aplicar  guarda en la base
//
// Cada actividad de la planilla se resuelve contra el catálogo (profesión + especialidad del
// profesional, con 'No Aplica' como transversal) en este orden:
//   1. texto exacto  2. mismo texto ignorando mayúsculas/tildes/espacios  3. tabla EQUIVALENCIAS
// Si alguna no resuelve, no se guarda nada. La simulación imprime la tabla de equivalencias
// usada para que se revise antes de aplicar.
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { parseAgendaWorkbook } from '../server/lib/agendaImport.js';
import { normalizeText } from '../server/lib/hr.js';

const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
// Recrea una agenda 2027 que ya existe, solo si nadie la ha editado en la plataforma (sin auditoría).
const REEMPLAZAR = args.includes('--reemplazar');
const CARPETA = args[args.indexOf('--carpeta') + 1];
// Procesa solo las planillas cuya ruta contiene este texto (ej. --solo MFyR), para cargar un
// servicio nuevo sin que las agendas 2027 ya cargadas de los otros den error de duplicado.
const SOLO = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null;
if (!CARPETA || !fs.existsSync(CARPETA)) {
  console.error('Falta --carpeta con la ruta de "Agendas de Especialidades 2027".');
  process.exit(1);
}

// --periodo 2026 carga en el periodo vigente un servicio que nunca tuvo agenda (con la misma
// vigencia agosto-diciembre del resto de las agendas 2026); por defecto, 2027.
const PERIODO = args.includes('--periodo') ? Number(args[args.indexOf('--periodo') + 1]) : 2027;
const VIGENCIA = PERIODO === 2026
  ? { desde: '2026-08-01', hasta: '2026-12-31', label: 'Agosto - Diciembre 2026' }
  : { desde: `${PERIODO}-01-01`, hasta: `${PERIODO}-12-31`, label: `Enero - Diciembre ${PERIODO}` };
const MEDICO = 'Médico(a) Cirujano(a)';
const ENFERMERO = 'Enfermero(a)';

// Planillas -> servicios destino. `destino(prof)` decide a qué servicio va cada hoja (el archivo
// de Gine-Obstetricia trae ambos servicios mezclados) y `especialidad(prof)` la especialidad del
// catálogo de ese profesional (null = la del servicio).
const ARCHIVOS = [
  {
    archivo: 'Cuidados Paliativos/AGENDAS CP dic 2026.xlsx',
    destino: () => 'Cuidados Paliativos',
    profesion: (pr) => (/ENFERM/.test(normalizeText(pr.especialidad)) ? ENFERMERO : MEDICO),
    especialidad: (pr) => (/FAMILIAR/.test(normalizeText(pr.especialidad)) ? 'MEDICINA FAMILIAR' : null),
  },
  {
    archivo: 'Ginecologia y Obstetricia/Agenda Gine - Obste Médicos Diciembre 2026.xlsx',
    destino: (pr) => (/OBSTETRICIA/.test(normalizeText(pr.especialidad)) ? 'Obstetricia' : 'Ginecología'),
    profesion: () => MEDICO,
    especialidad: () => null,
  },
  {
    archivo: 'Neonatologia/Programación 2027 UPCN.xlsx',
    destino: () => 'Neonatología',
    profesion: () => MEDICO,
    especialidad: (pr) => (/PEDIATRIA/.test(normalizeText(pr.especialidad)) ? 'PEDIATRÍA' : null),
  },
  {
    archivo: 'MFyR/Agenda_Medica_MFYR_2027.xlsx',
    destino: () => 'Medicina Física y Rehabilitación',
    profesion: () => MEDICO,
    especialidad: () => null,
  },
  {
    archivo: 'Cirugia Adulto/AGENDA 12.0 CIRUGIA ADULTO.xlsx',
    destino: () => 'Cirugía Adulto',
    profesion: () => MEDICO,
    especialidad: () => null,
    // Mismo nombre de catálogo que usa cirugiaadulto-2026 para estos procedimientos.
    renombrar: (texto) => ({
      'PROCEDIMIENTO: GASTRODUODENOSCOPIA (EDA)': 'Gastroduodenoscopía (incluye esofagoscopía)',
      'PROCEDIMIENTO: COLONOSCOPIA': 'Colonoscopía larga (incluye sigmoidoscopía y ....)',
    })[normalizeText(texto).replace(/\s+/g, ' ')],
  },
  // Cirugía Infantil = Cirugía Pediátrica. Sin agenda 2026 en la plataforma: se carga con
  // --periodo 2026 desde "Programación 2026\Agendas Especialidades 2026" (versión de sept. 2026).
  {
    archivo: 'Cirugía Infantil/Cirugia Pediatrica 2026.xlsx',
    destino: () => 'Cirugía Pediátrica',
    servicioNuevo: { specialtyCatalog: 'CIRUGÍA PEDIÁTRICA', base: 'cirugiapediatrica' },
    profesion: () => MEDICO,
    especialidad: () => null,
  },
  // CESAM Centro: 4 planillas (médica/profesionales × adulto/infantoadolescente) en una sola agenda
  // por dispositivo, igual que cesamcentro-2026. La hoja no trae la profesión de los no médicos:
  // se toma de PROFESION_CESAM_CENTRO (agenda 2026 + confirmación del usuario para los nuevos).
  ...[
    ['Programación médica 2027 Cesam centro adultos - Enero.xlsx', true, false],
    ['Programacion médica 2027 Cesam Centro Infantoadolescente - Enero.xlsx', true, true],
    ['Programación profesionales 2027 Cesam Centro Adulto - Enero.xlsx', false, false],
    ['Programación profesionales 2027 Cesam Centro Infantoadolescente - Enero.xlsx', false, true],
  ].map(([archivo, medica, infanto]) => ({
    archivo: `Salud Mental/Cesam Centro/${archivo}`,
    destino: () => 'Salud Mental CESAM Centro',
    profesion: (pr) => (medica ? MEDICO : PROFESION_CESAM_CENTRO[normalizeText(pr.nombre)] ?? null),
    especialidad: () => (infanto ? 'PSIQUIATRÍA PEDIÁTRICA Y DE LA ADOLESCENCIA' : null),
    renombrar: RENOMBRAR_CESAM,
  })),
  // CESAM Las Compañías: la hoja trae la profesión en "especialidad". Como en cesamcias-2026, solo
  // profesionales: PROGRAMACION TENS.xlsx y la trabajadora comunitaria quedan fuera.
  ...[
    ['PROGRAMACION MEDICA 2027.xlsx', true],
    ['2027 PROG PROFESIONALES.xlsx', false],
  ].map(([archivo, medica]) => ({
    archivo: `Salud Mental/Cesam Las compañías/${archivo}`,
    destino: () => 'Salud Mental CESAM Las Compañías',
    profesion: (pr) => (medica ? MEDICO : profesionDesdeEspecialidad(pr.especialidad)),
    especialidad: (pr) => (medica && /PEDIATRICA/.test(normalizeText(pr.especialidad)) ? 'PSIQUIATRÍA PEDIÁTRICA Y DE LA ADOLESCENCIA' : null),
    excluir: (pr) => /COMUNITARI/.test(normalizeText(pr.especialidad)),
    renombrar: RENOMBRAR_CESAM_LC,
  })),
];

// Las Compañías: textos que no existen para esa profesión. `R(...)` = criterio (se marca ⚠ REVISAR).
// Médicos: ingreso → mismo criterio que cesamcias-2026; control SM → control de especialidad.
const R = (a) => ({ actividad: a, revisar: true });
function RENOMBRAR_CESAM_LC(texto, profesion) {
  const t = normalizeText(texto).replace(/\s+/g, ' ');
  const med = profesion === MEDICO;
  const reglas = med ? {
    'CONSULTA INGRESO EQUIPO DE SALUD MENTAL': R('Consulta Ingreso Hospital de Día y UHCIP (SM)'),
    'CONSULTA CONTROL PRESENCIAL (SM)': 'Consulta Control de especialidad Presencial',
    'CONSULTA CONTROL SALUD MENTAL': 'Consulta Control de especialidad Presencial',
    'VISITA INTEGRAL DE SALUD MENTAL': 'Visita Integral de Salud Mental (SM)',
    'DERIVACION ASISTIDA SM': R('Gestión de Casos'),
    'GESTION TERAPEUTICA': R('Gestión de Casos'),
    'ATENCION DE ENLACE O INTERCONSULTA A SALA': R('Interconsulta'),
  } : {
    'VISITA INTEGRAL DE SALUD MENTAL': 'Visita Integral de Salud Mental (SM)',
    'CONSULTA ABREVIADA': 'Consulta Abreviada no Médica',
    'CONSULTA ABREVIADA NO MEDICA': profesion === 'Terapeuta Ocupacional' ? R('Consulta Control  Presencial (SM)')
      : profesion === 'Psicopedagogo(a)' ? R('Consulta Control Salud Mental') : undefined,
    'GESTION TERAPEUTICA': profesion === ENFERMERO || profesion === 'Psicopedagogo(a)' ? R('Gestión de Casos SM') : undefined,
    'TELEMEDICINA: TELECONSULTA CONTROL SALUD MENTAL': profesion === ENFERMERO ? 'Telemedicina: Teleconsulta Control' : 'Teleconsulta Control Salud Mental',
    'TELECONSULTA CONTROL SALUD MENTAL': profesion === ENFERMERO ? 'Telemedicina: Teleconsulta Control' : undefined,
  };
  return reglas[t] ?? RENOMBRAR_CESAM(texto, profesion);
}

function profesionDesdeEspecialidad(esp) {
  const t = normalizeText(esp);
  if (/TERAPEUTA OCUPACIONAL/.test(t)) return 'Terapeuta Ocupacional';
  if (/TRABAJADOR SOCIAL|ASISTENTE/.test(t)) return 'Asistente Social';
  if (/PSICOPEDAGOG/.test(t)) return 'Psicopedagogo(a)';
  if (/PSICOLOG/.test(t)) return 'Psicólogo(a) Clínica';
  if (/ENFERMER/.test(t)) return ENFERMERO;
  return null;
}

// CESAM: textos de planilla → actividad del catálogo, con el mismo criterio de cesamcentro-2026.
// Se aplica ANTES de buscar en el catálogo (aunque el texto exista tal cual, ej. Visita Domiciliaria).
// Valor: texto, o función (profesión) → texto | undefined (undefined = sin cambio).
function RENOMBRAR_CESAM(texto, profesion) {
  const med = profesion === MEDICO;
  const t = normalizeText(texto).replace(/\s+/g, ' ');
  const reglas = {
    // Criterio 2026 confirmado para 2027: visita domiciliaria → visita integral.
    'VISITA DOMICILIARIA': 'Visita Integral de Salud Mental (SM)',
    'TRABAJO SECTORIAL': 'Trabajo sectorial (SM)',
    'TRABAJO INTERSECTORIAL': 'Trabajo intersectorial (SM)',
    'CONSULTORIA CON APS O MACRORRED': med ? 'Consultoría de Salud Mental' : 'Consultoría en Salud Mental (Presencial)',
    'CONSULTA NUEVA PRESENCIAL': med ? undefined : 'Consulta Nueva Presencial (SM)',
    'CONSULTA CONTROL PRESENCIAL': med ? undefined : profesion === 'Psicopedagogo(a)' ? 'Consulta Control Salud Mental' : 'Consulta Control  Presencial (SM)',
    'TELEMEDICINA: TELECONSULTA CONTROL': med || profesion === ENFERMERO ? undefined : 'Teleconsulta Control Salud Mental',
    'INTERVENCION PSICOSOCIAL GRUPAL (SM) (INCLUYE PRESENCIAL Y REMOTO)': med ? undefined : 'Intervención Psicosocial Grupal (SM)(incluye presencial y remoto)',
    'ACTIVIDADES DE CUIDADO DEL EQUIPO (SM)': med ? undefined : 'Actividades de cuidado del equipo',
    'ACTIVIDADES ADMINISTRATIVAS': med ? undefined : 'OANC Actividades administrativas',
    'GESTION DE CASOS': med || profesion === ENFERMERO ? undefined : 'Gestión de Casos SM',
    'OTROS ACTIVIDADES CLINICAS': 'Otras Actividades Clínicas',
  };
  return reglas[t];
}

const PSICOLOGO = 'Psicólogo(a) Clínica';
const AS = 'Asistente Social';
const PROFESION_CESAM_CENTRO = Object.fromEntries(Object.entries({
  [PSICOLOGO]: ['PSICOLOGA PATRICIA CORTES RIVERA', 'MARÍA JOSÉ CAMPOS ACEVEDO', 'DANIELA CACERES GARCIA', 'CONSTANZA ARAYA DE VILLAR',
    'VALENTINA GARCÍA PINEDA', 'GERMAN RIVERA ROBLES', 'MARCELA VÁSQUEZ MACHUCA', 'Silvana Andrea Álvarez Gálvez', 'Leslie Naralit Rivera Araya',
    'María Teresa Parraguez Lira', 'Marcela Torres Olivares', 'Carolina Gutiérrez Madrigal'],
  [AS]: ['T.SOCIAL MARIA LUISA CARABANTES CASTILLO', 'Sebastián Rodrigo Araya Villegas', 'Camila Lorena Castillo Juerta', 'Carolina Alvarez Naveas'],
  'Terapeuta Ocupacional': ['KAREN SEPULVEDA', 'Cindy Castillo Cárcamo'],
  'Psicopedagogo(a)': ['Lucy Lya Nuñez Rojas'],
  [ENFERMERO]: ['Pia Vega', 'Ivis Morejón Menes'],
}).flatMap(([prof, nombres]) => nombres.map((n) => [normalizeText(n), prof])));

// Equivalencias para textos de planilla que no existen tal cual en el catálogo. Clave: texto
// normalizado (normalizeText). Valor: actividad del catálogo, o un objeto por servicio/profesión.
// `revisar: true` marca las que son criterio (no solo diferencia de escritura) para la revisión.
const TURNO = { turno: true };
const EQUIVALENCIAS = {
  'CONSULTA NUEVA PRESENCIAL': { [MEDICO]: 'Consulta Nueva de especialidad Presencial', [ENFERMERO]: 'Consulta Nueva Presencial (ESPECIALIDADES)' },
  'CONSULTA NUEVA': { [MEDICO]: 'Consulta Nueva de especialidad Presencial' },
  'CONSULTA NUEVA ESPECIALIDAD': { [MEDICO]: 'Consulta Nueva de especialidad Presencial' },
  'CONSULTA CONTROL PRESENCIAL': { [MEDICO]: 'Consulta Control de especialidad Presencial', [ENFERMERO]: 'Consulta Control  Presencial (ESPECIALIDADES)' },
  'CONSULTA CONTROL ESPECIALIDAD': { [MEDICO]: 'Consulta Control de especialidad Presencial' },
  'CONSULTA ABREVIADA': { [MEDICO]: 'Consulta Abreviada Médica Presencial', [ENFERMERO]: 'Consulta Abreviada no Médica' },
  'CONSULTA ABREVIADA /RECETAS': { [MEDICO]: 'Consulta Abreviada Médica Presencial' },
  'CONSULTA ABREVIADA/RECETAS': { [MEDICO]: 'Consulta Abreviada Médica Presencial' },
  'OTROS ACTIVIDADES CLINICAS': 'Otras Actividades Clínicas',
  'OTRAS ACTIVIDADES CLINICAS': 'Otras Actividades Clínicas',
  'OTRAS ACTIVIDADES NO CLINICAS': 'Otras Actividades No Clínicas',
  'ACTIVIDADES ADMINISTRATIVAS': { [MEDICO]: 'Otras Actividades No Clínicas', [ENFERMERO]: 'OANC Actividades administrativas', revisar: true },
  'INTERCONSULTA A SALA O ACTIVIDAD ENLACE': 'Interconsulta',
  'PROCEDIMIENTOS MEDICOS/OTROS PROFESIONALES': { [MEDICO]: 'Otros procedimientos médicos', [ENFERMERO]: 'Procedimientos No Invasivos (Propios)' },
  'PROCEDIMIENTOS MEDICOS/ OTROS PROFESIONALES': { [MEDICO]: 'Otros procedimientos médicos' },
  'COMITE CLINICO': { [MEDICO]: 'Comité Clínico', [ENFERMERO]: 'Comité clínico' },
  'REUNION CLINICA': 'Reunión Clínica',
  'REUNION TECNICO ADMINISTRATIVA': 'Reunión Técnica Administrativa',
  'REUNION TECNICA ADMINISTRATIVA': 'Reunión Técnica Administrativa',
  'REUNION TECNICO ADMINSITRATIVA': 'Reunión Técnica Administrativa',
  'GESTION DE CASOS': 'Gestión de Casos',
  'GESTION DE CASO': 'Gestión de Casos',
  'GESTION CASO CLINICO': 'Gestión de Casos',
  'GESTION CASOS CLINICOS': 'Gestión de Casos',
  'ADMINISTRATIVO JEFATURA': 'Gestión Organizacional (Administrativo/ Jefatura)',
  'GESTION JEFATURA': 'Gestión Organizacional (Administrativo/ Jefatura)',
  'GESTION ORGANIZACIONAL (ADMINISTRATIVO/JEFATURA)': 'Gestión Organizacional (Administrativo/ Jefatura)',
  'PABELLON CIRUGIA MAYOR': 'Pabellon Cirugía Mayor',
  'PABELLON CIRUGIA MAYOR AMBULATORIA': 'Pabellon Cirugía Mayor Ambulatoria',
  'TELECONSULTORIA': 'Teleconsultoria OTRAS ESPECIALIDADES',
  // --- criterio, para revisión ---
  'VISITA A SALA HOSPITALIZADO': { porServicio: { Obstetricia: 'Visita a sala Hospitalizado cama básica Adulto' }, defecto: 'Atención en sala', revisar: true },
  'VISITA SALA HOSPITALIZADO': { porServicio: { Obstetricia: 'Visita a sala Hospitalizado cama básica Adulto' }, defecto: 'Atención en sala', revisar: true },
  'VISITA PACIENTES HOSPITALIZADAS': { porServicio: { Obstetricia: 'Visita a sala Hospitalizado cama básica Adulto' }, defecto: 'Atención en sala', revisar: true },
  'EDUCACION INDIVIDUAL': { [MEDICO]: 'Otras Actividades Clínicas', [ENFERMERO]: 'Educación Individual', revisar: true },
  'PABELLON CESAREAS ELECTIVAS': { defecto: 'Pabellon Cirugía Obstétrica', revisar: true },
  'PROCEDIMIENTOS ECOGRAFICOS': { defecto: 'Ecografía Obstétrica', revisar: true },
  'PROCEDIENTO ECOGRAFIAS GINECOLOGICAS': { defecto: 'Procedimientos especialidad', revisar: true },
  'REUNION DE SERVICIO': { defecto: 'Reunión Técnica Administrativa', revisar: true },
  'ATENCION NUTRICIONAL INTENSIVA': { defecto: 'Atención en sala', revisar: true },
  // MFyR 2027: el catálogo de Fisiatría no tiene pabellón; decisión del referente (19-11-2026).
  'PABELLON CIRUGIA MENOR': { porServicio: { 'Medicina Física y Rehabilitación': 'Infiltraciones (rehabilitación)' }, revisar: true },
  'REFUERZO TURNO': { ...TURNO, revisar: true },
  'TURNO HOSPITALIZADOS': TURNO,
  'TURNO URGENCIAS': TURNO,
  'TURNO': TURNO,
};

function equivalencia(texto, profesion, servicio) {
  const e = EQUIVALENCIAS[normalizeText(texto)];
  if (e == null) return null;
  if (typeof e === 'string') return { actividad: e, revisar: false };
  if (e.turno) return { turno: true, revisar: !!e.revisar, etiqueta: String(texto).trim() };
  const actividad = e.porServicio?.[servicio] ?? e[profesion] ?? e.defecto ?? null;
  return actividad ? { actividad, revisar: !!e.revisar } : null;
}

const prisma = new PrismaClient();
async function retry(fn, label) {
  for (let i = 1; i <= 8; i++) {
    try { return await fn(); } catch (e) {
      if (!/Can't reach|P1001|P1017|connection/i.test(e.message)) throw e;
      console.log(`  (sin conexión a la base, reintento ${i} — ${label})`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw new Error(`Sin conexión a la base tras reintentos: ${label}`);
}

// ---- Cálculos derivados (mismos criterios que recomputeAgendaDerivedData en server/index.js) ----
const PROCESOS = ['Ambulatorio', 'Hospitalizado', 'Quirúrgico', 'Urgencia'];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const LABELS = [];
for (let m = 8 * 60; m < 20 * 60; m += 30) {
  const f = (x) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  LABELS.push(`${f(m)}–${f(m + 30)}`);
}
function horasYDistribucion(bloques) {
  const horas = Object.fromEntries(PROCESOS.map((p) => [p, 0]));
  const dist = Object.fromEntries(DIAS.map((d) => [d, Object.fromEntries(LABELS.map((l) => [l, 0]))]));
  for (const b of bloques) {
    if (b.isShift) continue;
    if (b.process in horas) horas[b.process] += b.durationMinutes / 60;
    if (!dist[b.day]) continue;
    LABELS.forEach((label, i) => {
      const ini = 8 * 60 + i * 30;
      const ov = Math.min(b.startMinutes + b.durationMinutes, ini + 30) - Math.max(b.startMinutes, ini);
      if (ov > 0) dist[b.day][label] += ov / 60;
    });
  }
  return { horas, dist };
}
const rendimiento = (cupos, min) => (!cupos || !min ? 0 : Math.round((cupos / (min / 60)) * 100) / 100);

// ---- 1. Leer planillas y agrupar profesionales por servicio destino ----
const porServicio = new Map(); // servicio -> [{ pr, profesion, especialidad }]
const serviciosNuevos = new Map(); // servicio -> { specialtyCatalog, base } (se crea si no existe)
const omitidas = [];
for (const cfg of ARCHIVOS.filter((c) => !SOLO || c.archivo.toLowerCase().includes(SOLO.toLowerCase()))) {
  const parsed = parseAgendaWorkbook(fs.readFileSync(path.join(CARPETA, cfg.archivo)));
  for (const o of parsed.omitidas) if (!/^\d+$/.test(o.sheet.trim()) && !/referencia/.test(o.motivo)) omitidas.push(`${cfg.archivo} › ${o.sheet}: ${o.motivo}`);
  for (const pr of parsed.profesionales) {
    if (cfg.excluir?.(pr)) { omitidas.push(`${cfg.archivo} › ${pr.sheet}: excluida (no es profesional programable)`); continue; }
    const servicio = cfg.destino(pr);
    if (!porServicio.has(servicio)) porServicio.set(servicio, []);
    porServicio.get(servicio).push({ pr, profesion: cfg.profesion(pr), especialidad: cfg.especialidad(pr), archivo: cfg.archivo, renombrar: cfg.renombrar });
    if (cfg.servicioNuevo) serviciosNuevos.set(servicio, cfg.servicioNuevo);
  }
}

// ---- 2. Resolver actividades contra el catálogo ----
const catalogo = await retry(() => prisma.catalogActivity.findMany(), 'catálogo');
const usadas = new Map(); // "origen → destino" -> { n, revisar, servicios }
const errores = [];
const plan = [];
for (const [servicioNombre, profs] of porServicio) {
  const nuevo = serviciosNuevos.get(servicioNombre);
  let servicio = await retry(() => prisma.service.findUnique({ where: { name: servicioNombre } }), 'servicio');
  if (!servicio && nuevo) servicio = { id: null, name: servicioNombre, specialtyCatalog: nuevo.specialtyCatalog, chiefName: null, crear: true };
  if (!servicio) { errores.push(`No existe el servicio "${servicioNombre}"`); continue; }
  const agenda2026 = servicio.id && PERIODO !== 2026
    ? await retry(() => prisma.agenda.findFirst({ where: { serviceId: servicio.id, planningPeriod: 2026 }, orderBy: { updatedAt: 'desc' } }), 'agenda 2026')
    : null;
  const base = (agenda2026?.externalId || nuevo?.base || servicioNombre).replace(/-20\d\d$/, '');
  const externalId = `${base}-${PERIODO}`;
  const existe = await retry(() => prisma.agenda.findUnique({ where: { externalId }, include: { _count: { select: { audits: true } } } }), 'existe');
  if (existe && !REEMPLAZAR) { errores.push(`Ya existe la agenda ${externalId} — no se duplica (usa --reemplazar para recrearla).`); continue; }
  if (existe && existe._count.audits > 0) { errores.push(`La agenda ${externalId} ya fue editada en la plataforma (${existe._count.audits} cambios) — no se reemplaza.`); continue; }

  const profesionales = [];
  for (const { pr, profesion, especialidad, renombrar } of profs) {
    if (!profesion) { errores.push(`${servicioNombre} › ${pr.nombre}: profesión desconocida`); continue; }
    const esp = especialidad || servicio.specialtyCatalog;
    const candidatos = catalogo.filter((c) => c.profession === profesion && (c.specialty === esp || c.specialty === 'No Aplica'));
    const buscar = (texto) => {
      const filas = candidatos.filter((c) => c.activity === texto || normalizeText(c.activity) === normalizeText(texto));
      filas.sort((a, b) => (a.specialty === esp ? 0 : 1) - (b.specialty === esp ? 0 : 1) || (a.process === 'Ambulatorio' ? 0 : 1) - (b.process === 'Ambulatorio' ? 0 : 1));
      return filas[0] || null;
    };
    const bloques = [];
    for (const b of pr.bloques) {
      const rn = typeof renombrar === 'function' ? renombrar(b.actividad, profesion) : undefined;
      const renombre = typeof rn === 'object' && rn ? rn.actividad : rn;
      let cat = buscar(renombre || b.actividad);
      let eq = null;
      if (renombre && cat) {
        const key = `${b.actividad}  →  ${cat.process}: ${cat.activity}`;
        const u = usadas.get(key) || { n: 0, revisar: !!rn?.revisar || /VISITA DOMICILIARIA/.test(normalizeText(b.actividad)), servicios: new Set() };
        u.n++; u.servicios.add(servicioNombre); usadas.set(key, u);
      }
      if (!cat) {
        eq = equivalencia(b.actividad, profesion, servicioNombre);
        if (eq?.actividad) cat = buscar(eq.actividad);
      }
      if (!cat && !eq?.turno) {
        errores.push(`${servicioNombre} › ${pr.nombre} (${profesion}/${esp}): "${b.actividad}"${eq ? ` → "${eq.actividad}" no existe para esa profesión/especialidad` : ' sin equivalencia'}`);
        continue;
      }
      if (eq) {
        const key = `${b.actividad}  →  ${eq.turno ? '[TURNO]' : `${cat.process}: ${cat.activity}`}`;
        const u = usadas.get(key) || { n: 0, revisar: eq.revisar, servicios: new Set() };
        u.n++; u.servicios.add(servicioNombre); usadas.set(key, u);
      }
      bloques.push(eq?.turno
        ? { day: b.dia, startMinutes: b.inicioMin, durationMinutes: b.duracionMin, process: null, activity: eq.etiqueta, isShift: true, isClinical: true, hasPerformance: false, performance: 0, box: b.box, observations: `Planilla: ${b.actividad}` }
        : { day: b.dia, startMinutes: b.inicioMin, durationMinutes: b.duracionMin, process: cat.process, activity: cat.activity, catalogActivityId: cat.id, isShift: false, isClinical: cat.isClinical, hasPerformance: cat.hasPerformance && b.cupos != null, performance: rendimiento(b.cupos, b.duracionMin), box: b.box });
    }
    profesionales.push({ pr, profesion, especialidad, bloques });
  }
  plan.push({ servicio, agenda2026, externalId, profesionales, reemplazaId: existe?.id ?? null });
}

// ---- 3. Informe ----
console.log(`\n===== PERIODO ${PERIODO} (${VIGENCIA.desde} a ${VIGENCIA.hasta}) — ${APLICAR ? 'APLICANDO' : 'SIMULACIÓN'} =====`);
for (const p of plan) {
  const nb = p.profesionales.reduce((s, x) => s + x.bloques.length, 0);
  const { horas } = horasYDistribucion(p.profesionales.flatMap((x) => x.bloques));
  const otrasEsp = p.profesionales.filter((x) => x.especialidad).map((x) => `${x.pr.nombre} (${x.especialidad})`);
  const tipos = {}; p.profesionales.forEach((x) => (tipos[x.profesion] = (tipos[x.profesion] || 0) + 1));
  console.log(`\n▶ ${p.servicio.name} → nueva agenda ${p.externalId}  [2026: ${p.agenda2026?.externalId || '—'}]`);
  console.log(`  ${p.profesionales.length} profesionales ${JSON.stringify(tipos)}, ${nb} bloques, horas ${JSON.stringify(Object.fromEntries(Object.entries(horas).map(([k, v]) => [k, Math.round(v * 10) / 10])))}`);
  if (otrasEsp.length) console.log(`  con especialidad propia: ${otrasEsp.join('; ')}`);
}
console.log('\n--- Hojas omitidas (vacías o sin formato de horario) ---');
omitidas.forEach((o) => console.log('  ' + o));
console.log('\n--- Equivalencias aplicadas (texto planilla → catálogo) [bloques] ---');
const filas = [...usadas.entries()].sort((a, b) => Number(b[1].revisar) - Number(a[1].revisar) || a[0].localeCompare(b[0]));
for (const [k, u] of filas) console.log(`  ${u.revisar ? '⚠ REVISAR ' : '          '}${k}  [${u.n}] (${[...u.servicios].join(', ')})`);
if (errores.length) {
  console.log('\n--- ERRORES (no se guarda nada) ---');
  errores.forEach((e) => console.log('  ✖ ' + e));
  process.exitCode = 1;
  await prisma.$disconnect();
  process.exit();
}

// ---- 4. Guardar ----
if (!APLICAR) {
  console.log('\nSIMULACIÓN OK: no se guardó nada. Ejecuta con --aplicar para guardar.');
  await prisma.$disconnect();
  process.exit();
}
const fecha = new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Santiago' });
await retry(() => prisma.$transaction(async (tx) => {
  for (const p of plan) {
    if (p.reemplazaId) await tx.agenda.delete({ where: { id: p.reemplazaId } });
    if (p.servicio.crear) {
      p.servicio = await tx.service.create({ data: { name: p.servicio.name, specialtyCatalog: p.servicio.specialtyCatalog } });
      console.log(`  ✔ servicio "${p.servicio.name}" creado`);
    }
    const todos = p.profesionales.flatMap((x) => x.bloques);
    const { horas, dist } = horasYDistribucion(todos);
    const agenda = await tx.agenda.create({
      data: {
        externalId: p.externalId,
        serviceId: p.servicio.id,
        serviceSpecialty: p.servicio.specialtyCatalog,
        serviceName: p.servicio.name,
        chiefName: p.agenda2026?.chiefName || p.servicio.chiefName || 'Sin jefe',
        chiefUserId: p.agenda2026?.chiefUserId ?? null,
        monthLabel: VIGENCIA.label,
        planningPeriod: PERIODO,
        validFrom: new Date(VIGENCIA.desde),
        validTo: new Date(VIGENCIA.hasta),
        status: 'borrador',
        version: 1,
        lastUpdated: BigInt(Date.now()),
        hoursJson: JSON.stringify(horas),
        distributionJson: JSON.stringify(dist),
      },
    });
    const idsUsados = new Set();
    for (const [i, x] of p.profesionales.entries()) {
      const rutDigits = x.pr.rut ? x.pr.rut.replace(/[^0-9kK]/g, '') : null;
      // Un RUT repetido en la planilla (error de digitación) no debe impedir la carga: el segundo
      // profesional usa el nombre de la hoja como identificador.
      let extId = `${p.externalId}-${rutDigits || x.pr.sheet.replace(/\W+/g, '')}`;
      if (idsUsados.has(extId)) extId = `${p.externalId}-${rutDigits || ''}-${x.pr.sheet.replace(/\W+/g, '')}-${i}`;
      idsUsados.add(extId);
      const prof = await tx.agendaProfessional.create({
        data: {
          agendaId: agenda.id,
          externalId: extId,
          name: x.pr.nombre,
          type: x.profesion,
          professionCatalog: x.profesion,
          rut: rutDigits ? rutDigits.slice(0, -1) : null,
          specialtyCatalog: x.especialidad,
          sortOrder: i,
        },
      });
      if (x.bloques.length) await tx.agendaBlock.createMany({ data: x.bloques.map((b) => ({ ...b, agendaId: agenda.id, professionalId: prof.id })) });
    }
    await tx.agendaHistory.create({
      data: {
        agendaId: agenda.id, dateLabel: fecha, action: `Creada para el periodo ${PERIODO} por importación de planilla`, userName: 'DDI', sortOrder: 0,
        comment: `Carga inicial de la programación ${PERIODO} desde la carpeta "Agendas de Especialidades ${PERIODO}".`,
      },
    });
    console.log(`  ✔ ${p.externalId} creada`);
  }
}, { maxWait: 30000, timeout: 180000 }), 'transacción');
console.log(`\nAPLICADO: agendas ${PERIODO} guardadas.`);
await prisma.$disconnect();
