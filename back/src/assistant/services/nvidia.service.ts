import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { getEnvConfig } from '../../env/envs';
import {
  INvidiaChatOptions,
  INvidiaChatResponse,
  INvidiaMessage,
} from '../interfaces/nvidia.interfaces';

/** Resultado de una llamada al modelo. Nunca lanza. */
export interface INvidiaChatResult {
  ok: boolean;
  /** Mensaje devuelto por el modelo cuando `ok` es `true`. */
  message?: INvidiaMessage;
  /** Motivo del fallo, en español y apto para mostrarse al usuario. */
  mensaje?: string;
}

/** Un proveedor de IA compatible con OpenAI, listo para ser llamado. */
interface IProveedorIa {
  /** Papel en la cadena, para las trazas: «primario» o «respaldo». */
  papel: string;
  baseUrl: string;
  apiKey: string;
  modelo: string;
  timeoutMs: number;
}

/** Espera entre el intento fallido y el reintento. */
const ESPERA_REINTENTO_MS = 800;

/**
 * Modelo del respaldo cuando NO se configura un proveedor de respaldo propio.
 *
 * Solo entra en juego si `LLM_FALLBACK_MODEL` está vacía: en ese caso el
 * respaldo repite contra el mismo proveedor del primario pero con otro modelo,
 * que es como funcionaba el asistente antes de admitir dos proveedores. En
 * producción no se usa, porque allí el respaldo es un proveedor completo.
 *
 * Antes era `nvidia/nvidia-nemotron-nano-9b-v2`, elegido el 24/08/2026 por su
 * puntería con las herramientas. Se descarta por lento: 14 s de media, que en
 * una orden con dos llamadas al modelo son casi 30 s de espera justo cuando el
 * asistente ya va mal. `gpt-oss-120b` acierta igual (36/36 el 25/08/2026) con
 * p50 de 2,0 s, así que el respaldo deja de castigar a quien le toca.
 */
const MODELO_RESPALDO = 'openai/gpt-oss-120b';

/**
 * Cliente de IA con DOS proveedores compatibles con OpenAI
 * (`{BASE_URL}/chat/completions`), llamados en cadena.
 *
 * Primero se pregunta al PRIMARIO. Si no responde -y «no responder» incluye
 * agotar el tiempo de espera, caerse la red, devolver un HTTP >= 400 o
 * contestar sin contenido utilizable- la MISMA petición se repite contra el
 * RESPALDO, que es otro proveedor entero: otra URL, otra clave y otro modelo.
 *
 * Antes los dos intentos iban al mismo sitio cambiando solo de modelo, así que
 * una caída del proveedor -o una clave caducada- se llevaba por delante el
 * asistente completo. Con dos proveedores independientes hace falta que fallen
 * los dos a la vez.
 *
 * Las claves se leen SIEMPRE del entorno; nunca se escriben en el código.
 */
@Injectable()
export class NvidiaService {
  private readonly logger = new Logger(NvidiaService.name);
  private readonly env = getEnvConfig();
  /** Cadena de proveedores a probar, en orden. */
  private readonly proveedores = this.construirProveedores();

  /** `true` si hay al menos un proveedor con clave utilizable. */
  get estaConfigurado(): boolean {
    return this.proveedores.length > 0;
  }

  /** Modelo que atenderá la próxima orden, para trazas y para la interfaz. */
  get modelo(): string {
    return this.proveedores[0]?.modelo ?? this.env.LLM_MODEL;
  }

  /**
   * Arma la cadena de proveedores a partir del entorno.
   *
   * El respaldo hereda del primario todo lo que no se le configure, de modo
   * que un `.env` que solo define el primario sigue comportándose como antes:
   * segundo intento contra el mismo sitio con el modelo alternativo.
   */
  private construirProveedores(): IProveedorIa[] {
    const primario: IProveedorIa = {
      papel: 'primario',
      baseUrl: this.env.LLM_BASE_URL,
      apiKey: this.env.LLM_API_KEY ?? '',
      modelo: this.env.LLM_MODEL,
      timeoutMs: this.env.LLM_TIMEOUT_MS,
    };

    const respaldo: IProveedorIa = {
      papel: 'respaldo',
      baseUrl: this.env.LLM_FALLBACK_BASE_URL || primario.baseUrl,
      apiKey: this.env.LLM_FALLBACK_API_KEY || primario.apiKey,
      modelo: this.env.LLM_FALLBACK_MODEL || MODELO_RESPALDO,
      timeoutMs: this.env.LLM_FALLBACK_TIMEOUT_MS || primario.timeoutMs,
    };

    // Un proveedor sin clave no se intenta: solo gastaría un 401 y su turno.
    return [primario, respaldo].filter((proveedor) => Boolean(proveedor.apiKey));
  }

