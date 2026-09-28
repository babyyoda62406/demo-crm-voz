/**
 * Las siete zonas de operación del despacho.
 * Los valores son slugs sin tildes; la etiqueta con tilde va en `PropertyZoneLabels`.
 */
export enum PropertyZone {
  ALTABRIA = 'altabria',
  VALDEMOR = 'valdemor',
  SERRANOVA = 'serranova',
  PUENTEALBA = 'puentealba',
  MARALTA = 'maralta',
  ALBAMAR = 'albamar',
  RIBAVERDE = 'ribaverde',
}

/** Etiqueta en español (con tildes) de cada zona. */
export const PropertyZoneLabels: Record<PropertyZone, string> = {
  [PropertyZone.ALTABRIA]: 'Altabria',
  [PropertyZone.VALDEMOR]: 'Valdemor',
  [PropertyZone.SERRANOVA]: 'Serranova',
  [PropertyZone.PUENTEALBA]: 'Puentealba',
  [PropertyZone.MARALTA]: 'Maralta',
  [PropertyZone.ALBAMAR]: 'Albamar',
  [PropertyZone.RIBAVERDE]: 'Ribaverde',
};

/** Provincia a la que pertenece cada zona (se usa como valor por defecto). */
export const PropertyZoneProvinces: Record<PropertyZone, string> = {
  [PropertyZone.ALTABRIA]: 'Nortia',
  [PropertyZone.VALDEMOR]: 'Nortia',
  [PropertyZone.SERRANOVA]: 'Nortia',
  [PropertyZone.PUENTEALBA]: 'Nortia',
  [PropertyZone.MARALTA]: 'Marenza',
  [PropertyZone.ALBAMAR]: 'Marenza',
  [PropertyZone.RIBAVERDE]: 'Marenza',
};

/** Listado ordenado de zonas, para catálogos y desplegables. */
export const PROPERTY_ZONES: PropertyZone[] = Object.values(PropertyZone);
