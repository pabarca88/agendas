import * as XLSX from 'xlsx';

// Quita tildes, pasa a mayúsculas y colapsa espacios — se usa tanto para encontrar columnas por
// nombre de encabezado (tolerante a variaciones entre cortes) como para el cruce por nombre
// cuando un profesional todavía no tiene RUT guardado.
export function normalizeText(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// RUT normalizado: solo dígitos, sin puntos/guión/DV. El DV se guarda aparte.
export function normalizeRut(rutRaw) {
  if (rutRaw === null || rutRaw === undefined) return '';
  return rutRaw.toString().replace(/\D/g, '').replace(/^0+/, '');
}

function findColumnIndex(headerRow, fragments) {
  for (let i = 0; i < headerRow.length; i += 1) {
    const normalized = normalizeText(headerRow[i]);
    if (fragments.some((f) => normalized.includes(normalizeText(f)))) return i;
  }
  return -1;
}

function excelDateToJsDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Encuentra la hoja de detalle del reporte de Dotación — su nombre cambia cada corte
// ("Dotacion Julio 2026", "Dotacion Agosto 2026", ...), así que se busca por prefijo en vez de
// hardcodear un mes.
function findDotacionSheetName(workbook) {
  const match = workbook.SheetNames.find((name) => normalizeText(name).startsWith('DOTACION'));
  return match || workbook.SheetNames[workbook.SheetNames.length - 1];
}

export function parseDotacionWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = findDotacionSheetName(workbook);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });

  if (rows.length === 0) {
    throw new Error(`La hoja "${sheetName}" está vacía.`);
  }

  const headerRow = rows[0];
  const col = {
    rut: findColumnIndex(headerRow, ['Rut']),
    dv: findColumnIndex(headerRow, ['Dv']),
    // Exacto: "Correl. Informe", "Correl. Planta" y "Corr. Contrato del Reemplazado" son otra cosa.
    correlativo: headerRow.findIndex((h) => normalizeText(h) === 'CORRELATIVO'),
    correlativo: headerRow.findIndex((h) => normalizeText(h) === 'CORRELATIVO'),
    nombre: findColumnIndex(headerRow, ['Nombre Funcionario']),
    planta: findColumnIndex(headerRow, ['Descripcion Planta']),
    calidad: findColumnIndex(headerRow, ['Calidad Juridica']),
    ley: findColumnIndex(headerRow, ['Ley']),
    horas: findColumnIndex(headerRow, ['Numero horas']),
    unidad: findColumnIndex(headerRow, ['Descripcion Unidad']),
    cargo: findColumnIndex(headerRow, ['Descripcion Cargo']),
    funcion: findColumnIndex(headerRow, ['Descripcion Funcion']),
    fechaInicio: findColumnIndex(headerRow, ['Fecha Inicio Contrato']),
    fechaTermino: findColumnIndex(headerRow, ['Fecha Termino Contrato']),
    transitorio: findColumnIndex(headerRow, ['Transitorio']),
  };

  const requiredCols = ['rut', 'nombre', 'planta', 'ley'];
  const missing = requiredCols.filter((key) => col[key] === -1);
  if (missing.length > 0) {
    throw new Error(`No se encontraron las columnas: ${missing.join(', ')} en la hoja "${sheetName}".`);
  }

  const contracts = [];
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row || row.every((v) => v === null || v === '')) continue;
    const rutRaw = row[col.rut];
    const nombre = row[col.nombre];
    if (!rutRaw || !nombre) continue;

    const numeroHorasRaw = col.horas !== -1 ? row[col.horas] : null;
    const numeroHoras = typeof numeroHorasRaw === 'number' ? numeroHorasRaw : Number(numeroHorasRaw);

    contracts.push({
      rut: normalizeRut(rutRaw),
      dv: col.dv !== -1 ? String(row[col.dv] ?? '').trim() : '',
      correlativo: col.correlativo !== -1 && row[col.correlativo] != null ? String(row[col.correlativo]).trim() : null,
      correlativo: col.correlativo !== -1 && row[col.correlativo] != null ? String(row[col.correlativo]).trim() : null,
      nombreFuncionario: String(nombre).trim(),
      planta: col.planta !== -1 ? normalizeText(row[col.planta]) : '',
      calidadJuridica: col.calidad !== -1 ? String(row[col.calidad] ?? '').trim() : '',
      ley: col.ley !== -1 ? String(row[col.ley] ?? '').trim() : '',
      numeroHoras: Number.isFinite(numeroHoras) ? numeroHoras : null,
      unidadDescripcion: col.unidad !== -1 ? String(row[col.unidad] ?? '').trim() || null : null,
      cargo: col.cargo !== -1 ? String(row[col.cargo] ?? '').trim() || null : null,
      funcionDescripcion: col.funcion !== -1 ? String(row[col.funcion] ?? '').trim() || null : null,
      fechaInicioContrato: col.fechaInicio !== -1 ? excelDateToJsDate(row[col.fechaInicio]) : null,
      fechaTerminoContrato: col.fechaTermino !== -1 ? excelDateToJsDate(row[col.fechaTermino]) : null,
      transitorio: col.transitorio !== -1 ? normalizeText(row[col.transitorio]) === 'S' : false,
    });
  }

  return { sheetName, contracts };
}
