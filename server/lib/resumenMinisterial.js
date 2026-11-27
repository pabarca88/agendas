import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { normalizeText } from './hr.js';

// Resumen de programación en formato ministerial: una fila por profesional × proceso × especialidad
// × actividad, con las horas semanales programadas y el cruce contra el contrato de RRHH (Dotación).
// Tres hojas: médicos, profesionales no médicos y odontólogos.
//
// Las columnas de producción semestral las calcula la planilla ministerial: aquí van vacías para
// no pisar sus fórmulas. Los códigos ID_Especialidad / Id_Actividad salen de
// server/data/codigosMinisteriales.json (se llenan con la tabla oficial).

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVO_CODIGOS = path.join(DIR, '..', 'data', 'codigosMinisteriales.json');
const ARCHIVO_EQUIVALENCIAS = path.join(DIR, '..', 'data', 'equivalenciasMinisteriales.json');

// Clave de comparación: sin tildes/mayúsculas, espacios colapsados y sin espacios junto a ( ) / :
// (el catálogo y la tabla oficial difieren en detalles como "(SM)(incluye" vs "(SM) (incluye").
export const claveCodigo = (t) => normalizeText(t).replace(/\s*([()/:.,])\s*/g, '$1');

function cargarCodigos() {
  const norm = (obj) => new Map(Object.entries(obj || {}).map(([k, v]) => [claveCodigo(k), v]));
  const leer = (archivo) => { try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return {}; } };
  const raw = leer(ARCHIVO_CODIGOS);
  const eq = leer(ARCHIVO_EQUIVALENCIAS);
  return {
    especialidades: norm(raw.especialidades),
    medicas: norm(raw.actividadesMedicas),
    noMedicas: norm(raw.actividadesNoMedicas),
    eqMedicas: norm(eq.medicas),
    eqNoMedicas: norm(eq.noMedicas),
  };
}

// Equivalencia de criterio (actividad del catálogo sin código oficial directo), por servicio.
// Devuelve { id, oficial } (nombre oficial de la tabla, para mostrarlo en la columna Actividad).
function equivalencia(regla, servicio) {
  if (regla == null) return null;
  if (typeof regla === 'number') return { id: regla, oficial: null };
  const s = regla.porServicio?.[servicio];
  if (s != null) return typeof s === 'number' ? { id: s, oficial: null } : { id: s.id, oficial: s.oficial || null };
  return regla.defecto != null ? { id: regla.defecto, oficial: regla.oficial || null } : null;
}

// Médicos (y odontólogos, que la tabla oficial no separa) usan la tabla de actividades médicas;
// el resto la de profesionales no médicos. Si no está en la propia, se prueba en la otra y
// después en las equivalencias acordadas.
function idActividad(codigos, hoja, actividad, servicio) {
  const k = claveCodigo(actividad);
  const noMed = hoja === 'no_medicos';
  const [propia, otra] = noMed ? [codigos.noMedicas, codigos.medicas] : [codigos.medicas, codigos.noMedicas];
  const directo = propia.get(k) ?? otra.get(k);
  if (directo != null) return { id: directo, nombre: actividad };
  const eq = equivalencia((noMed ? codigos.eqNoMedicas : codigos.eqMedicas).get(k), servicio);
  return eq ? { id: eq.id, nombre: eq.oficial || actividad } : { id: '', nombre: actividad };
}

export const HOJAS = [
  { id: 'medicos', nombre: 'Médicos' },
  { id: 'no_medicos', nombre: 'Profesionales no médicos' },
  { id: 'odontologos', nombre: 'Odontólogos' },
];

export function hojaDeProfesion(tipo) {
  const t = normalizeText(tipo);
  if (/ODONTOLOG|DENTISTA/.test(t)) return 'odontologos';
  if (/MEDICO\(A\) CIRUJANO|^MEDICO/.test(t)) return 'medicos';
  return 'no_medicos';
}

// Contratos que corresponden a cada hoja cuando un RUT tiene más de uno: el médico se programa
// sobre sus contratos de ley médica (19.664 / 15.076); el resto, sobre los demás.
const esLeyMedica = (ley) => /19\.?664|15\.?076/.test(ley || '');

