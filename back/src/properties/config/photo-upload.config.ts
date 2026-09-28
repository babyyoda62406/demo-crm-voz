import { existsSync, mkdirSync } from 'fs';
import { extname, join, resolve } from 'path';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/** Carpeta física donde se guardan las fotos: `<UPLOADS_DIR>/properties`. */
export const PROPERTY_PHOTOS_DIR = resolve(
  process.cwd(),
  process.env.UPLOADS_DIR || './uploads',
  'properties',
);

/** Prefijo de la URL relativa con la que se sirven las fotos. */
export const PROPERTY_PHOTOS_URL_PREFIX = '/api/properties/photos';

/** Extensiones de imagen admitidas. */
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

/** Tamaño máximo por fichero (8 MB) y número máximo de fotos por subida. */
export const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 12;

/** Crea la carpeta de fotos si todavía no existe. */
export const ensurePhotosDir = (): void => {
  if (!existsSync(PROPERTY_PHOTOS_DIR)) {
    mkdirSync(PROPERTY_PHOTOS_DIR, { recursive: true });
  }
};

/**
 * Nombre de fichero único y sin caracteres conflictivos, con el mismo patrón
 * que usa el resto de proyectos del autor: `<timestamp>-<aleatorio><extension>`.
 */
const buildFileName = (originalName: string): string => {
  const extension = extname(originalName).toLowerCase();
  const random = Math.random().toString(36).slice(2, 8);
  return `${Date.now()}-${random}${extension}`;
};

/** Opciones de multer para las fotos de inmuebles (almacenamiento en disco). */
export const propertyPhotosMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      ensurePhotosDir();
      callback(null, PROPERTY_PHOTOS_DIR);
    },
    filename: (_req, file, callback) => {
      callback(null, buildFileName(file.originalname));
    },
  }),
  limits: {
    fileSize: MAX_PHOTO_SIZE_BYTES,
    files: MAX_PHOTOS_PER_UPLOAD,
  },
  fileFilter: (_req, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      callback(
        new BadRequestException(
          `Formato de imagen no admitido (${extension || 'sin extensión'}). Admitidos: ${ALLOWED_EXTENSIONS.join(', ')}`,
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
};

/** Nombre de fichero seguro: sin rutas ni saltos de directorio. */
export const isSafePhotoFileName = (fileName: string): boolean =>
  /^[A-Za-z0-9._-]+$/.test(fileName) && !fileName.includes('..');

/** Ruta física de una foto a partir de su nombre de fichero. */
export const resolvePhotoPath = (fileName: string): string =>
  join(PROPERTY_PHOTOS_DIR, fileName);

/** URL relativa pública de una foto ya subida. */
export const buildPhotoUrl = (fileName: string): string =>
  `${PROPERTY_PHOTOS_URL_PREFIX}/${fileName}`;
