# Plantillas de contrato — mapa de campos

Documentación de las plantillas `.docx` del dominio **contratos** de CRMIA.

## Cómo está organizada esta carpeta

```
assets/templates/
├── herramientas/
│   ├── etiquetar-plantillas.js     Script que convierte los .docx de partida → etiquetados
│   └── salida/                     Texto extraído de cada plantilla etiquetada (revisión)
├── alquiler-temporal.docx          ← plantillas ETIQUETADAS que consume el backend
├── anexo-inquilino.docx
├── prorroga.docx
├── psi.docx
├── reserva.docx
└── campos.md                       este documento
```

## Cómo se generaron las plantillas etiquetadas

Los documentos de partida —los borradores de contrato del despacho, redactados
en Word— marcaban los huecos con puntos suspensivos (`……`), guiones bajos
(`____`) o rayas (`-----`). Un `.docx` es un zip cuyo texto vive en
`word/document.xml`, y Word parte una misma frase en varios `<w:r><w:t>` (runs),
de modo que un hueco puede estar repartido entre tres runs: un `search & replace`
sobre el XML no funciona.

`herramientas/etiquetar-plantillas.js` reconstruye el texto de cada párrafo,
aplica las reglas sobre texto plano y **redistribuye el resultado entre los runs
originales**, por lo que el formato del documento (tipografía, negritas,
márgenes, tabulaciones) queda intacto.

Para regenerar las plantillas etiquetadas desde `back/`:

```bash
node assets/templates/herramientas/etiquetar-plantillas.js
```

> En esta versión pública **no se publican los `.docx` de partida** (eran
> documentos del cliente). El script se conserva porque documenta cómo se
> resolvió el problema de los runs, pero necesita una carpeta `originales/`
> propia para volver a ejecutarse. Las plantillas etiquetadas que consume el
> backend sí están en el repositorio y no dependen de él.

## Convenciones de los marcadores

- Sintaxis **docxtemplater**: `{campo}`.
- Los bucles usan `{#campo}` … `{/campo}` con las etiquetas **solas en su
  párrafo**; el servicio instancia docxtemplater con `paragraphLoop: true`, de
  modo que se repite el bloque de párrafos completo y las líneas de las
  etiquetas desaparecen.
- Un marcador sin valor se renderiza vacío (`nullGetter`), nunca como
  `undefined`.
- Los campos `…Letras` se rellenan solos a partir de su cifra si se dejan vacíos
  (`helpers/number-to-words.helper.ts`).
- El catálogo formal (etiqueta, tipo, obligatoriedad, grupo) vive en
  `src/contracts/seed/contract-templates.seed.ts` y se siembra en la tabla
  `contract_templates`. **Este documento y esa semilla deben ir a la par.**

## Datos que quedan FIJOS en las plantillas

No son marcadores: son datos de la agencia y se dejan escritos en el documento.

| Dato | Aparece en |
|---|---|
| `Vantia Patrimonio S.L` — CIF `B00000000` | `psi.docx`, `reserva.docx` |
| Domicilio `Calle Mayor 1, 1.º, 00110 Altabria (Nortia)` | `psi.docx` |
| IBAN de la agencia `ES00 0000 0000 0000 0000 0000` | `psi.docx`, `reserva.docx` |
| Firmante `Vantia Patrimonio, S.L.` | `psi.docx` |

> **Limpieza del PSI**: el documento de partida traía datos de una operación
> concreta (ubicaciones de búsqueda, rango de precio e importes de honorarios).
> Se han sustituido por los marcadores `{ubicacionesBusqueda}`, `{rangoPrecio}`,
> `{honorariosTotales}`, `{honorariosPrimerPago}` y `{honorariosSegundoPago}`.

---

## 1. `alquiler-temporal.docx` — Contrato de alquiler de temporada

**Clave:** `alquiler-temporal` · **Categoría:** Alquiler temporal · **Admite prórroga:** sí (`prorroga`)

Origen: `MODELO CONTRATO ALQUILER TEMPORAL.docx`. Es la plantilla principal del
negocio (alquiler temporal a empresas para alojar a sus trabajadores).

### Fecha del documento

| Campo | Tipo | Oblig. | Dónde aparece |
|---|---|:--:|---|
| `diaContrato` | texto | ✔ | Encabezado «En Altabria, a … de … de …» |
| `mesContrato` | texto | ✔ | Encabezado |
| `anioContrato` | texto | ✔ | Encabezado |

### Arrendatario (la empresa)

| Campo | Tipo | Oblig. | Dónde aparece |
|---|---|:--:|---|
| `arrendatarioRazonSocial` | texto | ✔ | REUNIDOS y EXPONEN·segundo |
| `arrendatarioCif` | documento | ✔ | REUNIDOS |
| `arrendatarioDomicilio` | texto | ✔ | REUNIDOS |
| `arrendatarioAdministrador` | texto | ✔ | REUNIDOS (quien firma) |
| `arrendatarioAdministradorDni` | documento | ✔ | REUNIDOS |
| `arrendatarioAdministradorDomicilio` | texto | | REUNIDOS |
| `arrendatarioEmail` | email | | Estipulación 6.ª · comunicaciones |
| `arrendatarioDomicilioNotificaciones` | texto | | Estipulación 13.ª · notificaciones |

