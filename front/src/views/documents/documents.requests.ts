import api from '../../requests/axios.config';
import type { ItResponse, ItFindAllResponse } from '../../types/api.types';
import type {
  FileDoc,
  Folder,
  FolderBreadcrumb,
  FolderNode,
  MoveBulkResult,
  OnlyOfficeConfigResponse,
} from './documents.types';

interface ListarFicherosParams {
  page?: number;
  size?: number;
  folderId?: number;
  clienteId?: number;
  propiedadId?: number;
  nombre?: string;
  soloRaiz?: boolean;
}

/**
 * Capa de acceso al módulo `documents` del backend.
 * Todos los endpoints responden con el sobre `{ message, flag, data }`.
 */
export const documentsRequests = {
  // --- Carpetas ------------------------------------------------------------

  arbol: async (params: { clienteId?: number; propiedadId?: number } = {}): Promise<FolderNode[]> => {
    const { data } = await api.get<ItResponse<FolderNode[]>>('/documents/folders/tree', {
      params,
    });
    return data.data ?? [];
  },

  breadcrumb: async (folderId: number): Promise<FolderBreadcrumb[]> => {
    const { data } = await api.get<ItResponse<FolderBreadcrumb[]>>(
      `/documents/folders/${folderId}/breadcrumb`,
    );
    return data.data ?? [];
  },

  crearCarpeta: async (body: {
    nombre: string;
    parentId?: number;
    clienteId?: number;
    propiedadId?: number;
  }): Promise<ItResponse<Folder>> => {
    const { data } = await api.post<ItResponse<Folder>>('/documents/folders', body);
    return data;
  },

  renombrarCarpeta: async (id: number, nombre: string): Promise<ItResponse<Folder>> => {
    const { data } = await api.patch<ItResponse<Folder>>(`/documents/folders/${id}`, { nombre });
    return data;
  },

  moverCarpeta: async (id: number, parentId?: number): Promise<ItResponse<Folder>> => {
    const { data } = await api.patch<ItResponse<Folder>>(`/documents/folders/${id}/move`, {
      parentId,
    });
    return data;
  },

  borrarCarpeta: async (id: number): Promise<ItResponse<null>> => {
    const { data } = await api.delete<ItResponse<null>>(`/documents/folders/${id}`);
    return data;
  },

  // --- Ficheros ------------------------------------------------------------

  listar: async (params: ListarFicherosParams): Promise<ItFindAllResponse<FileDoc>> => {
    const { data } = await api.get<ItResponse<ItFindAllResponse<FileDoc>>>('/documents', {
      params,
    });
    return (
      data.data ?? {
        data: [],
        metadata: { records: 0, frame: 1, frameSize: 12, lastFrame: 1 },
      }
    );
  },

  /**
   * Subida multipart. Se deja que el navegador componga el `Content-Type` con
   * su propio `boundary`: fijarlo a mano rompe la petición.
   */
  subir: async (
    file: File,
    meta: { folderId?: number; clienteId?: number; propiedadId?: number } = {},
    onProgress?: (porcentaje: number) => void,
  ): Promise<ItResponse<FileDoc>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (meta.folderId) formData.append('folderId', String(meta.folderId));
    if (meta.clienteId) formData.append('clienteId', String(meta.clienteId));
    if (meta.propiedadId) formData.append('propiedadId', String(meta.propiedadId));

    const { data } = await api.post<ItResponse<FileDoc>>('/documents/upload', formData, {
      onUploadProgress: (evento) => {
        if (!onProgress || !evento.total) return;
        onProgress(Math.round((evento.loaded * 100) / evento.total));
      },
    });

    return data;
  },

  renombrar: async (id: number, nombre: string): Promise<ItResponse<FileDoc>> => {
    const { data } = await api.patch<ItResponse<FileDoc>>(`/documents/${id}`, { nombre });
    return data;
  },

  mover: async (id: number, folderId?: number): Promise<ItResponse<FileDoc>> => {
    const { data } = await api.patch<ItResponse<FileDoc>>(`/documents/${id}/move`, { folderId });
    return data;
  },

  /**
   * Mueve de una sola vez todos los documentos seleccionados en el Drive.
   * `folderId` a `null` los deja en la raíz.
   */
  moverEnMasa: async (
    ids: number[],
    folderId: number | null,
  ): Promise<ItResponse<MoveBulkResult>> => {
    const { data } = await api.patch<ItResponse<MoveBulkResult>>('/documents/move-bulk', {
      ids,
      folderId,
    });
    return data;
  },

  duplicar: async (id: number): Promise<ItResponse<FileDoc>> => {
    const { data } = await api.post<ItResponse<FileDoc>>(`/documents/${id}/duplicate`, {});
    return data;
  },

  borrar: async (id: number): Promise<ItResponse<null>> => {
    const { data } = await api.delete<ItResponse<null>>(`/documents/${id}`);
    return data;
  },

  /**
   * Descarga el binario como `Blob`.
   *
   * No se puede usar un enlace directo: la descarga exige la cabecera `token`,
   * que solo viaja en las peticiones de axios. De ahí el blob + URL de objeto.
   */
  descargarBlob: async (id: number): Promise<Blob> => {
    const { data } = await api.get<Blob>(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  // --- ONLYOFFICE ----------------------------------------------------------

  configEditor: async (id: number): Promise<OnlyOfficeConfigResponse> => {
    const { data } = await api.get<ItResponse<OnlyOfficeConfigResponse>>(
      `/documents/${id}/onlyoffice-config`,
    );
    return data.data;
  },
};

/** Fuerza la descarga de un blob en el navegador con el nombre indicado. */
export const descargarBlobEnNavegador = (blob: Blob, nombre: string): void => {
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  window.URL.revokeObjectURL(url);
};
