import api from '../../../requests/axios.config';
import { APP_CONFIG } from '../../../config/global';
import type { ItFindAllResponse, ItResponse } from '../../../types/api.types';
import type {
  ClienteOpcion,
  Contract,
  ContractSendResult,
  ContractStateValue,
  ContractTemplate,
  CreateContractBody,
  ContractFormValues,
  PropiedadOpcion,
  PublicContractView,
} from '../types/contracts.types';

/** Filtros del listado de contratos. */
export interface ContractsQuery {
  page?: number;
  size?: number;
  search?: string;
  estado?: ContractStateValue | '';
  templateKey?: string;
}

const limpiar = (query: ContractsQuery): Record<string, string | number> => {
  const params: Record<string, string | number> = {};
  Object.entries(query).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      params[clave] = valor as string | number;
    }
  });
  return params;
};

// ---------------------------------------------------------------------------
// Plantillas
// ---------------------------------------------------------------------------

export const getContractTemplates = async (): Promise<ContractTemplate[]> => {
  const { data } = await api.get<ItResponse<ContractTemplate[]>>(
    '/contracts/templates',
  );
  return data.data ?? [];
};

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export const getContracts = async (
  query: ContractsQuery,
): Promise<ItFindAllResponse<Contract>> => {
  const { data } = await api.get<ItFindAllResponse<Contract>>('/contracts', {
    params: limpiar(query),
  });
  return data;
};

export const getContract = async (id: number): Promise<Contract> => {
  const { data } = await api.get<ItResponse<Contract>>(`/contracts/${id}`);
  return data.data;
};

export const createContract = async (
  body: CreateContractBody,
): Promise<ItResponse<Contract>> => {
  const { data } = await api.post<ItResponse<Contract>>('/contracts', body);
  return data;
};

export const updateContract = async (
  id: number,
  body: {
    datos?: ContractFormValues;
    titulo?: string;
    notas?: string;
    clienteId?: number;
    clienteNombre?: string;
    propiedadId?: number;
    propiedadDireccion?: string;
  },
): Promise<ItResponse<Contract>> => {
  const { data } = await api.patch<ItResponse<Contract>>(
    `/contracts/${id}`,
    body,
  );
  return data;
};

export const deleteContract = async (id: number): Promise<ItResponse<null>> => {
  const { data } = await api.delete<ItResponse<null>>(`/contracts/${id}`);
  return data;
};

export const sendContract = async (
  id: number,
  body: { destinatarioEmail?: string; mensaje?: string },
): Promise<ItResponse<ContractSendResult>> => {
  const { data } = await api.post<ItResponse<ContractSendResult>>(
    `/contracts/${id}/send`,
    body,
  );
  return data;
};

export const createProrroga = async (
  id: number,
  body: { datos?: ContractFormValues; titulo?: string },
): Promise<ItResponse<Contract>> => {
  const { data } = await api.post<ItResponse<Contract>>(
    `/contracts/${id}/prorroga`,
    body,
  );
  return data;
};

export const regenerateContractPdf = async (
  id: number,
): Promise<ItResponse<Contract>> => {
  const { data } = await api.post<ItResponse<Contract>>(
    `/contracts/${id}/pdf`,
    {},
  );
  return data;
};

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

/**
 * Descarga el PDF como blob. Se usa para previsualizar dentro de un `<iframe>`:
 * el visor del navegador no puede enviar la cabecera `token`, así que el
 * documento se pide con axios y se sirve desde un object URL.
 */
