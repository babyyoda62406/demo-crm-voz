import axios from 'axios';
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { APP_CONFIG } from '../config/global';

// Sin Content-Type por defecto: axios pone application/json cuando el cuerpo
// es un objeto y deja que el navegador ponga multipart/form-data con boundary
// cuando es FormData. Fijarlo globalmente rompía todas las subidas de ficheros.
const api: AxiosInstance = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
    if (token && config.headers) {
      config.headers.token = token;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
      localStorage.removeItem(APP_CONFIG.USER_KEY);
      // Evento personalizado: AuthContext gestiona el logout y la redirección
      window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'token_expired' } }));
    }
    return Promise.reject(error);
  },
);

export default api;
