import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import {
  ASSISTANT_ACTION_TOKENS,
  AssistantActionName,
  ContractStatus,
  EntityRef,
  IAssistantActionResult,
  IClientActions,
  IContractActions,
  IContractTemplateData,
  ICreateClientInput,
  ICreatePropertyInput,
  IDashboardQueries,
  IFindClientsFilter,
  IFindPropertiesFilter,
  IPropertyActions,
} from '../common/contracts/assistant-actions';
import { ItFindAllResponse } from '../common/interfaces/find-all-response.interface';
import { AssistantLog } from './entities/assistant-log.entity';
import { AssistantInputType } from './enums/assistant-input-type.enum';
import { FindAllAssistantLogDto } from './dto/find-all-assistant-log.dto';
import { ElevenLabsService } from './services/elevenlabs.service';
import { NvidiaService } from './services/nvidia.service';
import {
  ASSISTANT_ACTION_LABELS,
  ASSISTANT_TOOLS,
  ASSISTANT_TOOL_NAMES,
} from './tools/assistant-tools';
import {
  IAssistantCommandInput,
  IAssistantCommandResponse,
  IAssistantExecutedAction,
  IAssistantExecutionResult,
} from './interfaces/assistant-command.interface';
import {
  INvidiaMessage,
  INvidiaToolCall,
} from './interfaces/nvidia.interfaces';

/** Máximo de registros de una lista que se le enseñan al modelo. */
const MAX_ELEMENTOS_AL_MODELO = 10;

/** Tope de registros por página que se acepta de una búsqueda del modelo. */
const MAX_TAMANO_PAGINA = 50;

/**
 * Palabras que el modelo cuela como «etapa» del pipeline pero que no lo son.
 *
 * Ante «cuántos clientes activos hay» el modelo tiende a mandar
 * `etapa: "activos"`. Esa etapa no existe, `normalizeStage` la rechaza y la
 * búsqueda se fuerza a vacío: la persona usuaria veía «no he encontrado ningún cliente»
 * teniendo la cartera llena. Como «activo» es justo el estado por defecto de
 * `findAll`, el filtro se descarta y la consulta hace lo correcto sola.
 */
const ETAPAS_INEXISTENTES = new Set([
  'activo',
  'activos',
  'activa',
  'activas',
  'inactivo',
  'inactivos',
  'en cartera',
  'cartera',
  'todos',
  'todas',
]);

