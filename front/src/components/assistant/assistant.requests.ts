import api from '../../requests/axios.config';
import type { ItResponse, ItFindAllResponse } from '../../types/api.types';
import type {
  AssistantCommandResponse,
  AssistantLogEntry,
  AssistantStatus,
} from './assistant.types';

/**
 * Peticiones del asistente de IA.
 * El endpoint de comando acepta audio (multipart) o texto (JSON).
 */
export const assistantRequests = {
  /** Envía una orden escrita. */
  enviarTexto: async (texto: string): Promise<AssistantCommandResponse> => {
    const { data } = await api.post<ItResponse<AssistantCommandResponse>>(
      '/assistant/command',
      { texto },
      // La IA encadena dos llamadas al modelo: se amplía el tiempo de espera.
      { timeout: 120000 },
    );
    return data.data;
  },

  /** Envía una orden dictada. El backend la transcribe con ElevenLabs. */
  enviarAudio: async (
    audio: Blob,
    nombreArchivo = 'orden.webm',
  ): Promise<AssistantCommandResponse> => {
    const formData = new FormData();
    formData.append('audio', audio, nombreArchivo);

    const { data } = await api.post<ItResponse<AssistantCommandResponse>>(
      '/assistant/command',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      },
    );
    return data.data;
  },

  /**
   * Historial paginado de órdenes del usuario.
   *
   * `conError: false` deja fuera las órdenes que fallaron: la vista de chat lo
   * usa al abrirse para no recibir a la persona usuaria con un muro de errores viejos.
   */
  historial: async (
    page = 1,
    size = 20,
    conError?: boolean,
  ): Promise<ItFindAllResponse<AssistantLogEntry>> => {
    const { data } = await api.get<
      ItResponse<ItFindAllResponse<AssistantLogEntry>>
    >('/assistant/history', { params: { page, size, conError } });
    return data.data;
  },

  /** Estado de configuración del asistente. */
  estado: async (): Promise<AssistantStatus> => {
    const { data } = await api.get<ItResponse<AssistantStatus>>(
      '/assistant/status',
    );
    return data.data;
  },
};
