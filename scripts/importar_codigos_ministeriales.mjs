// Genera server/data/codigosMinisteriales.json desde la planilla "ID Especialidades y Prestaciones.xlsx"
// (hoja Diccionarios: Especialidades | Actividades Médicas | Actividades profesional No Médico).
// Uso: node scripts/importar_codigos_ministeriales.mjs "<ruta xlsx>"
import fs from 'fs';
import * as XLSX from 'xlsx';
const ruta = process.argv[2];
const wb = XLSX.read(fs.readFileSync(ruta));
const ws = wb.Sheets.Diccionarios || wb.Sheets[wb.SheetNames[0]];
const filas = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, range: 2 });
// La hoja parte en la columna B: índices relativos a B.
const limpiar = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
const especialidades = {}; const actividadesMedicas = {}; const actividadesNoMedicas = {};
const conflictos = [];
const poner = (obj, desc, id, tabla) => {
  const d = limpiar(desc); if (!d || id == null || id === '') return;
  if (obj[d] != null && obj[d] !== id) conflictos.push(`${tabla}: "${d}" ${obj[d]} vs ${id}`);
  obj[d] = id;
};
for (const r of filas) {
  poner(especialidades, r[1], r[0], 'especialidades');
  poner(actividadesMedicas, r[4], r[5], 'médicas');
  if (r[7] != null && r[9] != null && r[7] !== r[9]) conflictos.push(`no médicas: "${limpiar(r[8])}" columna I=${r[7]} K=${r[9]}`);
  poner(actividadesNoMedicas, r[8], r[9] ?? r[7], 'no médicas');
}
const out = {
  _nota: `Códigos ministeriales generados desde "${ruta.split(/[\/]/).pop()}" el ${new Date().toISOString().slice(0, 10)}. Clave = descripción oficial (se compara sin tildes, mayúsculas ni espacios).`,
  especialidades, actividadesMedicas, actividadesNoMedicas,
};
fs.writeFileSync('server/data/codigosMinisteriales.json', JSON.stringify(out, null, 1));
console.log('especialidades', Object.keys(especialidades).length, '| médicas', Object.keys(actividadesMedicas).length, '| no médicas', Object.keys(actividadesNoMedicas).length);
if (conflictos.length) console.log('CONFLICTOS:\n  ' + conflictos.join('\n  '));