/**
 * Orquestador del asistente de voz e IA.
 *
 * Flujo de una orden:
 *   1. Si llega audio, se transcribe con ElevenLabs.
 *   2. Se consulta al modelo de NVIDIA con las herramientas del CRM.
 *   3. Si el modelo invoca una herramienta, se ejecuta la acción REAL contra el
 *      dominio correspondiente (por token, sin acoplarse a sus clases).
 *   4. Se vuelve a llamar al modelo con el resultado para que redacte la
 *      confirmación en español.
 *   5. Se registra todo en `assistant_logs`.
 *
 * Los proveedores de dominio se inyectan como opcionales: si un módulo aún no
 * publica su implementación, el asistente sigue en pie y responde que esa
 * acción no está disponible, en vez de tumbar el arranque de la aplicación.
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    @InjectRepository(AssistantLog)
    private readonly assistantLogDAO: Repository<AssistantLog>,
    private readonly elevenLabsService: ElevenLabsService,
    private readonly nvidiaService: NvidiaService,
    @Optional()
    @Inject(ASSISTANT_ACTION_TOKENS.CLIENT)
    private readonly clientActions?: IClientActions,
    @Optional()
    @Inject(ASSISTANT_ACTION_TOKENS.PROPERTY)
    private readonly propertyActions?: IPropertyActions,
    @Optional()
    @Inject(ASSISTANT_ACTION_TOKENS.CONTRACT)
    private readonly contractActions?: IContractActions,
    @Optional()
    @Inject(ASSISTANT_ACTION_TOKENS.DASHBOARD)
    private readonly dashboardQueries?: IDashboardQueries,
  ) {}

  // -------------------------------------------------------------------------
  // Caso de uso principal
  // -------------------------------------------------------------------------

  /**
   * Procesa una orden del asistente, venga dictada o escrita.
   * Nunca lanza por un fallo de IA: devuelve siempre una respuesta en español.
   */
  async processCommand(
    input: IAssistantCommandInput,
  ): Promise<IAssistantCommandResponse> {
    const iniciadoEn = Date.now();
    const origen = input.audio
      ? AssistantInputType.VOZ
      : AssistantInputType.TEXTO;

    // 1. Transcripción (solo si la orden llegó por voz).
    let transcripcion = (input.texto || '').trim();

    if (input.audio) {
      const transcripcionResultado =
        await this.elevenLabsService.transcribe(input.audio);

      if (!transcripcionResultado.ok) {
        return this.registrar({
          origen,
          transcripcion: '',
          accion: null,
          resultado: null,
          respuesta: transcripcionResultado.mensaje,
          error: transcripcionResultado.mensaje,
          userId: input.userId,
          iniciadoEn,
        });
      }

      transcripcion = transcripcionResultado.texto;
    }

    if (!transcripcion) {
      const respuesta =
        'No he recibido ninguna orden. Dicta o escribe qué necesitas.';
      return this.registrar({
        origen,
        transcripcion: '',
        accion: null,
        resultado: null,
        respuesta,
        error: respuesta,
        userId: input.userId,
        iniciadoEn,
      });
    }

    // 2. Primera consulta al modelo, con las herramientas del CRM.
    const conversacion: INvidiaMessage[] = [
      { role: 'system', content: this.construirPromptSistema() },
      { role: 'user', content: transcripcion },
    ];

    const primeraRespuesta = await this.nvidiaService.chat(conversacion, {
      tools: ASSISTANT_TOOLS,
    });

    if (!primeraRespuesta.ok) {
      return this.registrar({
        origen,
        transcripcion,
        accion: null,
        resultado: null,
        respuesta: primeraRespuesta.mensaje,
        error: primeraRespuesta.mensaje,
        userId: input.userId,
        iniciadoEn,
      });
    }

    const mensajeModelo = primeraRespuesta.message;
    const toolCall = this.extraerToolCall(mensajeModelo);

    // 3a. Sin herramienta: el modelo solo conversa (pide un dato, aclara...).
    if (!toolCall) {
      const respuesta =
        (mensajeModelo.content || '').trim() ||
        'No he sabido interpretar la orden. ¿Puedes decirlo de otra forma?';

      return this.registrar({
        origen,
        transcripcion,
        accion: null,
        resultado: null,
        respuesta,
        userId: input.userId,
        iniciadoEn,
      });
    }

    // 3b. Con herramienta: se ejecuta la acción real contra el dominio.
    const argumentos = this.parsearArgumentos(toolCall);
    const accion: IAssistantExecutedAction = {
      nombre: toolCall.function.name,
      etiqueta:
        ASSISTANT_ACTION_LABELS[
          toolCall.function.name as AssistantActionName
        ] || 'Acción del asistente',
      argumentos,
    };

    const resultado = await this.ejecutarAccion(
      toolCall.function.name as AssistantActionName,
      argumentos,
    );

    this.logger.log(
      `Acción "${accion.nombre}" ejecutada (ok: ${resultado.ok}) para la orden: "${transcripcion}"`,
    );

    // 4. Segunda consulta: el modelo redacta la confirmación en español.
    const respuesta = await this.redactarConfirmacion(
      conversacion,
      mensajeModelo,
      toolCall,
      resultado,
    );

    return this.registrar({
      origen,
      transcripcion,
      accion,
      resultado,
      respuesta,
      error: resultado.ok ? null : resultado.mensaje,
      userId: input.userId,
      iniciadoEn,
    });
  }

  /** Historial paginado de órdenes, de la más reciente a la más antigua. */
  async findAllLogs(
    dto: FindAllAssistantLogDto,
    userId?: number,
  ): Promise<ItFindAllResponse<AssistantLog>> {
    const { page = 1, size = 10, inputType, correcto, conError } = dto;

    const where: Record<string, unknown> = {};
    if (inputType) where.inputType = inputType;
    if (correcto !== undefined) where.correcto = correcto;
    // `conError: false` deja fuera las órdenes que fallaron: es lo que pide la
    // vista de chat al abrirse, para no recibir a la persona usuaria con un muro de
    // errores antiguos.
    if (conError !== undefined) where.error = conError ? Not(IsNull()) : IsNull();
    if (userId) where.userId = userId;

    const [data, total] = await this.assistantLogDAO.findAndCount({
      where,
      skip: (page - 1) * size,
      take: size,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      metadata: {
        records: total,
        frame: page,
        frameSize: size,
        lastFrame: Math.max(1, Math.ceil(total / size)),
      },
    };
  }

  /** Estado de configuración de los servicios externos, para la interfaz. */
  getStatus() {
    return {
      iaConfigurada: this.nvidiaService.estaConfigurado,
      vozConfigurada: this.elevenLabsService.estaConfigurado,
      modelo: this.nvidiaService.modelo,
      acciones: ASSISTANT_TOOLS.map((tool) => ({
        nombre: tool.function.name,
        etiqueta:
          ASSISTANT_ACTION_LABELS[
            tool.function.name as AssistantActionName
          ] || tool.function.name,
        disponible: this.accionDisponible(
          tool.function.name as AssistantActionName,
        ),
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Despacho de acciones al dominio
  // -------------------------------------------------------------------------

  /**
   * Ejecuta la acción elegida por el modelo contra el módulo de dominio que la
   * implementa. Nunca lanza: los fallos se devuelven como `ok: false`.
   */
  private async ejecutarAccion(
    nombre: AssistantActionName,
    args: Record<string, unknown>,
  ): Promise<IAssistantExecutionResult> {
    try {
      switch (nombre) {
        case AssistantActionName.CREAR_CLIENTE:
          return await this.invocar(this.clientActions, 'createClient', [
            this.construirClienteInput(args),
          ]);

        case AssistantActionName.MOVER_ETAPA_CLIENTE:
          return await this.invocar(this.clientActions, 'moveClientStage', [
            this.aEntityRef(args.cliente ?? args.clienteRef ?? args.clientRef),
            this.aTexto(args.etapa),
          ]);

        case AssistantActionName.BUSCAR_CLIENTES:
          return await this.invocar(this.clientActions, 'findClients', [
            this.construirFiltroClientes(args),
          ]);

        case AssistantActionName.BUSCAR_INMUEBLES:
          return await this.invocar(this.propertyActions, 'findProperties', [
            this.construirFiltroInmuebles(args),
          ]);

        case AssistantActionName.CREAR_INMUEBLE:
          return await this.invocar(this.propertyActions, 'createProperty', [
            this.construirInmuebleInput(args),
          ]);

        case AssistantActionName.GENERAR_CONTRATO: {
          const plantilla = this.aTexto(args.plantilla ?? args.templateKey);
          if (!plantilla) {
            return {
              ok: false,
              mensaje:
                'No se ha indicado qué plantilla de contrato hay que usar.',
            };
          }
          const clienteRef = this.aEntityRef(args.cliente ?? args.clientRef);
          return await this.invocar(this.contractActions, 'generateContract', [
            plantilla,
            this.construirDatosContrato(args.datos),
            clienteRef,
          ]);
        }

        case AssistantActionName.CONTRATOS_POR_ESTADO: {
          const estado = this.aContractStatus(args.estado ?? args.status);
          if (!estado) {
            return {
              ok: false,
              mensaje:
                'No se ha reconocido el estado del contrato. Puede ser borrador, pendiente de firma, firmado, anulado o vencido.',
            };
          }
          return await this.invocar(
            this.contractActions,
            'getContractsByStatus',
            [estado],
          );
        }

        case AssistantActionName.FIRMAS_PENDIENTES:
          return await this.invocar(
            this.dashboardQueries,
            'pendingSignatures',
            [],
          );

        case AssistantActionName.VENCIMIENTOS_PROXIMOS:
          return await this.invocar(
            this.dashboardQueries,
            'upcomingDeadlines',
            [this.aNumero(args.dias) ?? 30],
          );

        default:
          this.logger.warn(`El modelo pidió una acción desconocida: ${nombre}`);
          return {
            ok: false,
            mensaje:
              'Esa acción no está disponible en el asistente todavía.',
          };
      }
    } catch (error) {
      this.logger.error(
        `Error al ejecutar la acción "${nombre}": ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
      return {
        ok: false,
        mensaje:
          'La acción ha fallado al ejecutarse en el CRM. Vuelve a intentarlo o revísalo a mano.',
      };
    }
  }

  /**
   * Invoca un método del contrato comprobando antes que el módulo de dominio
   * lo publica de verdad. Así una implementación aún pendiente se traduce en un
   * mensaje claro y no en un error 500.
   */
  private async invocar<T extends object>(
    proveedor: T | undefined,
    metodo: keyof T,
    args: unknown[],
  ): Promise<IAssistantExecutionResult> {
    const fn = proveedor?.[metodo];

    if (typeof fn !== 'function') {
      this.logger.warn(
        `El dominio no publica el método "${String(metodo)}" requerido por el asistente.`,
      );
      return {
        ok: false,
        mensaje: 'Ese módulo del CRM todavía no está disponible.',
      };
    }

    const resultado = (await (fn as (...a: unknown[]) => unknown).apply(
      proveedor,
      args,
    )) as IAssistantActionResult<unknown>;

    return {
      ok: Boolean(resultado?.ok),
      mensaje: resultado?.mensaje || '',
      data: resultado?.data,
    };
  }

  /** Comprueba si el dominio que implementa una acción está disponible. */
  private accionDisponible(nombre: AssistantActionName): boolean {
    switch (nombre) {
      case AssistantActionName.CREAR_CLIENTE:
      case AssistantActionName.MOVER_ETAPA_CLIENTE:
      case AssistantActionName.BUSCAR_CLIENTES:
        return Boolean(this.clientActions);
      case AssistantActionName.BUSCAR_INMUEBLES:
      case AssistantActionName.CREAR_INMUEBLE:
        return Boolean(this.propertyActions);
      case AssistantActionName.GENERAR_CONTRATO:
      case AssistantActionName.CONTRATOS_POR_ESTADO:
        return Boolean(this.contractActions);
      case AssistantActionName.FIRMAS_PENDIENTES:
      case AssistantActionName.VENCIMIENTOS_PROXIMOS:
        return Boolean(this.dashboardQueries);
      default:
        return false;
    }
  }

  // -------------------------------------------------------------------------
  // Conversación con el modelo
  // -------------------------------------------------------------------------

  /**
   * Instrucciones del asistente, en español y ancladas al negocio de Vantia.
   *
   * No repite lo que hace cada herramienta —para eso están sus descripciones en
   * `ASSISTANT_TOOLS`—, pero sí fija las dos cosas que el modelo no deduce solo:
   *
   *  1. Que las PREGUNTAS DE RECUENTO son órdenes. Con el prompt anterior, que
   *     solo hablaba de «convertir la orden en una llamada», «¿cuántos clientes
   *     activos hay en la cartera?» se quedaba sin herramienta 1 de cada 5
   *     intentos (medido con openai/gpt-oss-20b, 5 repeticiones por frase): el
   *     modelo contestaba «no dispongo de una función que devuelva el número
   *     total», y la vista mostraba «No he sabido interpretar la orden».
   *  2. Que «cliente activo» es el caso por defecto de `buscar_clientes` y no
   *     una etapa del pipeline. Sin decirlo, el modelo mandaba
   *     `etapa: "activos"`, que no existe, y la búsqueda devolvía cero clientes
   *     con toda la apariencia de haber funcionado.
   */
  private construirPromptSistema(): string {
    const hoy = new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    return [
      'Eres el asistente del CRM inmobiliario del despacho (PSI para inversores, alquiler temporal a empresas y seguimiento de reformas).',
      'Convierte la orden de la persona usuaria en UNA llamada a herramienta, sin describir lo que harías. Rellena solo los argumentos que ella haya dicho.',
      'Las PREGUNTAS también son órdenes. «¿Cuántos…?», «¿cuántas…?», «número de…», «¿hay algún…?», «¿queda alguna…?» y «¿tenemos…?» se resuelven con la MISMA herramienta de búsqueda que usarías para listarlos: esa herramienta ya devuelve el recuento. No existe ninguna herramienta aparte para contar, así que nunca digas que no puedes contar ni que no dispones de esa función.',
      'Ejemplos: «¿cuántos clientes activos hay en la cartera?» → buscar_clientes sin argumentos. «¿cuántos contratos están pendientes de firma?» → firmas_pendientes. «¿hay algún inmueble disponible en Valdemor?» → buscar_inmuebles con poblacion "Valdemor" y estado "disponible". «¿cuántos inmuebles tenemos?» → buscar_inmuebles sin argumentos. «número de clientes de reformas» → buscar_clientes con lineaNegocio "reformas".',
      'Un cliente «activo» o «en cartera» es lo que buscar_clientes devuelve por defecto: no lo traduzcas a una etapa del pipeline ni preguntes qué significa. Ante la duda, llama a la herramienta con MENOS filtros en lugar de pedir aclaraciones.',
      'Si falta un dato imprescindible para dar de alta o generar algo, o si de verdad ninguna herramienta encaja, responde en español de España en una frase.',
      `Hoy es ${hoy}. Importes en euros y superficies en metros cuadrados.`,
    ].join('\n');
  }

  /**
   * Segunda llamada al modelo: con el resultado real de la acción en la mano,
   * redacta la confirmación que verá la persona usuaria.
   */
  private async redactarConfirmacion(
    conversacion: INvidiaMessage[],
    mensajeModelo: INvidiaMessage,
    toolCall: INvidiaToolCall,
    resultado: IAssistantExecutionResult,
  ): Promise<string> {
    const mensajes: INvidiaMessage[] = [
      ...conversacion,
      {
        role: 'assistant',
        content: mensajeModelo.content ?? '',
        tool_calls: [toolCall],
      },
      {
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(this.resumirParaModelo(resultado)),
      },
      {
        role: 'system',
        content: [
          'Confirma a la persona usuaria en español y en dos frases como máximo qué ha pasado, con los datos clave del resultado (nombres, referencias, importes o cuántos elementos hay).',
          'Si la orden era una pregunta de recuento («cuántos», «número de», «hay algún»), empieza la respuesta por la cifra exacta.',
          // El recuento bueno vive en `mensaje`, que el dominio compone con el
          // total real de la consulta. Ni `mostrados` ni la lista `elementos`
          // sirven para contar: son la pagina que se le ensena al modelo (10
          // por defecto), asi que responder con ellos convertiria «hay 24
          // clientes» en «hay 10 clientes».
          'La cifra buena es la que ya viene escrita en el campo "mensaje" del resultado: cópiala tal cual. NUNCA cuentes tú los elementos de la lista "elementos" ni uses el campo "mostrados" como respuesta: esa lista viene recortada y te haría dar un número menor del real.',
          'Si falló, explica el motivo y el siguiente paso. Nada de JSON, nombres de funciones ni datos inventados.',
          // La vista pinta la respuesta como texto plano: sin esta línea, los
          // asteriscos y las listas del modelo se ven en crudo en la burbuja.
          'Escribe en texto corrido, sin markdown, sin asteriscos y sin listas numeradas.',
        ].join(' '),
      },
    ];

    const segundaRespuesta = await this.nvidiaService.chat(mensajes, {
      temperature: 0.3,
      maxTokens: 400,
    });

    const redactada = (segundaRespuesta.message?.content || '').trim();

    // Si el modelo falla al redactar, el mensaje del dominio ya viene en
    // español y sirve perfectamente de confirmación.
    if (!redactada) {
      return (
        resultado.mensaje ||
        'La acción se ha procesado, pero no he podido redactar la confirmación.'
      );
    }

    return redactada;
  }

  /** Recorta el resultado para no enviarle al modelo cargas enormes. */
  private resumirParaModelo(resultado: IAssistantExecutionResult) {
    const resumen: Record<string, unknown> = {
      ok: resultado.ok,
      mensaje: resultado.mensaje,
    };

    if (Array.isArray(resultado.data)) {
      // Se llama `mostrados` y NO `total` a propósito. Es el tamaño de la
      // página que se le enseña al modelo, no cuántos hay: `findClients`
      // devuelve de diez en diez, así que con 11 clientes en la cartera este
      // número es 10. Mientras se llamó `total`, el modelo lo tomaba por la
      // respuesta y contestaba «hay 10 clientes activos» teniendo 11, aunque
      // el recuento bueno viniera escrito en `mensaje` justo al lado.
      resumen.mostrados = resultado.data.length;
      resumen.elementos = resultado.data.slice(0, MAX_ELEMENTOS_AL_MODELO);
      if (resultado.data.length > MAX_ELEMENTOS_AL_MODELO) {
        resumen.aviso = `Solo se muestran los primeros ${MAX_ELEMENTOS_AL_MODELO} de ${resultado.data.length}.`;
      }
    } else if (resultado.data !== undefined && resultado.data !== null) {
      resumen.elemento = resultado.data;
    }

    return resumen;
  }

  /**
   * Extrae la llamada a herramienta de la respuesta del modelo. Además del
   * campo estándar `tool_calls`, contempla el caso de modelos que devuelven la
   * invocación como JSON dentro del contenido.
   */
  private extraerToolCall(mensaje: INvidiaMessage): INvidiaToolCall | null {
    const toolCall = mensaje?.tool_calls?.[0];

    if (toolCall && ASSISTANT_TOOL_NAMES.has(toolCall.function?.name)) {
      return toolCall;
    }

    if (toolCall) {
      this.logger.warn(
        `El modelo invocó una herramienta inexistente: ${toolCall.function?.name}`,
      );
      return null;
    }

    const contenido = (mensaje?.content || '').trim();
    if (!contenido.startsWith('{') || !contenido.endsWith('}')) {
      return null;
    }

    try {
      const posible = JSON.parse(contenido) as {
        name?: string;
        arguments?: unknown;
        parameters?: unknown;
      };

      if (!posible?.name || !ASSISTANT_TOOL_NAMES.has(posible.name)) {
        return null;
      }

      const args = posible.arguments ?? posible.parameters ?? {};

      return {
        id: `fallback-${Date.now()}`,
        type: 'function',
        function: {
          name: posible.name,
          arguments: typeof args === 'string' ? args : JSON.stringify(args),
        },
      };
    } catch {
      return null;
    }
  }

  /** Convierte los argumentos serializados del modelo en un objeto seguro. */
  private parsearArgumentos(
    toolCall: INvidiaToolCall,
  ): Record<string, unknown> {
    const bruto = toolCall.function?.arguments;

    if (!bruto) return {};
    if (typeof bruto === 'object') return bruto as Record<string, unknown>;

    try {
      const parseado = JSON.parse(bruto);
      return parseado && typeof parseado === 'object'
        ? (parseado as Record<string, unknown>)
        : {};
    } catch {
      this.logger.warn(
        `Argumentos no parseables para "${toolCall.function?.name}": ${bruto}`,
      );
      return {};
    }
  }

  // -------------------------------------------------------------------------
  // Normalización de argumentos
  // -------------------------------------------------------------------------

  private construirClienteInput(
    args: Record<string, unknown>,
  ): ICreateClientInput {
    return this.limpiar<ICreateClientInput>({
      nombre: this.aTexto(args.nombre),
      apellidos: this.aTexto(args.apellidos),
      email: this.aTexto(args.email),
      telefono: this.aTexto(args.telefono),
      documento: this.aTexto(args.documento),
      lineaNegocio: this.aTexto(args.lineaNegocio),
      etapa: this.aTexto(args.etapa),
      origen: this.aTexto(args.origen),
      presupuestoMin: this.aNumero(args.presupuestoMin),
      presupuestoMax: this.aNumero(args.presupuestoMax),
      zonasInteres: this.aListaTexto(args.zonasInteres ?? args.zonas),
      notas: this.aTexto(args.notas),
    });
  }

  private construirFiltroClientes(
    args: Record<string, unknown>,
  ): IFindClientsFilter {
    return this.limpiar<IFindClientsFilter>({
      // El contrato usa `search`, igual que los DTO REST. Se sigue aceptando
      // `busqueda` porque algun modelo puede devolver todavia ese nombre.
      search: this.aTexto(args.search ?? args.busqueda),
      etapa: this.aEtapaReal(args.etapa),
      lineaNegocio: this.aTexto(args.lineaNegocio),
      page: this.aNumero(args.page),
      size: this.aTamanoPagina(args.size),
    });
  }

  private construirFiltroInmuebles(
    args: Record<string, unknown>,
  ): IFindPropertiesFilter {
    return this.limpiar<IFindPropertiesFilter>({
      search: this.aTexto(args.search ?? args.busqueda),
      poblacion: this.aTexto(args.poblacion),
      tipo: this.aTexto(args.tipo),
      estado: this.aTexto(args.estado),
      precioMin: this.aNumero(args.precioMin),
      precioMax: this.aNumero(args.precioMax),
      habitacionesMin: this.aNumero(args.habitacionesMin),
      page: this.aNumero(args.page),
      size: this.aTamanoPagina(args.size),
    });
  }

  private construirInmuebleInput(
    args: Record<string, unknown>,
  ): ICreatePropertyInput {
    return this.limpiar<ICreatePropertyInput>({
      referencia: this.aTexto(args.referencia),
      direccion: this.aTexto(args.direccion),
      poblacion: this.aTexto(args.poblacion),
      provincia: this.aTexto(args.provincia),
      codigoPostal: this.aTexto(args.codigoPostal),
      tipo: this.aTexto(args.tipo),
      precio: this.aNumero(args.precio),
      superficie: this.aNumero(args.superficie),
      habitaciones: this.aNumero(args.habitaciones),
      estado: this.aTexto(args.estado),
      clientRef: this.aEntityRef(args.cliente ?? args.clientRef),
      notas: this.aTexto(args.notas),
    });
  }

  /**
   * Normaliza los campos de relleno de una plantilla de contrato.
   *
   * El modelo entrega `datos` unas veces como objeto y otras como cadena JSON
   * (comportamiento observado en llama-3.1-70b), así que se contemplan ambos.
   */
  private construirDatosContrato(valor: unknown): IContractTemplateData {
    let fuente = valor;

    if (typeof fuente === 'string') {
      const texto = fuente.trim();
      if (!texto) return {};
      try {
        fuente = JSON.parse(texto);
      } catch {
        this.logger.warn(
          `Los datos del contrato no son un JSON válido: ${texto}`,
        );
        return {};
      }
    }

    if (!fuente || typeof fuente !== 'object' || Array.isArray(fuente)) {
      return {};
    }

    const datos: IContractTemplateData = {};

    for (const [clave, contenido] of Object.entries(
      fuente as Record<string, unknown>,
    )) {
      if (contenido === null || contenido === undefined) continue;

      if (
        typeof contenido === 'string' ||
        typeof contenido === 'number' ||
        typeof contenido === 'boolean'
      ) {
        datos[clave] = contenido;
      } else {
        datos[clave] = JSON.stringify(contenido);
      }
    }

    return datos;
  }

  /** Reconoce el estado de un contrato aunque venga dictado en lenguaje natural. */
  private aContractStatus(valor: unknown): ContractStatus | null {
    const texto = this.aTexto(valor);
    if (!texto) return null;

    const normalizado = texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[\s-]+/g, '_');

    if (normalizado in ContractStatus) {
      return ContractStatus[normalizado as keyof typeof ContractStatus];
    }
    if (normalizado.includes('BORRADOR')) return ContractStatus.BORRADOR;
    if (normalizado.includes('PENDIENTE') || normalizado.includes('FIRMA_')) {
      return ContractStatus.PENDIENTE_FIRMA;
    }
    if (normalizado.includes('FIRMADO')) return ContractStatus.FIRMADO;
    if (normalizado.includes('ANULADO') || normalizado.includes('CANCELADO')) {
      return ContractStatus.ANULADO;
    }
    if (normalizado.includes('VENCIDO') || normalizado.includes('CADUCADO')) {
      return ContractStatus.VENCIDO;
    }

    return null;
  }

  /**
   * Etapa del pipeline descartando las que el modelo se inventa al interpretar
   * «activos» o «en cartera» (ver `ETAPAS_INEXISTENTES`). Filtrar por una etapa
   * que no existe vacía el resultado; no filtrar devuelve lo que se pedía.
   */
  private aEtapaReal(valor: unknown): string | undefined {
    const texto = this.aTexto(valor);
    if (!texto) return undefined;

    const normalizada = texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();

    if (ETAPAS_INEXISTENTES.has(normalizada)) {
      this.logger.warn(
        `El modelo pidió filtrar por la etapa inexistente "${texto}"; se ignora el filtro.`,
      );
      return undefined;
    }

    return texto;
  }

  /**
   * Tamaño de página acotado a `MAX_TAMANO_PAGINA`.
   *
   * El esquema de la herramienta ya declara el máximo, pero el modelo lo ignora
   * de vez en cuando y llega a pedir `size: 1000`. La llamada al dominio no pasa
   * por la validación de los DTO REST, así que ese número entraría tal cual en
   * el `take` de la consulta.
   */
  private aTamanoPagina(valor: unknown): number | undefined {
    const numero = this.aNumero(valor);
    if (numero === undefined) return undefined;

    const entero = Math.trunc(numero);
    if (entero < 1) return undefined;

    return Math.min(entero, MAX_TAMANO_PAGINA);
  }

  /** Texto no vacío, o `undefined`. */
  private aTexto(valor: unknown): string | undefined {
    if (typeof valor === 'string') {
      const limpio = valor.trim();
      return limpio ? limpio : undefined;
    }
    if (typeof valor === 'number' || typeof valor === 'boolean') {
      return String(valor);
    }
    return undefined;
  }

  /**
   * Lista de textos no vacíos, o `undefined` si no queda ninguno.
   *
   * El modelo entrega los arrays unas veces como tal, otras como cadena JSON y
   * otras como enumeración separada por comas, así que se contemplan los tres
   * casos. La validación de qué valores son admisibles la hace el dominio.
   */
  private aListaTexto(valor: unknown): string[] | undefined {
    let fuente = valor;

    if (typeof fuente === 'string') {
      const texto = fuente.trim();
      if (!texto) return undefined;

      if (texto.startsWith('[')) {
        try {
          fuente = JSON.parse(texto) as unknown;
        } catch {
          fuente = texto.replace(/^\[|\]$/g, '').split(',');
        }
      } else {
        fuente = texto.split(/[,;|]/);
      }
    }

    if (!Array.isArray(fuente)) return undefined;

    const elementos = fuente
      .map((elemento) => this.aTexto(elemento))
      .filter((elemento): elemento is string => Boolean(elemento));

    return elementos.length ? elementos : undefined;
  }

  /** Número finito, aceptando también los que el modelo manda como texto. */
  private aNumero(valor: unknown): number | undefined {
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor;

    if (typeof valor === 'string') {
      const numero = Number.parseFloat(this.normalizarSeparadores(valor));
      if (Number.isFinite(numero)) return numero;
    }

    return undefined;
  }

  /**
   * Deja un número dictado en español listo para `parseFloat`.
   *
   * En es-ES el punto separa los millares y la coma los decimales ("250.000",
   * "1.234,56"), justo al revés de lo que entiende `parseFloat`. Sin esta
   * conversión, un presupuesto de "250.000" se guardaba como 250 euros.
   */
  private normalizarSeparadores(valor: string): string {
    const limpio = valor.replace(/[^\d,.-]/g, '');
    const ultimaComa = limpio.lastIndexOf(',');
    const ultimoPunto = limpio.lastIndexOf('.');

    // Con los dos separadores presentes, el último de ellos es el decimal.
    if (ultimaComa !== -1 && ultimoPunto !== -1) {
      return ultimaComa > ultimoPunto
        ? limpio.replace(/\./g, '').replace(',', '.')
        : limpio.replace(/,/g, '');
    }

    // Solo comas: una es el separador decimal español; varias son millares.
    if (ultimaComa !== -1) {
      const comas = limpio.split(',').length - 1;
      return comas > 1 ? limpio.replace(/,/g, '') : limpio.replace(',', '.');
    }

    // Solo puntos: son millares si hay varios ("1.234.567") o si el grupo
    // final tiene tres dígitos ("250.000"). Un único punto con otra cantidad
    // de dígitos detrás ("1.5") es un decimal y se respeta.
    if (ultimoPunto !== -1) {
      const puntos = limpio.split('.').length - 1;
      const decimales = limpio.length - ultimoPunto - 1;
      if (puntos > 1 || decimales === 3) return limpio.replace(/\./g, '');
    }

    return limpio;
  }

  /** Referencia a entidad: id numérico si lo parece, y si no, el texto. */
  private aEntityRef(valor: unknown): EntityRef | undefined {
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor;

    const texto = this.aTexto(valor);
    if (!texto) return undefined;

    return /^\d+$/.test(texto) ? Number.parseInt(texto, 10) : texto;
  }

  /**
   * Elimina las claves sin valor para no pisar los defaults del dominio,
   * conservando el tipo del objeto de entrada.
   */
  private limpiar<T extends object>(objeto: T): T {
    const limpio = {} as T;

    for (const [clave, valor] of Object.entries(objeto)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        limpio[clave as keyof T] = valor as T[keyof T];
      }
    }

    return limpio;
  }

  // -------------------------------------------------------------------------
  // Registro
  // -------------------------------------------------------------------------

  /**
   * Persiste la orden en `assistant_logs` y devuelve la respuesta del endpoint.
   * Si el registro falla, la respuesta se devuelve igualmente: nunca se pierde
   * el trabajo hecho por un problema de traza.
   */
  private async registrar(params: {
    origen: AssistantInputType;
    transcripcion: string;
    accion: IAssistantExecutedAction | null;
    resultado: IAssistantExecutionResult | null;
    respuesta: string;
    error?: string | null;
    userId?: number;
    iniciadoEn: number;
  }): Promise<IAssistantCommandResponse> {
    const {
      origen,
      transcripcion,
      accion,
      resultado,
      respuesta,
      error,
      userId,
      iniciadoEn,
    } = params;

    const respuestaFinal: IAssistantCommandResponse = {
      origen,
      transcripcion,
      accion,
      resultado,
      respuesta,
      error: error ?? null,
      fecha: new Date().toISOString(),
    };

    try {
      const registro = this.assistantLogDAO.create({
        inputType: origen,
        transcripcion,
        accion: accion?.nombre ?? null,
        argumentos: accion?.argumentos ?? null,
        resultado: resultado ? this.resumirParaModelo(resultado) : null,
        correcto: Boolean(resultado?.ok),
        respuesta,
        error: error ?? null,
        duracionMs: Date.now() - iniciadoEn,
        userId: userId ?? null,
      });

      const guardado = await this.assistantLogDAO.save(registro);
      respuestaFinal.id = guardado.id;
      respuestaFinal.fecha = guardado.createdAt.toISOString();
    } catch (errorRegistro) {
      this.logger.error(
        `No se ha podido registrar la orden del asistente: ${
          (errorRegistro as Error)?.message
        }`,
      );
    }

    return respuestaFinal;
  }
}
