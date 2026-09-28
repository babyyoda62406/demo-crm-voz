import { useState, useEffect, useCallback } from 'react';
import type { AxiosResponse } from 'axios';
import api from '../requests/axios.config';

interface UseFetchOptions {
  immediate?: boolean;
}

interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useFetch = <T = unknown>(
  url: string,
  options: UseFetchOptions = { immediate: true },
): UseFetchReturn<T> => {
  const immediate = options.immediate ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: AxiosResponse<T> = await api.get<T>(url);
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (immediate) {
      // La carga inicial es una sincronización con un sistema externo (la API):
      // el estado se actualiza dentro de la promesa, no de forma síncrona.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchData();
    }
  }, [immediate, fetchData]);

  return { data, loading, error, refetch: fetchData };
};
