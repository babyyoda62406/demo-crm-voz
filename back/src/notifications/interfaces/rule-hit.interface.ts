import { IEmitNotification } from './notification-emit.interface';

/**
 * Coincidencia detectada por el motor de reglas.
 *
 * Extiende la carga de una alerta con los datos que el cuadro de mando necesita
 * para pintar la lista de «tareas de hoy» sin tener que persistir nada: la
 * misma deteccion sirve para la campana (se guarda) y para el panel (se calcula
 * al vuelo).
 */
export interface IRuleHit extends IEmitNotification {
  /** Fecha de referencia del aviso (vencimiento, envio, ultima actividad). */
  fecha: string | null;
  /**
   * Dias que faltan para la fecha de referencia. Negativo si ya paso.
   * En los avisos de inactividad es el numero de dias transcurridos en negativo.
   */
  dias: number;
}
