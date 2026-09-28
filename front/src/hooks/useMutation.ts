import { useState, useCallback } from 'react';
import type { AxiosResponse, Method } from 'axios';
import api from '../requests/axios.config';

interface UseMutationOptions<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

interface UseMutationReturn<TData, TVariables> {
  mutate: (variables?: TVariables, method?: Method, url?: string) => Promise<TData | null>;
  data: TData | null;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

export const useMutation = <TData = unknown, TVariables = unknown>(
  defaultUrl: string,
  defaultMethod: Method = 'POST',
  options: UseMutationOptions<TData> = {},
): UseMutationReturn<TData, TVariables> => {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const { onSuccess, onError } = options;

  const mutate = useCallback(
    async (
      variables?: TVariables,
      method: Method = defaultMethod,
      url: string = defaultUrl,
    ): Promise<TData | null> => {
      try {
        setLoading(true);
        setError(null);
        let response: AxiosResponse<TData>;

        switch (String(method).toUpperCase()) {
          case 'POST':
            response = await api.post<TData>(url, variables);
            break;
          case 'PUT':
            response = await api.put<TData>(url, variables);
            break;
          case 'PATCH':
            response = await api.patch<TData>(url, variables);
            break;
          case 'DELETE':
            response = await api.delete<TData>(url);
            break;
          default:
            throw new Error(`Método no soportado: ${String(method)}`);
        }

        setData(response.data);
        onSuccess?.(response.data);
        return response.data;
      } catch (err) {
        const normalizedError = err instanceof Error ? err : new Error('Error desconocido');
        setError(normalizedError);
        onError?.(normalizedError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [defaultMethod, defaultUrl, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, data, loading, error, reset };
};
