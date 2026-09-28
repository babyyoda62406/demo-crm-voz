#!/usr/bin/env bash
#
# Semilla de demostracion del modulo Documentos (el Drive propio de CRMIA).
#
# Deja el Drive con la estructura de carpetas y los documentos que un despacho
# de personal shopper tendria de verdad: sus plantillas de contrato en Word,
# los dossieres de inversion que entrega a los inversores, el parte de
# seguimiento de reformas y los contratos ya firmados de sus clientes.
#
# QUE NO HACE ESTE SCRIPT
#   - No toca la base de datos: todo entra por la API publica del CRM.
#   - No borra nada. Es idempotente: si la carpeta o el documento ya existen
#     con ese nombre, los reutiliza y sigue.
#   - No inventa binarios. Las plantillas .docx son las mismas que usa el
#     generador de contratos; los contratos son los PDF que ya
#     genero el propio CRM; y los tres informes se componen con el Gotenberg
#     del stack a partir del HTML que acompana a este script.
#
# USO (desde el servidor donde corre el stack):
#
#   ./seed-drive-demo.sh
#
# Variables de entorno reconocidas (todas con valor por defecto util):
#
#   API_URL         Base de la API.            Por defecto http://localhost:3000/api
#   ADMIN_EMAIL     Usuario con permiso ADD_DOCUMENT.  Por defecto admin@crmia.local
#   ADMIN_PASSWORD  Su contrasena. Si no se da, se lee del .env de APP_DIR.
#   APP_DIR         Raiz del despliegue con el .env y los assets. Por defecto ~/apps/crmia
#   BACK_CONTAINER  Contenedor del backend, de donde salen los PDF de contratos.
#   GOTENBERG_URL   Gotenberg. Si no se da, se resuelve por `docker inspect`.
#
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@crmia.local}"
APP_DIR="${APP_DIR:-$HOME/apps/crmia}"
BACK_CONTAINER="${BACK_CONTAINER:-crmia_back}"
GOTENBERG_CONTAINER="${GOTENBERG_CONTAINER:-crmia_gotenberg_prod}"

GUION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRABAJO="$(mktemp -d)"
trap 'rm -rf "$TRABAJO"' EXIT

MIME_DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document'

# La traza va a stderr a proposito: `carpeta()` devuelve el id de la carpeta por
# stdout y se captura con `$(...)`. Si los mensajes salieran por stdout se
# colarian dentro del id.
log()   { printf '  %s\n' "$*" >&2; }
paso()  { printf '\n== %s\n' "$*" >&2; }
morir() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Lee una ruta del JSON de respuesta. `jq` no esta garantizado en el servidor,
# asi que se tira de python3, que si viene con la imagen base.
json() {
  python3 -c '
import json, sys
dato = json.load(sys.stdin)
for tramo in sys.argv[1:]:
    if dato is None:
        break
    dato = dato[int(tramo)] if isinstance(dato, list) else dato.get(tramo)
print("" if dato is None else dato)
' "$@"
}

# ---------------------------------------------------------------------------
# 1. Sesion
# ---------------------------------------------------------------------------
paso "Autenticacion contra $API_URL"

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  [ -f "$APP_DIR/.env" ] || morir "no encuentro $APP_DIR/.env y no me has dado ADMIN_PASSWORD"
  ADMIN_PASSWORD="$(grep -E '^ADMIN_PASSWORD=' "$APP_DIR/.env" | cut -d= -f2-)"
fi
[ -n "$ADMIN_PASSWORD" ] || morir "ADMIN_PASSWORD vacio"

CUERPO_LOGIN="$(python3 -c 'import json,sys; print(json.dumps({"email":sys.argv[1],"password":sys.argv[2]}))' \
  "$ADMIN_EMAIL" "$ADMIN_PASSWORD")"

TOKEN="$(curl -sS -X POST "$API_URL/auth/login" \
  -H 'Content-Type: application/json' --data-raw "$CUERPO_LOGIN" | json token)"

[ -n "$TOKEN" ] || morir "login rechazado para $ADMIN_EMAIL"
log "sesion abierta como $ADMIN_EMAIL"

api() { curl -sS -H "token: $TOKEN" "$@"; }

# ---------------------------------------------------------------------------
# 2. Carpetas de primer nivel
# ---------------------------------------------------------------------------
paso "Carpetas del Drive"

