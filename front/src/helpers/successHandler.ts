import i18n from '../config/i18n.config';

export const getSuccessMessage = (flag?: string, defaultMessage?: string): string => {
  if (flag && i18n.exists(`flags:${flag}`, { ns: 'flags' })) {
    return i18n.t(`flags:${flag}`, { ns: 'flags' });
  }
  return defaultMessage || i18n.t('flags:success', { ns: 'flags' });
};