const COLUMNAS = [
  { titulo: 'RUTSDV', ancho: 11 },
  { titulo: 'DV', ancho: 4 },
  { titulo: 'Correlativo contrato', ancho: 11 },
  { titulo: 'Nombre Profesional', ancho: 34 },
  { titulo: 'Proceso', ancho: 14 },
  { titulo: 'ID_Especialidad', ancho: 12 },
  { titulo: 'Especialidad', ancho: 30 },
  { titulo: 'Id_Actividad', ancho: 10 },
  { titulo: 'Actividad', ancho: 48 },
  { titulo: 'Horas asignadas', ancho: 10 },
  { titulo: 'Rendimiento por Hora', ancho: 11 },
  { titulo: 'Total Horas semanales del contrato', ancho: 11 },
  { titulo: '% asignado del contrato', ancho: 10 },
  { titulo: 'Total horas semanales contratadas RUN', ancho: 11 },
  { titulo: 'Delta contrato vs programado', ancho: 11 },
  { titulo: 'Producción 1 Sem', ancho: 12 },
  { titulo: 'Producción 2 Sem', ancho: 12 },
  { titulo: 'Requiere rendimiento', ancho: 10 },
  { titulo: 'TIPO', ancho: 6 },
];

// Plantas de Dotación que corresponden a profesionales (las que deben programarse).
export const PLANTAS_PROFESIONALES = ['MEDICOS', 'ODONTOLOGOS', 'FARMACEUTICOS', 'PROFESIONALES'];
const esPlantaProfesional = (planta) => PLANTAS_PROFESIONALES.includes(normalizeText(planta));

// Palabras de un nombre (sin tildes, sin títulos tipo "DR." / "PSICOLOGA") para cruzar por nombre
// cuando la agenda no tiene RUT: Dotación usa "APELLIDOS NOMBRES" y la agenda "Nombre Apellido".
const TITULOS = new Set(['DR', 'DRA', 'PSICOLOGA', 'PSICOLOGO', 'T', 'SOCIAL', 'EU', 'KLGO', 'KLGA', 'TO']);
export function tokensNombre(nombre) {
  return normalizeText(nombre).replace(/[^A-Z ]+/g, ' ').split(' ').filter((t) => t.length > 1 && !TITULOS.has(t));
}
// Todas las palabras del nombre de la agenda (mínimo 2) están en el nombre de Dotación.
export const coincideNombre = (tokensAgenda, tokensDotacion) => tokensAgenda.length >= 2
  && tokensAgenda.every((t) => tokensDotacion.includes(t));

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

/**
 * @param agendas  agendas con { serviceSpecialty, professionals[], blocks[{..., catalogActivity}] }
 * @param contratos HrContract[] (todo el corte cargado)
 * @param catalogo  CatalogActivity[] — para TIPO / requiere rendimiento de bloques sin vínculo
 * @param fechaCorte fecha contra la que se evalúa la vigencia de los contratos
 */
