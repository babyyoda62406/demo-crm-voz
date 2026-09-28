/** Estado comercial del cliente dentro del CRM. */
export enum ClientStatus {
  /** Cliente vivo: aparece en listados y en el kanban. */
  ACTIVO = 'activo',
  /** Cliente descartado: se conserva con su motivo de descarte. */
  DESCARTADO = 'descartado',
}

/** Etiquetas en espanol para mostrar en la interfaz. */
export const ClientStatusLabels: Record<ClientStatus, string> = {
  [ClientStatus.ACTIVO]: 'Activo',
  [ClientStatus.DESCARTADO]: 'Descartado',
};

/** Clases de color (Tailwind) asociadas a cada estado. */
export const ClientStatusColors: Record<ClientStatus, string> = {
  [ClientStatus.ACTIVO]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [ClientStatus.DESCARTADO]: 'bg-rose-100 text-rose-800 border-rose-200',
};

/** Listado ordenado de estados. */
export const ClientStatusList: ClientStatus[] = [
  ClientStatus.ACTIVO,
  ClientStatus.DESCARTADO,
];
