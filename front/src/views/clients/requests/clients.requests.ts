import api from '../../../requests/axios.config';
import type { ItFindAllResponse, ItResponse } from '../../../types/api.types';
import type {
  BusinessLine,
  ClientActivityType,
  ClientStage,
  ClientStatus,
  ClientType,
  InterestZone,
  OperationType,
} from '../enums/clientEnums';

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------

export interface ClientResponsible {
  id: number;
  name?: string;
  lastName?: string;
  email?: string;
}

export interface ClientActivity {
  id: number;
  clientId: number;
  tipo: ClientActivityType;
  descripcion: string;
  fecha: string;
  autor?: string | null;
  autorId?: number | null;
  createdAt: string;
}

export interface Client {
  id: number;
  nombre: string;
  apellidos?: string | null;
  email?: string | null;
  telefono?: string | null;
  documento?: string | null;
  tipo: ClientType;
  lineaNegocio: BusinessLine;
  etapa: ClientStage;
  presupuestoMin?: number | null;
  presupuestoMax?: number | null;
  zonasInteres: InterestZone[];
  tipoOperacion?: OperationType | null;
  origen?: string | null;
  notas?: string | null;
  estado: ClientStatus;
  motivoDescarte?: string | null;
  fechaDescarte?: string | null;
  responsableId?: number | null;
  responsable?: ClientResponsible | null;
  actividades?: ClientActivity[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Peticiones
// ---------------------------------------------------------------------------

export interface FindAllClientsParams {
  page?: number;
  size?: number;
  search?: string;
  tipo?: ClientType;
  lineaNegocio?: BusinessLine;
  etapa?: string;
  estado?: ClientStatus;
  zona?: InterestZone;
  tipoOperacion?: OperationType;
  presupuestoDesde?: number;
  presupuestoHasta?: number;
  responsableId?: number;
}

export interface SaveClientPayload {
  nombre: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  documento?: string;
  tipo?: ClientType;
  lineaNegocio?: BusinessLine;
  etapa?: string;
  presupuestoMin?: number;
  presupuestoMax?: number;
  zonasInteres?: InterestZone[];
  tipoOperacion?: OperationType;
  origen?: string;
  notas?: string;
  responsableId?: number;
}

export interface MoveStagePayload {
  etapa: string;
  lineaNegocio?: BusinessLine;
  comentario?: string;
}

export interface CreateActivityPayload {
  tipo: ClientActivityType;
  descripcion: string;
  fecha?: string;
}

export interface ImportClientsOptions {
  lineaNegocio?: BusinessLine;
  tipo?: ClientType;
  actualizarExistentes?: boolean;
}

export interface ImportClientsSummary {
  totalFilas: number;
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: { fila: number; motivo: string }[];
}

export interface KanbanColumn {
  id: ClientStage;
  label: string;
  color: string;
}

export interface KanbanBoardResponse {
  lineaNegocio: BusinessLine;
  lineaNegocioLabel: string;
  columnas: KanbanColumn[];
  clientes: Client[];
}

export interface StageCatalogEntry {
  lineaNegocio: BusinessLine;
  label: string;
  color: string;
  etapas: KanbanColumn[];
}

/**
 * Quita del objeto las claves sin valor para no enviar `?etapa=` vacío ni
 * campos `undefined` que el backend rechazaría por whitelist.
 */
const clean = <T extends object>(payload: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  ) as Partial<T>;

export const clientsRequests = {
  findAll: async (
    params: FindAllClientsParams = {},
  ): Promise<ItFindAllResponse<Client>> => {
    const response = await api.get<ItFindAllResponse<Client>>('/clients', {
      params: clean(params),
    });
    return response.data;
  },

  findOne: async (id: number): Promise<ItResponse<Client>> => {
    const response = await api.get<ItResponse<Client>>(`/clients/${id}`);
    return response.data;
  },

  create: async (payload: SaveClientPayload): Promise<ItResponse<Client>> => {
    const response = await api.post<ItResponse<Client>>('/clients', clean(payload));
    return response.data;
  },

  update: async (
    id: number,
    payload: Partial<SaveClientPayload>,
  ): Promise<ItResponse<Client>> => {
    const response = await api.patch<ItResponse<Client>>(`/clients/${id}`, payload);
    return response.data;
  },

  remove: async (id: number): Promise<ItResponse<null>> => {
    const response = await api.delete<ItResponse<null>>(`/clients/${id}`);
    return response.data;
  },

  moveStage: async (
    id: number,
    payload: MoveStagePayload,
  ): Promise<ItResponse<Client>> => {
    const response = await api.patch<ItResponse<Client>>(
      `/clients/${id}/stage`,
      clean(payload),
    );
    return response.data;
  },

  discard: async (
    id: number,
    motivoDescarte: string,
  ): Promise<ItResponse<Client>> => {
    const response = await api.patch<ItResponse<Client>>(`/clients/${id}/discard`, {
      motivoDescarte,
    });
    return response.data;
  },

  restore: async (id: number): Promise<ItResponse<Client>> => {
    const response = await api.patch<ItResponse<Client>>(`/clients/${id}/restore`, {});
    return response.data;
  },

  findActivities: async (
    id: number,
    params: { page?: number; size?: number; tipo?: ClientActivityType } = {},
  ): Promise<ItFindAllResponse<ClientActivity>> => {
    const response = await api.get<ItFindAllResponse<ClientActivity>>(
      `/clients/${id}/activities`,
      { params: clean(params) },
    );
    return response.data;
  },

  addActivity: async (
    id: number,
    payload: CreateActivityPayload,
  ): Promise<ItResponse<ClientActivity>> => {
    const response = await api.post<ItResponse<ClientActivity>>(
      `/clients/${id}/activities`,
      clean(payload),
    );
    return response.data;
  },

  getKanban: async (
    lineaNegocio: BusinessLine,
  ): Promise<ItResponse<KanbanBoardResponse>> => {
    const response = await api.get<ItResponse<KanbanBoardResponse>>('/clients/kanban', {
      params: { lineaNegocio },
    });
    return response.data;
  },

  getStages: async (): Promise<ItResponse<StageCatalogEntry[]>> => {
    const response = await api.get<ItResponse<StageCatalogEntry[]>>('/clients/stages');
    return response.data;
  },

  /**
   * Sube el fichero por multipart. Se fija el `Content-Type` explícitamente
   * porque la instancia de axios trae `application/json` por defecto.
   */
  import: async (
    file: File,
    options: ImportClientsOptions = {},
  ): Promise<ItResponse<ImportClientsSummary>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.lineaNegocio) formData.append('lineaNegocio', options.lineaNegocio);
    if (options.tipo) formData.append('tipo', options.tipo);
    formData.append(
      'actualizarExistentes',
      options.actualizarExistentes ? 'true' : 'false',
    );

    const response = await api.post<ItResponse<ImportClientsSummary>>(
      '/clients/import',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },
};
