/** Naturaleza del cliente. */
export enum ClientType {
  /** Persona fisica o juridica que compra para invertir. */
  INVERSOR = 'inversor',
  /** Empresa (alquiler temporal, corporate housing). */
  EMPRESA = 'empresa',
  /** Particular que busca vivienda o reforma. */
  PARTICULAR = 'particular',
}

/** Etiquetas en espanol para mostrar en la interfaz. */
export const ClientTypeLabels: Record<ClientType, string> = {
  [ClientType.INVERSOR]: 'Inversor',
  [ClientType.EMPRESA]: 'Empresa',
  [ClientType.PARTICULAR]: 'Particular',
};

/** Clases de color (Tailwind) asociadas a cada tipo de cliente. */
export const ClientTypeColors: Record<ClientType, string> = {
  [ClientType.INVERSOR]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [ClientType.EMPRESA]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [ClientType.PARTICULAR]: 'bg-slate-100 text-slate-800 border-slate-200',
};

/** Listado ordenado de tipos de cliente. */
export const ClientTypeList: ClientType[] = [
  ClientType.INVERSOR,
  ClientType.EMPRESA,
  ClientType.PARTICULAR,
];
