import { diskStorage } from 'multer';
import { extname, isAbsolute, join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getEnvConfig } from '../../env/envs';

/** Subcarpeta del almacen reservada al Drive de documentos. */
export const SUBCARPETA_DOCS = 'docs';

/** Raiz absoluta del almacen (`UPLOADS_DIR` del entorno). */
export const getUploadsRoot = (): string => {
  const { UPLOADS_DIR } = getEnvConfig();
  return isAbsolute(UPLOADS_DIR)
    ? UPLOADS_DIR
    : resolve(process.cwd(), UPLOADS_DIR);
};

/** Directorio absoluto donde se guardan los binarios del Drive. */
export const getDocsDir = (): string => join(getUploadsRoot(), SUBCARPETA_DOCS);

/** Crea el directorio del Drive si aun no existe y devuelve su ruta. */
export const ensureDocsDir = (): string => {
  const dir = getDocsDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
};

/** Convierte la ruta relativa guardada en base de datos en ruta absoluta. */
export const toAbsolutePath = (rutaRelativa: string): string =>
  join(getUploadsRoot(), rutaRelativa);

/** Nombre unico de almacenamiento: no colisiona ni revela el nombre original. */
export const generarNombreAlmacenado = (nombreOriginal: string): string => {
  const ext = extname(nombreOriginal || '').toLowerCase();
  const aleatorio = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${aleatorio}${ext}`;
};

/**
 * Almacenamiento en disco para `FileInterceptor`.
 * Se escribe directamente en `UPLOADS_DIR/docs` para no cargar en memoria
 * ficheros grandes (planos, dosieres escaneados).
 */
export const documentsDiskStorage = diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ensureDocsDir());
  },
  filename: (_req, file, cb) => {
    cb(null, generarNombreAlmacenado(file.originalname));
  },
});

/** Tamano maximo aceptado en la subida: 100 MB. */
export const LIMITE_TAMANO_SUBIDA = 100 * 1024 * 1024;
