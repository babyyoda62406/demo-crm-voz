import { ItPrivileges } from '../../auth/interfaces/it-privileges.interface';

export interface DefaultRolSeed {
  name: string;
  description: string;
  privileges: ItPrivileges[];
}

/** Nombre del rol que se asigna al administrador semilla. */
export const ADMIN_ROL_NAME = 'Administrador';

/**
 * Roles semilla de CRMIA. Se crean en el primer arranque si no existen.
 * Un rol ya existente NO se sobrescribe: el despacho puede ajustar permisos
 * desde la UI sin que el arranque los revierta.
 */
export const DEFAULT_ROLES: DefaultRolSeed[] = [
  {
    name: ADMIN_ROL_NAME,
    description: 'Acceso total al sistema, incluida la gestión de usuarios.',
    privileges: [ItPrivileges.ALL_PRIVILEGES],
  },
  {
    name: 'Gestor',
    description:
      'Gestión operativa completa: clientes, inmuebles, contratos, documentos y facturación.',
    privileges: [
      ItPrivileges.ADD_CLIENT,
      ItPrivileges.VIEW_CLIENT,
      ItPrivileges.EDIT_CLIENT,
      ItPrivileges.DELETE_CLIENT,
      ItPrivileges.ADD_PROPERTY,
      ItPrivileges.VIEW_PROPERTY,
      ItPrivileges.EDIT_PROPERTY,
      ItPrivileges.DELETE_PROPERTY,
      ItPrivileges.ADD_CONTRACT,
      ItPrivileges.VIEW_CONTRACT,
      ItPrivileges.EDIT_CONTRACT,
      ItPrivileges.DELETE_CONTRACT,
      ItPrivileges.ADD_DOCUMENT,
      ItPrivileges.VIEW_DOCUMENT,
      ItPrivileges.EDIT_DOCUMENT,
      ItPrivileges.DELETE_DOCUMENT,
      ItPrivileges.ADD_INVOICE,
      ItPrivileges.VIEW_INVOICE,
      ItPrivileges.EDIT_INVOICE,
      ItPrivileges.DELETE_INVOICE,
      ItPrivileges.USE_ASSISTANT,
      ItPrivileges.VIEW_DASHBOARD,
      ItPrivileges.VIEW_USER,
      ItPrivileges.VIEW_ROL,
    ],
  },
  {
    name: 'Comercial',
    description:
      'Capta y trabaja clientes e inmuebles; consulta contratos y documentos sin poder borrarlos.',
    privileges: [
      ItPrivileges.ADD_CLIENT,
      ItPrivileges.VIEW_CLIENT,
      ItPrivileges.EDIT_CLIENT,
      ItPrivileges.ADD_PROPERTY,
      ItPrivileges.VIEW_PROPERTY,
      ItPrivileges.EDIT_PROPERTY,
      ItPrivileges.ADD_CONTRACT,
      ItPrivileges.VIEW_CONTRACT,
      ItPrivileges.ADD_DOCUMENT,
      ItPrivileges.VIEW_DOCUMENT,
      ItPrivileges.VIEW_INVOICE,
      ItPrivileges.USE_ASSISTANT,
      ItPrivileges.VIEW_DASHBOARD,
    ],
  },
  {
    name: 'Colaborador',
    description: 'Acceso de solo lectura a todo el CRM.',
    privileges: [
      ItPrivileges.VIEW_CLIENT,
      ItPrivileges.VIEW_PROPERTY,
      ItPrivileges.VIEW_CONTRACT,
      ItPrivileges.VIEW_DOCUMENT,
      ItPrivileges.VIEW_INVOICE,
      ItPrivileges.VIEW_DASHBOARD,
    ],
  },
];
