import type { PropertyStatus, PropertyType, PropertyZone } from '../types/property.types';

/** Etiqueta en español de cada estado comercial. */
export const PropertyStatusLabels: Record<PropertyStatus, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  en_compra: 'En compra',
  en_reforma: 'En reforma',
  alquilado: 'Alquilado',
  traspasado: 'Traspasado',
};

/** Clases del distintivo de estado (cristal tintado del color del estado). */
export const PropertyStatusColors: Record<PropertyStatus, string> = {
  disponible: 'bg-emerald-500/25 text-emerald-900 border-emerald-600/40',
  reservado: 'bg-amber-500/25 text-amber-900 border-amber-600/40',
  en_compra: 'bg-blue-500/25 text-blue-900 border-blue-600/40',
  en_reforma: 'bg-violet-500/25 text-violet-900 border-violet-600/40',
  alquilado: 'bg-cyan-500/25 text-cyan-900 border-cyan-600/40',
  traspasado: 'bg-slate-500/25 text-slate-900 border-slate-600/40',
};

/**
 * Distintivo de estado para cuando va encima de una foto: color sólido y texto
 * blanco, porque el cristal tintado se pierde sobre imágenes oscuras.
 */
export const PropertyStatusOverlayColors: Record<PropertyStatus, string> = {
  disponible: 'bg-emerald-600/90 text-white border-emerald-700/60',
  reservado: 'bg-amber-600/90 text-white border-amber-700/60',
  en_compra: 'bg-blue-600/90 text-white border-blue-700/60',
  en_reforma: 'bg-violet-600/90 text-white border-violet-700/60',
  alquilado: 'bg-cyan-700/90 text-white border-cyan-800/60',
  traspasado: 'bg-slate-600/90 text-white border-slate-700/60',
};

/** Punto de color sólido del estado (leyendas y listas). */
export const PropertyStatusDots: Record<PropertyStatus, string> = {
  disponible: 'bg-emerald-600',
  reservado: 'bg-amber-600',
  en_compra: 'bg-blue-600',
  en_reforma: 'bg-violet-600',
  alquilado: 'bg-cyan-600',
  traspasado: 'bg-slate-600',
};

export const PropertyTypeLabels: Record<PropertyType, string> = {
  piso: 'Piso',
  local: 'Local',
  casa: 'Casa',
};

export const PropertyZoneLabels: Record<PropertyZone, string> = {
  altabria: 'Altabria',
  valdemor: 'Valdemor',
  serranova: 'Serranova',
  puentealba: 'Puentealba',
  maralta: 'Maralta',
  albamar: 'Albamar',
  ribaverde: 'Ribaverde',
};

/** Listados ordenados para desplegables y selectores múltiples. */
export const PROPERTY_STATUSES: PropertyStatus[] = [
  'disponible',
  'reservado',
  'en_compra',
  'en_reforma',
  'alquilado',
  'traspasado',
];

export const PROPERTY_TYPES: PropertyType[] = ['piso', 'local', 'casa'];

export const PROPERTY_ZONES: PropertyZone[] = [
  'altabria',
  'valdemor',
  'serranova',
  'puentealba',
  'maralta',
  'albamar',
  'ribaverde',
];

/** Opciones `{ value, label }` listas para `FilterBar` y los `<select>`. */
export const statusOptions = PROPERTY_STATUSES.map((value) => ({
  value,
  label: PropertyStatusLabels[value],
}));

export const typeOptions = PROPERTY_TYPES.map((value) => ({
  value,
  label: PropertyTypeLabels[value],
}));

export const zoneOptions = PROPERTY_ZONES.map((value) => ({
  value,
  label: PropertyZoneLabels[value],
}));

/** Texto en español que explica de dónde salen los criterios del cruce. */
export const ProfileSourceLabels: Record<string, string> = {
  cliente: 'Criterios de la ficha del cliente',
  parametros: 'Criterios introducidos a mano',
  mixto: 'Ficha del cliente + ajustes manuales',
  vacio: 'Sin criterios: se muestra toda la cartera disponible',
};

/** Color del anillo de puntuación según lo buena que sea la coincidencia. */
export const scoreTone = (score: number): { ring: string; text: string; label: string } => {
  if (score >= 80) return { ring: '#059669', text: 'text-emerald-800', label: 'Encaje excelente' };
  if (score >= 60) return { ring: '#2563EB', text: 'text-blue-800', label: 'Buen encaje' };
  if (score >= 40) return { ring: '#D97706', text: 'text-amber-800', label: 'Encaje parcial' };
  return { ring: '#64748B', text: 'text-slate-700', label: 'Encaje bajo' };
};
