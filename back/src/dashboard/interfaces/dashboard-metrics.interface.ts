import { BusinessLine, ClientStage } from '../../clients/enums';
import { PropertyStatus } from '../../properties/enums/property-status.enum';
import { PropertyZone } from '../../properties/enums/property-zone.enum';
import { ContractState } from '../../contracts/enums/contract-state.enum';
import { NotificationPriority } from '../../notifications/enums/notification-type.enum';
import { NotificationEntityType } from '../../notifications/enums/notification-entity-type.enum';

/**
 * Contratos de datos del cuadro de mando.
 *
 * Todo lo que sale de aqui viene ya con su etiqueta en espanol resuelta: la
 * interfaz solo tiene que pintar, nunca traducir reglas de negocio.
 */

/** Recuento de una categoria cualquiera, listo para pintar una barra. */
export interface ICount<T extends string = string> {
  /** Valor canonico (clave del enum). */
  clave: T;
  /** Etiqueta en espanol. */
  label: string;
  /** Numero de registros. */
  total: number;
  /** Porcentaje sobre el total del grupo (0-100, un decimal). */
  porcentaje: number;
}

/** Embudo completo de una linea de negocio. */
export interface IBusinessLineFunnel {
  linea: BusinessLine;
  label: string;
  total: number;
  /** Todas las etapas del pipeline en orden, incluidas las que estan a cero. */
  etapas: ICount<ClientStage>[];
}

/** Metricas del dominio Clientes. */
export interface IClientsMetrics {
  total: number;
  activos: number;
  descartados: number;
  /** Altas del mes en curso. */
  nuevosMes: number;
  /** Embudo por linea de negocio (columnas del kanban). */
  porLinea: IBusinessLineFunnel[];
  /** Recuento global por etapa, de mayor a menor. */
  porEtapa: ICount<ClientStage>[];
  /** Presupuesto medio maximo de los inversores activos, en euros. */
  presupuestoMedio: number;
}

/** Metricas del dominio Inmuebles. */
export interface IPropertiesMetrics {
  total: number;
  disponibles: number;
  /** Suma del precio de los inmuebles no traspasados, en euros. */
  valorCartera: number;
  porEstado: ICount<PropertyStatus>[];
  porZona: ICount<PropertyZone>[];
}

/** Metricas del dominio Contratos. */
export interface IContractsMetrics {
  total: number;
  /** Enviados o vistos: a la espera de la firma del cliente. */
  pendientesFirma: number;
  firmados: number;
  /** Contratos firmados dentro del mes en curso. */
  firmadosMes: number;
  porEstado: ICount<ContractState>[];
}

/** Facturacion del mes en curso. */
export interface IBillingMetrics {
  /** Mes en formato `YYYY-MM`. */
  mes: string;
  /** Mes en espanol: `agosto de 2026`. */
  etiquetaMes: string;
  numeroFacturas: number;
  baseImponible: number;
  cuotaIva: number;
  /** Total facturado del mes (sin contar las anuladas). */
  total: number;
  cobrado: number;
  pendiente: number;
  anulado: number;
  /** Total facturado el mes anterior, para comparar. */
  totalMesAnterior: number;
  /** Variacion porcentual respecto al mes anterior. */
  variacion: number;
}

/** Apunte del historial de un cliente mostrado en «actividad reciente». */
export interface IRecentActivityItem {
  id: number;
  tipo: string;
  tipoLabel: string;
  descripcion: string;
  fecha: string;
  autor: string | null;
  clienteId: number;
  clienteNombre: string;
}

/** Tarea o aviso del dia calculado por el motor de reglas. */
export interface IDashboardTask {
  /** Identificador estable del aviso (`tipo:entidad:id`). */
  clave: string;
  tipo: string;
  tipoLabel: string;
  titulo: string;
  mensaje: string;
  prioridad: NotificationPriority;
  entidadTipo: NotificationEntityType | null;
  entidadId: number | null;
  entidadNombre: string | null;
  enlace: string | null;
  /** Fecha de referencia del aviso en ISO. */
  fecha: string | null;
  /** Dias que faltan (positivo) o que han pasado (negativo). */
  dias: number;
}

/** Elemento pendiente de firma (contratos enviados o vistos). */
export interface IPendingSignature {
  id: number;
  referencia: string;
  titulo: string;
  estado: ContractState;
  estadoLabel: string;
  clienteId: number | null;
  clienteNombre: string | null;
  destinatarioEmail: string | null;
  enviadoAt: string | null;
  /** Dias transcurridos desde el envio. */
  diasEnEspera: number;
}

/** Vencimiento proximo (contratos con fin de vigencia y facturas sin cobrar). */
export interface IUpcomingDeadline {
  tipo: 'contrato' | 'factura';
  id: number;
  referencia: string;
  descripcion: string;
  fecha: string;
  /** Dias que faltan. Negativo si ya ha vencido. */
  dias: number;
  clienteNombre: string | null;
}

/** Titulares del cuadro de mando (las tarjetas grandes de la cabecera). */
export interface IDashboardHeadline {
  clientesActivos: number;
  inmueblesCartera: number;
  contratosPendientesFirma: number;
  facturadoMes: number;
  /** Avisos sin atender (tareas del dia). */
  avisosAbiertos: number;
}

/** Respuesta completa de `GET /api/dashboard/resumen`. */
export interface IDashboardSummary {
  /** Momento del calculo, en ISO. */
  generadoAt: string;
  titulares: IDashboardHeadline;
  clientes: IClientsMetrics;
  propiedades: IPropertiesMetrics;
  contratos: IContractsMetrics;
  facturacion: IBillingMetrics;
  actividadReciente: IRecentActivityItem[];
  tareasHoy: IDashboardTask[];
  firmasPendientes: IPendingSignature[];
}
