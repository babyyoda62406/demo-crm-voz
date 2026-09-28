import {
  NotificationPriority,
  NotificationType,
} from '../enums/notification-type.enum';
import { NotificationEntityType } from '../enums/notification-entity-type.enum';
import { Notification } from '../entities/notification.entity';

/**
 * Carga con la que cualquier modulo de dominio emite una alerta.
 *
 * @example
 * ```ts
 * await this.notificationsService.emit({
 *   tipo: NotificationType.RECORDATORIO,
 *   titulo: 'Visita confirmada',
 *   mensaje: 'Visita al piso de Altabria mañana a las 10:00.',
 *   entidadTipo: NotificationEntityType.INMUEBLE,
 *   entidadId: 4,
 * });
 * ```
 */
export interface IEmitNotification {
  /** Tipo de alerta. Determina icono y color en la interfaz. */
  tipo: NotificationType;
  /** Titulo corto (una linea). */
  titulo: string;
  /** Cuerpo del aviso, redactado en espanol y listo para mostrarse. */
  mensaje: string;
  /** Prioridad de presentacion. Por defecto `MEDIA`. */
  prioridad?: NotificationPriority;
  /** Destinatario. Omitido = alerta general del despacho. */
  usuarioId?: number | null;
  /** Dominio de la entidad relacionada. */
  entidadTipo?: NotificationEntityType;
  /** Identificador de la entidad relacionada. */
  entidadId?: number;
  /** Texto identificativo de la entidad (referencia, nombre). */
  entidadNombre?: string;
  /** Ruta del front. Si se omite se deduce de `entidadTipo`. */
  enlace?: string;
  /**
   * Huella de deduplicacion. Si ya existe una alerta sin leer con la misma
   * clave, `emit()` no crea otra y devuelve la existente.
   */
  claveRegla?: string;
}

/**
 * Resultado de emitir un lote de alertas.
 *
 * Separa las que se han dado de alta de verdad de las que ya estaban sin leer:
 * repetir la revision no duplica nada, y quien la lanza necesita saber si ha
 * pasado algo o no.
 */
export interface IEmitManyResult {
  /** Alertas dadas de alta en esta pasada. */
  creadas: Notification[];
  /** Alertas que ya existian y cuyo texto se ha puesto al dia. */
  actualizadas: Notification[];
  /** Alertas que ya existian sin leer y no ha hecho falta tocar. */
  reutilizadas: Notification[];
}

/**
 * Resultado de una pasada del motor de reglas.
 *
 * Los recuentos por regla y el `total` cuentan alertas NUEVAS. `detectadas`
 * cuenta las coincidencias vivas, se hayan avisado hoy o en una pasada
 * anterior: en una segunda revision seguida lo normal es `detectadas: 7` con
 * `total: 0`.
 *
 * `cerradas` y `actualizadas` son las dos mitades del mantenimiento: la pasada
 * retira de la campana los avisos ya resueltos y reescribe los plazos de los
 * que siguen vivos. Tras una pasada, `detectadas` es exactamente el numero de
 * alertas automaticas sin leer, que es el mismo que ensena el cuadro de mando.
 */
export interface IRulesRunResult {
  /** Momento en el que se ejecuto la revision. */
  ejecutadoAt: Date;
  /** Alertas creadas por la regla de los 30 dias. */
  avisosProrroga: number;
  /** Alertas creadas por contratos enviados y sin firmar. */
  contratosSinFirmar: number;
  /** Alertas creadas por clientes sin actividad. */
  clientesSinActividad: number;
  /** Alertas creadas por facturas pendientes de cobro. */
  facturasVencidas: number;
  /** Total de alertas creadas en la pasada. */
  total: number;
  /** Coincidencias vivas detectadas, incluidas las ya avisadas antes. */
  detectadas: number;
  /** Alertas retiradas de la campana por dejar de cumplirse su condicion. */
  cerradas: number;
  /** Alertas vivas cuyo texto se ha reescrito con las cifras de hoy. */
  actualizadas: number;
  /**
   * Identificadores de las alertas creadas en la pasada. Lo usa la semilla para
   * anotar como «datos de demostracion» tambien las alertas que genera el motor
   * de reglas justo despues de sembrar.
   */
  idsCreados: number[];
}
