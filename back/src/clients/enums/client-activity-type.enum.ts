/** Tipo de apunte del historial de un cliente. */
export enum ClientActivityType {
  /** Alta del cliente en el CRM. */
  ALTA = 'alta',
  /** Nota libre escrita por la persona usuaria. */
  NOTA = 'nota',
  LLAMADA = 'llamada',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  VISITA = 'visita',
  REUNION = 'reunion',
  /** Movimiento entre columnas del kanban. */
  CAMBIO_ETAPA = 'cambio_etapa',
  /** Edicion de los datos de la ficha. */
  ACTUALIZACION = 'actualizacion',
  /** Descarte del cliente con su motivo. */
  DESCARTE = 'descarte',
  /** Vuelta a activo de un cliente descartado. */
  REACTIVACION = 'reactivacion',
  /** Alta generada por una importacion CSV/Excel. */
  IMPORTACION = 'importacion',
  DOCUMENTO = 'documento',
}

/** Etiquetas en espanol para mostrar en la interfaz. */
export const ClientActivityTypeLabels: Record<ClientActivityType, string> = {
  [ClientActivityType.ALTA]: 'Alta',
  [ClientActivityType.NOTA]: 'Nota',
  [ClientActivityType.LLAMADA]: 'Llamada',
  [ClientActivityType.EMAIL]: 'Correo electrónico',
  [ClientActivityType.WHATSAPP]: 'WhatsApp',
  [ClientActivityType.VISITA]: 'Visita',
  [ClientActivityType.REUNION]: 'Reunión',
  [ClientActivityType.CAMBIO_ETAPA]: 'Cambio de etapa',
  [ClientActivityType.ACTUALIZACION]: 'Actualización',
  [ClientActivityType.DESCARTE]: 'Descarte',
  [ClientActivityType.REACTIVACION]: 'Reactivación',
  [ClientActivityType.IMPORTACION]: 'Importación',
  [ClientActivityType.DOCUMENTO]: 'Documento',
};

/** Clases de color (Tailwind) asociadas a cada tipo de apunte. */
export const ClientActivityTypeColors: Record<ClientActivityType, string> = {
  [ClientActivityType.ALTA]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [ClientActivityType.NOTA]: 'bg-slate-100 text-slate-800 border-slate-200',
  [ClientActivityType.LLAMADA]: 'bg-sky-100 text-sky-800 border-sky-200',
  [ClientActivityType.EMAIL]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ClientActivityType.WHATSAPP]: 'bg-green-100 text-green-800 border-green-200',
  [ClientActivityType.VISITA]: 'bg-violet-100 text-violet-800 border-violet-200',
  [ClientActivityType.REUNION]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [ClientActivityType.CAMBIO_ETAPA]: 'bg-amber-100 text-amber-800 border-amber-200',
  [ClientActivityType.ACTUALIZACION]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [ClientActivityType.DESCARTE]: 'bg-rose-100 text-rose-800 border-rose-200',
  [ClientActivityType.REACTIVACION]: 'bg-teal-100 text-teal-800 border-teal-200',
  [ClientActivityType.IMPORTACION]: 'bg-purple-100 text-purple-800 border-purple-200',
  [ClientActivityType.DOCUMENTO]: 'bg-orange-100 text-orange-800 border-orange-200',
};

/** Tipos que la persona usuaria puede crear manualmente desde la ficha del cliente. */
export const ManualClientActivityTypes: ClientActivityType[] = [
  ClientActivityType.NOTA,
  ClientActivityType.LLAMADA,
  ClientActivityType.EMAIL,
  ClientActivityType.WHATSAPP,
  ClientActivityType.VISITA,
  ClientActivityType.REUNION,
  ClientActivityType.DOCUMENTO,
];
