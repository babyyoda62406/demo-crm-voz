import api from '../../requests/axios.config';
import type { ItResponse, ItFindAllResponse } from '../../types/api.types';
import type {
  ClientInvoiceHistory,
  ClientOption,
  ContractOption,
  Invoice,
  InvoiceFilters,
  InvoiceFromContractPayload,
  InvoicePayload,
  InvoiceSummary,
} from './invoice.types';

const BASE = '/billing/invoice';

/** Tamaño de los desplegables de cliente y contrato del módulo. */
const TAMANO_SELECTOR = 200;

/**
 * Compone la cadena de consulta descartando los filtros vacíos: el backend
 * valida con `forbidNonWhitelisted`, así que no conviene enviar campos sueltos
 * ni valores en blanco.
 */
export const buildInvoiceQuery = (filters: InvoiceFilters): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([clave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return;
    params.append(clave, String(valor));
  });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const invoiceRequests = {
  create: async (data: InvoicePayload): Promise<ItResponse<Invoice>> => {
    const response = await api.post<ItResponse<Invoice>>(BASE, data);
    return response.data;
  },

  createFromContract: async (
    data: InvoiceFromContractPayload,
  ): Promise<ItResponse<Invoice>> => {
    const response = await api.post<ItResponse<Invoice>>(`${BASE}/from-contract`, data);
    return response.data;
  },

  findAll: async (filters: InvoiceFilters = {}): Promise<ItFindAllResponse<Invoice>> => {
    const response = await api.get<ItFindAllResponse<Invoice>>(
      `${BASE}${buildInvoiceQuery(filters)}`,
    );
    return response.data;
  },

  summary: async (filters: InvoiceFilters = {}): Promise<ItResponse<InvoiceSummary>> => {
    const response = await api.get<ItResponse<InvoiceSummary>>(
      `${BASE}/resumen${buildInvoiceQuery(filters)}`,
    );
    return response.data;
  },

  findByClient: async (clienteId: number): Promise<ItResponse<ClientInvoiceHistory>> => {
    const response = await api.get<ItResponse<ClientInvoiceHistory>>(
      `${BASE}/cliente/${clienteId}`,
    );
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<InvoicePayload>,
  ): Promise<ItResponse<Invoice>> => {
    const response = await api.patch<ItResponse<Invoice>>(`${BASE}/${id}`, data);
    return response.data;
  },

  markAsPaid: async (
    id: number,
    fechaCobro?: string,
  ): Promise<ItResponse<Invoice>> => {
    const response = await api.patch<ItResponse<Invoice>>(
      `${BASE}/${id}/cobrar`,
      fechaCobro ? { fechaCobro } : {},
    );
    return response.data;
  },

  /** Deshace el cobro: la factura vuelve a estar pendiente. */
  revertPayment: async (id: number): Promise<ItResponse<Invoice>> => {
    const response = await api.patch<ItResponse<Invoice>>(`${BASE}/${id}/descobrar`, {});
    return response.data;
  },

  cancel: async (id: number): Promise<ItResponse<Invoice>> => {
    const response = await api.patch<ItResponse<Invoice>>(`${BASE}/${id}/anular`, {});
    return response.data;
  },

  /** Descarga el PDF de la factura y lo entrega al navegador. */
  downloadPdf: async (id: number, numero: string): Promise<void> => {
    const response = await api.get<Blob>(`${BASE}/${id}/pdf`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(response.data);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${numero}.pdf`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
  },
};

// ---------------------------------------------------------------------------
// Selectores auxiliares (clientes y contratos)
// ---------------------------------------------------------------------------

/**
 * Filas de cliente y de contrato tal como llegan de sus dominios. Se leen con
 * tipos laxos a propósito: facturación sólo necesita cuatro campos y no debe
 * romperse si esos módulos añaden o renombran los suyos.
 */
interface FilaCliente {
  id: number;
  nombre?: string | null;
  apellidos?: string | null;
  documento?: string | null;
  email?: string | null;
  direccion?: string | null;
}

interface FilaContrato {
  id: number;
  referencia?: string | null;
  titulo?: string | null;
  clienteId?: number | null;
  clienteNombre?: string | null;
  estado?: string | null;
}

/**
 * Clientes disponibles para los desplegables de facturación.
 *
 * Si la petición falla (permisos insuficientes o dominio no disponible) se
 * devuelve una lista vacía en lugar de propagar el error: el formulario ofrece
 * entonces la introducción manual del cliente y la factura se puede emitir
 * igualmente.
 */
export const fetchClientOptions = async (): Promise<ClientOption[]> => {
  try {
    const response = await api.get<ItFindAllResponse<FilaCliente>>('/clients', {
      params: { page: 1, size: TAMANO_SELECTOR },
    });

    return (response.data?.data ?? []).map((fila) => ({
      id: fila.id,
      nombre: [fila.nombre, fila.apellidos].filter(Boolean).join(' ').trim() || `Cliente #${fila.id}`,
      documento: fila.documento ?? null,
      email: fila.email ?? null,
      direccion: fila.direccion ?? null,
    }));
  } catch {
    return [];
  }
};

/**
 * Contratos disponibles para emitir factura. Igual que con los clientes, un
 * fallo devuelve lista vacía y el formulario permite escribir el identificador
 * del contrato a mano.
 */
export const fetchContractOptions = async (): Promise<ContractOption[]> => {
  try {
    const response = await api.get<ItFindAllResponse<FilaContrato>>('/contracts', {
      params: { page: 1, size: TAMANO_SELECTOR },
    });

    return (response.data?.data ?? []).map((fila) => ({
      id: fila.id,
      referencia: fila.referencia ?? `Contrato #${fila.id}`,
      titulo: fila.titulo ?? '',
      clienteId: fila.clienteId ?? null,
      clienteNombre: fila.clienteNombre ?? null,
      estado: fila.estado ?? null,
    }));
  } catch {
    return [];
  }
};
