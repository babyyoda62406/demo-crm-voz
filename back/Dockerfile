# Imagen de produccion del backend de CRMIA (NestJS 10 + TypeORM + PostgreSQL).
# Multistage: se compila con las devDependencies y se ejecuta con un runtime
# minimo que solo contiene dist/ y las dependencias de produccion.
#
# Contexto de build: ./back  (ver docker-compose.prod.yml)

# ---------------------------------------------------------------------------
# 1. Build: instala TODAS las dependencias y compila TypeScript -> dist/
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Toolchain necesario para modulos nativos (bcrypt, pg-native...)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# 2. Dependencias de produccion (arbol node_modules limpio, sin devDeps)
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi \
    && npm cache clean --force

# ---------------------------------------------------------------------------
# 3. Runtime
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# tini: PID 1 correcto (senales y zombies). curl: healthcheck.
RUN apk add --no-cache tini curl

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Plantillas .docx de los contratos. `nest build` solo compila TypeScript, asi
# que `assets/` no llega a `dist/` y hay que copiarla aparte. Va en /app/assets
# porque es donde la busca `getAssetsDir()` desde `dist/contracts/helpers`.
# Sin esto, las plantillas se registran como inactivas y generar un contrato
# devuelve 404 ("No se encuentra el fichero de la plantilla").
COPY --from=builder /app/assets ./assets

# Directorio de ficheros subidos (se monta como volumen en compose)
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl --silent --fail http://localhost:3000/api/docs || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
