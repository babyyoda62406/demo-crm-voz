import * as Joi from 'joi';

export const envsSchema = Joi.object({
  // Servidor
  PORT: Joi.number().default(3000),
  URL: Joi.string().default('http://localhost:3000'),
  FRONTEND_URL: Joi.string().default('http://localhost:5173'),

  // JWT
  JWTSECRET: Joi.string().required(),
  JWTEXPIREIN: Joi.string().default('24h'),

  // Administrador semilla
  ADMIN_PASSWORD: Joi.string().default('admin1234'),

  // Logs
  ERRORLOGS: Joi.boolean().default(false),
  WEBHOOK_URL: Joi.string().allow('').optional(),
  ENABLE_WEBHOOK_LOGS: Joi.boolean().default(false),

  // Base de datos
  DB_TYPE: Joi.string().default('postgres'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  // Almacenamiento de ficheros
  UPLOADS_DIR: Joi.string().default('./uploads'),

  // IA: DOS proveedores compatibles con OpenAI (`{BASE_URL}/chat/completions`).
  //
  // El asistente llama primero al PRIMARIO y, si no responde, repite la misma
  // peticion contra el RESPALDO. Son proveedores completos e independientes
  // -URL, clave y modelo propios-, no dos modelos del mismo sitio: asi una
  // caida entera del proveedor primario deja de tumbar el asistente.
  //
  // Se aceptan los nombres antiguos `NVIDIA_*` como alias del primario (ver
  // `getEnvConfig`), igual que se hace con `JWTSECRET`/`JWT_SECRET`, para que
  // un despliegue ya configurado siga arrancando sin tocar su `.env`.
  LLM_API_KEY: Joi.string().allow('').optional(),
  LLM_BASE_URL: Joi.string().default('https://integrate.api.nvidia.com/v1'),
  // Medido el 25/08/2026 contra el catalogo de NVIDIA: `gpt-oss-120b` resolvio
  // 36/36 ordenes con p50 de 2,0 s. El default anterior era
  // `meta/llama-3.3-70b-instruct`, que en el tier gratuito devolvia 429/503 en
  // 3 de cada 4 llamadas: un default inservible que solo se notaba en el
  // despliegue que olvidaba fijar la variable.
  LLM_MODEL: Joi.string().default('openai/gpt-oss-120b'),
  // Tiempo maximo de espera por intento CONTRA EL PRIMARIO.
  //
  // 8 s es deliberadamente corto. El primario de produccion (Cloudflare
  // Workers AI) responde en ~1 s, asi que 8 s son ocho veces su p50: si tarda
  // mas, no es que vaya lento, es que no va, y lo que salva la orden es saltar
  // ya al respaldo en vez de agotar una espera larga. Cada orden son DOS
  // llamadas al modelo (elegir herramienta + redactar), de modo que el peor
  // caso con failover en ambas ronda 2 x (8 + 0,8 + 15) = 47 s.
  LLM_TIMEOUT_MS: Joi.number().min(1000).default(8000),
  // Respaldo. Todas opcionales: sin ellas se usa el MISMO proveedor que el
  // primario con el modelo alternativo que fija el propio servicio, que es el
  // comportamiento que tenia el asistente antes de admitir dos proveedores.
  LLM_FALLBACK_API_KEY: Joi.string().allow('').optional(),
  LLM_FALLBACK_BASE_URL: Joi.string().allow('').optional(),
  LLM_FALLBACK_MODEL: Joi.string().allow('').optional(),
  // El respaldo puede permitirse mas espera: para cuando le toca, el primario
  // ya ha fallado y lo unico que queda es que esta llamada salga adelante.
  LLM_FALLBACK_TIMEOUT_MS: Joi.number().min(1000).optional(),

  // Transcripcion de voz (ElevenLabs)
  ELEVENLABS_API_KEY: Joi.string().allow('').optional(),

  // Edicion de documentos (ONLYOFFICE)
  //
  // Tres variables porque hay TRES puntos de vista distintos sobre el mismo
  // Document Server, y confundirlos es el fallo clasico de esta integracion:
  //
  // - ONLYOFFICE_URL: como lo ve el BACKEND. En produccion es el nombre del
  //   servicio en la red de compose (`http://onlyoffice`), que el navegador no
  //   resuelve. Solo se usa para llamadas servidor -> Document Server.
  // - ONLYOFFICE_PUBLIC_URL: como lo ve el NAVEGADOR. Es la que viaja al front
  //   en `scriptUrl`, asi que tiene que ser una URL alcanzable desde fuera de
  //   Docker. Si no se define, se cae a ONLYOFFICE_URL (en desarrollo ambas
  //   coinciden: http://localhost:8081).
  // - ONLYOFFICE_INTERNAL_API_URL: como ve el CONTENEDOR de ONLYOFFICE a la API
  //   del CRM. De ahi salen `document.url` y `callbackUrl`. Si no se define, se
  //   deriva de URL reescribiendo `localhost` a `host.docker.internal`.
  ONLYOFFICE_URL: Joi.string().allow('').default('http://localhost:8081'),
  ONLYOFFICE_PUBLIC_URL: Joi.string().allow('').optional(),
  ONLYOFFICE_INTERNAL_API_URL: Joi.string().allow('').optional(),
  ONLYOFFICE_JWT_SECRET: Joi.string().allow('').optional(),

  // Conversion a PDF (Gotenberg)
  GOTENBERG_URL: Joi.string().allow('').default('http://localhost:3001'),
});

export interface EnvConfig {
  PORT: number;
  URL: string;
  FRONTEND_URL: string;
  JWTSECRET: string;
  JWTEXPIREIN: string;
  ADMIN_PASSWORD: string;
  ERRORLOGS: boolean;
  WEBHOOK_URL?: string;
  ENABLE_WEBHOOK_LOGS: boolean;
  DB_TYPE: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SYNCHRONIZE: boolean;
  DB_LOGGING: boolean;
  UPLOADS_DIR: string;
  LLM_API_KEY?: string;
  LLM_BASE_URL: string;
  LLM_MODEL: string;
  LLM_TIMEOUT_MS: number;
  LLM_FALLBACK_API_KEY?: string;
  LLM_FALLBACK_BASE_URL?: string;
  LLM_FALLBACK_MODEL?: string;
  LLM_FALLBACK_TIMEOUT_MS?: number;
  ELEVENLABS_API_KEY?: string;
  ONLYOFFICE_URL: string;
  ONLYOFFICE_PUBLIC_URL?: string;
  ONLYOFFICE_INTERNAL_API_URL?: string;
  ONLYOFFICE_JWT_SECRET?: string;
  GOTENBERG_URL: string;
}

export const getEnvConfig = (): EnvConfig => {
  const { error, value } = envsSchema.validate({
    PORT: process.env.PORT,
    URL: process.env.URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    // Se aceptan las dos convenciones de nombre a proposito: `back/.env` usa
    // `JWTSECRET`/`JWTEXPIREIN` (nombres heredados) mientras que
    // `docker-compose.prod.yml` inyecta `JWT_SECRET`/`JWT_EXPIRES_IN` desde el
    // `.env` de la raiz del monorepo. Sin este alias el contenedor de
    // produccion abortaba el arranque con `"JWTSECRET" is required`.
    JWTSECRET: process.env.JWTSECRET ?? process.env.JWT_SECRET,
    JWTEXPIREIN: process.env.JWTEXPIREIN ?? process.env.JWT_EXPIRES_IN,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ERRORLOGS: process.env.ERRORLOGS,
    WEBHOOK_URL: process.env.WEBHOOK_URL,
    ENABLE_WEBHOOK_LOGS: process.env.ENABLE_WEBHOOK_LOGS,
    DB_TYPE: process.env.DB_TYPE,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USERNAME: process.env.DB_USERNAME,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_DATABASE: process.env.DB_DATABASE,
    DB_SYNCHRONIZE: process.env.DB_SYNCHRONIZE,
    DB_LOGGING: process.env.DB_LOGGING,
    UPLOADS_DIR: process.env.UPLOADS_DIR,
    // Los `NVIDIA_*` son los nombres antiguos, de cuando el asistente solo
    // hablaba con NVIDIA. Se siguen aceptando como alias del proveedor
    // primario para no romper los `.env` ya desplegados.
    // Se usa `||` y no `??` porque aqui una cadena vacia significa «sin
    // definir»: es como llega una variable que `docker-compose` interpola sin
    // valor, y debe caer al alias antiguo o al default del esquema.
    LLM_API_KEY: process.env.LLM_API_KEY || process.env.NVIDIA_API_KEY,
    LLM_BASE_URL:
      process.env.LLM_BASE_URL || process.env.NVIDIA_BASE_URL || undefined,
    LLM_MODEL: process.env.LLM_MODEL || process.env.NVIDIA_MODEL || undefined,
    LLM_TIMEOUT_MS:
      process.env.LLM_TIMEOUT_MS ||
      process.env.NVIDIA_TIMEOUT_MS ||
      undefined,
    // `|| undefined` a proposito: `docker-compose` inyecta las variables no
    // definidas como cadena VACIA, no como ausentes. Sin esta normalizacion,
    // `LLM_FALLBACK_TIMEOUT_MS=""` llega a un `Joi.number()` y tumba el
    // arranque del contenedor con «must be a number» por una variable que el
    // despliegue simplemente no usa.
    LLM_FALLBACK_API_KEY: process.env.LLM_FALLBACK_API_KEY || undefined,
    LLM_FALLBACK_BASE_URL: process.env.LLM_FALLBACK_BASE_URL || undefined,
    LLM_FALLBACK_MODEL: process.env.LLM_FALLBACK_MODEL || undefined,
    LLM_FALLBACK_TIMEOUT_MS:
      process.env.LLM_FALLBACK_TIMEOUT_MS || undefined,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ONLYOFFICE_URL: process.env.ONLYOFFICE_URL,
    ONLYOFFICE_PUBLIC_URL: process.env.ONLYOFFICE_PUBLIC_URL,
    ONLYOFFICE_INTERNAL_API_URL: process.env.ONLYOFFICE_INTERNAL_API_URL,
    ONLYOFFICE_JWT_SECRET: process.env.ONLYOFFICE_JWT_SECRET,
    GOTENBERG_URL: process.env.GOTENBERG_URL,
  });

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

  return value as EnvConfig;
};
