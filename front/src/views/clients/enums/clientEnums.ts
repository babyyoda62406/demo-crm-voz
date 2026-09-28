/**
 * Espejo en el navegador de los enums del dominio Clientes del backend
 * (`back/src/clients/enums`). Se mantiene aquí una copia porque el front no
 * comparte código con la API: si cambia una etapa allí, hay que reflejarla aquí.
 */

// ---------------------------------------------------------------------------
// Línea de negocio
// ---------------------------------------------------------------------------

export const BusinessLine = {
  PSI: 'psi',
  ALQUILER_EMPRESAS: 'alquiler_empresas',
  REFORMAS: 'reformas',
} as const;

export type BusinessLine = (typeof BusinessLine)[keyof typeof BusinessLine];

export const BusinessLineLabels: Record<BusinessLine, string> = {
  [BusinessLine.PSI]: 'PSI para inversores',
  [BusinessLine.ALQUILER_EMPRESAS]: 'Alquiler temporal a empresas',
  [BusinessLine.REFORMAS]: 'Seguimiento de reformas',
};

/** Nombre corto para pestañas y selectores estrechos. */
export const BusinessLineShortLabels: Record<BusinessLine, string> = {
  [BusinessLine.PSI]: 'PSI',
  [BusinessLine.ALQUILER_EMPRESAS]: 'Alquiler empresas',
  [BusinessLine.REFORMAS]: 'Reformas',
};

export const BusinessLineColors: Record<BusinessLine, string> = {
  [BusinessLine.PSI]: 'bg-blue-100 text-blue-800 border-blue-200',
  [BusinessLine.ALQUILER_EMPRESAS]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [BusinessLine.REFORMAS]: 'bg-amber-100 text-amber-800 border-amber-200',
};

export const BusinessLineList: BusinessLine[] = [
  BusinessLine.PSI,
  BusinessLine.ALQUILER_EMPRESAS,
  BusinessLine.REFORMAS,
];

// ---------------------------------------------------------------------------
// Etapas del pipeline
// ---------------------------------------------------------------------------

export const ClientStage = {
  LEAD: 'lead',
  BRIEFING: 'briefing',
  CONTRATO_FIRMADO: 'contrato_firmado',
  BUSQUEDA: 'busqueda',
  VISITA: 'visita',
  RESERVA: 'reserva',
  ARRAS: 'arras',
  NOTARIA: 'notaria',
  POSTVENTA: 'postventa',
  INTERESADA: 'interesada',
  DOCUMENTACION: 'documentacion',
  CONTRATO: 'contrato',
  CHECKIN: 'checkin',
  ESTANCIA: 'estancia',
  CHECKOUT: 'checkout',
  PREVISTA: 'prevista',
  PRESUPUESTO: 'presupuesto',
  EN_OBRA: 'en_obra',
  ENTREGA: 'entrega',
} as const;

export type ClientStage = (typeof ClientStage)[keyof typeof ClientStage];

/** Columnas del kanban de cada línea, en orden. */
export const StagesByBusinessLine: Record<BusinessLine, ClientStage[]> = {
  [BusinessLine.PSI]: [
    ClientStage.LEAD,
    ClientStage.BRIEFING,
    ClientStage.CONTRATO_FIRMADO,
    ClientStage.BUSQUEDA,
    ClientStage.VISITA,
    ClientStage.RESERVA,
    ClientStage.ARRAS,
    ClientStage.NOTARIA,
    ClientStage.POSTVENTA,
  ],
  [BusinessLine.ALQUILER_EMPRESAS]: [
    ClientStage.INTERESADA,
    ClientStage.DOCUMENTACION,
    ClientStage.RESERVA,
    ClientStage.CONTRATO,
    ClientStage.CHECKIN,
    ClientStage.ESTANCIA,
    ClientStage.CHECKOUT,
  ],
  [BusinessLine.REFORMAS]: [
    ClientStage.PREVISTA,
    ClientStage.VISITA,
    ClientStage.PRESUPUESTO,
    ClientStage.EN_OBRA,
    ClientStage.ENTREGA,
  ],
};

export const ClientStageLabels: Record<ClientStage, string> = {
  [ClientStage.LEAD]: 'Lead',
  [ClientStage.BRIEFING]: 'Briefing',
  [ClientStage.CONTRATO_FIRMADO]: 'Contrato firmado',
  [ClientStage.BUSQUEDA]: 'Búsqueda',
  [ClientStage.VISITA]: 'Visita',
  [ClientStage.RESERVA]: 'Reserva',
  [ClientStage.ARRAS]: 'Arras',
  [ClientStage.NOTARIA]: 'Notaría',
  [ClientStage.POSTVENTA]: 'Postventa',
  [ClientStage.INTERESADA]: 'Interesada',
  [ClientStage.DOCUMENTACION]: 'Documentación',
  [ClientStage.CONTRATO]: 'Contrato',
  [ClientStage.CHECKIN]: 'Check-in',
  [ClientStage.ESTANCIA]: 'Estancia',
  [ClientStage.CHECKOUT]: 'Check-out',
  [ClientStage.PREVISTA]: 'Prevista',
  [ClientStage.PRESUPUESTO]: 'Presupuesto',
  [ClientStage.EN_OBRA]: 'En obra',
  [ClientStage.ENTREGA]: 'Entrega',
};