export const fetchContractPdfBlob = async (id: number): Promise<string> => {
  const { data } = await api.get<Blob>(`/contracts/${id}/pdf`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
};

/** Descarga directa de un documento del contrato. */
export const downloadContractFile = async (
  contrato: Contract,
  formato: 'docx' | 'pdf',
): Promise<void> => {
  const url =
    formato === 'pdf'
      ? `/contracts/${contrato.id}/pdf?descargar=true`
      : `/contracts/${contrato.id}/docx`;

  const { data } = await api.get<Blob>(url, { responseType: 'blob' });

  const objectUrl = URL.createObjectURL(new Blob([data]));
  const enlace = document.createElement('a');
  enlace.href = objectUrl;
  enlace.download = `${contrato.referencia}.${formato}`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(objectUrl);
};

// ---------------------------------------------------------------------------
// Buscadores de cliente e inmueble para el asistente
//
// Se consultan las APIs de los dominios `clients/` y `properties/` sin importar
// su código: sus tipos son suyos y aquí solo hacen falta cuatro campos. Las
// filas se leen de forma defensiva y cualquier error deja la lista vacía, para
// que el asistente de contratos nunca se rompa por un cambio ajeno.
// ---------------------------------------------------------------------------

type FilaCruda = Record<string, unknown>;

const filasDe = (cuerpo: unknown): FilaCruda[] => {
  const bruto = Array.isArray(cuerpo)
    ? cuerpo
    : (cuerpo as { data?: unknown })?.data;
  if (!Array.isArray(bruto)) return [];
  return bruto.filter(
    (fila): fila is FilaCruda => typeof fila === 'object' && fila !== null,
  );
};

const texto = (fila: FilaCruda, claves: string[]): string => {
  for (const clave of claves) {
    const valor = fila[clave];
    if (typeof valor === 'string' && valor.trim()) return valor.trim();
    if (typeof valor === 'number') return String(valor);
  }
  return '';
};

/** Clientes que casan con el texto escrito en el buscador del asistente. */
export const buscarClientes = async (
  search: string,
): Promise<ClienteOpcion[]> => {
  try {
    const { data } = await api.get<unknown>('/clients', {
      params: limpiar({ page: 1, size: 8, search }),
    });

    return filasDe(data).map((fila) => ({
      id: Number(fila.id),
      nombre:
        [texto(fila, ['nombre']), texto(fila, ['apellidos'])]
          .filter(Boolean)
          .join(' ')
          .trim() || `Cliente ${String(fila.id)}`,
      documento: texto(fila, ['documento', 'nif', 'cif']) || null,
      email: texto(fila, ['email']) || null,
      telefono: texto(fila, ['telefono']) || null,
      direccion: texto(fila, ['direccion', 'domicilio']) || null,
    }));
  } catch {
    return [];
  }
};

/** Inmuebles que casan con el texto escrito en el buscador del asistente. */
export const buscarPropiedades = async (
  search: string,
): Promise<PropiedadOpcion[]> => {
  try {
    const { data } = await api.get<unknown>('/properties', {
      params: limpiar({ page: 1, size: 8, search }),
    });

    return filasDe(data).map((fila) => ({
      id: Number(fila.id),
      referencia: texto(fila, ['referencia']) || null,
      titulo: texto(fila, ['titulo']) || null,
      direccion: texto(fila, ['direccion']),
      poblacion: texto(fila, ['poblacion']) || null,
      precio: typeof fila.precio === 'number' ? fila.precio : null,
    }));
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------
// Enlace público de firma (sin autenticación)
// ---------------------------------------------------------------------------

/**
 * URL absoluta del PDF público, apta para un `<iframe>` o un enlace.
 *
 * `version` (la fecha de la firma) se añade como parámetro para que el
 * navegador no reutilice el PDF sin firmar que ya tenía cacheado: al firmar, el
 * documento se rehace con la diligencia bajo la misma ruta.
 */
export const getPublicPdfUrl = (token: string, version?: string | null): string =>
  `${APP_CONFIG.API_BASE_URL}/contracts/public/${encodeURIComponent(token)}/pdf${
    version ? `?v=${encodeURIComponent(version)}` : ''
  }`;

export const getPublicContract = async (
  token: string,
): Promise<PublicContractView> => {
  const { data } = await api.get<ItResponse<PublicContractView>>(
    `/contracts/public/${encodeURIComponent(token)}/estado`,
  );
  return data.data;
};

export const signPublicContract = async (
  token: string,
  firmanteNombre: string,
): Promise<ItResponse<PublicContractView>> => {
  const { data } = await api.post<ItResponse<PublicContractView>>(
    `/contracts/public/${encodeURIComponent(token)}/sign`,
    { firmanteNombre },
  );
  return data;
};
