/**
 * Contratos de datos del cuadro de mando.
 *
 * Espejo de `back/src/dashboard/interfaces/dashboard-metrics.interface.ts`.
 * El backend resuelve las etiquetas en español y los porcentajes: aquí solo se
 * pinta, nunca se traducen reglas de negocio.
 */

/** Prioridad con la que se muestra una alerta. */
export const NotificationPriority = {
  ALTA: 'alta',
  MEDIA: 'media',
  BAJA: 'baja',
} as const;

export type NotificationPriorityType =
  (typeof NotificationPriority)[keyof typeof NotificationPriority];

/** Etiquetas en español de la prioridad. */
export const NotificationPriorityLabels: Record<NotificationPriorityType, string> = {
  [NotificationPriority.ALTA]: 'Alta',
  [NotificationPriority.MEDIA]: 'Media',
  [NotificationPriority.BAJA]: 'Baja',
};

/** Recuento de una categoría, listo para pintar una barra. */
export interface Recuento {
  /** Valor canónico (clave del enum del backend). */
  clave: string;
  /** Etiqueta en español. */
  label: string;
  total: number;
  /** Porcentaje sobre el total del grupo (0-100, un decimal). */
  porcentaje: number;
}

/** Embudo completo de una línea de negocio. */
export interface EmbudoLinea {
  linea: string;
  label: string;
  total: number;
  /** Todas las etapas del pipeline en orden, incluidas las que están a cero. */
  etapas: Recuento[];
}

export interface MetricasClientes {
  total: number;
  activos: number;
  descartados: number;
  nuevosMes: number;
  porLinea: EmbudoLinea[];
  porEtapa: Recuento[];
  presupuestoMedio: number;
}

export interface MetricasPropiedades {
  total: number;
  disponibles: number;
  valorCartera: number;
  porEstado: Recuento[];
  porZona: Recuento[];
}

export interface MetricasContratos {
  total: number;
  /** Enviados o vistos: a la espera de la firma del cliente. */
  pendientesFirma: number;
  firmados: number;
  firmadosMes: number;
  porEstado: Recuento[];
}

export interface MetricasFacturacion {
  /** Mes en formato `YYYY-MM`. */
  mes: string;
  /** Mes en español: `agosto de 2026`. */
  etiquetaMes: string;
  numeroFacturas: number;
  baseImponible: number;
  cuotaIva: number;
  total: number;
  cobrado: number;
  pendiente: number;
  anulado: number;
  totalMesAnterior: number;
  /** Variación porcentual respecto al mes anterior. */
  variacion: number;
}

/** Apunte del historial de un cliente mostrado en «actividad reciente». */
export interface ActividadReciente {
  id: number;
  tipo: string;
  tipoLabel: string;
  descripcion: string;
  fecha: string;
  autor: string | null;
  clienteId: number;
  clienteNombre: string;
}

/** Tarea o aviso del día calculado por el motor de reglas. */
export interface TareaHoy {
  /** Identificador estable del aviso (`tipo:entidad:id`). */
  clave: string;
  tipo: string;
  tipoLabel: string;
  titulo: string;
  mensaje: string;
  prioridad: NotificationPriorityType;
  entidadTipo: string | null;
  entidadId: number | null;
  entidadNombre: string | null;
  enlace: string | null;
  fecha: string | null;
  /** Días que faltan (positivo) o que han pasado (negativo). */
  dias: number;
}

/** Contrato enviado o visto que sigue a la espera de firma. */
export interface FirmaPendiente {
  id: number;
  referencia: string;
  titulo: string;
  estado: string;
  estadoLabel: string;
  clienteId: number | null;
  clienteNombre: string | null;
  destinatarioEmail: string | null;
  enviadoAt: string | null;
  diasEnEspera: number;
}

/** Vencimiento próximo (contratos con fin de vigencia y facturas sin cobrar). */
export interface VencimientoProximo {
  tipo: 'contrato' | 'factura';
  id: number;
  referencia: string;
  descripcion: string;
  fecha: string;
  /** Días que faltan. Negativo si ya ha vencido. */
  dias: number;
  clienteNombre: string | null;
}

/** Titulares del cuadro de mando (las tarjetas grandes de la cabecera). */
export interface TitularesDashboard {
  clientesActivos: number;
  inmueblesCartera: number;
  contratosPendientesFirma: number;
  facturadoMes: number;
  avisosAbiertos: number;
}

/** Respuesta completa de `GET /api/dashboard/resumen`. */
export interface ResumenDashboard {
  generadoAt: string;
  titulares: TitularesDashboard;
  clientes: MetricasClientes;
  propiedades: MetricasPropiedades;
  contratos: MetricasContratos;
  facturacion: MetricasFacturacion;
  actividadReciente: ActividadReciente[];
  tareasHoy: TareaHoy[];
  firmasPendientes: FirmaPendiente[];
}
