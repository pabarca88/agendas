import { randomUUID } from 'crypto';

export function toAgendaStatus(value) {
  const allowed = ['borrador', 'enviada', 'aprobada', 'rechazada', 'escalada', 'subida_alma'];
  return allowed.includes(value) ? value : 'borrador';
}

export function normalizeAgendaPayload(rawAgenda) {
  const agenda = { ...rawAgenda };

  return {
    ...agenda,
    id: agenda.id,
    servicio: agenda.servicio ?? 'Servicio sin nombre',
    jefe: agenda.jefe ?? 'Sin jefe',
    mes: agenda.mes ?? 'Sin mes',
    vigenciaDesde: agenda.vigenciaDesde ?? agenda.validFrom ?? null,
    vigenciaHasta: agenda.vigenciaHasta ?? agenda.validTo ?? null,
    estado: toAgendaStatus(agenda.estado),
    version: Number(agenda.version ?? 1),
    cnePct: Number(agenda.cnePct ?? 0),
    atenciones: Number(agenda.atenciones ?? 0),
    pendienteConfirmar: Boolean(agenda.pendienteConfirmar),
    lastUpdated: Number(agenda.lastUpdated ?? Date.now()),
    resumenIA: agenda.resumenIA ?? null,
    motivoRechazo: agenda.motivoRechazo ?? null,
    historial: Array.isArray(agenda.historial) ? agenda.historial : [],
    profesionales: Array.isArray(agenda.profesionales) ? agenda.profesionales : [],
    bloquesProf: Array.isArray(agenda.bloquesProf) ? agenda.bloquesProf : [],
    horas: agenda.horas ?? {},
    distribucionHoraria: agenda.distribucionHoraria ?? {},
  };
}

export function serializeAgenda(record) {
  const professionals = [...record.professionals]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((professional) => ({
      id: professional.externalId || professional.id,
      nombre: professional.name,
      tipo: professional.type,
      nivelFormacion: professional.trainingLevel,
      esSoloTurno: professional.isShiftOnly,
      tieneTurno: professional.hasTurno,
      rut: professional.rut,
      especialidad: professional.specialtyCatalog ?? null,
    }));

  const professionalIdMap = new Map(
    record.professionals.map((professional) => [professional.id, professional.externalId || professional.id])
  );

  const history = [...record.historyEntries]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => ({
      id: entry.externalId || entry.id,
      fecha: entry.dateLabel,
      accion: entry.action,
      usuario: entry.userName,
      comentario: entry.comment ?? undefined,
    }));

  const blocks = [...record.blocks]
    .sort((a, b) => a.day.localeCompare(b.day) || a.startMinutes - b.startMinutes)
    .map((block) => ({
      id: block.externalId || block.id,
      profesionalId: professionalIdMap.get(block.professionalId) || block.professionalId,
      dia: block.day,
      inicioMin: block.startMinutes,
      duracionMin: block.durationMinutes,
      proceso: block.process,
      actividad: block.activity,
      clinica: block.isClinical,
      tieneRendimiento: block.hasPerformance,
      rendimiento: block.performance,
      box: block.box,
      observaciones: block.observations,
      esTurno: block.isShift,
    }));

  return {
    id: isNaN(Number(record.externalId)) ? record.externalId : Number(record.externalId),
    servicio: record.serviceName,
    servicioId: record.serviceId,
    jefe: record.chiefName,
    mes: record.monthLabel,
    periodo: record.planningPeriod,
    copiaDe: record.copiedFrom ?? null,
    vigenciaDesde: record.validFrom ? record.validFrom.toISOString().slice(0, 10) : null,
    vigenciaHasta: record.validTo ? record.validTo.toISOString().slice(0, 10) : null,
    estado: record.status,
    version: record.version,
    cnePct: record.cnePct,
    atenciones: record.appointments,
    pendienteConfirmar: record.pendingConfirm,
    lastUpdated: Number(record.lastUpdated),
    resumenIA: record.summaryAI,
    motivoRechazo: record.rejectionReason,
    historial: history,
    profesionales: professionals,
    bloquesProf: blocks,
    horas: JSON.parse(record.hoursJson || '{}'),
    distribucionHoraria: JSON.parse(record.distributionJson || '{}'),
  };
}

export async function ensureServiceByName(prismaOrTx, name, chiefName) {
  if (!name) return null;
  return prismaOrTx.service.upsert({
    where: { name },
    update: { chiefName: chiefName ?? undefined },
    create: { name, chiefName },
  });
}

// Periodo de programación de una agenda: el explícito si viene, si no el año de inicio de vigencia.
export function resolvePlanningPeriod(agenda) {
  const explicito = Number(agenda.periodo);
  if (Number.isInteger(explicito) && explicito > 2000) return explicito;
  const desde = agenda.vigenciaDesde ? new Date(agenda.vigenciaDesde) : null;
  if (desde && !isNaN(desde)) return desde.getUTCFullYear();
  return undefined; // deja el valor actual (update) o el default del esquema (create)
}

