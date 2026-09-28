/**
 * Configuración global de CRMIA.
 * En desarrollo la baseURL es relativa (`/api`) y Vite hace proxy a
 * http://localhost:3000 (ver vite.config.ts).
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const APP_CONFIG = {
  API_BASE_URL,
  TOKEN_KEY: 'token',
  USER_KEY: 'user',
  LANGUAGE_KEY: 'language',
  DEFAULT_LANGUAGE: 'es',
  APP_NAME: 'CRMIA',
  APP_SUBTITLE: 'CRM Inmobiliario Inteligente',
} as const;
