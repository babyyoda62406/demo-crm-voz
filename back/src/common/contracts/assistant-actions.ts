/**
 * ============================================================================
 * CONTRATOS COMPARTIDOS — Acciones ejecutables por el asistente de IA
 * ============================================================================
 *
 * Este fichero es la FRONTERA entre el modulo `assistant/` (que interpreta la
 * intencion del usuario mediante NVIDIA) y los modulos de dominio que ejecutan
 * de verdad la accion contra la base de datos.
 *
 * COMO SE CONECTA UN MODULO DE DOMINIO
 * ------------------------------------
 * 1. Cada servicio de dominio implementa SU interfaz:
 *      `export class ClientsService implements IClientActions { ... }`
 * 2. Cada modulo exporta su servicio y lo registra ADEMAS bajo el token
 *    correspondiente de `ASSISTANT_ACTION_TOKENS`, para que `assistant/` pueda
 *    inyectarlo sin acoplarse a la clase concreta:
 *
 *      @Module({
 *        providers: [
 *          ClientsService,
 *          { provide: ASSISTANT_ACTION_TOKENS.CLIENT, useExisting: ClientsService },
 *        ],
 *        exports: [ClientsService, ASSISTANT_ACTION_TOKENS.CLIENT],
 *      })
 *
 * 3. TODOS los metodos devuelven `Promise<IAssistantActionResult<T>>`. Nunca
 *    lanzan para errores de negocio esperados (cliente inexistente, etapa
 *    desconocida): se devuelve `{ ok: false, mensaje }` con un mensaje EN
 *    ESPANOL apto para mostrarse tal cual al usuario final.
 * 4. Cambiar una firma de aqui rompe a la vez al asistente y a todos los
 *    dominios que la implementan, asi que se trata como una API publica: se
 *    amplia con campos opcionales antes que modificarse.
 */

// ---------------------------------------------------------------------------
// Tipos base
// ---------------------------------------------------------------------------

/**
 * Resultado uniforme de cualquier accion ejecutada por el asistente.
 * `mensaje` siempre viene redactado en espanol y listo para mostrarse en la UI.
 */
export interface IAssistantActionResult<T = unknown> {
  /** `true` si la accion se completo; `false` si fallo por regla de negocio. */
  ok: boolean;
  /** Texto en espanol explicando el resultado (exito o motivo del fallo). */
  mensaje: string;
  /** Carga util devuelta por la accion (entidad creada, listado, etc.). */
  data?: T;
}

/**
 * Referencia flexible a una entidad: id numerico o texto identificativo
 * (nombre, referencia, email). El dominio resuelve la ambiguedad y, si hay
 * varias coincidencias, devuelve `ok: false` pidiendo concrecion.
 */
export type EntityRef = number | string;

/** Paginacion opcional aplicable a cualquier busqueda del asistente. */
export interface IAssistantPagination {
  /** Pagina solicitada (1-indexada). Por defecto 1. */
  page?: number;
  /** Registros por pagina. Por defecto 10. */
  size?: number;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

/**
 * Zonas en las que opera Vantia, escritas tal como se dictan y se muestran.
 * Es el vocabulario cerrado que se le ofrece al modelo; el dominio se encarga
 * de normalizarlas a los valores canonicos de su enum `InterestZone`.
 */
export const ASSISTANT_INTEREST_ZONES = [
  'Altabria',
  'Valdemor',
  'Serranova',
  'Puentealba',
  'Maralta',
  'Albamar',
  'Ribaverde',
] as const;

/** Union de las zonas de interes admitidas por el asistente. */
export type AssistantInterestZone = (typeof ASSISTANT_INTEREST_ZONES)[number];

/** Datos minimos para dar de alta un cliente desde el asistente. */
export interface ICreateClientInput {
  /** Nombre o razon social del cliente. Obligatorio. */
  nombre: string;
  /** Apellidos, si es persona fisica. */
  apellidos?: string;
  /** Correo electronico de contacto. */
  email?: string;
  /** Telefono de contacto. */
  telefono?: string;
  /** NIF / CIF / NIE. */
  documento?: string;
  /** Linea de negocio: PSI para inversores, alquiler temporal, reformas. */
  lineaNegocio?: string;
  /** Etapa inicial del pipeline. Si se omite, el dominio usa la primera. */
  etapa?: string;
  /** Origen del lead (web, referido, portal inmobiliario...). */
  origen?: string;
  /** Presupuesto minimo en euros que maneja el cliente. */
  presupuestoMin?: number;
  /** Presupuesto maximo en euros que maneja el cliente. */
  presupuestoMax?: number;
  /**
   * Zonas en las que el cliente quiere operar. Se admiten las etiquetas de
   * `ASSISTANT_INTEREST_ZONES`; el dominio normaliza tildes, mayusculas y
   * grafias alternativas, y descarta lo que no reconozca.
   */
  zonasInteres?: string[];
  /** Notas libres dictadas por la persona usuaria. */
  notas?: string;
}

/** Filtro de busqueda de clientes lanzado desde el asistente. */
export interface IFindClientsFilter extends IAssistantPagination {
  /** Texto libre: busca en nombre, apellidos, email, telefono y documento. */
  search?: string;
  /** Etapa concreta del pipeline. */
  etapa?: string;
  /** Linea de negocio concreta. */
  lineaNegocio?: string;
  /** Id del usuario responsable del cliente. */
  responsableId?: number;
}

/**
 * Acciones sobre clientes expuestas al asistente de IA.
 * La implementa `ClientsService` (modulo `clients/`).
 */
export interface IClientActions {
  /**
   * Da de alta un cliente nuevo en el CRM.
   * @param data Datos del cliente extraidos de la orden del usuario.
   * @returns El cliente creado, o `ok: false` si ya existe o faltan datos.
   */
  createClient(
    data: ICreateClientInput,
  ): Promise<IAssistantActionResult<unknown>>;

