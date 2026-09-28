import { Privileges } from '../enums/Privileges';

/**
 * Privilegio requerido por ruta. `null` = accesible para cualquier usuario
 * autenticado.
 *
 * Los valores son EXACTAMENTE los que el backend exige en el `@Auth(...)` del
 * controlador correspondiente. Mientras esta tabla estuvo entera a `null`, el
 * menu ofrecia a un rol de solo lectura entradas cuya API le respondia 403:
 * el usuario navegaba a una pantalla que se quedaba vacia sin explicar por que.
 * Mantener los dos lados en el mismo privilegio hace que la pantalla ni
 * siquiera se ofrezca.
 */
export const routePrivileges: Record<string, Privileges | Privileges[] | null> = {
  '/dashboard': Privileges.VIEW_DASHBOARD,
  '/clientes': Privileges.VIEW_CLIENT,
  '/propiedades': Privileges.VIEW_PROPERTY,
  '/contratos': Privileges.VIEW_CONTRACT,
  '/documentos': Privileges.VIEW_DOCUMENT,
  '/facturas': Privileges.VIEW_INVOICE,
  '/asistente': Privileges.USE_ASSISTANT,
};

export const getRoutePrivilege = (path: string): Privileges | Privileges[] | null => {
  const exactMatch = routePrivileges[path];
  if (exactMatch !== undefined) return exactMatch;

  for (const [route, privilege] of Object.entries(routePrivileges)) {
    const routePattern = route.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${routePattern}$`);
    if (regex.test(path)) {
      return privilege;
    }
  }

  return null;
};