### Arrendador (la propiedad)

| Campo | Tipo | Oblig. | Dónde aparece |
|---|---|:--:|---|
| `arrendadorNombre` | texto | ✔ | REUNIDOS y EXPONEN·primero |
| `arrendadorDni` | documento | ✔ | REUNIDOS |
| `arrendadorDomicilio` | texto | ✔ | REUNIDOS |
| `arrendadorEmail` | email | | Estipulación 6.ª · comunicaciones |

### Inmueble y temporada

| Campo | Tipo | Oblig. | Dónde aparece |
|---|---|:--:|---|
| `direccionInmueble` | texto | ✔ | EXPONEN·primero |
| `temporada` | texto | | EXPONEN·segundo |
| `duracionContrato` | texto | | Estipulación 1.ª |
| `inicioDia` / `inicioMes` / `inicioAnio` | texto | ✔ | Estipulación 1.ª · inicio |
| `finDia` / `finMes` / `finAnio` | texto | ✔ | Estipulación 1.ª · fin |

### Condiciones económicas

| Campo | Tipo | Oblig. | Dónde aparece |
|---|---|:--:|---|
| `precioMensualCifra` | moneda | ✔ | Estipulación 2.ª · «(1.200€) mensuales» |
| `precioMensualLetras` | texto | | Estipulación 2.ª — derivado de `precioMensualCifra` |
| `diaPago` | texto | | Estipulación 2.ª · «antes del día …» |
| `iban` | iban | | Estipulación 2.ª · cuenta de la arrendadora |
| `fianzaCifra` | moneda | ✔ | Estipulación 12.ª · fianza legal (art. 36.1 LAU) |
| `fianzaLetras` | texto | | Estipulación 12.ª — derivado de `fianzaCifra` |

### Protección de datos

| Campo | Tipo | Oblig. | Dónde aparece |
|---|---|:--:|---|
| `responsableDatos` | texto | | Estipulación 14.ª (por defecto `Vantia Patrimonio S.L.`) |

### Ocupantes — **bucle**

```
{#ocupantes}
Nombre: {nombre}  DNI: {dni} y domicilio: {domicilio}
{/ocupantes}
```

| Subcampo | Tipo |
|---|---|
| `nombre` | texto |
| `dni` | documento |
| `domicilio` | texto |

La cláusula cuarta fija un **máximo de 4 ocupantes** (prohibición de
sobreocupación); el formulario lo advierte.

---

## 2. `prorroga.docx` — Prórroga de alquiler de temporada

**Clave:** `prorroga` · **Categoría:** Alquiler temporal

Origen: `MODELO DE PRORROGA.docx`. Se genera desde un contrato de alquiler ya
existente (`POST /api/contracts/:id/prorroga`), que precarga automáticamente
todos los campos con el mismo nombre más `fechaContratoOriginal` y
`fechaFinOriginal`, derivadas de las fechas del contrato de origen.

| Campo | Tipo | Oblig. | Dónde aparece |
|---|---|:--:|---|
| `diaContrato` / `mesContrato` / `anioContrato` | texto | ✔ | Encabezado |
| `arrendatarioRazonSocial` | texto | ✔ | REUNIDOS |
| `arrendatarioCif` | documento | ✔ | REUNIDOS |
| `arrendatarioDomicilio` | texto | ✔ | REUNIDOS |
| `arrendatarioAdministrador` | texto | ✔ | REUNIDOS |
| `arrendatarioAdministradorDni` | documento | ✔ | REUNIDOS |
| `arrendatarioAdministradorDomicilio` | texto | | REUNIDOS (sustituye al «C/ …» del original) |
| `arrendadorNombre` | texto | ✔ | REUNIDOS |
| `arrendadorDni` | documento | ✔ | REUNIDOS |
| `arrendadorDomicilio` | texto | ✔ | REUNIDOS |
| `fechaContratoOriginal` | fecha | ✔ | MANIFIESTAN·primero |
| `direccionInmueble` | texto | ✔ | MANIFIESTAN·primero |
| `fechaFinOriginal` | fecha | ✔ | MANIFIESTAN·segundo y Estipulación 1.ª |
| `duracionProrroga` | texto | ✔ | Estipulación 1.ª |
| `fechaFinProrroga` | fecha | ✔ | Estipulación 1.ª |

---

## 3. `anexo-inquilino.docx` — Anexo de incorporación de nuevo inquilino

**Clave:** `anexo-inquilino` · **Categoría:** Alquiler temporal

Origen: `ANEXO INCORPORACION NUEVO INQUILINO EN CONTRATO ALQUILER TEMPORAL.docx`.