  /**
   * Lanza una conversación contra la IA, opcionalmente con herramientas.
   * Si el primario no responde, repite la petición contra el respaldo; solo
   * devuelve `ok: false` cuando fallan los dos.
   *
   * @param messages Historial de la conversación.
   * @param options Herramientas, temperatura y límite de tokens.
   */
  async chat(
    messages: INvidiaMessage[],
    options: INvidiaChatOptions = {},
  ): Promise<INvidiaChatResult> {
    if (!this.estaConfigurado) {
      return {
        ok: false,
        mensaje:
          'El asistente de IA no está configurado en el servidor. Avisa al administrador.',
      };
    }

    const body: Record<string, unknown> = {
      messages,
      temperature: options.temperature ?? 0.2,
      top_p: 0.9,
      max_tokens: options.maxTokens ?? 1024,
      stream: false,
    };

    if (options.tools?.length) {
      body.tools = options.tools;
      body.tool_choice = 'auto';
    }

    let ultimoError: unknown = null;

    for (const [indice, proveedor] of this.proveedores.entries()) {
      const siguiente = this.proveedores[indice + 1];

      try {
        const { data } = await axios.post<INvidiaChatResponse>(
          `${proveedor.baseUrl.replace(/\/+$/, '')}/chat/completions`,
          { ...body, model: proveedor.modelo },
          {
            headers: {
              Authorization: `Bearer ${proveedor.apiKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            timeout: proveedor.timeoutMs,
          },
        );

        const message = data?.choices?.[0]?.message;

        // Un HTTP 200 sin nada aprovechable es un fallo del proveedor como
        // cualquier otro, así que también le pasa el turno al respaldo.
        if (!this.tieneContenidoUtil(message)) {
          ultimoError = new Error('Respuesta del modelo sin contenido utilizable');
          this.logger.warn(
            `El proveedor ${proveedor.papel} (${proveedor.modelo}) devolvió una respuesta sin contenido utilizable.`,
          );
          if (!siguiente) break;
          await this.esperar(ESPERA_REINTENTO_MS);
          continue;
        }

        if (indice > 0) {
          this.logger.log(
            `FAILOVER: la orden se ha resuelto con el proveedor de ${proveedor.papel} (${proveedor.modelo}).`,
          );
        }

        return { ok: true, message };
      } catch (error) {
        ultimoError = error;
        const status = (error as AxiosError)?.response?.status;

        this.logger.warn(
          `Fallo del proveedor ${proveedor.papel} con ${proveedor.modelo}${
            status ? ` (HTTP ${status})` : ''
          }: ${(error as Error)?.message || 'error desconocido'}`,
        );

        if (!siguiente) break;

        // Credenciales rechazadas o petición mal formada son fallos
        // deterministas: repetirlos no cambia el resultado. Antes cortaban la
        // cadena entera, y eso era correcto mientras los dos intentos iban al
        // mismo sitio con la misma clave. Ahora el respaldo suele ser OTRO
        // proveedor con OTRA clave, así que un 401 del primario es justo el
        // caso que el respaldo existe para salvar: solo se corta si el
        // siguiente comparte origen y clave y por tanto fallaría igual.
        const determinista =
          status === 400 || status === 401 || status === 403;

        if (determinista && this.mismoOrigen(proveedor, siguiente)) {
          break;
        }

        // La pausa solo ayuda ante saturación (429) o caídas pasajeras (5xx).
        // Ante un fallo determinista se salta al respaldo sin perder tiempo.
        if (!determinista) {
          await this.esperar(ESPERA_REINTENTO_MS);
        }

        this.logger.warn(
          `Se intenta la orden con el proveedor de ${siguiente.papel} (${siguiente.modelo}).`,
        );
      }
    }

    return { ok: false, mensaje: this.describirError(ultimoError) };
  }

  /**
   * Decide si una respuesta del modelo sirve para algo.
   *
   * No basta con que el mensaje exista: un `content` vacío sin herramienta
   * invocada llega aguas arriba como «No he sabido interpretar la orden»,
   * que le echa al asistente la culpa de un fallo del proveedor. Cuenta como
   * «no responde» y activa el respaldo.
   *
   * Ojo con exigir texto: `content: null` CON `tool_calls` es la respuesta
   * normal y correcta cuando el modelo elige herramienta (llama-4-scout lo
   * hace siempre), y es justo el camino bueno del asistente.
   */
  private tieneContenidoUtil(
    message?: INvidiaMessage,
  ): message is INvidiaMessage {
    if (!message) return false;
    if (message.tool_calls?.length) return true;
    return Boolean((message.content || '').trim());
  }

  /** `true` si dos proveedores atacan el mismo endpoint con la misma clave. */
  private mismoOrigen(uno: IProveedorIa, otro: IProveedorIa): boolean {
    return uno.baseUrl === otro.baseUrl && uno.apiKey === otro.apiKey;
  }

  /** Traduce el fallo de la API a un mensaje accionable en español. */
  private describirError(error: unknown): string {
    const axiosError = error as AxiosError;
    const status = axiosError?.response?.status;

    const detalle =
      (axiosError?.response?.data as { message?: string })?.message ||
      axiosError?.message ||
      'error desconocido';

    // Si se llega aquí han fallado TODOS los proveedores de la cadena.
    this.logger.error(
      `Ningún proveedor de IA ha podido atender la orden. Último fallo: ${detalle}`,
    );

    if (status === 401 || status === 403) {
      return 'La clave del servicio de IA no es válida. Revisa la configuración del servidor.';
    }
    if (status === 400) {
      return 'El modelo ha rechazado la petición. Reformula la orden con menos detalle.';
    }
    if (status === 429) {
      return 'El modelo está saturado ahora mismo. Inténtalo de nuevo en unos segundos.';
    }
    if (status && status >= 500) {
      return 'El servicio de IA no está disponible en este momento. Inténtalo de nuevo en unos segundos.';
    }
    if (axiosError?.code === 'ECONNABORTED') {
      return 'El modelo ha tardado demasiado en responder. Inténtalo de nuevo.';
    }

    return 'No se ha podido contactar con el asistente de IA. Inténtalo de nuevo en unos segundos.';
  }

  /** Pausa entre reintentos. */
  private esperar(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
