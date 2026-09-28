import { ItPrivileges } from '../../auth/interfaces/it-privileges.interface';

/**
 * Combina los privilegios del usuario con los de su rol, eliminando duplicados.
 * Si el usuario tiene ALL_PRIVILEGES, retorna solo ese privilegio.
 * @param userPrivileges Privilegios propios del usuario
 * @param rolePrivileges Privilegios heredados del rol
 * @returns Array de privilegios combinados y unicos
 */
export function mergePrivileges(
  userPrivileges: ItPrivileges[] = [],
  rolePrivileges: ItPrivileges[] = [],
): ItPrivileges[] {
  // Si el usuario tiene ALL_PRIVILEGES, retorna solo ese
  if (userPrivileges.includes(ItPrivileges.ALL_PRIVILEGES)) {
    return [ItPrivileges.ALL_PRIVILEGES];
  }

  // Si el rol tiene ALL_PRIVILEGES y el usuario no tiene privilegios propios
  if (
    rolePrivileges.includes(ItPrivileges.ALL_PRIVILEGES) &&
    userPrivileges.length === 0
  ) {
    return [ItPrivileges.ALL_PRIVILEGES];
  }

  // Combina ambos arrays y elimina duplicados
  const combined = [...userPrivileges, ...rolePrivileges];
  return Array.from(new Set(combined));
}
