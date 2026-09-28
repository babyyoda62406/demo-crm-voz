import { normalizeKey } from '../helpers/normalize-text.helper';

/**
 * Zonas en las que opera Vantia. Un cliente puede tener varias zonas de
 * interes (se guardan como `simple-array` en la entidad).
 */
export enum InterestZone {
  ALTABRIA = 'altabria',
  VALDEMOR = 'valdemor',
  SERRANOVA = 'serranova',
  PUENTEALBA = 'puentealba',
  MARALTA = 'maralta',
  ALBAMAR = 'albamar',
  RIBAVERDE = 'ribaverde',
}

/** Etiquetas en espanol (con tildes) para mostrar en la interfaz. */
export const InterestZoneLabels: Record<InterestZone, string> = {
  [InterestZone.ALTABRIA]: 'Altabria',
  [InterestZone.VALDEMOR]: 'Valdemor',
  [InterestZone.SERRANOVA]: 'Serranova',
  [InterestZone.PUENTEALBA]: 'Puentealba',
  [InterestZone.MARALTA]: 'Maralta',
  [InterestZone.ALBAMAR]: 'Albamar',
  [InterestZone.RIBAVERDE]: 'Ribaverde',
};

/** Clases de color (Tailwind) asociadas a cada zona. */
export const InterestZoneColors: Record<InterestZone, string> = {
  [InterestZone.ALTABRIA]: 'bg-blue-100 text-blue-800 border-blue-200',
  [InterestZone.VALDEMOR]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [InterestZone.SERRANOVA]: 'bg-violet-100 text-violet-800 border-violet-200',
  [InterestZone.PUENTEALBA]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [InterestZone.MARALTA]: 'bg-amber-100 text-amber-800 border-amber-200',
  [InterestZone.ALBAMAR]: 'bg-orange-100 text-orange-800 border-orange-200',
  [InterestZone.RIBAVERDE]: 'bg-teal-100 text-teal-800 border-teal-200',
};

/** Listado ordenado de zonas (comarca de Nortia primero, Marenza después). */
export const InterestZoneList: InterestZone[] = [
  InterestZone.ALTABRIA,
  InterestZone.VALDEMOR,
  InterestZone.SERRANOVA,
  InterestZone.PUENTEALBA,
  InterestZone.MARALTA,
  InterestZone.ALBAMAR,
  InterestZone.RIBAVERDE,
];

/** Sinonimos y grafias alternativas admitidas al importar ficheros. */
const ZoneSynonyms: Record<string, InterestZone> = {
  altabriaa: InterestZone.ALTABRIA,
  valdemorr: InterestZone.VALDEMOR,
  serranova_norte: InterestZone.SERRANOVA,
  mar_alta: InterestZone.MARALTA,
  maraltta: InterestZone.MARALTA,
  maralta_costa: InterestZone.MARALTA,
  alba_mar: InterestZone.ALBAMAR,
  riba_verde: InterestZone.RIBAVERDE,
};

/**
 * Traduce un texto libre a una zona canonica.
 * @returns La zona o `null` si no se reconoce.
 */
export const normalizeZone = (
  raw: string | null | undefined,
): InterestZone | null => {
  const key = normalizeKey(raw);
  if (!key) return null;

  const direct = Object.values(InterestZone).find((zone) => zone === key);
  return direct ?? ZoneSynonyms[key] ?? null;
};

/**
 * Traduce una lista (o una cadena separada por comas / punto y coma) a zonas
 * canonicas, descartando en silencio lo que no se reconoce.
 */
export const normalizeZones = (
  raw: string | string[] | null | undefined,
): InterestZone[] => {
  if (!raw) return [];
  const parts = Array.isArray(raw) ? raw : String(raw).split(/[,;|]/);
  const zones = parts
    .map((part) => normalizeZone(part))
    .filter((zone): zone is InterestZone => zone !== null);

  return Array.from(new Set(zones));
};
