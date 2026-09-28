import api from '../../requests/axios.config';
import type { ItFindAllResponse, ItResponse } from '../../types/api.types';
import type {
  Notification,
  NotificationCounter,
  NotificationFilters,
} from './notifications.types';

const BASE = '/notifications';

/**
 * Compone la cadena de consulta descartando los filtros vacíos: el backend
 * valida con `forbidNonWhitelisted`, así que no conviene enviar campos sueltos.
 */
const buildQuery = (filters: NotificationFilters): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return;
    params.append(clave, String(valor));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

/**
 * Llamadas del módulo de alertas.
 *
 * `findAll` devuelve directamente `{ data, metadata }` (el controlador no lo
 * envuelve en `{ message, flag, data }`); el resto sí siguen el sobre estándar.
 */
export const notificationRequests = {
  findAll: async (
    filters: NotificationFilters = {},
  ): Promise<ItFindAllResponse<Notification>> => {
    const response = await api.get<ItFindAllResponse<Notification>>(
      `${BASE}${buildQuery(filters)}`,
    );
    return response.data;
  },

  findUnread: async (limite = 10): Promise<ItResponse<Notification[]>> => {
    const response = await api.get<ItResponse<Notification[]>>(
      `${BASE}/no-leidas?limite=${limite}`,
    );
    return response.data;
  },

  countUnread: async (): Promise<ItResponse<NotificationCounter>> => {
    const response = await api.get<ItResponse<NotificationCounter>>(`${BASE}/contador`);
    return response.data;
  },

  markAsRead: async (id: number): Promise<ItResponse<Notification>> => {
    const response = await api.patch<ItResponse<Notification>>(`${BASE}/${id}/leer`);
    return response.data;
  },

  markAsUnread: async (id: number): Promise<ItResponse<Notification>> => {
    const response = await api.patch<ItResponse<Notification>>(`${BASE}/${id}/no-leer`);
    return response.data;
  },

  markAllAsRead: async (): Promise<ItResponse<{ actualizadas: number }>> => {
    const response = await api.patch<ItResponse<{ actualizadas: number }>>(
      `${BASE}/leer-todas`,
    );
    return response.data;
  },

  remove: async (id: number): Promise<ItResponse<null>> => {
    const response = await api.delete<ItResponse<null>>(`${BASE}/${id}`);
    return response.data;
  },

  /** Lanza a mano el motor de reglas (el mismo que corre cada día a las 8:00). */
  runRules: async (): Promise<ItResponse<{ total: number }>> => {
    const response = await api.post<ItResponse<{ total: number }>>(`${BASE}/revisar`);
    return response.data;
  },
};
