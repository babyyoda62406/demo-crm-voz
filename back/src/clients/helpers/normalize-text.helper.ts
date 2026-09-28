/**
 * Normalizacion de texto libre para poder casar lo que dicta la persona usuaria (o lo
 * que trae un CSV ajeno) con los valores canonicos de los enums del dominio.
 *
 * Quita tildes y diacriticos, pasa a minusculas y colapsa cualquier separador
 * (espacios, guiones, puntos) en un unico guion bajo.
 *
 * @example normalizeKey(' Contrato Firmado ') // 'contrato_firmado'
 * @example normalizeKey('Check-In')           // 'checkin'  -> ver sinonimos
 */
export const normalizeKey = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';

  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s.\-/]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Normaliza una cabecera de fichero importado: igual que `normalizeKey` pero
 * ademas elimina los guiones bajos, de modo que `Linea de negocio`,
 * `linea_negocio` y `LineaNegocio` acaban en la misma clave `lineadenegocio`
 * / `lineanegocio`. Se usa junto a un diccionario de alias.
 */
export const normalizeHeader = (value: string | null | undefined): string =>
  normalizeKey(value).replace(/_/g, '');

/** Convierte a `undefined` las cadenas vacias o solo con espacios. */
export const emptyToUndefined = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
};

/**
 * Convierte un texto libre a numero admitiendo formato espanol
 * (`180.000,50 €`, `180000`, `180 000`).
 */
export const parseAmount = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;

  const raw = String(value)
    .replace(/[^\d,.-]/g, '')
    .trim();
  if (!raw) return undefined;

  // Si hay coma y punto, el ultimo separador que aparece es el decimal.
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let normalized: string;

  if (lastComma > -1 && lastDot > -1) {
    normalized =
      lastComma > lastDot
        ? raw.replace(/\./g, '').replace(',', '.')
        : raw.replace(/,/g, '');
  } else if (lastComma > -1) {
    // Una sola coma: decimal si deja 1 o 2 cifras detras, si no es de millares.
    normalized =
      raw.length - lastComma - 1 <= 2
        ? raw.replace(',', '.')
        : raw.replace(/,/g, '');
  } else {
    normalized =
      lastDot > -1 && raw.length - lastDot - 1 > 2 ? raw.replace(/\./g, '') : raw;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};
