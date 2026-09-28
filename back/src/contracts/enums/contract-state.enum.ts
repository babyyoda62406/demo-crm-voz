import { ContractStatus } from '../../common/contracts/assistant-actions';

/**
 * Ciclo de vida real de un contrato en CRMIA.
 *
 * NOTA: `common/contracts/assistant-actions.ts` (solo lectura) define un enum
 * `ContractStatus` mas grueso para el asistente de IA. Este enum es el que
 * persiste la entidad `Contract`; `CONTRACT_STATE_FROM_STATUS` traduce del
 * enum del asistente al de dominio.
 */
export enum ContractState {
  /** Generado, todavia no enviado al cliente. */
  BORRADOR = 'borrador',
  /** Enviado al cliente mediante enlace publico, pendiente de apertura. */
  ENVIADO = 'enviado',
  /** El cliente ha abierto el enlace publico. */
  VISTO = 'visto',
  /** Firmado por el cliente. */
  FIRMADO = 'firmado',
  /** Anulado manualmente. */
  ANULADO = 'anulado',
}

/** Etiquetas en espanol para la interfaz. */
export const ContractStateLabels: Record<ContractState, string> = {
  [ContractState.BORRADOR]: 'Borrador',
  [ContractState.ENVIADO]: 'Enviado',
  [ContractState.VISTO]: 'Visto',
  [ContractState.FIRMADO]: 'Firmado',
  [ContractState.ANULADO]: 'Anulado',
};

/** Color asociado a cada estado (nombre de color de Tailwind). */
export const ContractStateColors: Record<ContractState, string> = {
  [ContractState.BORRADOR]: 'gray',
  [ContractState.ENVIADO]: 'blue',
  [ContractState.VISTO]: 'amber',
  [ContractState.FIRMADO]: 'emerald',
  [ContractState.ANULADO]: 'red',
};

/** Orden natural del ciclo de vida (para pintar la linea de tiempo). */
export const CONTRACT_STATE_FLOW: ContractState[] = [
  ContractState.BORRADOR,
  ContractState.ENVIADO,
  ContractState.VISTO,
  ContractState.FIRMADO,
];

/**
 * Traduccion del enum del asistente (`ContractStatus`) a los estados de
 * dominio. Un estado del asistente puede cubrir varios estados internos.
 */
export const CONTRACT_STATE_FROM_STATUS: Record<ContractStatus, ContractState[]> =
  {
    [ContractStatus.BORRADOR]: [ContractState.BORRADOR],
    [ContractStatus.PENDIENTE_FIRMA]: [
      ContractState.ENVIADO,
      ContractState.VISTO,
    ],
    [ContractStatus.FIRMADO]: [ContractState.FIRMADO],
    [ContractStatus.ANULADO]: [ContractState.ANULADO],
    [ContractStatus.VENCIDO]: [],
  };
