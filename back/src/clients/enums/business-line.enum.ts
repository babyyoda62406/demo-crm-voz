/**
 * Lineas de negocio de Vantia. Cada linea tiene su propio pipeline de etapas
 * (ver `client-stage.enum.ts`).
 */
export enum BusinessLine {
  /** Personal shopper inmobiliario para inversores. */
  PSI = 'psi',
  /** Alquiler temporal a empresas. */
  ALQUILER_EMPRESAS = 'alquiler_empresas',
  /** Seguimiento de reformas. */
  REFORMAS = 'reformas',
}

/** Etiquetas en espanol para mostrar en la interfaz. */
export const BusinessLineLabels: Record<BusinessLine, string> = {
  [BusinessLine.PSI]: 'PSI para inversores',
  [BusinessLine.ALQUILER_EMPRESAS]: 'Alquiler temporal a empresas',
  [BusinessLine.REFORMAS]: 'Seguimiento de reformas',
};

/** Clases de color (Tailwind) asociadas a cada linea de negocio. */
export const BusinessLineColors: Record<BusinessLine, string> = {
  [BusinessLine.PSI]: 'bg-blue-100 text-blue-800 border-blue-200',
  [BusinessLine.ALQUILER_EMPRESAS]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [BusinessLine.REFORMAS]: 'bg-amber-100 text-amber-800 border-amber-200',
};

/** Listado ordenado de lineas de negocio. */
export const BusinessLineList: BusinessLine[] = [
  BusinessLine.PSI,
  BusinessLine.ALQUILER_EMPRESAS,
  BusinessLine.REFORMAS,
];
