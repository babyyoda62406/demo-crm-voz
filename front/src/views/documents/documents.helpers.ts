import {
  FiFile,
  FiFileText,
  FiGrid,
  FiImage,
  FiMonitor,
  FiMusic,
  FiPackage,
  FiVideo,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import type { AxiosError } from 'axios';
import { getErrorMessage } from '../../helpers/errorHandler';

/** Extensión en minúsculas y sin punto. */
export const getExtension = (nombre: string): string => {
  if (!nombre) return '';
  const partes = nombre.split('.');
  if (partes.length < 2) return '';
  return (partes.pop() ?? '').toLowerCase().trim();
};

/**
 * Parte el nombre en la parte editable y la extensión, punto incluido:
 * «nota-simple.pdf» → `{ base: 'nota-simple', extension: '.pdf' }`.
 *
 * Es lo que permite renombrar como en Windows o en Google Drive, editando solo
 * el nombre y conservando la extensión, de la que dependen el visor y el editor.
 */
export const separarExtension = (nombre: string): { base: string; extension: string } => {
  const corte = nombre.lastIndexOf('.');

  // Sin punto, o con el punto al principio («.gitignore»): no hay parte editable
  // que separar y el nombre viaja entero.
  if (corte <= 0 || !getExtension(nombre)) return { base: nombre, extension: '' };

  return { base: nombre.slice(0, corte), extension: nombre.slice(corte) };
};

const EXT_WORD = ['doc', 'docm', 'docx', 'dot', 'odt', 'ott', 'rtf', 'txt', 'epub'];
const EXT_CELL = ['csv', 'ods', 'ots', 'xls', 'xlsm', 'xlsx', 'xlt'];
const EXT_SLIDE = ['odp', 'otp', 'pot', 'pps', 'ppsx', 'ppt', 'pptm', 'pptx'];
const EXT_IMAGEN = ['bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'];
const EXT_VIDEO = ['avi', 'mkv', 'mov', 'mp4', 'webm'];
const EXT_AUDIO = ['aac', 'flac', 'm4a', 'mp3', 'ogg', 'wav'];
const EXT_COMPRIMIDO = ['7z', 'gz', 'rar', 'tar', 'zip'];

/** Formatos que ONLYOFFICE abre en modo edición. */
const EXT_EDITABLE = ['csv', 'docx', 'odp', 'ods', 'odt', 'pptx', 'rtf', 'txt', 'xlsx'];

/** Formatos que ONLYOFFICE puede mostrar (editando o solo lectura). */
const EXT_ONLYOFFICE = [...EXT_WORD, ...EXT_CELL, ...EXT_SLIDE];

export const esPdf = (nombre: string): boolean => getExtension(nombre) === 'pdf';

export const esImagen = (nombre: string): boolean => EXT_IMAGEN.includes(getExtension(nombre));

/** `true` si el documento se abre en el editor embebido de ONLYOFFICE. */
export const esOnlyOffice = (nombre: string): boolean =>
  EXT_ONLYOFFICE.includes(getExtension(nombre));

export const esEditable = (nombre: string): boolean => EXT_EDITABLE.includes(getExtension(nombre));

/** `true` si el documento se puede previsualizar dentro del CRM. */
export const esPrevisualizable = (nombre: string): boolean =>
  esOnlyOffice(nombre) || esPdf(nombre) || esImagen(nombre);

export interface EstiloTipoFichero {
  Icono: IconType;
  /** Color del icono. */
  color: string;
  /** Fondo de la pastilla que lo enmarca. */
  fondo: string;
  /** Etiqueta corta del tipo, en español. */
  etiqueta: string;
}

/**
 * Icono, color y etiqueta según el tipo de fichero.
 * La paleta mantiene el código visual habitual (azul texto, verde hoja de
 * cálculo, naranja presentación, rojo PDF) dentro del cristal de CRMIA.
 */
export const getEstiloTipoFichero = (nombre: string): EstiloTipoFichero => {
  const ext = getExtension(nombre);

  if (ext === 'pdf') {
    return {
      Icono: FiFileText,
      color: 'text-red-600',
      fondo: 'bg-red-50/70 border-red-200/60',
      etiqueta: 'PDF',
    };
  }

  if (EXT_WORD.includes(ext)) {
    return {
      Icono: FiFileText,
      color: 'text-blue-600',
      fondo: 'bg-blue-50/70 border-blue-200/60',
      etiqueta: 'Documento',
    };
  }

  if (EXT_CELL.includes(ext)) {
    return {
      Icono: FiGrid,
      color: 'text-emerald-600',
      fondo: 'bg-emerald-50/70 border-emerald-200/60',
      etiqueta: 'Hoja de cálculo',
    };
  }

  if (EXT_SLIDE.includes(ext)) {
    return {
      Icono: FiMonitor,
      color: 'text-orange-600',
      fondo: 'bg-orange-50/70 border-orange-200/60',
      etiqueta: 'Presentación',
    };
  }

  if (EXT_IMAGEN.includes(ext)) {
    return {
      Icono: FiImage,
      color: 'text-purple-600',
      fondo: 'bg-purple-50/70 border-purple-200/60',
      etiqueta: 'Imagen',
    };
  }

  if (EXT_VIDEO.includes(ext)) {
    return {
      Icono: FiVideo,
      color: 'text-pink-600',
      fondo: 'bg-pink-50/70 border-pink-200/60',
      etiqueta: 'Vídeo',
    };
  }

  if (EXT_AUDIO.includes(ext)) {
    return {
      Icono: FiMusic,
      color: 'text-indigo-600',
      fondo: 'bg-indigo-50/70 border-indigo-200/60',
      etiqueta: 'Audio',
    };
  }

  if (EXT_COMPRIMIDO.includes(ext)) {
    return {
      Icono: FiPackage,
      color: 'text-amber-600',
      fondo: 'bg-amber-50/70 border-amber-200/60',
      etiqueta: 'Comprimido',
    };
  }

  return {
    Icono: FiFile,
    color: 'text-gray-600',
    fondo: 'bg-gray-50/70 border-gray-200/60',
    etiqueta: 'Archivo',
  };
};

/** Tamaño legible en español (1.024 bytes = 1 KB). */
export const formatearTamano = (bytes?: number | null): string => {
  if (!bytes || bytes <= 0) return '0 B';

  const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
  const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
  const valor = bytes / 1024 ** indice;
  const decimales = indice === 0 ? 0 : 1;

  return `${valor.toLocaleString('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })} ${unidades[indice]}`;
};

/**
 * Tamaño máximo por archivo que acepta el backend.
 * Espejo de `LIMITE_TAMANO_SUBIDA` en `back/src/documents/helpers/storage.helper.ts`.
 */
export const LIMITE_TAMANO_SUBIDA = 100 * 1024 * 1024;

/**
 * Mensaje de error de una acción del Drive.
 *
 * El backend explica con detalle lo que ha pasado («Ya existe una carpeta con
 * ese nombre en esta ubicación», «El nombre debe terminar en «.pdf»…»), pero el
 * traductor común resuelve antes el `flag` genérico y esas explicaciones se
 * pierden en un «Conflicto. El recurso ya existe». Aquí manda el mensaje del
 * servidor, salvo en el 413 de la subida, que llega en inglés desde multer y
 * sin decir cuál es el límite.
 */
export const mensajeErrorDrive = (fallo: unknown, respaldo: string): string => {
  const respuesta = (fallo as AxiosError | undefined)?.response;
  if (!respuesta) return getErrorMessage(fallo, respaldo);

  if (respuesta.status === 413) {
    return `El archivo supera el máximo permitido (${formatearTamano(LIMITE_TAMANO_SUBIDA)}).`;
  }

  const mensaje = (respuesta.data as { message?: string | string[] } | undefined)?.message;
  const texto = Array.isArray(mensaje) ? mensaje.join('. ') : mensaje;

  return texto?.trim() ? texto : getErrorMessage(fallo, respaldo);
};

/** Aplana el árbol de carpetas para pintar selectores con sangría. */
export interface OpcionCarpeta {
  id: number;
  nombre: string;
  nivel: number;
}

export const aplanarArbol = (
  nodos: { id: number; nombre: string; hijos: OpcionCarpeta[] | unknown }[],
  nivel = 0,
): OpcionCarpeta[] => {
  const salida: OpcionCarpeta[] = [];

  for (const nodo of nodos) {
    salida.push({ id: nodo.id, nombre: nodo.nombre, nivel });
    const hijos = (nodo.hijos ?? []) as typeof nodos;
    salida.push(...aplanarArbol(hijos, nivel + 1));
  }

  return salida;
};