  /**
   * Mueve un cliente a otra etapa del pipeline (columna del kanban).
   * @param clientRef Id numerico del cliente o su nombre tal como lo dicto el usuario.
   * @param etapa Etapa destino. El dominio la normaliza (tildes, mayusculas, sinonimos).
   * @returns El cliente actualizado, o `ok: false` si no se identifico
   *          univocamente el cliente o la etapa no existe.
   */
  moveClientStage(
    clientRef: EntityRef,
    etapa: string,
  ): Promise<IAssistantActionResult<unknown>>;

  /**
   * Busca clientes segun un filtro en lenguaje estructurado.
   * @param filtro Criterios de busqueda y paginacion.
   * @returns Listado de clientes coincidentes (array vacio si no hay ninguno).
   */
  findClients(
    filtro: IFindClientsFilter,
  ): Promise<IAssistantActionResult<unknown[]>>;
}

// ---------------------------------------------------------------------------
// Inmuebles
// ---------------------------------------------------------------------------

/** Datos minimos para dar de alta un inmueble desde el asistente. */
export interface ICreatePropertyInput {
  /** Referencia interna del inmueble. Si se omite, el dominio la genera. */
  referencia?: string;
  /** Direccion completa. Obligatoria. */
  direccion: string;
  /** Poblacion o municipio. */
  poblacion?: string;
  /** Provincia. */
  provincia?: string;
  /** Codigo postal. */
  codigoPostal?: string;
  /** Tipo de inmueble (piso, local, chalet, nave...). */
  tipo?: string;
  /** Precio de venta o renta mensual, en euros. */
  precio?: number;
  /** Superficie en metros cuadrados. */
  superficie?: number;
  /** Numero de habitaciones. */
  habitaciones?: number;
  /** Estado comercial (disponible, reservado, vendido, alquilado...). */
  estado?: string;
  /** Cliente propietario o inversor asociado. */
  clientRef?: EntityRef;
  /** Notas libres. */
  notas?: string;
}

/** Filtro de busqueda de inmuebles lanzado desde el asistente. */
export interface IFindPropertiesFilter extends IAssistantPagination {
  /** Texto libre: busca en referencia, direccion y poblacion. */
  search?: string;
  /** Poblacion o municipio. */
  poblacion?: string;
  /** Tipo de inmueble. */
  tipo?: string;
  /** Estado comercial. */
  estado?: string;
  /** Precio minimo en euros. */
  precioMin?: number;
  /** Precio maximo en euros. */
  precioMax?: number;
  /** Numero minimo de habitaciones. */
  habitacionesMin?: number;
}

/**
 * Acciones sobre inmuebles expuestas al asistente de IA.
 * La implementa `PropertiesService` (modulo `properties/`).
 */
export interface IPropertyActions {
  /**
   * Busca inmuebles segun un filtro en lenguaje estructurado.
   * @param filtro Criterios de busqueda y paginacion.
   * @returns Listado de inmuebles coincidentes (array vacio si no hay ninguno).
   */
  findProperties(
    filtro: IFindPropertiesFilter,
  ): Promise<IAssistantActionResult<unknown[]>>;

