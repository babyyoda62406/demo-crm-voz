import { BusinessLine } from './business-line.enum';
import { normalizeKey } from '../helpers/normalize-text.helper';

/**
 * Etapas del pipeline. Son las columnas del kanban.
 *
 * Un mismo valor puede pertenecer a mas de una linea de negocio (`visita` esta
 * en PSI y en reformas; `reserva` en PSI y en alquiler a empresas), por eso el
 * enum es unico y la pertenencia se define en `StagesByBusinessLine`.
 */
export enum ClientStage {
  // --- PSI para inversores ---
  LEAD = 'lead',
  BRIEFING = 'briefing',
  CONTRATO_FIRMADO = 'contrato_firmado',
  BUSQUEDA = 'busqueda',
  VISITA = 'visita',
  RESERVA = 'reserva',
  ARRAS = 'arras',
  NOTARIA = 'notaria',
  POSTVENTA = 'postventa',

  // --- Alquiler temporal a empresas ---
  INTERESADA = 'interesada',
  DOCUMENTACION = 'documentacion',
  CONTRATO = 'contrato',
  CHECKIN = 'checkin',
  ESTANCIA = 'estancia',
  CHECKOUT = 'checkout',

  // --- Seguimiento de reformas ---
  PREVISTA = 'prevista',
  PRESUPUESTO = 'presupuesto',
  EN_OBRA = 'en_obra',
  ENTREGA = 'entrega',
}

/**
 * Pipeline de cada linea de negocio, en orden. El primer elemento es la etapa
 * por defecto al dar de alta un cliente en esa linea.
 */
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

/** Etiquetas en espanol para mostrar en la interfaz. */
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

/**
 * Clases de color (Tailwind) de cada etapa. Progresion frio -> calido conforme
 * el cliente avanza en el embudo, para que el kanban se lea de un vistazo.
 */
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

/**
 * Sinonimos aceptados al normalizar una etapa dictada por voz o importada de
 * un fichero. La clave ya viene pasada por `normalizeKey`.
 */
const StageSynonyms: Record<string, ClientStage> = {
  nuevo: ClientStage.LEAD,
  contacto: ClientStage.LEAD,
  primer_contacto: ClientStage.LEAD,
  entrevista: ClientStage.BRIEFING,
  mandato: ClientStage.CONTRATO_FIRMADO,
  mandato_firmado: ClientStage.CONTRATO_FIRMADO,
  firmado: ClientStage.CONTRATO_FIRMADO,
  buscando: ClientStage.BUSQUEDA,
  seleccion: ClientStage.BUSQUEDA,
  visitas: ClientStage.VISITA,
  primera_visita: ClientStage.VISITA,
  reservado: ClientStage.RESERVA,
  senal: ClientStage.RESERVA,
  contrato_arras: ClientStage.ARRAS,
  arras_firmadas: ClientStage.ARRAS,
  notario: ClientStage.NOTARIA,
  escritura: ClientStage.NOTARIA,
  firma_notaria: ClientStage.NOTARIA,
  post_venta: ClientStage.POSTVENTA,
  seguimiento: ClientStage.POSTVENTA,
  interesado: ClientStage.INTERESADA,
  interes: ClientStage.INTERESADA,
  docs: ClientStage.DOCUMENTACION,
  documentos: ClientStage.DOCUMENTACION,
  check_in: ClientStage.CHECKIN,
  entrada: ClientStage.CHECKIN,
  alojada: ClientStage.ESTANCIA,
  en_estancia: ClientStage.ESTANCIA,
  check_out: ClientStage.CHECKOUT,
  salida: ClientStage.CHECKOUT,
  planificada: ClientStage.PREVISTA,
  pendiente: ClientStage.PREVISTA,
  presupuestada: ClientStage.PRESUPUESTO,
  obra: ClientStage.EN_OBRA,
  en_ejecucion: ClientStage.EN_OBRA,
  ejecucion: ClientStage.EN_OBRA,
  entregada: ClientStage.ENTREGA,
  finalizada: ClientStage.ENTREGA,
};

/** Devuelve el pipeline completo de una linea de negocio. */
export const getStagesByBusinessLine = (
  businessLine: BusinessLine,
): ClientStage[] => StagesByBusinessLine[businessLine] ?? [];

/** Devuelve la primera etapa (etapa de entrada) de una linea de negocio. */
export const getFirstStage = (businessLine: BusinessLine): ClientStage =>
  getStagesByBusinessLine(businessLine)[0] ?? ClientStage.LEAD;

/** Indica si una etapa pertenece al pipeline de una linea de negocio. */
export const isStageOfBusinessLine = (
  stage: ClientStage,
  businessLine: BusinessLine,
): boolean => getStagesByBusinessLine(businessLine).includes(stage);

/**
 * Traduce un texto libre a una etapa canonica.
 *
 * @param raw Texto dictado o importado (`Contrato Firmado`, `NOTARÍA`, `obra`).
 * @param businessLine Si se indica, solo se acepta una etapa de esa linea.
 * @returns La etapa canonica o `null` si no se reconoce.
 */
export const normalizeStage = (
  raw: string | null | undefined,
  businessLine?: BusinessLine,
): ClientStage | null => {
  const key = normalizeKey(raw);
  if (!key) return null;

  const direct = Object.values(ClientStage).find((stage) => stage === key);
  const resolved = direct ?? StageSynonyms[key] ?? null;
  if (!resolved) return null;

  if (businessLine && !isStageOfBusinessLine(resolved, businessLine)) return null;
  return resolved;
};

/**
 * Localiza la linea de negocio a la que pertenece una etapa. Si la etapa esta
 * compartida entre varias lineas devuelve la primera coincidencia, por lo que
 * solo debe usarse como ayuda, nunca como fuente de verdad.
 */
export const findBusinessLineByStage = (
  stage: ClientStage,
): BusinessLine | null => {
  const entry = Object.entries(StagesByBusinessLine).find(([, stages]) =>
    stages.includes(stage),
  );
  return entry ? (entry[0] as BusinessLine) : null;
};
