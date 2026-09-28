/**
 * Estado comercial del inmueble dentro del ciclo de vida de Vantia
 *.
 */
export enum PropertyStatus {
  DISPONIBLE = 'disponible',
  RESERVADO = 'reservado',
  EN_COMPRA = 'en_compra',
  EN_REFORMA = 'en_reforma',
  ALQUILADO = 'alquilado',
  TRASPASADO = 'traspasado',
}

/** Etiqueta en español de cada estado. */
export const PropertyStatusLabels: Record<PropertyStatus, string> = {
  [PropertyStatus.DISPONIBLE]: 'Disponible',
  [PropertyStatus.RESERVADO]: 'Reservado',
  [PropertyStatus.EN_COMPRA]: 'En compra',
  [PropertyStatus.EN_REFORMA]: 'En reforma',
  [PropertyStatus.ALQUILADO]: 'Alquilado',
  [PropertyStatus.TRASPASADO]: 'Traspasado',
};

/** Color (hexadecimal) con el que se pinta cada estado en la interfaz. */
export const PropertyStatusColors: Record<PropertyStatus, string> = {
  [PropertyStatus.DISPONIBLE]: '#059669',
  [PropertyStatus.RESERVADO]: '#D97706',
  [PropertyStatus.EN_COMPRA]: '#2563EB',
  [PropertyStatus.EN_REFORMA]: '#7C3AED',
  [PropertyStatus.ALQUILADO]: '#0891B2',
  [PropertyStatus.TRASPASADO]: '#64748B',
};

/** Listado ordenado de estados, para catálogos y desplegables. */
export const PROPERTY_STATUSES: PropertyStatus[] = Object.values(PropertyStatus);

/**
 * Estados que se consideran comercializables: son los únicos que entran por
 * defecto en el cruce de coincidencias con el perfil del inversor.
 */
export const MATCHABLE_PROPERTY_STATUSES: PropertyStatus[] = [
  PropertyStatus.DISPONIBLE,
  PropertyStatus.EN_REFORMA,
];
