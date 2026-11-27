// Crea la agenda 2027 de cada servicio que aún no la tiene, copiando su última versión 2026
// (profesionales y bloques tal cual) como borrador provisional, hasta que llegue la planilla 2027.
// El externalId sigue la regla de importar_periodo_2027.mjs (<base>-2027), así que esa importación
// puede reemplazar la copia con --reemplazar mientras nadie la haya editado en la plataforma.
//
// Uso:
//   node scripts/copiar_2026_a_2027.mjs            simulación (no guarda)
//   node scripts/copiar_2026_a_2027.mjs --aplicar  guarda en la base
import { PrismaClient } from '@prisma/client';

const APLICAR = process.argv.includes('--aplicar');
const ORIGEN = 2026;
const PERIODO = 2027;
const VIGENCIA = { desde: '2027-01-01', hasta: '2027-12-31', label: 'Enero - Diciembre 2027' };
// Agendas de prueba que no representan la programación del servicio.
const EXCLUIR = new Set(['104']);

const prisma = new PrismaClient();
async function retry(fn, label) {
  for (let i = 1; i <= 10; i++) {
    try { return await fn(); } catch (e) {
      if (!/Can't reach|P1001|P1017|connection/i.test(e.message)) throw e;
      console.log(`  (sin conexión a la base, reintento ${i} — ${label})`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw new Error(`Sin conexión a la base tras reintentos: ${label}`);
}

const agendas = await retry(() => prisma.agenda.findMany({
  where: { planningPeriod: { in: [ORIGEN, PERIODO] } },
  select: { id: true, externalId: true, serviceId: true, serviceName: true, planningPeriod: true, validFrom: true, updatedAt: true, version: true, status: true },
}), 'agendas');
const conDestino = new Set(agendas.filter((a) => a.planningPeriod === PERIODO).map((a) => a.serviceName));

// Última versión 2026 por servicio: vigencia más reciente, luego la última modificada.
const ultima = new Map();
for (const a of agendas.filter((x) => x.planningPeriod === ORIGEN && !EXCLUIR.has(x.externalId))) {
  const prev = ultima.get(a.serviceName);
  const clave = (x) => [x.validFrom?.getTime() ?? 0, x.updatedAt.getTime()];
  if (!prev || clave(a)[0] > clave(prev)[0] || (clave(a)[0] === clave(prev)[0] && clave(a)[1] > clave(prev)[1])) ultima.set(a.serviceName, a);
}
const plan = [...ultima.values()].filter((a) => !conDestino.has(a.serviceName)).sort((a, b) => a.serviceName.localeCompare(b.serviceName));

console.log(`\n===== Copia ${ORIGEN} → ${PERIODO} — ${APLICAR ? 'APLICANDO' : 'SIMULACIÓN'} =====`);
console.log(`Ya tienen agenda ${PERIODO}: ${[...conDestino].sort().join(', ')}`);
const excluidas = agendas.filter((a) => EXCLUIR.has(a.externalId));
if (excluidas.length) console.log(`Excluidas (prueba): ${excluidas.map((a) => `${a.serviceName} [${a.externalId}]`).join(', ')}`);
console.log(`\nSe copian ${plan.length}:`);
for (const a of plan) console.log(`  ${a.serviceName}: ${a.externalId} (${a.status}, v${a.version}) → ${a.externalId.replace(/-20\d\d$/, '')}-${PERIODO}`);

if (!APLICAR) {
  console.log('\nSIMULACIÓN: no se guardó nada. Ejecuta con --aplicar para guardar.');
  await prisma.$disconnect();
  process.exit();
}

const fecha = new Date().toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Santiago' });
let ok = 0;
for (const a of plan) {
  const externalId = `${a.externalId.replace(/-20\d\d$/, '')}-${PERIODO}`;
  const src = await retry(() => prisma.agenda.findUnique({ where: { id: a.id }, include: { professionals: { orderBy: { sortOrder: 'asc' } }, blocks: true } }), a.externalId);
  if (await retry(() => prisma.agenda.findUnique({ where: { externalId } }), 'existe')) { console.log(`  · ${externalId} ya existe, se omite`); continue; }
  await retry(() => prisma.$transaction(async (tx) => {
    const nueva = await tx.agenda.create({
      data: {
        externalId,
        serviceId: src.serviceId,
        chiefUserId: src.chiefUserId,
        serviceSpecialty: src.serviceSpecialty,
        serviceName: src.serviceName,
        chiefName: src.chiefName,
        monthLabel: VIGENCIA.label,
        planningPeriod: PERIODO,
        copiedFrom: src.externalId,
        validFrom: new Date(VIGENCIA.desde),
        validTo: new Date(VIGENCIA.hasta),
        status: 'borrador',
        version: 1,
        cnePct: src.cnePct,
        appointments: src.appointments,
        lastUpdated: BigInt(Date.now()),
        hoursJson: src.hoursJson,
        distributionJson: src.distributionJson,
      },
    });
    const idProf = new Map();
    for (const p of src.professionals) {
      const { id, agendaId, createdAt, updatedAt, ...resto } = p;
      const np = await tx.agendaProfessional.create({ data: { ...resto, agendaId: nueva.id } });
      idProf.set(id, np.id);
    }
    const bloques = src.blocks.filter((b) => idProf.has(b.professionalId)).map(({ id, agendaId, createdAt, updatedAt, professionalId, ...resto }) => ({
      ...resto, agendaId: nueva.id, professionalId: idProf.get(professionalId),
    }));
    if (bloques.length) await tx.agendaBlock.createMany({ data: bloques });
    await tx.agendaHistory.create({
      data: {
        agendaId: nueva.id, dateLabel: fecha, userName: 'DDI', sortOrder: 0,
        action: `Creada para el periodo ${PERIODO} como copia de la versión ${ORIGEN}`,
        comment: `Copia provisional de ${src.externalId} (v${src.version}, ${src.status}) mientras se recibe la programación ${PERIODO} del servicio.`,
      },
    });
    console.log(`  ✔ ${externalId}: ${src.professionals.length} profesionales, ${bloques.length} bloques`);
  }, { maxWait: 30000, timeout: 180000 }), externalId);
  ok++;
}
console.log(`\nAPLICADO: ${ok} agendas ${PERIODO} creadas.`);
await prisma.$disconnect();
