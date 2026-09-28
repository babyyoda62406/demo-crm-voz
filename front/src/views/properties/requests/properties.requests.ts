import api from '../../../requests/axios.config';
import { API_BASE_URL } from '../../../config/global';
import type { ItResponse } from '../../../types/api.types';
import type {
  ClientOption,
  MatchCriteria,
  PropertyFilters,
  PropertyMatchResponse,
} from '../types/property.types';

/**
 * Construye la cadena de consulta del listado. Se omiten los valores vacíos
 * para no disparar la validación estricta del backend.
 */
export const buildPropertiesQuery = (
  filters: PropertyFilters,
  page: number,
  size: number,
): string => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));

  if (filters.search) params.set('search', filters.search);
  if (filters.zona) params.set('zona', filters.zona);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.tipo) params.set('tipo', filters.tipo);
  if (filters.precioMin !== undefined) params.set('precioMin', String(filters.precioMin));
  if (filters.precioMax !== undefined) params.set('precioMax', String(filters.precioMax));

  return `/properties?${params.toString()}`;
};

/**
 * URL absoluta de una foto. El backend guarda rutas relativas del tipo
 * `/api/properties/photos/<fichero>`; aquí se reescribe el prefijo por si la
 * API vive en otro origen (`VITE_API_BASE_URL`).
 */
export const photoUrl = (path: string): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const relative = path.startsWith('/api') ? path.slice('/api'.length) : path;
  return `${API_BASE_URL}${relative.startsWith('/') ? relative : `/${relative}`}`;
};

/** Sube fotos al servidor y devuelve sus URLs relativas. */
export const uploadPropertyPhotos = async (files: File[]): Promise<string[]> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('fotos', file));

  const response = await api.post<ItResponse<string[]>>('/properties/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.data ?? [];
};

/**
 * Borra una foto del servidor. Si pertenece a un inmueble se usa el endpoint de
 * su galería (que además la desvincula); si todavía está suelta —subida desde
 * el alta y descartada antes de guardar— el de fotos sin inmueble.
 */
export const deletePropertyPhoto = async (
  photoPath: string,
  propertyId?: number,
): Promise<void> => {
  const fileName = photoPath.split('/').pop();
  if (!fileName) return;

  const url = propertyId
    ? `/properties/${propertyId}/photos/${encodeURIComponent(fileName)}`
    : `/properties/photos/${encodeURIComponent(fileName)}`;

  await api.delete(url);
};

/** Cruza el perfil inversor de un cliente con la cartera. */
export const fetchPropertyMatches = async (
  clientId: number,
  criteria: MatchCriteria,
): Promise<PropertyMatchResponse> => {
  const params = new URLSearchParams();
  if (criteria.presupuestoMin !== undefined) {
    params.set('presupuestoMin', String(criteria.presupuestoMin));
  }
  if (criteria.presupuestoMax !== undefined) {
    params.set('presupuestoMax', String(criteria.presupuestoMax));
  }
  if (criteria.zonas.length) params.set('zonas', criteria.zonas.join(','));
  if (criteria.tipos.length) params.set('tipos', criteria.tipos.join(','));
  if (criteria.habitacionesMin !== undefined) {
    params.set('habitacionesMin', String(criteria.habitacionesMin));
  }
  if (criteria.rentabilidadMin !== undefined) {
    params.set('rentabilidadMin', String(criteria.rentabilidadMin));
  }
  if (criteria.incluirNoDisponibles) params.set('incluirNoDisponibles', 'true');

  const query = params.toString();
  const response = await api.get<ItResponse<PropertyMatchResponse>>(
    `/properties/matching/${clientId}${query ? `?${query}` : ''}`,
  );

  return response.data.data;
};

/** Fila cruda de cliente: el esquema lo define el dominio `clients/`. */
type RawClient = Record<string, unknown>;

const readText = (row: RawClient, keys: string[]): string => {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

/**
 * Lista de clientes para el selector de coincidencias.
 * El dominio `clients/` puede no estar publicado todavía: cualquier error se
 * traduce en una lista vacía y la vista ofrece introducir el id a mano.
 */
export const fetchClientOptions = async (): Promise<ClientOption[]> => {
  try {
    const response = await api.get<unknown>('/clients?page=1&size=100');
    const body = response.data as { data?: unknown } | unknown[];
    const rows: unknown = Array.isArray(body) ? body : (body as { data?: unknown }).data;
    if (!Array.isArray(rows)) return [];

    return rows
      .filter((row): row is RawClient => typeof row === 'object' && row !== null)
      .map((row) => {
        const id = Number(row.id);
        const nombre =
          [
            readText(row, ['nombre', 'name', 'razonSocial', 'nombreCompleto']),
            readText(row, ['apellidos', 'lastName']),
          ]
            .filter(Boolean)
            .join(' ')
            .trim() || `Cliente ${id}`;
        return { id, nombre };
      })
      .filter((client) => Number.isFinite(client.id));
  } catch {
    return [];
  }
};
