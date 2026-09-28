/**
 * Dominio al que apunta una alerta.
 *
 * Se guarda como texto suelto junto al identificador (`entidadId`) en lugar de
 * como clave ajena: una alerta no debe arrastrar borrados en cascada ni acoplar
 * el modulo de notificaciones al calendario de entrega de los demas dominios.
 */
export enum NotificationEntityType {
  CLIENTE = 'cliente',
  INMUEBLE = 'inmueble',
  CONTRATO = 'contrato',
  FACTURA = 'factura',
  DOCUMENTO = 'documento',
}

/** Etiquetas en espanol para mostrar en la interfaz. */
export const NotificationEntityTypeLabels: Record<
  NotificationEntityType,
  string
> = {
  [NotificationEntityType.CLIENTE]: 'Cliente',
  [NotificationEntityType.INMUEBLE]: 'Inmueble',
  [NotificationEntityType.CONTRATO]: 'Contrato',
  [NotificationEntityType.FACTURA]: 'Factura',
  [NotificationEntityType.DOCUMENTO]: 'Documento',
};

/**
 * Ruta del front asociada a cada dominio. La interfaz la usa para que al pulsar
 * una alerta se navegue a la pantalla correspondiente.
 */
export const NotificationEntityRoutes: Record<NotificationEntityType, string> = {
  [NotificationEntityType.CLIENTE]: '/clientes',
  [NotificationEntityType.INMUEBLE]: '/propiedades',
  [NotificationEntityType.CONTRATO]: '/contratos',
  [NotificationEntityType.FACTURA]: '/facturas',
  [NotificationEntityType.DOCUMENTO]: '/documentos',
};
