/**
 * Tipos del endpoint de NVIDIA compatible con OpenAI
 * (`POST {NVIDIA_BASE_URL}/chat/completions`).
 *
 * Se declaran a mano en lugar de depender del SDK de OpenAI: el backend ya
 * trae axios y así no se añade ninguna dependencia nueva.
 */

/** Roles admitidos en la conversación. */
export type NvidiaRole = 'system' | 'user' | 'assistant' | 'tool';

/** Invocación de una herramienta emitida por el modelo. */
export interface INvidiaToolCall {
  /** Identificador de la llamada; se devuelve en el mensaje `tool`. */
  id: string;
  type: 'function';
  function: {
    /** Nombre de la herramienta (`AssistantActionName`). */
    name: string;
    /** Argumentos serializados como JSON. */
    arguments: string;
  };
}

/** Mensaje de la conversación enviado o recibido. */
export interface INvidiaMessage {
  role: NvidiaRole;
  content?: string | null;
  /** Presente en respuestas del asistente que invocan herramientas. */
  tool_calls?: INvidiaToolCall[];
  /** Obligatorio en los mensajes con rol `tool`. */
  tool_call_id?: string;
  /** Nombre de la herramienta en los mensajes con rol `tool`. */
  name?: string;
}

/** Esquema JSON de los parámetros de una herramienta. */
export interface INvidiaFunctionParameters {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/** Declaración de una herramienta invocable por el modelo. */
export interface INvidiaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: INvidiaFunctionParameters;
  };
}

/** Opción devuelta por el modelo. */
export interface INvidiaChoice {
  index: number;
  message: INvidiaMessage;
  finish_reason: string;
}

/** Respuesta completa de `chat/completions`. */
export interface INvidiaChatResponse {
  id: string;
  model: string;
  choices: INvidiaChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** Opciones de una llamada al modelo. */
export interface INvidiaChatOptions {
  /** Herramientas ofrecidas al modelo. Si se omite, responde solo con texto. */
  tools?: INvidiaTool[];
  /** Temperatura de muestreo. Por defecto 0.2 (órdenes deterministas). */
  temperature?: number;
  /** Límite de tokens de la respuesta. */
  maxTokens?: number;
}
