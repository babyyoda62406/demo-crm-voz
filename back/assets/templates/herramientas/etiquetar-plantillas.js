/* eslint-disable */
/**
 * ============================================================================
 * ETIQUETADOR DE PLANTILLAS .docx  —  CRMIA (dominio contratos)
 * ============================================================================
 *
 * Convierte los .docx de partida del despacho (con huecos hechos a base
 * de puntos suspensivos «……», guiones bajos «____» o guiones «-----») en
 * plantillas ETIQUETADAS con marcadores docxtemplater `{campo}`.
 *
 * Un .docx es un zip: el texto vive en `word/document.xml`. El problema es que
 * Word parte una misma frase en varios `<w:r><w:t>` (runs) por motivos de
 * formato, así que un hueco «……………» puede estar repartido entre 3 runs. Por eso
 * el script NO hace un search&replace sobre el XML: reconstruye el texto de
 * cada párrafo, aplica las reglas sobre el texto plano y vuelve a repartir el
 * resultado entre los runs originales (el marcador cae en el run donde empezaba
 * el hueco). Así se conserva intacto el formato del documento.
 *
 * USO:  node assets/templates/herramientas/etiquetar-plantillas.js
 *       (desde la carpeta `back/`; sin argumentos)
 *
 * ENTRADA : assets/templates/originales/*.docx
 * SALIDA  : assets/templates/*.docx   (versión etiquetada)
 *           assets/templates/herramientas/salida/*.txt (texto extraído, para revisar)
 *
 * El mapa de campos por plantilla está documentado en assets/templates/campos.md
 * y replicado en `src/contracts/seed/contract-templates.seed.ts`.
 */

const fs = require('fs');
const path = require('path');

const BACK_DIR = path.resolve(__dirname, '..', '..', '..');
const PizZip = require(path.join(BACK_DIR, '..', 'node_modules', 'pizzip'));

const TEMPLATES_DIR = path.join(BACK_DIR, 'assets', 'templates');
const ORIGINALS_DIR = path.join(TEMPLATES_DIR, 'originales');
const DEBUG_DIR = path.join(__dirname, 'salida');

// ---------------------------------------------------------------------------
// Motor de sustitución a nivel de párrafo
// ---------------------------------------------------------------------------

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const encode = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Regex de un hueco genérico: puntos suspensivos, puntos, guiones bajos o rayas.
 * NO consume los espacios que rodean al hueco: así «………… con CIF» queda como
 * «{campo} con CIF» y no como «{campo}con CIF».
 */
const HUECO = /(?:[…]|\.{2,}|_{2,}|-{4,})[…._-]*/g;

/**
 * Representa un párrafo del documento (el trozo de XML anterior a `</w:p>`).
 * Permite leer su texto completo y reescribirlo conservando los runs.
 */
class Paragraph {
  constructor(xml) {
    this.xml = xml;
    this.parts = []; // { pre, text, post } por cada <w:t>
    const re = /(<w:t(?:\s[^>]*)?>)([\s\S]*?)(<\/w:t>)/g;
    let match;
    let cursor = 0;
    this.chunks = [];
    while ((match = re.exec(xml)) !== null) {
      this.chunks.push(xml.slice(cursor, match.index));
      this.parts.push(decode(match[2]));
      cursor = match.index + match[0].length;
    }
    this.tail = xml.slice(cursor);
  }

  get hasText() {
    return this.parts.length > 0;
  }

  /** Texto plano del párrafo (concatenación de todos los `<w:t>`). */
  get text() {
    return this.parts.join('');
  }

  /**
   * Aplica una sustitución sobre el texto plano y redistribuye el resultado
   * entre los runs. El texto insertado cae en el run donde empezaba el match.
   */
  replace(pattern, replacement) {
    if (!this.hasText) return false;

    const re =
      pattern instanceof RegExp
        ? new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
        : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

    const full = this.text;
    const matches = [...full.matchAll(re)];
    if (matches.length === 0) return false;

    // owner[i] = índice del <w:t> al que pertenece el carácter i.
    const owner = new Array(full.length);
    let idx = 0;
    this.parts.forEach((part, partIndex) => {
      for (let k = 0; k < part.length; k += 1) {
        owner[idx] = partIndex;
        idx += 1;
      }
    });

    const out = this.parts.map(() => '');
    const jumps = new Map();
    for (const m of matches) {
      const rep =
        typeof replacement === 'function' ? replacement(...m) : m[0].replace(re, replacement);
      jumps.set(m.index, { end: m.index + m[0].length, rep });
    }

    let i = 0;
    let lastOwner = 0;
    while (i < full.length) {
      const jump = jumps.get(i);
      if (jump) {
        const target = owner[i] !== undefined ? owner[i] : lastOwner;
        out[target] += jump.rep;
        i = jump.end > i ? jump.end : i + 1;
      } else {
        const target = owner[i];
        lastOwner = target;
        out[target] += full[i];
        i += 1;
      }
    }
    // Un match que termina justo al final del texto puede dejar `jumps` sin consumir.
    for (const [start, jump] of jumps) {
      if (start >= full.length) {
        out[out.length - 1] += jump.rep;
      }
    }

    this.parts = out;
    return true;
  }

