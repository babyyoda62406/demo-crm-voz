/**
 * Línea de detalle de una factura. Se persiste como JSON dentro de la propia
 * factura (`invoices.lineas`): una vez emitida, la factura es un documento
 * cerrado y sus líneas no deben depender de otras tablas.
 */
export interface IInvoiceLine {
  /** Descripción del servicio facturado. */
  concepto: string;
  /** Unidades o meses facturados. */
  cantidad: number;
  /** Precio por unidad, en euros y sin IVA. */
  precioUnitario: number;
  /** Importe de la línea (`cantidad * precioUnitario`), calculado en servidor. */
  importe: number;
}

/** Totales agregados de un conjunto de facturas (periodo, cliente, filtro...). */
export interface IInvoiceSummary {
  /** Número de facturas que cumplen el filtro (incluidas las anuladas). */
  numeroFacturas: number;
  /** Suma de bases imponibles, excluidas las facturas anuladas. */
  baseImponible: number;
  /** Suma de cuotas de IVA, excluidas las facturas anuladas. */
  cuotaIva: number;
  /** Suma de totales (base + IVA), excluidas las facturas anuladas. */
  total: number;
  /** Total de las facturas en estado `cobrada`. */
  totalCobrado: number;
  /** Total de las facturas en estado `emitida` (pendientes de cobro). */
  totalPendiente: number;
  /** Total de las facturas en estado `anulada`. */
  totalAnulado: number;
}
