import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  BusinessLine,
  ClientType,
  InterestZone,
  OperationType,
  normalizeOperationType,
  normalizeZones,
} from '../enums';
import {
  emptyToUndefined,
  normalizeHeader,
  normalizeKey,
  parseAmount,
} from './normalize-text.helper';

/** Extensiones admitidas por el importador. */
export const SUPPORTED_IMPORT_EXTENSIONS = ['csv', 'xlsx', 'xls', 'ods'];

/** Tamano maximo del fichero de importacion: 5 MB. */
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

/** Fichero recibido por multipart. Tipado estructural para no atarse a multer. */
export interface UploadedImportFile {
  originalname: string;
  buffer: Buffer;
  mimetype?: string;
  size?: number;
}

/** Fila de un fichero importado, ya traducida al vocabulario del dominio. */
export interface ImportedClientRow {
  nombre?: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  documento?: string;
  tipo?: ClientType;
  lineaNegocio?: BusinessLine;
  etapa?: string;
  presupuestoMin?: number;
  presupuestoMax?: number;
  zonasInteres?: InterestZone[];
  tipoOperacion?: OperationType;
  origen?: string;
  notas?: string;
}

/**
 * Diccionario de cabeceras admitidas. Las claves ya vienen pasadas por
 * `normalizeHeader` (sin tildes, minusculas y sin separadores), de modo que
 * `Línea de negocio`, `linea_negocio` y `LINEANEGOCIO` casan con la misma
 * entrada.
 */
const HEADER_ALIASES: Record<string, keyof ImportedClientRow | 'presupuesto'> = {
  nombre: 'nombre',
  name: 'nombre',
  cliente: 'nombre',
  nombrecliente: 'nombre',
  razonsocial: 'nombre',
  empresa: 'nombre',

  apellidos: 'apellidos',
  apellido: 'apellidos',
  lastname: 'apellidos',
  surname: 'apellidos',

  email: 'email',
  correo: 'email',
  correoelectronico: 'email',
  mail: 'email',
  emailcontacto: 'email',

  telefono: 'telefono',
  tel: 'telefono',
  movil: 'telefono',
  celular: 'telefono',
  phone: 'telefono',

  documento: 'documento',
  nif: 'documento',
  cif: 'documento',
  nie: 'documento',
  dni: 'documento',

  tipo: 'tipo',
  tipocliente: 'tipo',
  perfil: 'tipo',

  lineanegocio: 'lineaNegocio',
  lineadenegocio: 'lineaNegocio',
  linea: 'lineaNegocio',
  negocio: 'lineaNegocio',
  servicio: 'lineaNegocio',

  etapa: 'etapa',
  fase: 'etapa',
  stage: 'etapa',
  estadopipeline: 'etapa',

  presupuestomin: 'presupuestoMin',
  presupuestominimo: 'presupuestoMin',
  presupuestodesde: 'presupuestoMin',
  minimo: 'presupuestoMin',
  budgetmin: 'presupuestoMin',

  presupuestomax: 'presupuestoMax',
  presupuestomaximo: 'presupuestoMax',
  presupuestohasta: 'presupuestoMax',
  maximo: 'presupuestoMax',
  budgetmax: 'presupuestoMax',

  presupuesto: 'presupuesto',
  budget: 'presupuesto',

  zonas: 'zonasInteres',
  zona: 'zonasInteres',
  zonasinteres: 'zonasInteres',
  zonasdeinteres: 'zonasInteres',
  poblacion: 'zonasInteres',
  poblaciones: 'zonasInteres',
  municipio: 'zonasInteres',
  municipios: 'zonasInteres',

  tipooperacion: 'tipoOperacion',
  tipodeoperacion: 'tipoOperacion',
  operacion: 'tipoOperacion',

  origen: 'origen',
  fuente: 'origen',
  procedencia: 'origen',
  source: 'origen',

  notas: 'notas',
  nota: 'notas',
  observaciones: 'notas',
  comentarios: 'notas',
  comentario: 'notas',
};