# Devuelve el id de una carpeta raiz con ese nombre; la crea si no existe.
carpeta() {
  local nombre="$1" existente
  existente="$(api "$API_URL/documents/folders?size=100" |
    python3 -c '
import json, sys
objetivo = sys.argv[1]
carpetas = json.load(sys.stdin)["data"]["data"]
print(next((str(c["id"]) for c in carpetas
            if c["nombre"] == objetivo and not c.get("parentId")), ""))
' "$nombre")"

  if [ -n "$existente" ]; then
    log "ya existia  «$nombre» (id $existente)"
    printf '%s' "$existente"
    return
  fi

  local id
  id="$(api -X POST "$API_URL/documents/folders" -H 'Content-Type: application/json' \
    --data-raw "$(python3 -c 'import json,sys; print(json.dumps({"nombre":sys.argv[1]}))' "$nombre")" |
    json data id)"
  [ -n "$id" ] || morir "no se pudo crear la carpeta «$nombre»"
  log "creada      «$nombre» (id $id)"
  printf '%s' "$id"
}

ID_PLANTILLAS="$(carpeta 'Plantillas de contrato')"
ID_DOSSIERES="$(carpeta 'Dossieres de inversión')"
ID_REFORMAS="$(carpeta 'Reformas')"
ID_CLIENTES="$(carpeta 'Documentación clientes')"

# ---------------------------------------------------------------------------
# 3. Binarios de origen
# ---------------------------------------------------------------------------
paso "Reuniendo los binarios de origen"

PLANTILLAS="$APP_DIR/back/assets/templates"
[ -d "$PLANTILLAS" ] || morir "no encuentro las plantillas en $PLANTILLAS"

# 3.a Las mismas plantillas .docx que usa el generador de contratos, con nombre
#     de fichero en ASCII (el nombre bonito viaja aparte, en el campo `nombre`
#     de la subida).
cp "$PLANTILLAS/alquiler-temporal.docx" "$TRABAJO/plantilla-alquiler-temporal.docx"
cp "$PLANTILLAS/psi.docx"               "$TRABAJO/plantilla-psi.docx"
cp "$PLANTILLAS/reserva.docx"           "$TRABAJO/plantilla-reserva.docx"
log "3 plantillas .docx copiadas de $PLANTILLAS"

# 3.b PDF de contratos que ya genero el propio CRM.
for referencia in CT-2026-0001 CT-2026-0003; do
  docker cp "$BACK_CONTAINER:/app/uploads/contracts/$referencia.pdf" "$TRABAJO/$referencia.pdf" >/dev/null ||
    morir "no se pudo extraer $referencia.pdf de $BACK_CONTAINER"
done
log "2 PDF de contratos extraidos de $BACK_CONTAINER"

# 3.c Informes propios: HTML -> PDF con el Gotenberg del stack.
if [ -z "${GOTENBERG_URL:-}" ]; then
  ip_gotenberg="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' \
    "$GOTENBERG_CONTAINER" 2>/dev/null || true)"
  [ -n "$ip_gotenberg" ] || morir "no localizo el contenedor $GOTENBERG_CONTAINER; pasa GOTENBERG_URL"
  GOTENBERG_URL="http://$ip_gotenberg:3000"
fi

# Compone el HTML (estilo + cuerpo) y lo manda a Chromium.
a_pdf() {
  local fuente="$GUION_DIR/$1.html" salida="$TRABAJO/$1.pdf"
  [ -f "$fuente" ] || morir "falta el HTML de origen $fuente"

  # `_estilo.html` se inyecta en el marcador para no repetir el CSS en cada
  # documento. Gotenberg renderiza sin red: todo tiene que ir en linea.
  python3 - "$GUION_DIR/_estilo.html" "$fuente" > "$TRABAJO/index.html" <<'PY'
import sys
estilo = open(sys.argv[1], encoding='utf-8').read()
cuerpo = open(sys.argv[2], encoding='utf-8').read()
print('<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body>')
print(cuerpo.replace('<!--ESTILO-->', estilo))
print('</body></html>')
PY

  curl -sS --fail -o "$salida" \
    -F "files=@$TRABAJO/index.html" \
    -F 'printBackground=true' \
    -F 'preferCssPageSize=true' \
    "$GOTENBERG_URL/forms/chromium/convert/html" ||
    morir "Gotenberg no pudo convertir $1.html"

  [ -s "$salida" ] || morir "Gotenberg devolvio un PDF vacio para $1"
  log "generado    $1.pdf ($(stat -c%s "$salida") bytes)"
}

a_pdf dossier-altabria-nortia
a_pdf dossier-maralta-marenza
a_pdf seguimiento-reformas
a_pdf tarifas-honorarios
a_pdf checklist-documentacion-cliente

# ---------------------------------------------------------------------------
# 4. Subida
# ---------------------------------------------------------------------------
paso "Subiendo documentos"

