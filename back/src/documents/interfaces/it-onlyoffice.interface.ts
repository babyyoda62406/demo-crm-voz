import { OnlyOfficeDocumentType } from '../helpers/document-type.helper';

/** Permisos del documento dentro del editor, derivados de los privilegios. */
export interface ItOnlyOfficePermissions {
  edit: boolean;
  download: boolean;
  print: boolean;
  review: boolean;
  comment: boolean;
  fillForms: boolean;
  copy: boolean;
}

/**
 * Configuracion que el front entrega a `new DocsAPI.DocEditor(...)`.
 * Se corresponde uno a uno con el contrato de ONLYOFFICE Document Server.
 */
export interface ItOnlyOfficeConfig {
  document: {
    fileType: string;
    /** Identificador de version. Cambia en cada guardado (ver `FileDoc.version`). */
    key: string;
    title: string;
    /** URL del binario, resuelta DESDE EL CONTENEDOR de ONLYOFFICE. */
    url: string;
    permissions: ItOnlyOfficePermissions;
  };
  documentType: OnlyOfficeDocumentType;
  editorConfig: {
    lang: string;
    mode: 'edit' | 'view';
    /** URL a la que ONLYOFFICE notifica los guardados. */
    callbackUrl: string;
    user: { id: string; name: string };
    customization: Record<string, unknown>;
  };
  height: string;
  width: string;
  /** Firma JWT de todo lo anterior (secreto `ONLYOFFICE_JWT_SECRET`). */
  token?: string;
}

/**
 * Respuesta de `GET /documents/:id/onlyoffice-config`.
 * Ademas de la config firmada incluye la URL del script del editor, que el
 * navegador debe cargar dinamicamente.
 */
export interface ItOnlyOfficeConfigResponse {
  /** `${ONLYOFFICE_URL}/web-apps/apps/api/documents/api.js` */
  scriptUrl: string;
  config: ItOnlyOfficeConfig;
  /** `false` si el formato solo admite lectura (PDF, .doc antiguo...). */
  editable: boolean;
}

/**
 * Cuerpo que ONLYOFFICE envia al `callbackUrl`.
 * Se tipa como interfaz (no como DTO de class-validator) a proposito: el
 * servidor de documentos manda campos extra segun la version y el
 * `ValidationPipe` global, con `forbidNonWhitelisted`, rechazaria la peticion.
 */
export interface ItOnlyOfficeCallbackBody {
  /** 1 editando, 2 listo para guardar, 3 error al guardar, 4 sin cambios, 6 forcesave, 7 error en forcesave. */
  status: number;
  key?: string;
  /** URL de descarga de la version editada (la sirve el propio ONLYOFFICE). */
  url?: string;
  filetype?: string;
  token?: string;
  users?: string[];
  actions?: unknown[];
  forcesavetype?: number;
  [clave: string]: unknown;
}

/** Estados del callback de ONLYOFFICE. */
export enum OnlyOfficeStatus {
  EDITANDO = 1,
  LISTO_PARA_GUARDAR = 2,
  ERROR_AL_GUARDAR = 3,
  SIN_CAMBIOS = 4,
  GUARDADO_FORZADO = 6,
  ERROR_GUARDADO_FORZADO = 7,
}