  /** Sustituye el párrafo entero por un texto (se mantiene el primer run). */
  setText(value) {
    if (!this.hasText) return false;
    this.parts = this.parts.map((_, i) => (i === 0 ? value : ''));
    return true;
  }

  toXml() {
    if (!this.hasText) return this.xml;
    let result = '';
    this.parts.forEach((text, i) => {
      result += this.chunks[i];
      result += `<w:t xml:space="preserve">${encode(text)}</w:t>`;
    });
    return result + this.tail;
  }
}

/** Aplica las reglas de una plantilla sobre el `document.xml` completo. */
function aplicarReglas(xml, reglas) {
  const chunks = xml.split('</w:p>');
  const paragraphs = chunks.map((c) => new Paragraph(c));
  const dropped = new Set();
  const aplicadas = [];
  const fallidas = [];

  for (const regla of reglas) {
    const p = paragraphs[regla.p];
    if (!p) {
      fallidas.push(`párrafo ${regla.p} inexistente`);
      continue;
    }
    if (regla.drop) {
      dropped.add(regla.p);
      aplicadas.push(`p${regla.p}: eliminado`);
      continue;
    }
    if (regla.set !== undefined) {
      p.setText(regla.set);
      aplicadas.push(`p${regla.p}: reemplazado por «${regla.set}»`);
      continue;
    }
    const ok = p.replace(regla.find, regla.rep);
    if (ok) aplicadas.push(`p${regla.p}: ${String(regla.find)} -> ${regla.rep}`);
    else fallidas.push(`p${regla.p}: NO coincide ${String(regla.find)}`);
  }

  const salida = [];
  for (let i = 0; i < paragraphs.length; i += 1) {
    if (dropped.has(i)) continue;
    salida.push(paragraphs[i].toXml());
  }
  // El último trozo no lleva `</w:p>` (es la cola del documento).
  const last = salida.pop();
  return { xml: salida.map((c) => c + '</w:p>').join('') + last, aplicadas, fallidas };
}

// ---------------------------------------------------------------------------
// Reglas por plantilla (los índices de párrafo son 0-based sobre document.xml)
// ---------------------------------------------------------------------------

/** Sustituye el n-ésimo hueco del párrafo por un marcador. */
const huecos = (p, ...campos) => ({ p, huecos: campos });

