/**
 * Catalogo de privilegios de CRMIA.
 * Se combinan los del usuario con los de su rol (ver `mergePrivileges`).
 */
export enum ItPrivileges {
  /** Comodin: concede acceso a todo el sistema. */
  ALL_PRIVILEGES = 'ALL_PRIVILEGES',

  // Usuarios
  ADD_USER = 'ADD_USER',
  VIEW_USER = 'VIEW_USER',
  EDIT_USER = 'EDIT_USER',
  DELETE_USER = 'DELETE_USER',
  HARD_DELETE_USER = 'HARD_DELETE_USER',
  RESTORE_USER = 'RESTORE_USER',

  // Roles
  ADD_ROL = 'ADD_ROL',
  VIEW_ROL = 'VIEW_ROL',
  EDIT_ROL = 'EDIT_ROL',
  DELETE_ROL = 'DELETE_ROL',

  // Clientes
  ADD_CLIENT = 'ADD_CLIENT',
  VIEW_CLIENT = 'VIEW_CLIENT',
  EDIT_CLIENT = 'EDIT_CLIENT',
  DELETE_CLIENT = 'DELETE_CLIENT',

  // Inmuebles
  ADD_PROPERTY = 'ADD_PROPERTY',
  VIEW_PROPERTY = 'VIEW_PROPERTY',
  EDIT_PROPERTY = 'EDIT_PROPERTY',
  DELETE_PROPERTY = 'DELETE_PROPERTY',

  // Contratos
  ADD_CONTRACT = 'ADD_CONTRACT',
  VIEW_CONTRACT = 'VIEW_CONTRACT',
  EDIT_CONTRACT = 'EDIT_CONTRACT',
  DELETE_CONTRACT = 'DELETE_CONTRACT',

  // Documentos
  ADD_DOCUMENT = 'ADD_DOCUMENT',
  VIEW_DOCUMENT = 'VIEW_DOCUMENT',
  EDIT_DOCUMENT = 'EDIT_DOCUMENT',
  DELETE_DOCUMENT = 'DELETE_DOCUMENT',

  // Facturacion
  ADD_INVOICE = 'ADD_INVOICE',
  VIEW_INVOICE = 'VIEW_INVOICE',
  EDIT_INVOICE = 'EDIT_INVOICE',
  DELETE_INVOICE = 'DELETE_INVOICE',

  // Transversales
  /** Permite usar el asistente de IA (texto y voz). */
  USE_ASSISTANT = 'USE_ASSISTANT',
  /** Permite consultar el cuadro de mando. */
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
}
