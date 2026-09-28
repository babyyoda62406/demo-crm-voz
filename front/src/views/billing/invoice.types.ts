/**
 * Tipos del dominio Facturación. Reflejan exactamente el contrato que expone
 * `back/src/billing` (entidad `Invoice` y DTOs asociados).
 */

/** Estados del ciclo de vida de una factura. */
export const InvoiceStatus = {
  EMITIDA: 'emitida',
  COBRADA: 'cobrada',
  ANULADA: 'anulada',
} as const;

export type InvoiceStatusType = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

/** Etiqueta en español de cada estado. */
export const InvoiceStatusLabels: Record<InvoiceStatusType, string> = {
  [InvoiceStatus.EMITIDA]: 'Emitida',
  [InvoiceStatus.COBRADA]: 'Cobrada',
  [InvoiceStatus.ANULADA]: 'Anulada',
};

/** Línea de detalle tal como la devuelve el backend (con el importe calculado). */
export interface InvoiceLine {
  concepto: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

/** Línea en edición dentro del formulario (el importe se calcula en vivo). */
export interface InvoiceLineDraft {
  concepto: string;
  cantidad: string;
  precioUnitario: string;
}

export interface Invoice {
  id: number;
  numero: string;
  ejercicio: number;
  secuencia: number;
  clienteId: number;
  clienteNombre: string;
  clienteDocumento?: string | null;
  clienteDireccion?: string | null;
  clienteEmail?: string | null;
  contratoId?: number | null;
  contratoReferencia?: string | null;
  lineas: InvoiceLine[];
  baseImponible: number;
  tipoIva: number;
  cuotaIva: number;
  total: number;
  estado: InvoiceStatusType;
  fechaEmision: string;
  fechaCobro?: string | null;
  notas?: string | null;
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Totales agregados de un periodo o de un cliente. */
export interface InvoiceSummary {
  numeroFacturas: number;
  baseImponible: number;
  cuotaIva: number;
  total: number;
  totalCobrado: number;
  totalPendiente: number;
  totalAnulado: number;
}

/** Histórico de facturación de un cliente. */
export interface ClientInvoiceHistory {
  clienteId: number;
  clienteNombre: string | null;
  facturas: Invoice[];
  resumen: InvoiceSummary;
}

/** Cuerpo del alta y de la edición de facturas. */
export interface InvoicePayload {
  clienteId: number;
  clienteNombre: string;
  clienteDocumento?: string;
  clienteDireccion?: string;
  clienteEmail?: string;
  contratoId?: number;
  contratoReferencia?: string;
  lineas: { concepto: string; cantidad: number; precioUnitario: number }[];
  tipoIva?: number;
  fechaEmision?: string;
  notas?: string;
}

/** Cuerpo de la generación de factura a partir de un contrato. */
export interface InvoiceFromContractPayload {
  contratoId: number;
  clienteId?: number;
  clienteNombre?: string;
  clienteDocumento?: string;
  clienteDireccion?: string;
  clienteEmail?: string;
  contratoReferencia?: string;
  concepto?: string;
  importe?: number;
  cantidad?: number;
  tipoIva?: number;
  fechaEmision?: string;
  notas?: string;
}

/** Filtros del listado y del resumen de totales. */
export interface InvoiceFilters {
  page?: number;
  size?: number;
  estado?: InvoiceStatusType | '';
  clienteId?: number | '';
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

// ---------------------------------------------------------------------------
// Apoyo a la interfaz (no forman parte del contrato del backend)
// ---------------------------------------------------------------------------

/** Cliente reducido a lo que necesitan los desplegables de facturación. */
export interface ClientOption {
  id: number;
  nombre: string;
  documento?: string | null;
  email?: string | null;
  direccion?: string | null;
}

/** Contrato reducido a lo que necesita la emisión desde contrato. */
export interface ContractOption {
  id: number;
  referencia: string;
  titulo: string;
  clienteId?: number | null;
  clienteNombre?: string | null;
  estado?: string | null;
}
