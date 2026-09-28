/**
 * Contratos del módulo de alertas.
 * Espejo de `back/src/notifications/`.
 */

/** Tipos de alerta que genera CRMIA. */
export const NotificationType = {
  AVISO_PRORROGA: 'aviso_prorroga',
  CONTRATO_SIN_FIRMAR: 'contrato_sin_firmar',
  CLIENTE_SIN_ACTIVIDAD: 'cliente_sin_actividad',
  FACTURA_VENCIDA: 'factura_vencida',
  RECORDATORIO: 'recordatorio',
  SISTEMA: 'sistema',
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

/** Etiquetas en español para mostrar en la interfaz. */
export const NotificationTypeLabels: Record<NotificationTypeValue, string> = {
  [NotificationType.AVISO_PRORROGA]: 'Aviso de prórroga',
  [NotificationType.CONTRATO_SIN_FIRMAR]: 'Contrato sin firmar',
  [NotificationType.CLIENTE_SIN_ACTIVIDAD]: 'Cliente sin actividad',
  [NotificationType.FACTURA_VENCIDA]: 'Factura pendiente de cobro',
  [NotificationType.RECORDATORIO]: 'Recordatorio',
  [NotificationType.SISTEMA]: 'Sistema',
};

/** Prioridad con la que se muestra la alerta. */
export const NotificationPriority = {
  ALTA: 'alta',
  MEDIA: 'media',
  BAJA: 'baja',
} as const;

export type NotificationPriorityValue =
  (typeof NotificationPriority)[keyof typeof NotificationPriority];

export const NotificationPriorityLabels: Record<NotificationPriorityValue, string> = {
  [NotificationPriority.ALTA]: 'Alta',
  [NotificationPriority.MEDIA]: 'Media',
  [NotificationPriority.BAJA]: 'Baja',
};

/** Dominio al que apunta una alerta. */
export const NotificationEntityType = {
  CLIENTE: 'cliente',
  INMUEBLE: 'inmueble',
  CONTRATO: 'contrato',
  FACTURA: 'factura',
  DOCUMENTO: 'documento',
} as const;

export type NotificationEntityTypeValue =
  (typeof NotificationEntityType)[keyof typeof NotificationEntityType];

export const NotificationEntityTypeLabels: Record<NotificationEntityTypeValue, string> = {
  [NotificationEntityType.CLIENTE]: 'Cliente',
  [NotificationEntityType.INMUEBLE]: 'Inmueble',
  [NotificationEntityType.CONTRATO]: 'Contrato',
  [NotificationEntityType.FACTURA]: 'Factura',
  [NotificationEntityType.DOCUMENTO]: 'Documento',
};

/** Alerta tal y como la devuelve la API. */
export interface Notification {
  id: number;
  tipo: NotificationTypeValue;
  titulo: string;
  mensaje: string;
  leida: boolean;
  leidaAt: string | null;
  prioridad: NotificationPriorityValue;
  usuarioId: number | null;
  entidadTipo: NotificationEntityTypeValue | null;
  entidadId: number | null;
  entidadNombre: string | null;
  /** Ruta del front a la que lleva la alerta al pulsarla. */
  enlace: string | null;
  claveRegla: string | null;
  createdAt: string;
}

/**
 * Desglose del contador de la campana.
 *
 * `automaticas` es el número que produce el motor de reglas y el que enseña la
 * tarjeta «Avisos abiertos» del Panel; `manuales` son los recordatorios que
 * escribe la persona usuaria, que el Panel no contabiliza. Sin este desglose la campana
 * y el Panel enseñan dos cifras distintas sin explicación.
 */
export interface NotificationCounter {
  noLeidas: number;
  automaticas: number;
  manuales: number;
}

/** Filtros del listado de alertas. */
export interface NotificationFilters {
  page?: number;
  size?: number;
  leida?: boolean;
  tipo?: NotificationTypeValue;
  entidadTipo?: NotificationEntityTypeValue;
}
