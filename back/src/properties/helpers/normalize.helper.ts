import {
  PropertyType,
  PropertyTypeLabels,
  PROPERTY_TYPES,
} from '../enums/property-type.enum';
import {
  PropertyStatus,
  PropertyStatusLabels,
  PROPERTY_STATUSES,
} from '../enums/property-status.enum';
import {
  PropertyZone,
  PropertyZoneLabels,
  PROPERTY_ZONES,
} from '../enums/property-zone.enum';

/**
 * Reduce un texto a su forma comparable: sin tildes, en minúsculas y sin
 * separadores. «En Reforma», «en-reforma» y «EN_REFORMA» acaban siendo iguales.
 */
export const slugify = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Sinónimos habituales que la persona usuaria (o el asistente) puede dictar. */
const TYPE_SYNONYMS: Record<string, PropertyType> = {
  apartamento: PropertyType.PISO,
  atico: PropertyType.PISO,
  duplex: PropertyType.PISO,
  estudio: PropertyType.PISO,
  vivienda: PropertyType.PISO,
  localcomercial: PropertyType.LOCAL,
  comercial: PropertyType.LOCAL,
  bajocomercial: PropertyType.LOCAL,
  nave: PropertyType.LOCAL,
  chalet: PropertyType.CASA,
  adosado: PropertyType.CASA,
  unifamiliar: PropertyType.CASA,
  casaunifamiliar: PropertyType.CASA,
  torre: PropertyType.CASA,
};

const STATUS_SYNONYMS: Record<string, PropertyStatus> = {
  libre: PropertyStatus.DISPONIBLE,
  activo: PropertyStatus.DISPONIBLE,
  encompra: PropertyStatus.EN_COMPRA,
  compra: PropertyStatus.EN_COMPRA,
  comprando: PropertyStatus.EN_COMPRA,
  enreforma: PropertyStatus.EN_REFORMA,
  reforma: PropertyStatus.EN_REFORMA,
  enobras: PropertyStatus.EN_REFORMA,
  obras: PropertyStatus.EN_REFORMA,
  arrendado: PropertyStatus.ALQUILADO,
  traspaso: PropertyStatus.TRASPASADO,
  vendido: PropertyStatus.TRASPASADO,
};

const ZONE_SYNONYMS: Record<string, PropertyZone> = {
  maraltta: PropertyZone.MARALTA,
  vilareial: PropertyZone.MARALTA,
  vilarreal: PropertyZone.MARALTA,
  alba_mar: PropertyZone.ALBAMAR,
  riba_verde: PropertyZone.RIBAVERDE,
};

/**
 * Traduce un texto libre a un valor del enum comparando contra los propios
 * valores, sus etiquetas en español y una tabla de sinónimos.
 */
const matchEnum = <T extends string>(
  raw: unknown,
  values: T[],
  labels: Record<T, string>,
  synonyms: Record<string, T>,
): T | undefined => {
  const key = slugify(raw);
  if (!key) return undefined;

  const direct = values.find((value) => slugify(value) === key);
  if (direct) return direct;

  const byLabel = values.find((value) => slugify(labels[value]) === key);
  if (byLabel) return byLabel;

  return synonyms[key];
};

/** Normaliza un texto libre a un `PropertyType`, o `undefined` si no encaja. */
export const normalizeType = (raw: unknown): PropertyType | undefined =>
  matchEnum(raw, PROPERTY_TYPES, PropertyTypeLabels, TYPE_SYNONYMS);

/** Normaliza un texto libre a un `PropertyStatus`, o `undefined` si no encaja. */
export const normalizeStatus = (raw: unknown): PropertyStatus | undefined =>
  matchEnum(raw, PROPERTY_STATUSES, PropertyStatusLabels, STATUS_SYNONYMS);

/** Normaliza un texto libre a una `PropertyZone`, o `undefined` si no encaja. */
export const normalizeZone = (raw: unknown): PropertyZone | undefined =>
  matchEnum(raw, PROPERTY_ZONES, PropertyZoneLabels, ZONE_SYNONYMS);

/**
 * Convierte un valor heterogéneo (array, cadena separada por comas, objeto
 * JSON) en una lista de textos limpios. Se usa al leer el perfil inversor del
 * cliente, cuyo esquema pertenece a otro dominio.
 */
export const toTextList = (raw: unknown): string[] => {
  if (raw === undefined || raw === null) return [];
  if (Array.isArray(raw)) return raw.flatMap((item) => toTextList(item));
  if (typeof raw === 'object') return toTextList(Object.values(raw));
  return String(raw)
    .split(/[,;/|]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

/** Convierte un valor heterogéneo en número, o `undefined` si no lo es. */
export const toNumber = (raw: unknown): number | undefined => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const parsed =
    typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};