export const ClientStageColors: Record<ClientStage, string> = {
  [ClientStage.LEAD]: 'bg-slate-100 text-slate-800 border-slate-200',
  [ClientStage.BRIEFING]: 'bg-sky-100 text-sky-800 border-sky-200',
  [ClientStage.CONTRATO_FIRMADO]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ClientStage.BUSQUEDA]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [ClientStage.VISITA]: 'bg-violet-100 text-violet-800 border-violet-200',
  [ClientStage.RESERVA]: 'bg-amber-100 text-amber-800 border-amber-200',
  [ClientStage.ARRAS]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ClientStage.NOTARIA]: 'bg-teal-100 text-teal-800 border-teal-200',
  [ClientStage.POSTVENTA]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [ClientStage.INTERESADA]: 'bg-slate-100 text-slate-800 border-slate-200',
  [ClientStage.DOCUMENTACION]: 'bg-sky-100 text-sky-800 border-sky-200',
  [ClientStage.CONTRATO]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ClientStage.CHECKIN]: 'bg-violet-100 text-violet-800 border-violet-200',
  [ClientStage.ESTANCIA]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [ClientStage.CHECKOUT]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [ClientStage.PREVISTA]: 'bg-slate-100 text-slate-800 border-slate-200',
  [ClientStage.PRESUPUESTO]: 'bg-amber-100 text-amber-800 border-amber-200',
  [ClientStage.EN_OBRA]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ClientStage.ENTREGA]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

/** Punto de color para el encabezado de cada columna del kanban. */
export const ClientStageDotColors: Record<ClientStage, string> = {
  [ClientStage.LEAD]: 'bg-slate-500',
  [ClientStage.BRIEFING]: 'bg-sky-500',
  [ClientStage.CONTRATO_FIRMADO]: 'bg-blue-600',
  [ClientStage.BUSQUEDA]: 'bg-indigo-500',
  [ClientStage.VISITA]: 'bg-violet-500',
  [ClientStage.RESERVA]: 'bg-amber-500',
  [ClientStage.ARRAS]: 'bg-orange-500',
  [ClientStage.NOTARIA]: 'bg-teal-500',
  [ClientStage.POSTVENTA]: 'bg-emerald-500',
  [ClientStage.INTERESADA]: 'bg-slate-500',
  [ClientStage.DOCUMENTACION]: 'bg-sky-500',
  [ClientStage.CONTRATO]: 'bg-blue-600',
  [ClientStage.CHECKIN]: 'bg-violet-500',
  [ClientStage.ESTANCIA]: 'bg-cyan-500',
  [ClientStage.CHECKOUT]: 'bg-emerald-500',
  [ClientStage.PREVISTA]: 'bg-slate-500',
  [ClientStage.PRESUPUESTO]: 'bg-amber-500',
  [ClientStage.EN_OBRA]: 'bg-orange-500',
  [ClientStage.ENTREGA]: 'bg-emerald-500',
};

/** Color del título de cada columna del kanban. */
export const ClientStageAccentColors: Record<ClientStage, string> = {
  [ClientStage.LEAD]: 'text-slate-700',
  [ClientStage.BRIEFING]: 'text-sky-700',
  [ClientStage.CONTRATO_FIRMADO]: 'text-blue-700',
  [ClientStage.BUSQUEDA]: 'text-indigo-700',
  [ClientStage.VISITA]: 'text-violet-700',
  [ClientStage.RESERVA]: 'text-amber-700',
  [ClientStage.ARRAS]: 'text-orange-700',
  [ClientStage.NOTARIA]: 'text-teal-700',
  [ClientStage.POSTVENTA]: 'text-emerald-700',
  [ClientStage.INTERESADA]: 'text-slate-700',
  [ClientStage.DOCUMENTACION]: 'text-sky-700',
  [ClientStage.CONTRATO]: 'text-blue-700',
  [ClientStage.CHECKIN]: 'text-violet-700',
  [ClientStage.ESTANCIA]: 'text-cyan-700',
  [ClientStage.CHECKOUT]: 'text-emerald-700',
  [ClientStage.PREVISTA]: 'text-slate-700',
  [ClientStage.PRESUPUESTO]: 'text-amber-700',
  [ClientStage.EN_OBRA]: 'text-orange-700',
  [ClientStage.ENTREGA]: 'text-emerald-700',
};

