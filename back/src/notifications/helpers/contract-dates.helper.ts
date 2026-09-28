/**
 * Lectura de fechas de vencimiento guardadas dentro del `datos` (jsonb) de un
 * contrato.
 *
 * Las plantillas .docx no guardan una fecha ISO: reparten el vencimiento en
 * `finDia` / `finMes` / `finAnio` (alquiler temporal) o lo escriben en prosa
 * (`fechaFinProrroga`: «11 de agosto de 2026»). Este helper unifica todas esas
 * formas en un `Date`, para que el motor de reglas pueda comparar sin
 * depender del formato de cada plantilla.
 */

/** Meses en espanol, en el orden del calendario. */
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Grafias alternativas admitidas al leer un mes escrito a mano. */
const MESES_ALTERNATIVOS: Record<string, number> = {
  setiembre: 8,
  sept: 8,
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  oct: 9,
  nov: 10,
  dic: 11,
};

/** Quita tildes y pasa a minusculas para poder comparar sin sorpresas. */
const normaliza = (valor: unknown): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

/**
 * Traduce un mes escrito como nombre (`agosto`) o como numero (`8`, `08`) a su
 * indice 0-11.
 * @returns El indice del mes o `null` si no se reconoce.
 */
export const parseMonth = (raw: unknown): number | null => {
  const texto = normaliza(raw);
  if (!texto) return null;

  if (/^\d{1,2}$/.test(texto)) {
    const numero = Number(texto);
    return numero >= 1 && numero <= 12 ? numero - 1 : null;
  }

  const indice = MESES.indexOf(texto);
  if (indice >= 0) return indice;

  const alternativo = MESES_ALTERNATIVOS[texto];
  return alternativo === undefined ? null : alternativo;
};

/** Construye una fecha valida a mediodia (evita saltos por zona horaria). */
const construirFecha = (
  anio: number,
  mes: number,
  dia: number,
): Date | null => {
  if (!Number.isFinite(anio) || !Number.isFinite(dia)) return null;
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;

  const fecha = new Date(anio, mes, dia, 12, 0, 0, 0);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

/**
 * Interpreta una fecha escrita en cualquiera de los formatos que usan las
 * plantillas: `2026-08-11`, `11/08/2026` u `11 de agosto de 2026`.
 * @returns La fecha o `null` si el texto no es interpretable.
 */
export const parseSpanishDate = (raw: unknown): Date | null => {
  const texto = normaliza(raw);
  if (!texto) return null;

  // ISO: 2026-08-11 (con o sin hora)
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return construirFecha(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  // Numerica: 11/08/2026 u 11-08-2026
  const numerica = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (numerica) {
    return construirFecha(
      Number(numerica[3]),
      Number(numerica[2]) - 1,
      Number(numerica[1]),
    );
  }

  // En prosa: «11 de agosto de 2026»
  const prosa = texto.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})$/);
  if (prosa) {
    const mes = parseMonth(prosa[2]);
    if (mes === null) return null;
    return construirFecha(Number(prosa[3]), mes, Number(prosa[1]));
  }

  return null;
};

/**
 * Extrae la fecha de vencimiento de los datos de relleno de un contrato.
 *
 * Prioriza la prorroga (si existe, es la fecha vigente) y despues el trio
 * `finDia`/`finMes`/`finAnio` del contrato de alquiler temporal.
 *
 * @param datos Objeto `datos` (jsonb) de la entidad `Contract`.
 * @returns La fecha de fin o `null` si el contrato no la lleva.
 */
export const resolveContractEndDate = (
  datos: Record<string, unknown> | null | undefined,
): Date | null => {
  if (!datos) return null;

  // 1. Prorrogas y campos escritos como fecha completa.
  const camposDirectos = [
    'fechaFinProrroga',
    'fechaFin',
    'fechaFinOriginal',
    'validezHasta',
  ];
  for (const campo of camposDirectos) {
    const fecha = parseSpanishDate(datos[campo]);
    if (fecha) return fecha;
  }

  // 2. Trio dia / mes / anio del contrato de alquiler temporal.
  const dia = Number(normaliza(datos['finDia']));
  const mes = parseMonth(datos['finMes']);
  const anio = Number(normaliza(datos['finAnio']));
  if (mes !== null && Number.isFinite(dia) && Number.isFinite(anio) && anio > 0) {
    return construirFecha(anio, mes, dia);
  }

  return null;
};

/** Dias naturales que faltan (o sobran, en negativo) hasta una fecha. */
export const diasHasta = (fecha: Date, desde: Date = new Date()): number => {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  const inicio = new Date(
    desde.getFullYear(),
    desde.getMonth(),
    desde.getDate(),
  ).getTime();
  const fin = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
  ).getTime();

  return Math.round((fin - inicio) / MS_POR_DIA);
};

/** Dias naturales transcurridos desde una fecha pasada. */
export const diasDesde = (fecha: Date, hasta: Date = new Date()): number =>
  diasHasta(hasta, fecha);

/** Formatea una fecha como `11 de agosto de 2026`. */
export const formatearFechaLarga = (fecha: Date): string =>
  `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
