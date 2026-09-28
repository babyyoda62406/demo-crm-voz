import * as fs from 'fs';
import * as path from 'path';
import { getEnvConfig } from '../../env/envs';

/**
 * Resolucion de rutas de ficheros del dominio contratos.
 *
 * Las plantillas viven en `back/assets/templates`. Como el proyecto se ejecuta
 * tanto desde `src/` (ts-node) como desde `dist/` (produccion), la carpeta se
 * busca por candidatos en vez de asumir un unico `__dirname`.
 */

const CANDIDATOS_ASSETS = [
  // dist/contracts/helpers -> back/assets   |   src/contracts/helpers -> back/assets
  path.resolve(__dirname, '..', '..', '..', 'assets'),
  // dist/contracts -> back/assets (por si cambia la profundidad de compilacion)
  path.resolve(__dirname, '..', '..', 'assets'),
  // proceso arrancado desde `back/`
  path.resolve(process.cwd(), 'assets'),
  path.resolve(process.cwd(), 'back', 'assets'),
];

let assetsDirCache: string | null = null;

/** Carpeta `assets` del backend. */
export function getAssetsDir(): string {
  if (assetsDirCache) return assetsDirCache;

  const encontrado = CANDIDATOS_ASSETS.find((candidato) =>
    fs.existsSync(path.join(candidato, 'templates')),
  );

  assetsDirCache = encontrado ?? CANDIDATOS_ASSETS[0];
  return assetsDirCache;
}

/** Carpeta con las plantillas .docx etiquetadas. */
export function getTemplatesDir(): string {
  return path.join(getAssetsDir(), 'templates');
}

/** Ruta absoluta de una plantilla concreta. */
export function getTemplatePath(archivo: string): string {
  return path.join(getTemplatesDir(), archivo);
}

/** Carpeta raiz de subidas configurada por entorno (`UPLOADS_DIR`). */
export function getUploadsDir(): string {
  const { UPLOADS_DIR } = getEnvConfig();
  return path.isAbsolute(UPLOADS_DIR)
    ? UPLOADS_DIR
    : path.resolve(process.cwd(), UPLOADS_DIR);
}

/** Carpeta donde se guardan los contratos generados. Se crea si no existe. */
export function getContractsDir(): string {
  const dir = path.join(getUploadsDir(), 'contracts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Convierte una ruta relativa guardada en BD en ruta absoluta del disco. */
export function resolveStoredPath(rutaRelativa: string): string {
  return path.isAbsolute(rutaRelativa)
    ? rutaRelativa
    : path.join(getUploadsDir(), rutaRelativa);
}

/** Ruta relativa (la que se guarda en BD) de un fichero de contratos. */
export function toStoredPath(nombreFichero: string): string {
  return path.posix.join('contracts', nombreFichero);
}
