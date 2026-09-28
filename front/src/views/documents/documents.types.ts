/**
 * Tipos del Drive documental. Reflejan uno a uno las entidades `Folder` y
 * `FileDoc` del backend (`back/src/documents/entities`).
 */

export interface Folder {
  id: number;
  nombre: string;
  parentId: number | null;
  clienteId: number | null;
  propiedadId: number | null;
  esRaiz: boolean;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileDoc {
  id: number;
  nombre: string;
  nombreOriginal: string;
  nombreAlmacenado: string;
  mime: string;
  tamano: number;
  ruta: string;
  folderId: number | null;
  clienteId: number | null;
  propiedadId: number | null;
  version: number;
  uploadedById: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Resultado del movimiento en masa: cuántos se movieron y cuántos se omitieron. */
export interface MoveBulkResult {
  movidos: number;
  omitidos: number;
}

/** Nodo del árbol de carpetas, ya anidado por el backend. */
export interface FolderNode {
  id: number;
  nombre: string;
  parentId: number | null;
  clienteId: number | null;
  propiedadId: number | null;
  esRaiz: boolean;
  totalFicheros: number;
  hijos: FolderNode[];
}

export interface FolderBreadcrumb {
  id: number;
  nombre: string;
}

/** Ámbito del explorador: Drive completo, o documentación de un cliente/inmueble. */
export interface DriveScope {
  clienteId?: number;
  propiedadId?: number;
}

export type OnlyOfficeDocumentType = 'word' | 'cell' | 'slide' | 'pdf';

export interface OnlyOfficeConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: Record<string, boolean>;
  };
  documentType: OnlyOfficeDocumentType;
  editorConfig: {
    lang: string;
    mode: 'edit' | 'view';
    callbackUrl: string;
    user: { id: string; name: string };
    customization: Record<string, unknown>;
  };
  height: string;
  width: string;
  token?: string;
}

export interface OnlyOfficeConfigResponse {
  scriptUrl: string;
  config: OnlyOfficeConfig;
  editable: boolean;
}

/** Acciones del menú contextual de un documento. */
export type FileAction =
  | 'abrir'
  | 'descargar'
  | 'renombrar'
  | 'mover'
  | 'duplicar'
  | 'borrar';

/** Acciones del menú contextual de una carpeta. */
export type FolderAction = 'renombrar' | 'mover' | 'borrar' | 'nueva';