  /**
   * Da de alta un inmueble nuevo en la cartera.
   * @param data Datos del inmueble extraidos de la orden del usuario.
   * @returns El inmueble creado, o `ok: false` si la referencia ya existe.
   */
  createProperty(
    data: ICreatePropertyInput,
  ): Promise<IAssistantActionResult<unknown>>;
}

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/**
 * Datos de relleno de una plantilla de contrato. Las claves coinciden con los
 * marcadores del `.docx` (docxtemplater), p. ej. `{nombreCliente}`.
 */
export type IContractTemplateData = Record<string, string | number | boolean>;

/** Estados posibles del ciclo de vida de un contrato. */
export enum ContractStatus {
  /** Generado pero aun no revisado. */
  BORRADOR = 'BORRADOR',
  /** Enviado al cliente, pendiente de firma. */
  PENDIENTE_FIRMA = 'PENDIENTE_FIRMA',
  /** Firmado por todas las partes. */
  FIRMADO = 'FIRMADO',
  /** Anulado o rechazado. */
  ANULADO = 'ANULADO',
  /** Vencido por fecha. */
  VENCIDO = 'VENCIDO',
}

/**
 * Acciones sobre contratos expuestas al asistente de IA.
 * La implementa `ContractsService` (modulo `contracts/`).
 */
export interface IContractActions {
  /**
   * Genera un contrato a partir de una plantilla `.docx` rellenando sus
   * marcadores con los datos indicados.
   * @param templateKey Clave de la plantilla registrada (p. ej. `mandato-psi`).
   * @param datos Pares clave/valor que rellenan los marcadores de la plantilla.
   * @param clientRef Cliente al que se vincula el contrato. Opcional: si se
   *        indica, el dominio completa automaticamente los datos del cliente.
   * @returns El contrato generado con su ruta de fichero, o `ok: false` si la
   *          plantilla no existe o faltan marcadores obligatorios.
   */
  generateContract(
    templateKey: string,
    datos: IContractTemplateData,
    clientRef?: EntityRef,
  ): Promise<IAssistantActionResult<unknown>>;

  /**
   * Lista los contratos que se encuentran en un estado concreto.
   * @param status Estado del contrato a filtrar.
   * @returns Listado de contratos en ese estado (array vacio si no hay ninguno).
   */
  getContractsByStatus(
    status: ContractStatus,
  ): Promise<IAssistantActionResult<unknown[]>>;
}

// ---------------------------------------------------------------------------
// Cuadro de mando
// ---------------------------------------------------------------------------

/**
 * Consultas agregadas para el cuadro de mando y para que el asistente pueda
 * responder preguntas de situacion.
 * La implementa `DashboardService` (modulo `dashboard/`).
 */
export interface IDashboardQueries {
  /**
   * Devuelve los documentos y contratos que siguen a la espera de firma.
   * @returns Listado de elementos pendientes de firma, ordenados del mas
   *          antiguo al mas reciente.
   */
  pendingSignatures(): Promise<IAssistantActionResult<unknown[]>>;

  /**
   * Devuelve los vencimientos proximos (contratos, alquileres, hitos de
   * reforma, facturas) dentro de la ventana temporal indicada.
   * @param dias Numero de dias hacia delante a considerar. Por defecto 30.
   * @returns Listado de vencimientos ordenados por fecha ascendente.
   */
  upcomingDeadlines(dias?: number): Promise<IAssistantActionResult<unknown[]>>;
}

// ---------------------------------------------------------------------------
// Tokens de inyeccion
// ---------------------------------------------------------------------------

/**
 * Tokens con los que cada modulo de dominio publica su implementacion y con los
 * que `assistant/` la inyecta. Evitan que el asistente importe clases concretas
 * de dominio (y con ello, dependencias circulares entre modulos).
 */
export const ASSISTANT_ACTION_TOKENS = {
  /** Proveedor de `IClientActions` (modulo `clients/`). */
  CLIENT: 'ASSISTANT_CLIENT_ACTIONS',
  /** Proveedor de `IPropertyActions` (modulo `properties/`). */
  PROPERTY: 'ASSISTANT_PROPERTY_ACTIONS',
  /** Proveedor de `IContractActions` (modulo `contracts/`). */
  CONTRACT: 'ASSISTANT_CONTRACT_ACTIONS',
  /** Proveedor de `IDashboardQueries` (modulo `dashboard/`). */
  DASHBOARD: 'ASSISTANT_DASHBOARD_QUERIES',
} as const;

/** Union de todos los tokens de accion disponibles. */
export type AssistantActionToken =
  (typeof ASSISTANT_ACTION_TOKENS)[keyof typeof ASSISTANT_ACTION_TOKENS];

/**
 * Nombres canonicos de las acciones que el modelo de NVIDIA puede invocar.
 * El asistente traduce la intencion del usuario a uno de estos identificadores
 * y despacha al metodo correspondiente de la interfaz de dominio.
 */
export enum AssistantActionName {
  CREAR_CLIENTE = 'crear_cliente',
  MOVER_ETAPA_CLIENTE = 'mover_etapa_cliente',
  BUSCAR_CLIENTES = 'buscar_clientes',
  BUSCAR_INMUEBLES = 'buscar_inmuebles',
  CREAR_INMUEBLE = 'crear_inmueble',
  GENERAR_CONTRATO = 'generar_contrato',
  CONTRATOS_POR_ESTADO = 'contratos_por_estado',
  FIRMAS_PENDIENTES = 'firmas_pendientes',
  VENCIMIENTOS_PROXIMOS = 'vencimientos_proximos',
}
