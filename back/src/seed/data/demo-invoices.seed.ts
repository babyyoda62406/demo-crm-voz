import { InvoiceStatus } from '../../billing/enums/invoice-status.enum';

/** Linea de detalle de una factura de demostracion (el importe lo calcula el servicio). */
export interface IDemoInvoiceLine {
  concepto: string;
  cantidad: number;
  precioUnitario: number;
}

/**
 * Momento de emision de la factura.
 * - `diaDelMes`: dia del mes EN CURSO (se recorta a hoy si aun no ha llegado),
 *   para que la facturacion del mes nunca salga vacia en la demo.
 * - `hace`: dias hacia atras desde hoy.
 */
export type IDemoInvoiceDate = { diaDelMes: number } | { hace: number };

/**
 * Factura de demostracion.
 *
 * NO lleva numero: la secuencia (`FRA-2026-0001`, `0002`, ...) la asigna
 * `SeedService` ordenando las facturas por fecha de emision. Declararla aqui a
 * mano fue la causa de que la demo ensenara la 0003 y la 0004 emitidas ANTES
 * que la 0001, que es justo lo que una numeracion correlativa no puede hacer.
 */
export interface IDemoInvoice {
  /** Cliente facturado (clave `ref` de `DEMO_CLIENTS`). */
  clienteRef: string;
  /** Contrato de origen (clave `ref` de `DEMO_CONTRACTS`), si lo hay. */
  contratoRef?: string;
  lineas: IDemoInvoiceLine[];
  tipoIva: number;
  estado: InvoiceStatus;
  emision: IDemoInvoiceDate;
  /** Dias transcurridos desde el cobro. Solo con estado `cobrada`. */
  cobroHace?: number;
  notas?: string;
}

/**
 * Cuatro facturas: dos de meses anteriores (una de ellas con el cobro atrasado,
 * para que salte el aviso de cobro pendiente) y dos del mes en curso, una
 * cobrada y otra pendiente, para que la tarjeta de facturacion del panel tenga
 * dato y comparativa.
 *
 * Van escritas de la mas antigua a la mas reciente, que es el orden en el que
 * se numeraran. Las dos primeras usan `hace` (41 y 54 dias, siempre en un mes
 * anterior) y las dos ultimas `diaDelMes` del mes en curso, asi que el orden
 * cronologico se mantiene se lance la semilla el dia que se lance.
 */
export const DEMO_INVOICES: IDemoInvoice[] = [
  {
    clienteRef: 'ibarra',
    lineas: [
      {
        concepto: 'Dirección y seguimiento de obra — certificación mensual de reforma',
        cantidad: 2,
        precioUnitario: 1100,
      },
    ],
    tipoIva: 21,
    estado: InvoiceStatus.EMITIDA,
    emision: { hace: 54 },
    notas: 'Pendiente de cobro. Reclamada por teléfono sin respuesta.',
  },
  {
    clienteRef: 'escalante',
    lineas: [
      {
        concepto: 'Honorarios de intermediación en la reserva de la vivienda de Serranova',
        cantidad: 1,
        precioUnitario: 3000,
      },
    ],
    tipoIva: 21,
    estado: InvoiceStatus.COBRADA,
    emision: { hace: 41 },
    cobroHace: 33,
    notas: 'Cobrada el mismo día de la firma del documento de reserva.',
  },
  {
    clienteRef: 'duarte',
    contratoRef: 'psi-duarte',
    lineas: [
      {
        concepto:
          'Honorarios de personal shopper inmobiliario — primer pago (50 %) del encargo de búsqueda',
        cantidad: 1,
        precioUnitario: 1500,
      },
    ],
    tipoIva: 21,
    estado: InvoiceStatus.COBRADA,
    emision: { diaDelMes: 4 },
    cobroHace: 3,
    notas: 'Cobrada por transferencia. Segundo pago al formalizar la compraventa.',
  },
  {
    clienteRef: 'orion',
    contratoRef: 'alquiler-orion',
    lineas: [
      {
        concepto: 'Gestión integral del alquiler temporal — mensualidad',
        cantidad: 1,
        precioUnitario: 950,
      },
      {
        concepto: 'Servicio de limpieza y reposición de la vivienda',
        cantidad: 2,
        precioUnitario: 85,
      },
    ],
    tipoIva: 21,
    estado: InvoiceStatus.EMITIDA,
    emision: { diaDelMes: 9 },
    notas: 'Vence a 30 días desde la emisión.',
  },
];
