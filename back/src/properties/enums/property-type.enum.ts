/**
 * Tipología de inmueble de la cartera de Vantia.
 * Los valores son slugs sin tildes (seguros para el enum de PostgreSQL);
 * las etiquetas visibles en español viven en `PropertyTypeLabels`.
 */
export enum PropertyType {
  PISO = 'piso',
  LOCAL = 'local',
  CASA = 'casa',
}

/** Etiqueta en español de cada tipo de inmueble. */
export const PropertyTypeLabels: Record<PropertyType, string> = {
  [PropertyType.PISO]: 'Piso',
  [PropertyType.LOCAL]: 'Local',
  [PropertyType.CASA]: 'Casa',
};

/** Color de acento (hexadecimal) asociado a cada tipo. */
export const PropertyTypeColors: Record<PropertyType, string> = {
  [PropertyType.PISO]: '#2563EB',
  [PropertyType.LOCAL]: '#8B5CF6',
  [PropertyType.CASA]: '#0891B2',
};

/** Listado ordenado de tipos, para catálogos y desplegables. */
export const PROPERTY_TYPES: PropertyType[] = Object.values(PropertyType);