/** Color del título de una columna, tolerante a valores desconocidos. */
export const getStageAccent = (stage?: string | null): string =>
  (stage && ClientStageAccentColors[stage as ClientStage]) || 'text-gray-800';

/** Etapas de una línea de negocio, con salvaguarda si llega un valor raro. */
export const getStagesByBusinessLine = (line: BusinessLine): ClientStage[] =>
  StagesByBusinessLine[line] ?? [];

/** Etiqueta de una etapa, tolerante a valores desconocidos. */
export const getStageLabel = (stage?: string | null): string =>
  stage ? (ClientStageLabels[stage as ClientStage] ?? stage) : '—';

/** Clases de color de una etapa, tolerante a valores desconocidos. */
export const getStageColor = (stage?: string | null): string =>
  (stage && ClientStageColors[stage as ClientStage]) ||
  'bg-slate-100 text-slate-800 border-slate-200';

// ---------------------------------------------------------------------------
// Tipo de cliente
// ---------------------------------------------------------------------------

export const ClientType = {
  INVERSOR: 'inversor',
  EMPRESA: 'empresa',
  PARTICULAR: 'particular',
} as const;

export type ClientType = (typeof ClientType)[keyof typeof ClientType];

export const ClientTypeLabels: Record<ClientType, string> = {
  [ClientType.INVERSOR]: 'Inversor',
  [ClientType.EMPRESA]: 'Empresa',
  [ClientType.PARTICULAR]: 'Particular',
};

export const ClientTypeColors: Record<ClientType, string> = {
  [ClientType.INVERSOR]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [ClientType.EMPRESA]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [ClientType.PARTICULAR]: 'bg-slate-100 text-slate-800 border-slate-200',
};

export const ClientTypeList: ClientType[] = [
  ClientType.INVERSOR,
  ClientType.EMPRESA,
  ClientType.PARTICULAR,
];

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

export const ClientStatus = {
  ACTIVO: 'activo',
  DESCARTADO: 'descartado',
} as const;

export type ClientStatus = (typeof ClientStatus)[keyof typeof ClientStatus];

export const ClientStatusLabels: Record<ClientStatus, string> = {
  [ClientStatus.ACTIVO]: 'Activo',
  [ClientStatus.DESCARTADO]: 'Descartado',
};

export const ClientStatusColors: Record<ClientStatus, string> = {
  [ClientStatus.ACTIVO]: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  [ClientStatus.DESCARTADO]: 'bg-rose-100 text-rose-800 border-rose-200',
};

// ---------------------------------------------------------------------------
// Zonas de interés
// ---------------------------------------------------------------------------

export const InterestZone = {
  ALTABRIA: 'altabria',
  VALDEMOR: 'valdemor',
  SERRANOVA: 'serranova',
  PUENTEALBA: 'puentealba',
  MARALTA: 'maralta',
  ALBAMAR: 'albamar',
  RIBAVERDE: 'ribaverde',
} as const;

export type InterestZone = (typeof InterestZone)[keyof typeof InterestZone];

export const InterestZoneLabels: Record<InterestZone, string> = {
  [InterestZone.ALTABRIA]: 'Altabria',
  [InterestZone.VALDEMOR]: 'Valdemor',
  [InterestZone.SERRANOVA]: 'Serranova',
  [InterestZone.PUENTEALBA]: 'Puentealba',
  [InterestZone.MARALTA]: 'Maralta',
  [InterestZone.ALBAMAR]: 'Albamar',
  [InterestZone.RIBAVERDE]: 'Ribaverde',
};

export const InterestZoneColors: Record<InterestZone, string> = {
  [InterestZone.ALTABRIA]: 'bg-blue-100 text-blue-800 border-blue-200',
  [InterestZone.VALDEMOR]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [InterestZone.SERRANOVA]: 'bg-violet-100 text-violet-800 border-violet-200',
  [InterestZone.PUENTEALBA]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [InterestZone.MARALTA]: 'bg-amber-100 text-amber-800 border-amber-200',
  [InterestZone.ALBAMAR]: 'bg-orange-100 text-orange-800 border-orange-200',
  [InterestZone.RIBAVERDE]: 'bg-teal-100 text-teal-800 border-teal-200',
};

export const InterestZoneList: InterestZone[] = [
  InterestZone.ALTABRIA,
  InterestZone.VALDEMOR,
  InterestZone.SERRANOVA,
  InterestZone.PUENTEALBA,
  InterestZone.MARALTA,
  InterestZone.ALBAMAR,
  InterestZone.RIBAVERDE,
];

/** Etiqueta de una zona, tolerante a valores desconocidos. */
export const getZoneLabel = (zone?: string | null): string =>
  zone ? (InterestZoneLabels[zone as InterestZone] ?? zone) : '';

