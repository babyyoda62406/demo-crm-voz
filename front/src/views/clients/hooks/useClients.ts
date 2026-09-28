import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useFetch } from '../../../hooks/useFetch';
import { getErrorMessage } from '../../../helpers/errorHandler';
import { getSuccessMessage } from '../../../helpers/successHandler';
import type { ItFindAllResponse, ItResponse } from '../../../types/api.types';
import {
  clientsRequests,
  type Client,
  type ClientActivity,
  type CreateActivityPayload,
  type FindAllClientsParams,
  type ImportClientsOptions,
  type ImportClientsSummary,
  type KanbanBoardResponse,
  type MoveStagePayload,
  type SaveClientPayload,
} from '../requests/clients.requests';
import type { BusinessLine } from '../enums/clientEnums';

/** Convierte un objeto de filtros en query string, saltándose los vacíos. */
const buildQuery = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
};

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------

/**
 * Listado paginado de clientes. Los filtros viven aquí para que la URL de
 * `useFetch` cambie con ellos y dispare la recarga sola.
 */
export const useClientsList = (initialParams: FindAllClientsParams = {}) => {
  const [params, setParams] = useState<FindAllClientsParams>({
    page: 1,
    size: 10,
    ...initialParams,
  });

  const url = useMemo(
    () => `/clients${buildQuery(params as Record<string, unknown>)}`,
    [params],
  );
  const { data, loading, error, refetch } = useFetch<ItFindAllResponse<Client>>(url);

  /** Aplica filtros nuevos y vuelve a la primera página. */
  const updateParams = useCallback((partial: FindAllClientsParams) => {
    setParams((previous) => ({ ...previous, ...partial, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setParams((previous) => ({ ...previous, page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setParams((previous) => ({ ...previous, size, page: 1 }));
  }, []);

  return {
    clients: data?.data ?? [],
    metadata: data?.metadata ?? null,
    isLoading: loading,
    error,
    params,
    updateParams,
    setPage,
    setPageSize,
    refetch,
  };
};

// ---------------------------------------------------------------------------
// Kanban
// ---------------------------------------------------------------------------

/**
 * Tablero kanban de una línea de negocio.
 *
 * `applyOptimisticMove` mueve la tarjeta en local antes de que responda la API:
 * al arrastrar, la columna cambia al instante y solo se recarga si falla.
 */
export const useClientKanban = (lineaNegocio: BusinessLine) => {
  const url = useMemo(() => `/clients/kanban?lineaNegocio=${lineaNegocio}`, [lineaNegocio]);
  const { data, loading, error, refetch } =
    useFetch<ItResponse<KanbanBoardResponse>>(url);

  const [overrides, setOverrides] = useState<Record<number, string>>({});

  const applyOptimisticMove = useCallback((clientId: number, etapa: string) => {
    setOverrides((previous) => ({ ...previous, [clientId]: etapa }));
  }, []);

  const clearOptimisticMoves = useCallback(() => setOverrides({}), []);

  const clientes = useMemo(
    () =>
      (data?.data?.clientes ?? []).map((client) =>
        overrides[client.id]
          ? { ...client, etapa: overrides[client.id] as Client['etapa'] }
          : client,
      ),
    [data, overrides],
  );

  return {
    columnas: data?.data?.columnas ?? [],
    clientes,
    isLoading: loading,
    error,
    refetch,
    applyOptimisticMove,
    clearOptimisticMoves,
  };
};

// ---------------------------------------------------------------------------
// Escrituras
// ---------------------------------------------------------------------------

/**
 * Acciones de escritura sobre clientes. Todas avisan por toast salvo que se
 * pidan en modo silencioso (`silent`), pensado para el arrastre del kanban.
 */
export const useClientActions = () => {
  const [isSaving, setIsSaving] = useState(false);

  /** Envuelve una llamada a la API con estado de carga y avisos homogéneos. */
  const run = useCallback(
    async <T>(
      action: () => Promise<ItResponse<T>>,
      fallbackMessage: string,
      silent = false,
    ): Promise<T | null> => {
      try {
        setIsSaving(true);
        const response = await action();
        if (!silent) {
          toast.success(getSuccessMessage(response.flag, response.message ?? fallbackMessage));
        }
        return response.data;
      } catch (error) {
        toast.error(getErrorMessage(error, fallbackMessage));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const createClient = useCallback(
    (payload: SaveClientPayload) =>
      run<Client>(() => clientsRequests.create(payload), 'No se ha podido crear el cliente'),
    [run],
  );

  const updateClient = useCallback(
    (id: number, payload: Partial<SaveClientPayload>) =>
      run<Client>(
        () => clientsRequests.update(id, payload),
        'No se ha podido actualizar el cliente',
      ),
    [run],
  );

  const removeClient = useCallback(
    (id: number) =>
      run<null>(() => clientsRequests.remove(id), 'No se ha podido eliminar el cliente'),
    [run],
  );

  const moveStage = useCallback(
    (id: number, payload: MoveStagePayload, silent = false) =>
      run<Client>(
        () => clientsRequests.moveStage(id, payload),
        'No se ha podido cambiar la etapa',
        silent,
      ),
    [run],
  );

  const discardClient = useCallback(
    (id: number, motivoDescarte: string) =>
      run<Client>(
        () => clientsRequests.discard(id, motivoDescarte),
        'No se ha podido descartar el cliente',
      ),
    [run],
  );

  const restoreClient = useCallback(
    (id: number) =>
      run<Client>(
        () => clientsRequests.restore(id),
        'No se ha podido reactivar el cliente',
      ),
    [run],
  );

  const addActivity = useCallback(
    (id: number, payload: CreateActivityPayload) =>
      run<ClientActivity>(
        () => clientsRequests.addActivity(id, payload),
        'No se ha podido registrar la actividad',
      ),
    [run],
  );

  const importClients = useCallback(
    (file: File, options: ImportClientsOptions) =>
      run<ImportClientsSummary>(
        () => clientsRequests.import(file, options),
        'No se ha podido importar el fichero',
      ),
    [run],
  );

  return {
    isSaving,
    createClient,
    updateClient,
    removeClient,
    moveStage,
    discardClient,
    restoreClient,
    addActivity,
    importClients,
  };
};
