# Semilla de demostración del Drive (módulo Documentos)

El módulo Documentos arrancaba vacío en producción: cero carpetas y cero
documentos. Esta carpeta contiene lo necesario para dejarlo con el contenido que
tendría de verdad el Drive de un despacho de personal shopper, sin escribir a
mano en la base de datos ni subir ficheros de relleno.

## Qué deja montado

| Carpeta | Documentos |
|---|---|
| *(raíz del Drive)* | Tarifas y honorarios 2026, checklist de documentación a pedir al cliente |
| Plantillas de contrato | Alquiler temporal, personal shopper (PSI), reserva y paga y señal |
| Dossieres de inversión | Altabria y Nortia, Maralta y la Marenza |
| Reformas | Parte de seguimiento de obras de agosto de 2026 |
| Documentación clientes | CT-2026-0001 y CT-2026-0003, ya firmados |

Los dos documentos de la raíz no son decorativos: la vista Documentos abre por la
raíz del Drive y solo lista lo que cuelga de ella, así que dejarla vacía daba una
primera pantalla con el cartel «Esta carpeta está vacía» aunque el árbol tuviera
contenido.

## De dónde sale cada binario

Ninguno se inventa:

- **Las tres plantillas `.docx`** son las mismas que usa el generador de
  contratos, en `back/assets/templates/`. Son las que abre el editor ONLYOFFICE
  en la demo.
- **Los dos contratos firmados** son los PDF que genera el propio CRM, copiados
  de `/app/uploads/contracts` del contenedor del backend.
- **Los cinco informes** (dossieres, reformas, tarifas y checklist) se componen
  con el Gotenberg del stack a partir de los `.html` de esta carpeta, que usan
  los datos reales de los inmuebles `INM-0001` a `INM-0010` del CRM.

## Uso

Desde el servidor donde corre el stack:

```bash
./seed-drive-demo.sh
```

Es **idempotente**: no borra nada y, si la carpeta o el documento ya existen con
ese nombre, los reutiliza y sigue. Se puede volver a lanzar sin duplicar.

Variables reconocidas (todas con un valor por defecto útil): `API_URL`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD` (si no se da, se lee del `.env` de `APP_DIR`),
`APP_DIR`, `BACK_CONTAINER`, `GOTENBERG_CONTAINER` y `GOTENBERG_URL`.

## Ficheros

- `seed-drive-demo.sh` — el script; crea las carpetas, compone los PDF y sube todo por la API.
- `_estilo.html` — hoja de estilo común de los informes. Se inyecta en el marcador de cada documento.
- `dossier-altabria-nortia.html`, `dossier-maralta-marenza.html` — dossieres de inversión por zona.
- `seguimiento-reformas.html` — parte quincenal de obra.
- `tarifas-honorarios.html`, `checklist-documentacion-cliente.html` — los dos documentos de la raíz.

## Dos avisos para quien toque esto

- **Los nombres visibles empiezan por lo que distingue a cada documento**, no por
  su categoría. La rejilla del Drive recorta el título a dos líneas: con el
  prefijo repetido («Plantilla — …»), todas las tarjetas de una carpeta se leían
  igual.
- **En los `.html` no puede aparecer el cierre de comentario de HTML dentro de un
  comentario.** `_estilo.html` acaba pegado en el cuerpo del documento y el
  navegador cierra el comentario en la primera secuencia de cierre que encuentra:
  el resto se cuela como texto visible en la esquina del PDF.