# subir <carpetaId|RAIZ> <fichero> <mime> <nombre visible>
#
# `RAIZ` sube el documento sin carpeta: la vista Documentos abre por la raiz del
# Drive y solo lista lo que cuelga de ella, asi que dejarla vacia da una primera
# pantalla en blanco aunque el arbol tenga contenido.
subir() {
  local carpeta_id="$1" fichero="$2" mime="$3" nombre="$4" existente consulta

  if [ "$carpeta_id" = 'RAIZ' ]; then
    consulta="$API_URL/documents?soloRaiz=true&size=100"
  else
    consulta="$API_URL/documents?folderId=$carpeta_id&size=100"
  fi

  existente="$(api "$consulta" |
    python3 -c '
import json, sys
objetivo = sys.argv[1]
ficheros = json.load(sys.stdin)["data"]["data"]
print(next((str(f["id"]) for f in ficheros if f["nombre"] == objetivo), ""))
' "$nombre")"

  if [ -n "$existente" ]; then
    log "ya existia  «$nombre» (id $existente)"
    return
  fi

  local id
  if [ "$carpeta_id" = 'RAIZ' ]; then
    id="$(api -X POST "$API_URL/documents/upload" \
      -F "file=@$fichero;type=$mime" \
      -F "nombre=$nombre" | json data id)"
  else
    id="$(api -X POST "$API_URL/documents/upload" \
      -F "file=@$fichero;type=$mime" \
      -F "folderId=$carpeta_id" \
      -F "nombre=$nombre" | json data id)"
  fi
  [ -n "$id" ] || morir "fallo al subir «$nombre»"
  log "subido      «$nombre» (id $id)"
}

subir RAIZ "$TRABAJO/tarifas-honorarios.pdf" 'application/pdf' \
  'Tarifas y honorarios — Vantia 2026.pdf'
subir RAIZ "$TRABAJO/checklist-documentacion-cliente.pdf" 'application/pdf' \
  'Checklist — Documentación a pedir al cliente.pdf'

# Los nombres empiezan por lo que distingue a cada documento, no por la
# categoria: la rejilla del Drive recorta el titulo a dos lineas y con el prefijo
# repetido («Plantilla — …», «Dossier inversión — …») todas las tarjetas de una
# misma carpeta se leian iguales.
subir "$ID_PLANTILLAS" "$TRABAJO/plantilla-alquiler-temporal.docx" "$MIME_DOCX" \
  'Alquiler temporal — plantilla de contrato.docx'
subir "$ID_PLANTILLAS" "$TRABAJO/plantilla-psi.docx" "$MIME_DOCX" \
  'Personal shopper (PSI) — plantilla de contrato.docx'
subir "$ID_PLANTILLAS" "$TRABAJO/plantilla-reserva.docx" "$MIME_DOCX" \
  'Reserva y paga y señal — plantilla de documento.docx'

subir "$ID_DOSSIERES" "$TRABAJO/dossier-altabria-nortia.pdf" 'application/pdf' \
  'Altabria y Nortia — dossier de inversión.pdf'
subir "$ID_DOSSIERES" "$TRABAJO/dossier-maralta-marenza.pdf" 'application/pdf' \
  'Maralta y la Marenza — dossier de inversión.pdf'

subir "$ID_REFORMAS" "$TRABAJO/seguimiento-reformas.pdf" 'application/pdf' \
  'Seguimiento de reformas — agosto 2026.pdf'

subir "$ID_CLIENTES" "$TRABAJO/CT-2026-0001.pdf" 'application/pdf' \
  'CT-2026-0001 — Alquiler temporal Orión Norte (firmado).pdf'
subir "$ID_CLIENTES" "$TRABAJO/CT-2026-0003.pdf" 'application/pdf' \
  'CT-2026-0003 — Encargo personal shopper N. Duarte (firmado).pdf'

# ---------------------------------------------------------------------------
# 5. Resumen
# ---------------------------------------------------------------------------
paso "Estado final del Drive"
# Sin f-strings: hasta Python 3.12 no se admiten comillas escapadas dentro de
# la expresion, y este bloque viaja entre comillas simples del shell.
api "$API_URL/documents/folders/tree" | python3 -c '
import json, sys
for carpeta in json.load(sys.stdin)["data"]:
    print("  %-26s id %-4s %d documento(s)"
          % (carpeta["nombre"], carpeta["id"], carpeta.get("totalFicheros", 0)))
'
api "$API_URL/documents?size=100" | python3 -c '
import json, sys
datos = json.load(sys.stdin)["data"]
print("  %d documentos en total" % datos["metadata"]["records"])
'
