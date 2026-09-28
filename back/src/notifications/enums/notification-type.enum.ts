/**
 * Tipos de alerta que genera CRMIA.
 *
 * Los tres primeros los produce el motor de reglas
 * (`NotificationRulesService`) en su pasada diaria; el resto los emiten los
 * modulos de dominio llamando a `NotificationsService.emit()`.
 */
export enum NotificationType {
  /** Contrato de alquiler cuyo vencimiento esta a 30 dias o menos. */
  AVISO_PRORROGA = 'aviso_prorroga',
  /** Contrato enviado al cliente que sigue sin firmar pasados varios dias. */
  CONTRATO_SIN_FIRMAR = 'contrato_sin_firmar',
  /** Cliente en etapa inicial (lead / briefing) sin movimiento reciente. */
  CLIENTE_SIN_ACTIVIDAD = 'cliente_sin_actividad',
  /** Factura emitida cuyo cobro se esta demorando. */
  FACTURA_VENCIDA = 'factura_vencida',
  /** Aviso operativo generico emitido por un modulo de dominio. */
  RECORDATORIO = 'recordatorio',
  /** Mensaje del sistema (semilla, mantenimiento, avisos tecnicos). */
  SISTEMA = 'sistema',
}

/** Etiquetas en espanol para mostrar en la interfaz. */
export const NotificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.AVISO_PRORROGA]: 'Aviso de prórroga',
  [NotificationType.CONTRATO_SIN_FIRMAR]: 'Contrato sin firmar',
  [NotificationType.CLIENTE_SIN_ACTIVIDAD]: 'Cliente sin actividad',
  [NotificationType.FACTURA_VENCIDA]: 'Factura pendiente de cobro',
  [NotificationType.RECORDATORIO]: 'Recordatorio',
  [NotificationType.SISTEMA]: 'Sistema',
};

/** Clases de color (Tailwind) asociadas a cada tipo de alerta. */
export const NotificationTypeColors: Record<NotificationType, string> = {
  [NotificationType.AVISO_PRORROGA]: 'bg-amber-100 text-amber-800 border-amber-200',
  [NotificationType.CONTRATO_SIN_FIRMAR]: 'bg-blue-100 text-blue-800 border-blue-200',
  [NotificationType.CLIENTE_SIN_ACTIVIDAD]: 'bg-rose-100 text-rose-800 border-rose-200',
  [NotificationType.FACTURA_VENCIDA]: 'bg-orange-100 text-orange-800 border-orange-200',
  [NotificationType.RECORDATORIO]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [NotificationType.SISTEMA]: 'bg-slate-100 text-slate-800 border-slate-200',
};

/** Listado ordenado de tipos, para catalogos y desplegables. */
export const NOTIFICATION_TYPES: NotificationType[] =
  Object.values(NotificationType);

/** Prioridad con la que se muestra la alerta en el panel y en la campana. */
export enum NotificationPriority {
  ALTA = 'alta',
  MEDIA = 'media',
  BAJA = 'baja',
}

/** Etiquetas en espanol de la prioridad. */
export const NotificationPriorityLabels: Record<NotificationPriority, string> = {
  [NotificationPriority.ALTA]: 'Alta',
  [NotificationPriority.MEDIA]: 'Media',
  [NotificationPriority.BAJA]: 'Baja',
};