/** Clases de color de una zona, tolerante a valores desconocidos. */
export const getZoneColor = (zone?: string | null): string =>
  (zone && InterestZoneColors[zone as InterestZone]) ||
  'bg-slate-100 text-slate-800 border-slate-200';

// ---------------------------------------------------------------------------
// Tipo de operación
// ---------------------------------------------------------------------------

export const OperationType = {
  COMPRA_INVERSION: 'compra_inversion',
  COMPRA_VIVIENDA: 'compra_vivienda',
  ALQUILER_TEMPORAL: 'alquiler_temporal',
  ALQUILER_LARGA_ESTANCIA: 'alquiler_larga_estancia',
  REFORMA_INTEGRAL: 'reforma_integral',
  VENTA: 'venta',
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

export const OperationTypeLabels: Record<OperationType, string> = {
  [OperationType.COMPRA_INVERSION]: 'Compra para inversión',
  [OperationType.COMPRA_VIVIENDA]: 'Compra de vivienda',
  [OperationType.ALQUILER_TEMPORAL]: 'Alquiler temporal',
  [OperationType.ALQUILER_LARGA_ESTANCIA]: 'Alquiler de larga estancia',
  [OperationType.REFORMA_INTEGRAL]: 'Reforma integral',
  [OperationType.VENTA]: 'Venta',
};

export const OperationTypeList: OperationType[] = [
  OperationType.COMPRA_INVERSION,
  OperationType.COMPRA_VIVIENDA,
  OperationType.ALQUILER_TEMPORAL,
  OperationType.ALQUILER_LARGA_ESTANCIA,
  OperationType.REFORMA_INTEGRAL,
  OperationType.VENTA,
];

/** Etiqueta de un tipo de operación, tolerante a valores desconocidos. */
export const getOperationTypeLabel = (operation?: string | null): string =>
  operation ? (OperationTypeLabels[operation as OperationType] ?? operation) : '—';

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

export const ClientActivityType = {
  ALTA: 'alta',
  NOTA: 'nota',
  LLAMADA: 'llamada',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  VISITA: 'visita',
  REUNION: 'reunion',
  CAMBIO_ETAPA: 'cambio_etapa',
  ACTUALIZACION: 'actualizacion',
  DESCARTE: 'descarte',
  REACTIVACION: 'reactivacion',
  IMPORTACION: 'importacion',
  DOCUMENTO: 'documento',
} as const;

export type ClientActivityType =
  (typeof ClientActivityType)[keyof typeof ClientActivityType];

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

/** Puntos de color del timeline. */
export const ClientActivityTypeDotColors: Record<ClientActivityType, string> = {
  [ClientActivityType.ALTA]: 'bg-emerald-500',
  [ClientActivityType.NOTA]: 'bg-slate-400',
  [ClientActivityType.LLAMADA]: 'bg-sky-500',
  [ClientActivityType.EMAIL]: 'bg-blue-500',
  [ClientActivityType.WHATSAPP]: 'bg-green-500',
  [ClientActivityType.VISITA]: 'bg-violet-500',
  [ClientActivityType.REUNION]: 'bg-indigo-500',
  [ClientActivityType.CAMBIO_ETAPA]: 'bg-amber-500',
  [ClientActivityType.ACTUALIZACION]: 'bg-cyan-500',
  [ClientActivityType.DESCARTE]: 'bg-rose-500',
  [ClientActivityType.REACTIVACION]: 'bg-teal-500',
  [ClientActivityType.IMPORTACION]: 'bg-purple-500',
  [ClientActivityType.DOCUMENTO]: 'bg-orange-500',
};

/** Tipos que la persona usuaria puede registrar a mano desde la ficha. */
export const ManualClientActivityTypes: ClientActivityType[] = [
  ClientActivityType.NOTA,
  ClientActivityType.LLAMADA,
  ClientActivityType.EMAIL,
  ClientActivityType.WHATSAPP,
  ClientActivityType.VISITA,
  ClientActivityType.REUNION,
  ClientActivityType.DOCUMENTO,
];

/** Etiqueta de un tipo de actividad, tolerante a valores desconocidos. */
export const getActivityLabel = (type?: string | null): string =>
  type ? (ClientActivityTypeLabels[type as ClientActivityType] ?? type) : '—';

/** Clases de color de un tipo de actividad, tolerante a valores desconocidos. */
export const getActivityColor = (type?: string | null): string =>
  (type && ClientActivityTypeColors[type as ClientActivityType]) ||
  'bg-slate-100 text-slate-800 border-slate-200';

/** Punto de color de un tipo de actividad, tolerante a valores desconocidos. */
export const getActivityDotColor = (type?: string | null): string =>
  (type && ClientActivityTypeDotColors[type as ClientActivityType]) || 'bg-slate-400';
