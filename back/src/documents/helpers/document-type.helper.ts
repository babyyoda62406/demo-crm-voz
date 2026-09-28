/**
 * Traduccion entre la extension de un fichero y lo que ONLYOFFICE espera.
 *
 * ONLYOFFICE clasifica todo documento en cuatro familias (`documentType`) y
 * necesita ademas la extension exacta (`fileType`). Si el par no cuadra, el
 * editor arranca en blanco sin dar error, asi que esta tabla es la fuente unica
 * de verdad para back y front.
 */

export type OnlyOfficeDocumentType = 'word' | 'cell' | 'slide' | 'pdf';

/** Extensiones de texto que ONLYOFFICE abre como documento. */
const EXTENSIONES_WORD = [
  'doc',
  'docm',
  'docx',
  'dot',
  'dotm',
  'dotx',
  'epub',
  'fodt',
  'htm',
  'html',
  'mht',
  'odt',
  'ott',
  'rtf',
  'txt',
];

/** Extensiones de hoja de calculo. */
const EXTENSIONES_CELL = [
  'csv',
  'fods',
  'ods',
  'ots',
  'xls',
  'xlsm',
  'xlsx',
  'xlt',
  'xltm',
  'xltx',
];

/** Extensiones de presentacion. */
const EXTENSIONES_SLIDE = [
  'fodp',
  'odp',
  'otp',
  'pot',
  'potm',
  'potx',
  'pps',
  'ppsm',
  'ppsx',
  'ppt',
  'pptm',
  'pptx',
];

/** Extensiones que ONLYOFFICE abre en modo solo lectura. */
const EXTENSIONES_PDF = ['djvu', 'oxps', 'pdf', 'xps'];

/**
 * Formatos que ONLYOFFICE puede EDITAR y volver a guardar. El resto se abre en
 * modo lectura aunque el usuario tenga privilegio de edicion.
 */
const EXTENSIONES_EDITABLES = [
  'csv',
  'docx',
  'docxf',
  'odp',
  'ods',
  'odt',
  'pptx',
  'rtf',
  'txt',
  'xlsx',
];

/** Devuelve la extension en minusculas y sin punto (`''` si no tiene). */
export const getExtension = (nombre: string): string => {
  if (!nombre) return '';
  const partes = nombre.split('.');
  if (partes.length < 2) return '';
  return partes.pop().toLowerCase().trim();
};

/**
 * Familia de ONLYOFFICE a la que pertenece el fichero.
 * @returns `null` si la extension no la soporta el editor (imagenes, zip...).
 */
export const getDocumentType = (
  nombre: string,
): OnlyOfficeDocumentType | null => {
  const ext = getExtension(nombre);
  if (EXTENSIONES_WORD.includes(ext)) return 'word';
  if (EXTENSIONES_CELL.includes(ext)) return 'cell';
  if (EXTENSIONES_SLIDE.includes(ext)) return 'slide';
  if (EXTENSIONES_PDF.includes(ext)) return 'pdf';
  return null;
};

/** `true` si ONLYOFFICE puede abrirlo (en edicion o en lectura). */
export const esVisualizableOnlyOffice = (nombre: string): boolean =>
  getDocumentType(nombre) !== null;

/** `true` si ONLYOFFICE puede guardar cambios sobre este formato. */
export const esEditableOnlyOffice = (nombre: string): boolean =>
  EXTENSIONES_EDITABLES.includes(getExtension(nombre));

/** `true` si es un PDF (se abre en el visor embebido del front). */
export const esPdf = (nombre: string): boolean => getExtension(nombre) === 'pdf';

/** Tipos MIME mas habituales, por si el navegador no lo declara en la subida. */
const MIMES: Record<string, string> = {
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  odp: 'application/vnd.oasis.opendocument.presentation',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odt: 'application/vnd.oasis.opendocument.text',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  rtf: 'application/rtf',
  txt: 'text/plain',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
};

/** MIME correspondiente a la extension, con respaldo generico. */
export const getMimePorExtension = (nombre: string): string =>
  MIMES[getExtension(nombre)] || 'application/octet-stream';

/**
 * Limpia un nombre de fichero o carpeta introducido por el usuario: quita
 * separadores de ruta y recorridos `..` para que no se pueda escribir fuera del
 * directorio de subidas.
 */
export const sanearNombre = (nombre: string): string =>
  (nombre || '')
    .replace(/[/\\]/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/[\x00-\x1f]/g, '')
    .trim();