const PLANTILLAS = [
  // =========================================================================
  // 1) ALQUILER TEMPORAL  (la estrella de la demo)
  // =========================================================================
  {
    origen: 'MODELO CONTRATO ALQUILER TEMPORAL.docx',
    destino: 'alquiler-temporal.docx',
    reglas: [
      {
        p: 3,
        find: /En Altabria, a[….\s]*de[….\s]*de 202[….]*/,
        rep: 'En Altabria, a {diaContrato} de {mesContrato} de {anioContrato}',
      },
      huecos(
        8,
        'arrendatarioRazonSocial',
        'arrendatarioCif',
        'arrendatarioDomicilio',
        'arrendatarioAdministrador',
        'arrendatarioAdministradorDni',
        'arrendatarioAdministradorDomicilio',
      ),
      huecos(10, 'arrendadorNombre', 'arrendadorDni', 'arrendadorDomicilio'),
      huecos(16, 'arrendadorNombre', 'direccionInmueble'),
      { p: 16, find: /\{direccionInmueble\}/, rep: '{direccionInmueble}.' },
      huecos(18, 'arrendatarioRazonSocial', 'temporada'),
      huecos(
        24,
        'inicioDia',
        'inicioMes',
        'inicioAnio',
        'finDia',
        'finMes',
        'finAnio',
      ),
      { p: 24, find: /\{finAnio\}/, rep: '{finAnio}.' },
      huecos(25, 'duracionContrato'),
      huecos(30, 'precioMensualLetras', 'precioMensualCifra', 'diaPago'),
      huecos(31, 'iban'),
      // Ocupantes: bucle de párrafo docxtemplater (paragraphLoop: true).
      { p: 50, set: '{#ocupantes}' },
      {
        p: 51,
        set: 'Nombre: {nombre}  DNI: {dni} y domicilio: {domicilio}',
      },
      { p: 52, set: '{/ocupantes}' },
      { p: 53, drop: true },
      huecos(67, 'arrendadorEmail'),
      huecos(68, 'arrendatarioEmail'),
      huecos(98, 'fianzaLetras', 'fianzaCifra'),
      huecos(104, 'arrendatarioDomicilioNotificaciones'),
      huecos(107, 'responsableDatos'),
    ],
  },

  // =========================================================================
  // 2) ANEXO — INCORPORACIÓN DE NUEVO INQUILINO
  // =========================================================================
  {
    origen: 'ANEXO INCORPORACION NUEVO INQUILINO EN CONTRATO ALQUILER TEMPORAL.docx',
    destino: 'anexo-inquilino.docx',
    reglas: [
      {
        p: 0,
        find: /En Altabria a_+de _+de _+/,
        rep: 'En Altabria a {diaContrato} de {mesContrato} de {anioContrato}',
      },
      huecos(9, 'arrendadorNombre'),
      huecos(10, 'arrendadorDni'),
      huecos(11, 'arrendadorDomicilio'),
      huecos(
        14,
        'inquilino1Nombre',
        'inquilino1Dni',
        'inquilino2Nombre',
        'inquilino2Dni',
      ),
      huecos(17, 'nuevoInquilinoNombre'),
      huecos(18, 'nuevoInquilinoDni'),
      huecos(19, 'nuevoInquilinoDomicilio', 'nuevoInquilinoTelefono'),
      huecos(20, 'nuevoInquilinoEmail'),
      huecos(23, 'fechaContratoOriginal', 'direccionInmueble'),
      huecos(29, 'nuevoInquilinoNombre', 'nuevoInquilinoDni'),
    ],
  },

  // =========================================================================
  // 3) PERSONAL SHOPPER INMOBILIARIO (PSI)
  //    OJO: el documento de partida traía datos de una operación concreta
  //    (ubicaciones, rango de precio y honorarios). Se sustituyen por
  //    marcadores. Los datos de la AGENCIA (Vantia Patrimonio S.L., CIF,
  //    IBAN y firmante) se dejan FIJOS a propósito.
  // =========================================================================
  {
    origen: 'MODELO DE CONTRATO PERSONAL SHOPPER - PSI.docx',
    destino: 'psi.docx',
    reglas: [
      {
        p: 0,
        find: /En Altabria _+ de _+ de _+/,
        rep: 'En Altabria {diaContrato} de {mesContrato} de {anioContrato}',
      },
      huecos(2, 'clienteNombre', 'clienteDni', 'clienteDomicilio'),
      {
        p: 6,
        find: /1- Tipo de vivienda,[\s\S]*$/,
        rep: '1- Tipo de vivienda: {tipoVivienda}',
      },
      { p: 7, find: /2- Ubicación:.*$/, rep: '2- Ubicación: {ubicacionesBusqueda}' },
      {
        p: 8,
        find: /3- Precio:.*?\(sin incluir/,
        rep: '3- Precio: {rangoPrecio} (sin incluir',
      },
      {
        p: 10,
        find: /tendrá una duración de 6 meses/,
        rep: 'tendrá una duración de {duracionEncargo}',
      },
      {
        p: 32,
        find: /serán de 3\.500€ \+ iva/,
        rep: 'serán de {honorariosTotales}',
      },
      {
        p: 32,
        find: /la cantidad de 1\.750€ \+ iva/,
        rep: 'la cantidad de {honorariosPrimerPago}',
      },
      {
        p: 33,
        find: /los honorarios de 1\.750€ \+ iva/,
        rep: 'los honorarios de {honorariosSegundoPago}',
      },
      {
        p: 35,
        find: /durante 6 meses/,
        rep: 'durante {duracionEncargo}',
      },
    ],
  },

  // =========================================================================
  // 4) PRÓRROGA DE ALQUILER TEMPORAL
  // =========================================================================
  {
    origen: 'MODELO DE PRORROGA.docx',
    destino: 'prorroga.docx',
    reglas: [
      {
        p: 3,
        find: /En Altabria a[….\s]*de[….\s]*de[….\s]*/,
        rep: 'En Altabria a {diaContrato} de {mesContrato} de {anioContrato}',
      },
      { p: 6, find: /con domicilio C\/ [….]+/, rep: 'con domicilio {arrendatarioAdministradorDomicilio}' },
      huecos(
        6,
        'arrendatarioRazonSocial',
        'arrendatarioCif',
        'arrendatarioDomicilio',
        'arrendatarioAdministrador',
        'arrendatarioAdministradorDni',
      ),
      huecos(8, 'arrendadorNombre', 'arrendadorDni', 'arrendadorDomicilio'),
      { p: 8, find: /\{arrendadorDomicilio\} En concepto/, rep: '{arrendadorDomicilio}. En concepto' },
      huecos(18, 'fechaContratoOriginal', 'direccionInmueble'),
      { p: 18, find: /\{direccionInmueble\}/, rep: '{direccionInmueble}.' },
      huecos(20, 'fechaFinOriginal'),
      { p: 20, find: /\{fechaFinOriginal\}/, rep: '{fechaFinOriginal}.' },
      huecos(28, 'fechaFinOriginal', 'duracionProrroga', 'fechaFinProrroga'),
      { p: 28, find: /\{duracionProrroga\} Por lo tanto/, rep: '{duracionProrroga}. Por lo tanto' },
      { p: 28, find: /\{fechaFinProrroga\}/, rep: '{fechaFinProrroga}.' },
    ],
  },

  // =========================================================================
  // 5) DOCUMENTO DE RESERVA (paga y señal)
  //    Datos de la agencia (VANTIA PATRIMONIO S.L., CIF e IBAN): FIJOS.
  // =========================================================================
  {
    origen: 'MODELO DOCUMENTO DE RESERVA.docx',
    destino: 'reserva.docx',
    reglas: [
      {
        p: 0,
        find: /En Altabria, a[….\s]*de[….\s]*de[….\s]*/,
        rep: 'En Altabria, a {diaContrato} de {mesContrato} de {anioContrato}',
      },
      huecos(
        3,
        'firmanteNombre',
        'firmanteDni',
        'firmanteDomicilio',
        'empresaRazonSocial',
        'empresaCif',
        'empresaDomicilio',
      ),
      { p: 3, find: /\{firmanteDni\}mayor/, rep: '{firmanteDni} mayor' },
      { p: 4, find: /del inmueble en C\/[….]+/, rep: 'del inmueble en {direccionInmueble}' },
      huecos(4, 'importeReservaLetras', 'importeReservaBase', 'importeReservaTotal'),
      { p: 4, find: /\{importeReservaLetras\}\(/, rep: '{importeReservaLetras} (' },
      huecos(6, 'precioMensualLetras', 'precioMensualCifra'),
      huecos(8, 'validezHasta'),
    ],
  },
];

// ---------------------------------------------------------------------------
// Expansión de la regla abreviada `huecos(p, campo1, campo2, ...)`
// ---------------------------------------------------------------------------

function expandirReglas(reglas) {
  const expandidas = [];
  for (const regla of reglas) {
    if (!regla.huecos) {
      expandidas.push(regla);
      continue;
    }
    // Un único `replace` que consume los huecos en orden.
    let i = 0;
    expandidas.push({
      p: regla.p,
      find: HUECO,
      rep: () => {
        const campo = regla.huecos[i];
        i += 1;
        return campo ? `{${campo}}` : '';
      },
    });
  }
  return expandidas;
}

// ---------------------------------------------------------------------------
// Extracción de texto plano (para revisión manual)
// ---------------------------------------------------------------------------

function extraerTexto(xml) {
  return xml
    .split('</w:p>')
    .map((p) =>
      decode([...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join('')),
    )
    .join('\n');
}

// ---------------------------------------------------------------------------
// Programa principal
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

  for (const plantilla of PLANTILLAS) {
    const origen = path.join(ORIGINALS_DIR, plantilla.origen);
    if (!fs.existsSync(origen)) {
      console.error(`  ✗ No se encuentra el original: ${plantilla.origen}`);
      continue;
    }

    const zip = new PizZip(fs.readFileSync(origen));
    const documentXml = zip.file('word/document.xml').asText();
    const { xml, aplicadas, fallidas } = aplicarReglas(
      documentXml,
      expandirReglas(plantilla.reglas),
    );

    zip.file('word/document.xml', xml);
    const destino = path.join(TEMPLATES_DIR, plantilla.destino);
    fs.writeFileSync(destino, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));

    const texto = extraerTexto(xml);
    fs.writeFileSync(path.join(DEBUG_DIR, plantilla.destino.replace('.docx', '.txt')), texto);

    const marcadores = [...texto.matchAll(/\{[#/]?([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]);
    console.log(`\n▸ ${plantilla.destino}`);
    console.log(`  reglas aplicadas: ${aplicadas.length}`);
    if (fallidas.length) {
      console.log(`  ⚠ reglas SIN aplicar (${fallidas.length}):`);
      fallidas.forEach((f) => console.log(`     - ${f}`));
    }
    console.log(`  marcadores: ${[...new Set(marcadores)].join(', ')}`);
  }
}

main();
