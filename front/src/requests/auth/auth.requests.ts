import api from '../axios.config';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  lastName?: string;
  privileges?: string[];
}

/**
 * `auth.service.ts` responde `{ message, flag, token, data: <usuario> }`: el
 * usuario viaja directamente en `data`, no anidado en `data.user`. El tipo
 * admite además las formas alternativas (`user` en raíz, `data.user`) para no
 * romper si el contrato cambia.
 */
export interface AuthResponse {
  message: string;
  flag: string;
  token?: string;
  user?: AuthUser;
  data?: Partial<AuthUser> & {
    token?: string;
    user?: AuthUser;
  };
}

export const authRequests = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  profile: async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>('/auth/profile');
    return response.data;
  },
};
