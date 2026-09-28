import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Carga las variables de entorno del backend.
 *
 * El monorepo tiene DOS ficheros `.env` y los dos hacen falta:
 *
 * 1. `back/.env`   → configuracion propia del backend (puerto, base de datos,
 *                    `JWTSECRET`, `ADMIN_PASSWORD`...). Es el que lee `dotenv`
 *                    por defecto porque los scripts de npm se ejecutan con el
 *                    directorio de trabajo en `back/`.
 * 2. `<raiz>/.env` → referencia unica del monorepo, tal y como declara
 *                    `.env.template`. Aporta los secretos compartidos con el
 *                    resto de servicios (claves de NVIDIA y ElevenLabs, secreto
 *                    de ONLYOFFICE) y es el fichero que `docker-compose`
 *                    interpola.
 *
 * Sin este puente el backend arrancaba con `NVIDIA_API_KEY` vacia -aunque la
 * clave real estuviera en el `.env` de la raiz- y el asistente respondia
 * `iaConfigurada: false`.
 *
 * PRIORIDAD: gana siempre `back/.env`. La raiz solo rellena las variables que
 * falten o que esten definidas como cadena vacia, asi que un valor real del
 * backend nunca queda pisado. En produccion las variables llegan ya inyectadas
 * en el entorno del contenedor y este segundo paso simplemente no encuentra
 * fichero que leer.
 */
export const loadEnv = (): void => {
  // 1. Fichero propio del backend (prioridad maxima).
  dotenv.config();

  // 2. Fichero de la raiz del monorepo, como respaldo.
  const rutaRaiz = resolverEnvRaiz();
  if (!rutaRaiz) return;

  let compartidas: Record<string, string>;
  try {
    compartidas = dotenv.parse(fs.readFileSync(rutaRaiz));
  } catch {
    // Un `.env` de raiz ilegible no debe impedir el arranque: el backend puede
    // funcionar solo con su propio fichero.
    return;
  }

  for (const [clave, valor] of Object.entries(compartidas)) {
    if (valor === '') continue;

    const actual = process.env[clave];
    if (actual === undefined || actual === '') {
      process.env[clave] = valor;
    }
  }
};

/**
 * Localiza el `.env` de la raiz del monorepo.
 *
 * Se prueban dos rutas porque el proceso arranca de formas distintas:
 * desde `back/` con los scripts de npm y desde `back/dist/` con `start:prod`.
 */
const resolverEnvRaiz = (): string | null => {
  const candidatas = [
    // Ejecucion normal: el directorio de trabajo es `back/`.
    path.resolve(process.cwd(), '..', '.env'),
    // Respaldo por ubicacion del propio fichero (`src/env` o `dist/env`).
    path.resolve(__dirname, '..', '..', '..', '.env'),
  ];

  return candidatas.find((ruta) => fs.existsSync(ruta)) ?? null;
};
