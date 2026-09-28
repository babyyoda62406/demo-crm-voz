/**
 * Nodo del arbol de carpetas que consume el panel izquierdo del Drive.
 * Se devuelve ya anidado para que el front no tenga que reconstruirlo.
 */
export interface ItFolderNode {
  id: number;
  nombre: string;
  parentId: number | null;
  clienteId: number | null;
  propiedadId: number | null;
  esRaiz: boolean;
  /** Ficheros contenidos directamente en esta carpeta (sin contar los hijos). */
  totalFicheros: number;
  hijos: ItFolderNode[];
}

/** Migaja de pan: ruta desde la raiz hasta la carpeta actual, inclusive. */
export interface ItFolderBreadcrumb {
  id: number;
  nombre: string;
}