/** Extrae la extension en minusculas del nombre original del fichero. */
export const getFileExtension = (filename: string): string => {
  const parts = String(filename ?? '').split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Convierte el fichero subido en filas crudas (objetos cabecera -> valor).
 *
 * @throws Error con mensaje en espanol si el formato no es legible.
 */
export const parseImportFile = (
  file: UploadedImportFile,
): Record<string, unknown>[] => {
  const extension = getFileExtension(file.originalname);

  if (extension === 'csv') {
    const text = file.buffer.toString('utf8').replace(/^\uFEFF/, '');
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
    });

    // Papaparse acumula errores por fila; solo aborta si no hay ninguna fila.
    if (!result.data.length && result.errors.length) {
      throw new Error(
        `No se ha podido leer el CSV: ${result.errors[0].message ?? 'formato no reconocido'}`,
      );
    }

    return result.data;
  }

  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El libro de cálculo no contiene ninguna hoja.');
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: '', raw: false },
  );
};

/**
 * Traduce una fila cruda al vocabulario del dominio.
 *
 * Las cabeceras desconocidas se ignoran en silencio: importar la agenda de la
 * despacho no puede fallar porque su Excel traiga una columna de más.
 */
export const mapRowToClientInput = (
  row: Record<string, unknown>,
): ImportedClientRow => {
  const mapped: ImportedClientRow = {};
  let presupuestoSuelto: string | undefined;

  for (const [header, rawValue] of Object.entries(row)) {
    const field = HEADER_ALIASES[normalizeHeader(header)];
    if (!field) continue;

    const value = emptyToUndefined(rawValue);
    if (value === undefined) continue;

    switch (field) {
      case 'nombre':
        // La primera cabecera que aporta nombre gana (p. ej. `nombre` sobre `empresa`).
        mapped.nombre = mapped.nombre ?? value;
        break;
      case 'apellidos':
        mapped.apellidos = value;
        break;
      case 'email':
        mapped.email = value.toLowerCase();
        break;
      case 'telefono':
        mapped.telefono = value;
        break;
      case 'documento':
        mapped.documento = value.toUpperCase();
        break;
      case 'tipo': {
        const tipo = Object.values(ClientType).find(
          (candidate) => candidate === normalizeKey(value),
        );
        if (tipo) mapped.tipo = tipo;
        break;
      }
      case 'lineaNegocio': {
        const linea = Object.values(BusinessLine).find(
          (candidate) => candidate === normalizeKey(value),
        );
        if (linea) mapped.lineaNegocio = linea;
        break;
      }
      case 'etapa':
        mapped.etapa = value;
        break;
      case 'presupuestoMin':
        mapped.presupuestoMin = parseAmount(value);
        break;
      case 'presupuestoMax':
        mapped.presupuestoMax = parseAmount(value);
        break;
      case 'presupuesto':
        presupuestoSuelto = value;
        break;
      case 'zonasInteres': {
        const zonas = normalizeZones(value);
        if (zonas.length) {
          mapped.zonasInteres = Array.from(
            new Set([...(mapped.zonasInteres ?? []), ...zonas]),
          );
        }
        break;
      }
      case 'tipoOperacion': {
        const operacion = normalizeOperationType(value);
        if (operacion) mapped.tipoOperacion = operacion;
        break;
      }
      case 'origen':
        mapped.origen = value;
        break;
      case 'notas':
        mapped.notas = value;
        break;
    }
  }

  // Una columna `presupuesto` suelta puede traer un rango ("120.000 - 180.000")
  // o un unico importe, que se interpreta como el techo del comprador.
  if (presupuestoSuelto !== undefined) {
    const partes = presupuestoSuelto
      .split(/\s*(?:-|–|a|hasta)\s*/i)
      .map((parte) => parseAmount(parte))
      .filter((parte): parte is number => parte !== undefined);

    if (partes.length >= 2) {
      mapped.presupuestoMin = mapped.presupuestoMin ?? Math.min(...partes);
      mapped.presupuestoMax = mapped.presupuestoMax ?? Math.max(...partes);
    } else if (partes.length === 1) {
      mapped.presupuestoMax = mapped.presupuestoMax ?? partes[0];
    }
  }

  return mapped;
};
