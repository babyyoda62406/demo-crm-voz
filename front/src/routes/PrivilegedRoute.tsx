import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePrivileges } from '../hooks/usePrivileges';
import { Privileges } from '../enums/Privileges';
import { getRoutePrivilege } from '../config/routePrivileges';

interface PrivilegedRouteProps {
  children: ReactNode;
  requiredPrivileges?: Privileges | Privileges[];
  fallbackPath?: string;
}

export const PrivilegedRoute = ({
  children,
  requiredPrivileges,
  fallbackPath = '/dashboard',
}: PrivilegedRouteProps) => {
  const { hasPrivilege } = usePrivileges();
  const location = useLocation();

  const privilege = requiredPrivileges ?? getRoutePrivilege(location.pathname);

  if (privilege === null) {
    return <>{children}</>;
  }

  if (!hasPrivilege(privilege)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
