import { AssistantInputType } from '../enums/assistant-input-type.enum';

/** Audio recibido en el endpoint del asistente. */
export interface IAssistantAudioInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Entrada normalizada del caso de uso "procesar orden". */
export interface IAssistantCommandInput {
  /** Orden escrita. Excluyente con `audio`. */
  texto?: string;
  /** Orden dictada. Excluyente con `texto`. */
  audio?: IAssistantAudioInput;
  /** Usuario autenticado que lanza la orden. */
  userId?: number;
}

/** Acción que el modelo decidió ejecutar. */
export interface IAssistantExecutedAction {
  /** Nombre canónico de la acción (`AssistantActionName`). */
  nombre: string;
  /** Etiqueta legible en español para pintar en la interfaz. */
  etiqueta: string;
  /** Argumentos con los que se invocó la acción. */
  argumentos: Record<string, unknown>;
}

/** Resultado devuelto por el dominio tras ejecutar la acción. */
export interface IAssistantExecutionResult {
  ok: boolean;
  mensaje: string;
  data?: unknown;
}

/**
 * Respuesta del endpoint `POST /assistant/command`, tal cual la consume la
 * vista de chat del frontend.
 */
export interface IAssistantCommandResponse {
  /** Identificador del registro en `assistant_logs`. */
  id?: number;
  /** Origen de la orden (voz o texto). */
  origen: AssistantInputType;
  /** Texto de la orden (transcrito si venía por voz). */
  transcripcion: string;
  /** Acción ejecutada, o `null` si el modelo solo conversó. */
  accion: IAssistantExecutedAction | null;
  /** Resultado devuelto por el dominio, o `null` si no hubo acción. */
  resultado: IAssistantExecutionResult | null;
  /** Confirmación en español lista para mostrarse. */
  respuesta: string;
  /**
   * Motivo del fallo, o `null` si la orden se resolvió bien.
   *
   * El endpoint responde 200 aunque el modelo falle (la respuesta en español ya
   * viene dentro), así que este campo es la única forma que tiene la vista de
   * distinguir un error de una respuesta correcta y ofrecer «Reintentar».
   */
  error: string | null;
  /** Marca temporal ISO del registro. */
  fecha: string;
}
