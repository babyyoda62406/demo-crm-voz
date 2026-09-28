import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authRequests } from '../requests/auth/auth.requests';
import type { LoginRequest } from '../requests/auth/auth.requests';
import { normalizePrivileges } from '../helpers/privilegesNormalizer';
import { getErrorMessage } from '../helpers/errorHandler';
import { getSuccessMessage } from '../helpers/successHandler';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (data: LoginRequest) => {
    setIsLoading(true);

    try {
      const response = await authRequests.login(data);
      const payload = response.data;
      const token = response.token ?? payload?.token;
      // El backend devuelve el usuario en `data` (auth.service.ts). Se aceptan
      // también las formas alternativas `user` en raíz y `data.user`.
      const userData =
        response.user ?? payload?.user ?? (payload?.id !== undefined ? payload : undefined);

      if (token && userData?.id !== undefined && userData.email) {
        login(token, {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          lastName: userData.lastName,
          privileges: normalizePrivileges(userData.privileges ?? []),
        });
        toast.success(getSuccessMessage(response.flag, 'Sesión iniciada correctamente'));
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 0);
      } else {
        toast.error(getErrorMessage(null, response.message || 'No se ha podido iniciar sesión'));
      }
    } catch (err: unknown) {
      toast.error(
        getErrorMessage(err, 'No podemos iniciar sesión ahora mismo. Inténtalo más tarde.'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { login: handleLogin, isLoading };
};
