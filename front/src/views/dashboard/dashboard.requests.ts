import api from '../../requests/axios.config';
import type { ItResponse } from '../../types/api.types';
import type {
  ActividadReciente,
  FirmaPendiente,
  ResumenDashboard,
  TareaHoy,
  VencimientoProximo,
} from './dashboard.types';

const BASE = '/dashboard';

/**
 * Llamadas al cuadro de mando.
 *
 * `resumen()` trae de una sola vez todo lo que pinta la pantalla; el resto
 * existen para refrescos puntuales sin recargar el panel entero.
 */
export const dashboardRequests = {
  resumen: async (): Promise<ItResponse<ResumenDashboard>> => {
    const response = await api.get<ItResponse<ResumenDashboard>>(`${BASE}/resumen`);
    return response.data;
  },

  tareasHoy: async (): Promise<ItResponse<TareaHoy[]>> => {
    const response = await api.get<ItResponse<TareaHoy[]>>(`${BASE}/tareas-hoy`);
    return response.data;
  },

  actividad: async (limite = 10): Promise<ItResponse<ActividadReciente[]>> => {
    const response = await api.get<ItResponse<ActividadReciente[]>>(
      `${BASE}/actividad?limite=${limite}`,
    );
    return response.data;
  },

  firmasPendientes: async (): Promise<ItResponse<FirmaPendiente[]>> => {
    const response = await api.get<ItResponse<FirmaPendiente[]>>(
      `${BASE}/firmas-pendientes`,
    );
    return response.data;
  },

  vencimientos: async (dias = 30): Promise<ItResponse<VencimientoProximo[]>> => {
    const response = await api.get<ItResponse<VencimientoProximo[]>>(
      `${BASE}/vencimientos?dias=${dias}`,
    );
    return response.data;
  },
};