export async function writeAgendaGraph(prismaOrTx, agenda, existingId = null) {
  const service = await ensureServiceByName(prismaOrTx, agenda.servicio, agenda.jefe);
  const planningPeriod = resolvePlanningPeriod(agenda);

  const agendaRecord = existingId
    ? await prismaOrTx.agenda.update({
        where: { id: existingId },
        data: {
          serviceId: service?.id ?? null,
          serviceSpecialty: service?.specialtyCatalog ?? null,
          serviceName: agenda.servicio,
          chiefName: agenda.jefe,
          monthLabel: agenda.mes,
          ...(planningPeriod ? { planningPeriod } : {}),
          validFrom: agenda.vigenciaDesde ? new Date(agenda.vigenciaDesde) : null,
          validTo: agenda.vigenciaHasta ? new Date(agenda.vigenciaHasta) : null,
          status: agenda.estado,
          version: agenda.version,
          cnePct: agenda.cnePct,
          appointments: agenda.atenciones,
          pendingConfirm: agenda.pendienteConfirmar,
          lastUpdated: BigInt(agenda.lastUpdated),
          summaryAI: agenda.resumenIA,
          rejectionReason: agenda.motivoRechazo,
          hoursJson: JSON.stringify(agenda.horas ?? {}),
          distributionJson: JSON.stringify(agenda.distribucionHoraria ?? {}),
          sourceSnapshot: JSON.stringify(agenda),
          ...(agenda.chiefUserId !== undefined ? { chiefUserId: agenda.chiefUserId } : {}),
        },
      })
    : await prismaOrTx.agenda.create({
        data: {
          externalId: String(agenda.id),
          serviceId: service?.id ?? null,
          serviceSpecialty: service?.specialtyCatalog ?? null,
          serviceName: agenda.servicio,
          chiefName: agenda.jefe,
          monthLabel: agenda.mes,
          ...(planningPeriod ? { planningPeriod } : {}),
          validFrom: agenda.vigenciaDesde ? new Date(agenda.vigenciaDesde) : null,
          validTo: agenda.vigenciaHasta ? new Date(agenda.vigenciaHasta) : null,
          status: agenda.estado,
          version: agenda.version,
          cnePct: agenda.cnePct,
          appointments: agenda.atenciones,
          pendingConfirm: agenda.pendienteConfirmar,
          lastUpdated: BigInt(agenda.lastUpdated),
          summaryAI: agenda.resumenIA,
          rejectionReason: agenda.motivoRechazo,
          hoursJson: JSON.stringify(agenda.horas ?? {}),
          distributionJson: JSON.stringify(agenda.distribucionHoraria ?? {}),
          sourceSnapshot: JSON.stringify(agenda),
          ...(agenda.chiefUserId !== undefined ? { chiefUserId: agenda.chiefUserId } : {}),
        },
      });

  // En una agenda recién creada no hay nada que borrar todavía — saltarse estos 3 round-trips
  // cuando existingId es null evita 3 idas y vueltas a Neon que no hacen nada.
  if (existingId) {
    await prismaOrTx.agendaHistory.deleteMany({ where: { agendaId: agendaRecord.id } });
    await prismaOrTx.agendaBlock.deleteMany({ where: { agendaId: agendaRecord.id } });
    await prismaOrTx.agendaProfessional.deleteMany({ where: { agendaId: agendaRecord.id } });
  }

  // createMany en vez de un .create() por fila: una agenda clonada desde una versión anterior
  // puede traer cientos de bloques, y cientos de round-trips secuenciales a Neon dentro de una
  // misma transacción alcanzan a expirar el timeout de la transacción interactiva de Prisma
  // (P2028) antes de terminar. Los ids internos se generan acá mismo (randomUUID) porque
  // createMany no devuelve las filas creadas, y los bloques necesitan el id real del profesional
  // para enlazarse.
  const professionalMap = new Map();
  if (agenda.profesionales.length > 0) {
    const professionalsData = agenda.profesionales.map((professional, index) => {
      const id = randomUUID();
      professionalMap.set(String(professional.id), id);
      return {
        id,
        agendaId: agendaRecord.id,
        externalId: String(professional.id),
        name: professional.nombre,
        type: professional.tipo,
        professionCatalog: professional.tipo,
        trainingLevel: professional.nivelFormacion ?? null,
        hasTurno: Boolean(professional.tieneTurno ?? false),
        isShiftOnly: Boolean(professional.esSoloTurno ?? false),
        rut: professional.rut ?? null,
        specialtyCatalog: professional.especialidad || null,
        sortOrder: index,
      };
    });
    await prismaOrTx.agendaProfessional.createMany({ data: professionalsData });
  }

  const blocksData = agenda.bloquesProf
    .filter((block) => professionalMap.has(String(block.profesionalId)))
    .map((block) => ({
      id: randomUUID(),
      agendaId: agendaRecord.id,
      professionalId: professionalMap.get(String(block.profesionalId)),
      externalId: String(block.id),
      day: block.dia,
      startMinutes: Number(block.inicioMin ?? 0),
      durationMinutes: Number(block.duracionMin ?? 0),
      process: block.proceso ?? null,
      activity: block.actividad ?? null,
      isClinical: Boolean(block.clinica ?? true),
      hasPerformance: Boolean(block.tieneRendimiento ?? true),
      performance: Number(block.rendimiento ?? 0),
      box: block.box ?? null,
      observations: block.observaciones ?? null,
      isShift: Boolean(block.esTurno ?? false),
    }));
  if (blocksData.length > 0) {
    await prismaOrTx.agendaBlock.createMany({ data: blocksData });
  }

  if (agenda.historial.length > 0) {
    const historyData = agenda.historial.map((entry, index) => ({
      id: randomUUID(),
      agendaId: agendaRecord.id,
      externalId: entry.id ? String(entry.id) : null,
      dateLabel: entry.fecha ?? '',
      action: entry.accion ?? '',
      userName: entry.usuario ?? '',
      comment: entry.comentario ?? null,
      sortOrder: index,
    }));
    await prismaOrTx.agendaHistory.createMany({ data: historyData });
  }

  return agendaRecord;
}

export async function findAgendaRecord(prismaOrTx, externalId) {
  return prismaOrTx.agenda.findUnique({
    where: { externalId: String(externalId) },
    include: {
      professionals: true,
      blocks: true,
      historyEntries: true,
    },
  });
}
