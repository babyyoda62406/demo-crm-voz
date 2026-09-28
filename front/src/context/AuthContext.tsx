import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { APP_CONFIG } from '../config/global';
import { Privileges } from '../enums/Privileges';
import { normalizePrivileges } from '../helpers/privilegesNormalizer';

export interface AuthUser {
  id: number;
  email: string;
  name?: string;
  lastName?: string;
  privileges?: Privileges[];
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  privileges: Privileges[];
  login: (token: string, userData: AuthUser) => void;
  logout: (redirectToLogin?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Restaura la sesión desde localStorage de forma síncrona, antes del primer
 * render, para que las rutas protegidas no parpadeen hacia /login.
 */
const restoreSession = (): AuthUser | null => {
  const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);
  const userData = localStorage.getItem(APP_CONFIG.USER_KEY);
  if (!token || !userData) return null;

  try {
    const parsedUser = JSON.parse(userData) as AuthUser;
    return { ...parsedUser, privileges: normalizePrivileges(parsedUser.privileges ?? []) };
  } catch {
    localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
    localStorage.removeItem(APP_CONFIG.USER_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(restoreSession);
  const isAuthenticated = user !== null;
  const isLoading = false;
  const privileges = user?.privileges ?? [];

  const login = useCallback((token: string, userData: AuthUser) => {
    const validPrivileges = normalizePrivileges(userData.privileges ?? []);
    const userWithValidPrivileges: AuthUser = { ...userData, privileges: validPrivileges };
    localStorage.setItem(APP_CONFIG.TOKEN_KEY, token);
    localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(userWithValidPrivileges));
    setUser(userWithValidPrivileges);
  }, []);

  const logout = useCallback((redirectToLogin = true) => {
    localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
    localStorage.removeItem(APP_CONFIG.USER_KEY);
    setUser(null);
    if (redirectToLogin) {
      window.location.hash = '#/login';
    }
  }, []);

  useEffect(() => {
    const handleAuthLogout = () => {
      logout(true);
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, privileges, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
