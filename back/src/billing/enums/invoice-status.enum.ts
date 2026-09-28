/**
 * Estados del ciclo de vida de una factura.
 *
 * - `EMITIDA`: factura creada y numerada, pendiente de cobro.
 * - `COBRADA`: el importe ha sido percibido (lleva `fechaCobro`).
 * - `ANULADA`: factura invalidada. Conserva su número (la numeración es
 *   correlativa y no se reutiliza) pero no computa en la facturación.
 */
export enum InvoiceStatus {
  EMITIDA = 'emitida',
  COBRADA = 'cobrada',
  ANULADA = 'anulada',
}

/** Etiquetas en español para mostrar en la interfaz y en el PDF. */
export const InvoiceStatusLabels: Record<InvoiceStatus, string> = {
  [InvoiceStatus.EMITIDA]: 'Emitida',
  [InvoiceStatus.COBRADA]: 'Cobrada',
  [InvoiceStatus.ANULADA]: 'Anulada',
};
