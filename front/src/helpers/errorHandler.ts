import type { AxiosError } from 'axios';
import i18n from '../config/i18n.config';

export const getErrorMessage = (error: unknown, defaultMessage?: string): string => {
  if (!error) {
    return defaultMessage || i18n.t('flags:error', { ns: 'flags' });
  }

  const axiosError = error as AxiosError;

  // Error de conexión (servidor apagado, sin internet, etc.)
  if (!axiosError.response) {
    if (axiosError.code === 'ECONNABORTED' || axiosError.message?.includes('timeout')) {
      return i18n.t('flags:timeout_error', { ns: 'flags' });
    }
    if (axiosError.code === 'ERR_NETWORK' || axiosError.message?.includes('Network Error')) {
      return i18n.t('flags:network_error', { ns: 'flags' });
    }
    return i18n.t('flags:connection_error', { ns: 'flags' });
  }

  const status = axiosError.response.status;
  const responseData = axiosError.response.data as { message?: string; flag?: string } | undefined;
  const serverMessage = responseData?.message;
  const flag = responseData?.flag;

  // Si el backend envía un flag conocido, se traduce
  if (flag && i18n.exists(`flags:${flag}`, { ns: 'flags' })) {
    return i18n.t(`flags:${flag}`, { ns: 'flags' });
  }

  if (serverMessage) {
    return serverMessage;
  }

  switch (status) {
    case 400:
      return i18n.t('flags:validation_error', { ns: 'flags' });
    case 401:
      return i18n.t('flags:unauthorized', { ns: 'flags' });
    case 403:
      return i18n.t('flags:forbidden', { ns: 'flags' });
    case 404:
      return i18n.t('flags:not_found', { ns: 'flags' });
    case 409:
      return i18n.t('flags:conflict', { ns: 'flags' });
    case 500:
    case 502:
    case 503:
      return i18n.t('flags:database_error', { ns: 'flags' });
    default:
      return defaultMessage || i18n.t('flags:error', { ns: 'flags' });
  }
};