| Campo | Tipo | Oblig. | Dónde aparece |
|---|---|:--:|---|
| `diaContrato` / `mesContrato` / `anioContrato` | texto | ✔ | Encabezado |
| `arrendadorNombre` | texto | ✔ | REUNIDOS · arrendador |
| `arrendadorDni` | documento | ✔ | REUNIDOS · arrendador |
| `arrendadorDomicilio` | texto | ✔ | REUNIDOS · arrendador |
| `inquilino1Nombre` / `inquilino1Dni` | texto / documento | | REUNIDOS · inquilinos actuales |
| `inquilino2Nombre` / `inquilino2Dni` | texto / documento | | REUNIDOS · inquilinos actuales |
| `nuevoInquilinoNombre` | texto | ✔ | Bloque «nuevo inquilino» y acuerdo 1.º |
| `nuevoInquilinoDni` | documento | ✔ | Bloque «nuevo inquilino» y acuerdo 1.º |
| `nuevoInquilinoDomicilio` | texto | | Bloque «nuevo inquilino» |
| `nuevoInquilinoTelefono` | teléfono | | Bloque «nuevo inquilino» |
| `nuevoInquilinoEmail` | email | | Bloque «nuevo inquilino» |
| `fechaContratoOriginal` | fecha | ✔ | EXPONEN |
| `direccionInmueble` | texto | ✔ | EXPONEN |

---

## 4. `psi.docx` — Contrato de personal shopper inmobiliario

**Clave:** `psi` · **Categoría:** PSI

Origen: `MODELO DE CONTRATO PERSONAL SHOPPER - PSI.docx`.

| Campo | Tipo | Oblig. | Valor por defecto | Dónde aparece |
|---|---|:--:|---|---|
| `diaContrato` / `mesContrato` / `anioContrato` | texto | ✔ | | Encabezado |
| `clienteNombre` | texto | ✔ | | REUNIDOS · cliente comprador |
| `clienteDni` | documento | ✔ | | REUNIDOS |
| `clienteDomicilio` | texto | ✔ | | REUNIDOS |
| `tipoVivienda` | texto largo | ✔ | | EXPONEN·primero, punto 1 |
| `ubicacionesBusqueda` | texto largo | ✔ | | EXPONEN·primero, punto 2 |
| `rangoPrecio` | texto | ✔ | | EXPONEN·primero, punto 3 |
| `duracionEncargo` | texto | | `6 meses` | Cláusula 2.1 y cláusula 5.ª |
| `honorariosTotales` | texto | | `3.000€ + IVA` | Cláusula 5.ª · honorarios |
| `honorariosPrimerPago` | texto | | `1.500€ + IVA` | Cláusula 5.ª · a la firma |
| `honorariosSegundoPago` | texto | | `1.500€ + IVA` | Cláusula 5.ª · a la firma de arras |

El bloque de servicios adicionales (Home Staging, mentoría, club de inversores)
se mantiene tal cual: es catálogo de la agencia, no dato del cliente.

---

## 5. `reserva.docx` — Documento de reserva (paga y señal)

**Clave:** `reserva` · **Categoría:** Alquiler temporal

Origen: `MODELO DOCUMENTO DE RESERVA.docx`.

| Campo | Tipo | Oblig. | Dónde aparece |
|---|---|:--:|---|
| `diaContrato` / `mesContrato` / `anioContrato` | texto | ✔ | Encabezado |
| `firmanteNombre` | texto | ✔ | Compareciente |
| `firmanteDni` | documento | ✔ | Compareciente |
| `firmanteDomicilio` | texto | | Compareciente |
| `empresaRazonSocial` | texto | ✔ | Empresa representada |
| `empresaCif` | documento | ✔ | Empresa representada |
| `empresaDomicilio` | texto | | Empresa representada |
| `importeReservaLetras` | texto | | Entrega — derivado de `importeReservaTotal` |
| `importeReservaBase` | moneda | ✔ | Entrega · «(… más IVA = …)» |
| `importeReservaTotal` | moneda | ✔ | Entrega · «(… más IVA = …)» |
| `direccionInmueble` | texto | ✔ | Entrega · inmueble reservado |
| `precioMensualLetras` | texto | | MANIFIESTAN — derivado de `precioMensualCifra` |
| `precioMensualCifra` | moneda | ✔ | MANIFIESTAN · precio mensual pactado |
| `validezHasta` | fecha | ✔ | Validez de la reserva |

---

## Añadir o cambiar un campo

1. Editar las reglas de la plantilla en `herramientas/etiquetar-plantillas.js`.
2. Regenerar: `node assets/templates/herramientas/etiquetar-plantillas.js`.
3. Revisar el texto resultante en `herramientas/salida/<plantilla>.txt`.
4. Declarar el campo en `src/contracts/seed/contract-templates.seed.ts`
   (etiqueta, tipo, grupo, obligatoriedad).
5. Reiniciar el backend: `ContractTemplatesService` resiembra el catálogo al
   arrancar (es idempotente).
6. Actualizar la tabla correspondiente de este documento.
