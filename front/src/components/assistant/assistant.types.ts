/**
 * Contrato del módulo del asistente, espejo de
 * `back/src/assistant/interfaces/assistant-command.interface.ts`.
 */

/** Origen de la orden. */
export type AssistantInputType = 'TEXTO' | 'VOZ';

/** Nombres canónicos de las acciones que el asistente puede ejecutar. */
export const ASSISTANT_ACTIONS = {
  CREAR_CLIENTE: 'crear_cliente',
  MOVER_ETAPA_CLIENTE: 'mover_etapa_cliente',
  BUSCAR_CLIENTES: 'buscar_clientes',
  BUSCAR_INMUEBLES: 'buscar_inmuebles',
  CREAR_INMUEBLE: 'crear_inmueble',
  GENERAR_CONTRATO: 'generar_contrato',
  CONTRATOS_POR_ESTADO: 'contratos_por_estado',
  FIRMAS_PENDIENTES: 'firmas_pendientes',
  VENCIMIENTOS_PROXIMOS: 'vencimientos_proximos',
} as const;

export type AssistantActionName =
  (typeof ASSISTANT_ACTIONS)[keyof typeof ASSISTANT_ACTIONS];

/**
 * Etiqueta en español de cada acción, espejo de `ASSISTANT_ACTION_LABELS` del
 * backend. Se usa al rehidratar el historial, donde solo llega el nombre
 * canónico de la acción.
 */
export const ASSISTANT_ACTION_LABELS: Record<string, string> = {
  [ASSISTANT_ACTIONS.CREAR_CLIENTE]: 'Alta de cliente',
  [ASSISTANT_ACTIONS.MOVER_ETAPA_CLIENTE]: 'Cambio de etapa',
  [ASSISTANT_ACTIONS.BUSCAR_CLIENTES]: 'Búsqueda de clientes',
  [ASSISTANT_ACTIONS.BUSCAR_INMUEBLES]: 'Búsqueda de inmuebles',
  [ASSISTANT_ACTIONS.CREAR_INMUEBLE]: 'Alta de inmueble',
  [ASSISTANT_ACTIONS.GENERAR_CONTRATO]: 'Generación de contrato',
  [ASSISTANT_ACTIONS.CONTRATOS_POR_ESTADO]: 'Contratos por estado',
  [ASSISTANT_ACTIONS.FIRMAS_PENDIENTES]: 'Firmas pendientes',
  [ASSISTANT_ACTIONS.VENCIMIENTOS_PROXIMOS]: 'Vencimientos próximos',
};

/** Acción que el modelo decidió ejecutar. */
export interface AssistantExecutedAction {
  nombre: string;
  etiqueta: string;
  argumentos: Record<string, unknown>;
}

/**
 * Resultado devuelto por el dominio.
 *
 * El endpoint de comando devuelve la carga en `data`; el historial la devuelve
 * ya resumida en `elementos` / `elemento`. La interfaz contempla ambas formas.
 */
export interface AssistantExecutionResult {
  ok: boolean;
  mensaje: string;
  data?: unknown;
  total?: number;
  elementos?: unknown[];
  elemento?: unknown;
  aviso?: string;
}

/** Respuesta de `POST /assistant/command`. */
export interface AssistantCommandResponse {
  id?: number;
  origen: AssistantInputType;
  transcripcion: string;
  accion: AssistantExecutedAction | null;
  resultado: AssistantExecutionResult | null;
  respuesta: string;
  /**
   * Motivo del fallo, o `null` si la orden se resolvió bien. El endpoint
   * responde 200 aunque el modelo falle, así que es lo único que distingue un
   * error de una respuesta correcta.
   */
  error: string | null;
  fecha: string;
}

/** Registro tal como lo devuelve `GET /assistant/history`. */
export interface AssistantLogEntry {
  id: number;
  inputType: AssistantInputType;
  transcripcion: string | null;
  accion: string | null;
  argumentos: Record<string, unknown> | null;
  resultado: AssistantExecutionResult | null;
  correcto: boolean;
  respuesta: string | null;
  error: string | null;
  duracionMs: number | null;
  createdAt: string;
}

/** Acción disponible según el estado del backend. */
export interface AssistantActionStatus {
  nombre: string;
  etiqueta: string;
  disponible: boolean;
}

/** Respuesta de `GET /assistant/status`. */
export interface AssistantStatus {
  iaConfigurada: boolean;
  vozConfigurada: boolean;
  modelo: string;
  acciones: AssistantActionStatus[];
}

/** Fases visuales del asistente en la interfaz. */
export type AssistantPhase =
  | 'inactivo'
  | 'grabando'
  | 'transcribiendo'
  | 'ejecutando';

/** Turno de la conversación pintado en la vista de chat. */
export interface AssistantTurn {
  /** Clave estable para React. */
  key: string;
  origen: AssistantInputType;
  transcripcion: string;
  accion: AssistantExecutedAction | null;
  resultado: AssistantExecutionResult | null;
  respuesta: string;
  fecha: string;
  /** `true` mientras el turno está en curso (optimista). */
  pendiente?: boolean;
  /** Motivo del fallo, si la orden no se pudo resolver. */
  error?: string | null;
}
