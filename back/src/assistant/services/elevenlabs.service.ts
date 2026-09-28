import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { getEnvConfig } from '../../env/envs';
import { IAssistantAudioInput } from '../interfaces/assistant-command.interface';

/** Resultado de una transcripción. Nunca lanza: el fallo se devuelve en `ok`. */
export interface ITranscriptionResult {
  ok: boolean;
  /** Texto transcrito cuando `ok` es `true`. */
  texto?: string;
  /** Motivo del fallo, en español y apto para mostrarse al usuario. */
  mensaje?: string;
}

/** Forma de la respuesta de ElevenLabs Speech-to-Text. */
interface IElevenLabsSttResponse {
  text?: string;
  language_code?: string;
  language_probability?: number;
}

const ELEVENLABS_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';

/** Modelo de transcripción de ElevenLabs. */
const STT_MODEL_ID = 'scribe_v1';

/** Idioma fijo del CRM. */
const STT_LANGUAGE = 'es';

/**
 * Transcripción de voz a texto con ElevenLabs.
 *
 * La clave se lee SIEMPRE de la variable de entorno `ELEVENLABS_API_KEY`;
 * nunca se escribe en el código.
 */
@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly env = getEnvConfig();

  /** `true` si hay clave configurada y el servicio puede usarse. */
  get estaConfigurado(): boolean {
    return Boolean(this.env.ELEVENLABS_API_KEY);
  }

  /**
   * Transcribe un audio dictado por la persona usuaria.
   *
   * @param audio Fichero recibido en el endpoint (webm, ogg, mp3, wav...).
   * @returns El texto reconocido o el motivo del fallo, en español.
   */
  async transcribe(audio: IAssistantAudioInput): Promise<ITranscriptionResult> {
    if (!this.estaConfigurado) {
      return {
        ok: false,
        mensaje:
          'La transcripción de voz no está configurada. Escribe la orden o avisa al administrador.',
      };
    }

    if (!audio?.buffer?.length) {
      return {
        ok: false,
        mensaje: 'No se ha recibido audio. Vuelve a intentar la grabación.',
      };
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(audio.buffer)], {
        type: audio.mimetype || 'audio/webm',
      }),
      audio.originalname || 'orden.webm',
    );
    form.append('model_id', STT_MODEL_ID);
    form.append('language_code', STT_LANGUAGE);

    try {
      const { data } = await axios.post<IElevenLabsSttResponse>(
        ELEVENLABS_STT_URL,
        form,
        {
          headers: { 'xi-api-key': this.env.ELEVENLABS_API_KEY },
          timeout: 60000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      const texto = (data?.text || '').trim();

      if (!texto) {
        return {
          ok: false,
          mensaje:
            'No se ha entendido el audio. Habla un poco más cerca del micrófono y repite la orden.',
        };
      }

      this.logger.log(`Audio transcrito (${audio.size} bytes): "${texto}"`);
      return { ok: true, texto };
    } catch (error) {
      return { ok: false, mensaje: this.describirError(error) };
    }
  }

  /** Traduce el fallo de la API a un mensaje accionable en español. */
  private describirError(error: unknown): string {
    const axiosError = error as AxiosError;
    const status = axiosError?.response?.status;

    this.logger.error(
      `Fallo al transcribir con ElevenLabs${status ? ` (HTTP ${status})` : ''}: ${
        axiosError?.message || 'error desconocido'
      }`,
    );

    if (status === 401 || status === 403) {
      return 'La clave de ElevenLabs no es válida. Revisa la configuración del servidor.';
    }
    if (status === 413) {
      return 'La grabación es demasiado larga. Prueba con una orden más corta.';
    }
    if (status === 429) {
      return 'El servicio de transcripción está saturado. Inténtalo de nuevo en unos segundos.';
    }
    if (axiosError?.code === 'ECONNABORTED') {
      return 'La transcripción ha tardado demasiado. Inténtalo de nuevo.';
    }

    return 'No se ha podido transcribir el audio. Inténtalo de nuevo o escribe la orden.';
  }
}