export function construirResumenMinisterial({ agendas, contratos, catalogo, fechaCorte = new Date() }) {
  const codigos = cargarCodigos();
  const vigente = (c) => (!c.fechaInicioContrato || c.fechaInicioContrato <= fechaCorte)
    && (!c.fechaTerminoContrato || c.fechaTerminoContrato >= fechaCorte);
  // Lineamiento: se programa a todos los profesionales y solo a ellos. Técnicos, administrativos,
  // auxiliares y directivos quedan fuera del análisis.
  const contratosPorRut = new Map();
  const rutsNoProfesionales = new Set();
  for (const c of contratos) {
    if (!vigente(c)) continue;
    if (!esPlantaProfesional(c.planta)) { rutsNoProfesionales.add(c.rut); continue; }
    if (!contratosPorRut.has(c.rut)) contratosPorRut.set(c.rut, []);
    contratosPorRut.get(c.rut).push(c);
  }
  const excluidosNoProfesionales = new Set();
  const catalogoPorClave = new Map(catalogo.map((c) => [`${c.process}|${c.profession}|${c.specialty}|${normalizeText(c.activity)}`, c]));

  // 1. Agregar bloques (sin turnos) por persona + proceso + especialidad + actividad.
  const filas = new Map();
  for (const agenda of agendas) {
    const profPorId = new Map(agenda.professionals.map((p) => [p.id, p]));
    for (const b of agenda.blocks) {
      if (b.isShift || !b.activity) continue;
      const prof = profPorId.get(b.professionalId);
      if (!prof) continue;
      // En Dotación solo con contrato no profesional (ej. técnico): fuera del análisis.
      if (prof.rut && !contratosPorRut.has(prof.rut) && rutsNoProfesionales.has(prof.rut)) {
        excluidosNoProfesionales.add(prof.name);
        continue;
      }
      const hoja = hojaDeProfesion(prof.type);
      const persona = prof.rut ? `rut:${prof.rut}` : `nom:${normalizeText(prof.name)}`;
      const cat = b.catalogActivity;
      const especialidad = cat?.specialty && cat.specialty !== 'No Aplica'
        ? cat.specialty
        : (prof.specialtyCatalog || agenda.serviceSpecialty || 'No Aplica');
      // El servicio entra en la clave porque algunas equivalencias de código dependen de él.
      const clave = `${hoja}|${persona}|${agenda.serviceName}|${b.process}|${especialidad}|${normalizeText(b.activity)}`;
      if (!filas.has(clave)) {
        const catRef = cat
          || catalogoPorClave.get(`${b.process}|${prof.type}|${especialidad}|${normalizeText(b.activity)}`)
          || catalogoPorClave.get(`${b.process}|${prof.type}|No Aplica|${normalizeText(b.activity)}`);
        filas.set(clave, {
          hoja, persona, servicio: agenda.serviceName, rut: prof.rut || '', nombre: prof.name, tipo: prof.type,
          proceso: b.process || '', especialidad, actividad: cat?.activity || b.activity,
          minutos: 0, minRend: 0, sumaRend: 0,
          requiereRend: catRef ? (catRef.rawPerformanceFlag || (catRef.hasPerformance ? 'R' : 'NR')) : (b.hasPerformance ? 'R' : 'NR'),
          tipoAct: catRef ? (catRef.rawType || (catRef.isClinical ? 'C' : 'NC')) : (b.isClinical ? 'C' : 'NC'),
        });
      }
      const f = filas.get(clave);
      f.minutos += b.durationMinutes;
      if (b.hasPerformance && b.performance > 0) {
        f.minRend += b.durationMinutes;
        f.sumaRend += b.performance * b.durationMinutes;
      }
    }
  }

  // 2. Total programado por persona y hoja (para el delta contra contrato).
  const programadoPersona = new Map();
  for (const f of filas.values()) {
    const k = `${f.hoja}|${f.persona}`;
    programadoPersona.set(k, (programadoPersona.get(k) || 0) + f.minutos / 60);
  }

  // 3. Armar filas de cada hoja.
  const porHoja = Object.fromEntries(HOJAS.map((h) => [h.id, []]));
  const avisos = { sinRut: new Set(), sinContrato: new Set(), variosContratos: new Set(), sinCodigoEsp: new Set(), sinCodigoAct: new Set() };
  const ordenadas = [...filas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')
    || a.proceso.localeCompare(b.proceso) || a.actividad.localeCompare(b.actividad, 'es'));
  for (const f of ordenadas) {
    const horas = r2(f.minutos / 60);
    const todos = f.rut ? (contratosPorRut.get(f.rut) || []) : [];
    const deHoja = todos.filter((c) => (f.hoja === 'medicos' ? esLeyMedica(c.ley) : !esLeyMedica(c.ley)));
    const usados = deHoja.length ? deHoja : todos;
    const horasContrato = usados.reduce((s, c) => s + (c.numeroHoras || 0), 0);
    const horasRun = todos.reduce((s, c) => s + (c.numeroHoras || 0), 0);
    const encontrado = todos.length > 0;
    if (!f.rut) avisos.sinRut.add(f.nombre);
    else if (!encontrado) avisos.sinContrato.add(f.nombre);
    if (usados.length > 1) avisos.variosContratos.add(f.nombre);
    const dv = todos[0]?.dv || '';
    const correlativo = usados.map((c) => c.correlativo).filter(Boolean).join(' / ');
    const idEsp = codigos.especialidades.get(claveCodigo(f.especialidad)) ?? '';
    const { id: idAct, nombre: actividadOficial } = idActividad(codigos, f.hoja, f.actividad, f.servicio);
    if (idEsp === '' && f.especialidad !== 'No Aplica') avisos.sinCodigoEsp.add(f.especialidad);
    if (idAct === '') avisos.sinCodigoAct.add(`${f.actividad} (${f.hoja === 'no_medicos' ? f.tipo : 'médico'})`);
    const programado = programadoPersona.get(`${f.hoja}|${f.persona}`) || 0;
    porHoja[f.hoja].push([
      f.rut ? Number(f.rut) : '',
      dv,
      correlativo,
      // Como en la planilla ministerial: el nombre sale de RRHH; si el RUN no cruza se avisa (con el
      // nombre de la agenda entre paréntesis para poder identificarlo).
      encontrado ? (todos[0].nombreFuncionario || f.nombre) : `RUN No encontrado en RRHH (${f.nombre})`,
      f.proceso,
      idEsp,
      f.especialidad,
      idAct,
      actividadOficial,
      horas,
      f.minRend ? r2(f.sumaRend / f.minRend) : '',
      encontrado ? r1(horasContrato) : 0,
      encontrado && horasContrato ? horas / horasContrato : 0,
      encontrado ? r1(horasRun) : 0,
      encontrado ? r1(horasContrato - programado) : 0,
      '',
      '',
      f.requiereRend,
      f.tipoAct,
    ]);
  }

  // 4. Libro Excel.
  const wb = XLSX.utils.book_new();
  for (const h of HOJAS) {
    const ws = XLSX.utils.aoa_to_sheet([COLUMNAS.map((c) => c.titulo), ...porHoja[h.id]]);
    ws['!cols'] = COLUMNAS.map((c) => ({ wch: c.ancho }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(porHoja[h.id].length, 1), c: COLUMNAS.length - 1 } }) };
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    // % asignado del contrato con formato porcentaje.
    for (let r = 1; r <= porHoja[h.id].length; r += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 12 })];
      if (cell && typeof cell.v === 'number') cell.z = '0%';
    }
    XLSX.utils.book_append_sheet(wb, ws, h.nombre);
  }
  const lista = (s) => [...s].sort((a, b) => a.localeCompare(b, 'es'));
  const filasAviso = [
    ['Resumen de programación — avisos de la exportación'],
    [],
    ['Excluidos: en Dotación no son profesionales (técnico, administrativo, auxiliar)', lista(excluidosNoProfesionales).join('; ') || '—'],
    ['Profesionales sin RUT en la agenda (no cruzan con RRHH)', lista(avisos.sinRut).join('; ') || '—'],
    ['RUT no encontrado en la Dotación cargada', lista(avisos.sinContrato).join('; ') || '—'],
    ['Con más de un contrato vigente (correlativos separados por " / ")', lista(avisos.variosContratos).join('; ') || '—'],
    ['Especialidades sin ID ministerial', lista(avisos.sinCodigoEsp).join('; ') || '—'],
    ['Actividades sin Id_Actividad ministerial', lista(avisos.sinCodigoAct).join('; ') || '—'],
    [],
    ['Notas'],
    ['Horas asignadas = horas semanales de jornada programadas (no incluye turnos).'],
    ['Producción 1 Sem / 2 Sem se dejan vacías: las calcula la planilla ministerial.'],
    ['Contratos vigentes a la fecha de exportación según la última Dotación cargada.'],
    [`Se consideran profesionales las plantas ${PLANTAS_PROFESIONALES.join(', ')}; el resto de la Dotación queda fuera del análisis.`],
  ];
  const wsAv = XLSX.utils.aoa_to_sheet(filasAviso);
  wsAv['!cols'] = [{ wch: 62 }, { wch: 120 }];
  XLSX.utils.book_append_sheet(wb, wsAv, 'Avisos');

  return {
    buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
    conteo: { ...Object.fromEntries(HOJAS.map((h) => [h.id, porHoja[h.id].length])) },
  };
}
