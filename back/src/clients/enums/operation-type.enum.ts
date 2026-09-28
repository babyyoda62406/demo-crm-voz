import { normalizeKey } from '../helpers/normalize-text.helper';

/** Tipo de operacion que busca el cliente. */
export enum OperationType {
  COMPRA_INVERSION = 'compra_inversion',
  COMPRA_VIVIENDA = 'compra_vivienda',
  ALQUILER_TEMPORAL = 'alquiler_temporal',
  ALQUILER_LARGA_ESTANCIA = 'alquiler_larga_estancia',
  REFORMA_INTEGRAL = 'reforma_integral',
  VENTA = 'venta',
}

/** Etiquetas en espanol para mostrar en la interfaz. */
export const OperationTypeLabels: Record<OperationType, string> = {
  [OperationType.COMPRA_INVERSION]: 'Compra para inversión',
  [OperationType.COMPRA_VIVIENDA]: 'Compra de vivienda',
  [OperationType.ALQUILER_TEMPORAL]: 'Alquiler temporal',
  [OperationType.ALQUILER_LARGA_ESTANCIA]: 'Alquiler de larga estancia',
  [OperationType.REFORMA_INTEGRAL]: 'Reforma integral',
  [OperationType.VENTA]: 'Venta',
};

/** Clases de color (Tailwind) asociadas a cada tipo de operacion. */
export const OperationTypeColors: Record<OperationType, string> = {
  [OperationType.COMPRA_INVERSION]: 'bg-blue-100 text-blue-800 border-blue-200',
  [OperationType.COMPRA_VIVIENDA]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [OperationType.ALQUILER_TEMPORAL]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [OperationType.ALQUILER_LARGA_ESTANCIA]: 'bg-teal-100 text-teal-800 border-teal-200',
  [OperationType.REFORMA_INTEGRAL]: 'bg-amber-100 text-amber-800 border-amber-200',
  [OperationType.VENTA]: 'bg-rose-100 text-rose-800 border-rose-200',
};

/** Listado ordenado de tipos de operacion. */
export const OperationTypeList: OperationType[] = [
  OperationType.COMPRA_INVERSION,
  OperationType.COMPRA_VIVIENDA,
  OperationType.ALQUILER_TEMPORAL,
  OperationType.ALQUILER_LARGA_ESTANCIA,
  OperationType.REFORMA_INTEGRAL,
  OperationType.VENTA,
];

/** Sinonimos admitidos al importar ficheros. */
const OperationSynonyms: Record<string, OperationType> = {
  inversion: OperationType.COMPRA_INVERSION,
  compra: OperationType.COMPRA_VIVIENDA,
  vivienda: OperationType.COMPRA_VIVIENDA,
  alquiler: OperationType.ALQUILER_LARGA_ESTANCIA,
  temporal: OperationType.ALQUILER_TEMPORAL,
  corporate_housing: OperationType.ALQUILER_TEMPORAL,
  larga_estancia: OperationType.ALQUILER_LARGA_ESTANCIA,
  reforma: OperationType.REFORMA_INTEGRAL,
  obra: OperationType.REFORMA_INTEGRAL,
  vender: OperationType.VENTA,
};

/**
 * Traduce un texto libre a un tipo de operacion canonico.
 * @returns El tipo de operacion o `null` si no se reconoce.
 */
export const normalizeOperationType = (
  raw: string | null | undefined,
): OperationType | null => {
  const key = normalizeKey(raw);
  if (!key) return null;

  const direct = Object.values(OperationType).find((type) => type === key);
  return direct ?? OperationSynonyms[key] ?? null;
};
