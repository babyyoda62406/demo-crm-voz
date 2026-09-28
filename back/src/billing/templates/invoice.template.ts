import { Invoice } from '../entities/invoice.entity';
import { InvoiceStatus, InvoiceStatusLabels } from '../enums/invoice-status.enum';
import { AGENCY, AGENCY_LEGAL_NOTE } from '../constants/agency.constants';

/**
 * Plantilla HTML de la factura en PDF.
 *
 * Se renderiza a PDF con Gotenberg (Chromium), así que todo el CSS va en línea
 * en el propio documento: no hay servidor de estáticos al que pedir recursos.
 */

/** Escapa el texto que procede de la base de datos para no romper el HTML. */
const escapar = (value?: string | number | null): string => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// `useGrouping: true` porque es-ES no agrupa por defecto hasta cinco cifras:
// sin él convivían «17.988,95 €» y «6534,00 €» en el mismo documento.
const euros = (value: number): string =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    useGrouping: true,
  }).format(Number.isFinite(value) ? value : 0);

const numero = (value: number): string =>
  new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

/** Convierte `YYYY-MM-DD` (o Date) al formato español `DD/MM/AAAA`. */
const fecha = (value?: string | Date | null): string => {
  if (!value) return '—';
  const texto = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [anio, mes, dia] = texto.split('-');
  if (!anio || !mes || !dia) return '—';
  return `${dia}/${mes}/${anio}`;
};

const COLOR_BADGE: Record<InvoiceStatus, string> = {
  [InvoiceStatus.EMITIDA]: '#1D4ED8',
  [InvoiceStatus.COBRADA]: '#047857',
  [InvoiceStatus.ANULADA]: '#B91C1C',
};

/** Genera el HTML completo (autocontenido) de una factura. */
export const renderInvoiceHtml = (invoice: Invoice): string => {
  const lineas = Array.isArray(invoice.lineas) ? invoice.lineas : [];

  const filas = lineas
    .map(
      (linea, indice) => `
        <tr class="${indice % 2 === 0 ? '' : 'alterna'}">
          <td class="concepto">${escapar(linea.concepto)}</td>
          <td class="num">${numero(linea.cantidad)}</td>
          <td class="num">${euros(linea.precioUnitario)}</td>
          <td class="num importe">${euros(linea.importe)}</td>
        </tr>`,
    )
    .join('');

  const bloqueContrato = invoice.contratoReferencia
    ? `<div class="meta-fila"><span>Contrato</span><strong>${escapar(invoice.contratoReferencia)}</strong></div>`
    : '';

  const bloqueCobro =
    invoice.estado === InvoiceStatus.COBRADA && invoice.fechaCobro
      ? `<div class="meta-fila"><span>Fecha de cobro</span><strong>${fecha(invoice.fechaCobro)}</strong></div>`
      : '';

  const bloqueNotas = invoice.notas
    ? `<section class="notas">
         <h3>Observaciones</h3>
         <p>${escapar(invoice.notas)}</p>
       </section>`
    : '';

  const marcaAnulada =
    invoice.estado === InvoiceStatus.ANULADA
      ? '<div class="marca-agua">ANULADA</div>'
      : '';

  // Una factura anulada no reclama el pago: conserva su número pero ya no se
  // cobra.
  const bloquePago =
    invoice.estado === InvoiceStatus.ANULADA
      ? `<section class="pago">
           <strong>Factura anulada:</strong> conserva su número dentro del
           correlativo del ejercicio y no debe abonarse.
         </section>`
      : `<section class="pago">
           <strong>Forma de pago:</strong> transferencia bancaria a la cuenta
           <strong>${escapar(AGENCY.iban)}</strong>, indicando el número de factura
           ${escapar(invoice.numero)} como concepto.
         </section>`;

  // El teléfono es opcional: mejor no imprimir ninguno que imprimir uno falso.
  const contactoAgencia = [
    AGENCY.telefono ? `Tel. ${escapar(AGENCY.telefono)}` : '',
    escapar(AGENCY.email),
  ]
    .filter(Boolean)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapar(invoice.numero)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 18mm 16mm;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    color: #1F2937;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    position: relative;
  }
  .cabecera {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 3px solid #1D4ED8;
  }
  .emisor .nombre {
    font-size: 17pt;
    font-weight: 700;
    color: #1D4ED8;
    letter-spacing: -0.3px;
  }
  .emisor .dato { font-size: 9pt; color: #4B5563; line-height: 1.55; }
  .titulo { text-align: right; }
  .titulo h1 {
    margin: 0;
    font-size: 20pt;
    letter-spacing: 4px;
    color: #111827;
    text-transform: uppercase;
  }
  .titulo .numero {
    margin-top: 4px;
    font-size: 13pt;
    font-weight: 700;
    color: #1D4ED8;
  }
  .badge {
    display: inline-block;
    margin-top: 8px;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #FFFFFF;
  }
  .bloques {
    display: flex;
    gap: 14px;
    margin-top: 22px;
  }
  .bloque {
    flex: 1;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    padding: 12px 14px;
    background: #F9FAFB;
  }
  .bloque h2 {
    margin: 0 0 8px;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #6B7280;
  }
  .bloque .principal { font-size: 11.5pt; font-weight: 700; color: #111827; }
  .bloque .dato { font-size: 9.5pt; color: #4B5563; line-height: 1.6; }
  .meta-fila {
    display: flex;
    justify-content: space-between;
    font-size: 9.5pt;
    padding: 3px 0;
    border-bottom: 1px dotted #E5E7EB;
  }
  .meta-fila:last-child { border-bottom: none; }
  .meta-fila span { color: #6B7280; }
  table.detalle {
    width: 100%;
    border-collapse: collapse;
    margin-top: 24px;
  }
  table.detalle thead th {
    background: #1D4ED8;
    color: #FFFFFF;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 9px 10px;
    text-align: left;
  }
  table.detalle thead th.num { text-align: right; }
  table.detalle tbody td {
    padding: 9px 10px;
    font-size: 10pt;
    border-bottom: 1px solid #E5E7EB;
    vertical-align: top;
  }
  table.detalle tbody tr.alterna { background: #F9FAFB; }
  table.detalle td.num { text-align: right; white-space: nowrap; }
  table.detalle td.importe { font-weight: 700; }
  table.detalle td.concepto { width: 55%; }
  .totales {
    margin-top: 18px;
    display: flex;
    justify-content: flex-end;
  }
  /* Separate con espaciado cero: la barra azul del total es una sola pieza.
     Con collapse, el radio de cada celda partía la barra en dos rectángulos. */
  .totales table { width: 58%; border-collapse: separate; border-spacing: 0; }
  .totales td {
    padding: 7px 12px;
    font-size: 10.5pt;
  }
  .totales td.etiqueta { color: #4B5563; }
  .totales td.valor { text-align: right; font-weight: 600; white-space: nowrap; }
  .totales tr.total td {
    background: #1D4ED8;
    color: #FFFFFF;
    font-size: 12.5pt;
    font-weight: 700;
  }
  .totales tr.total td.etiqueta {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
  }
  .totales tr.total td.valor {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }
  .notas {
    margin-top: 26px;
    padding: 12px 14px;
    border-left: 3px solid #1D4ED8;
    background: #F9FAFB;
  }
  .notas h3 {
    margin: 0 0 4px;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #6B7280;
  }
  .notas p { margin: 0; font-size: 10pt; color: #374151; white-space: pre-line; }
  .pago {
    margin-top: 26px;
    font-size: 9.5pt;
    color: #374151;
  }
  .pago strong { color: #111827; }
  .pie {
    margin-top: 34px;
    padding-top: 10px;
    border-top: 1px solid #E5E7EB;
    font-size: 7.8pt;
    color: #9CA3AF;
    line-height: 1.6;
    text-align: center;
  }
  .marca-agua {
    position: fixed;
    top: 42%;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 68pt;
    font-weight: 800;
    letter-spacing: 12px;
    color: rgba(185, 28, 28, 0.12);
    transform: rotate(-22deg);
    pointer-events: none;
  }
</style>
</head>
<body>
  ${marcaAnulada}

  <header class="cabecera">
    <div class="emisor">
      <div class="nombre">${escapar(AGENCY.nombre)}</div>
      <div class="dato">
        CIF ${escapar(AGENCY.cif)}<br />
        ${escapar(AGENCY.direccion)}<br />
        ${escapar(AGENCY.codigoPostal)} ${escapar(AGENCY.poblacion)} (${escapar(AGENCY.provincia)})<br />
        ${contactoAgencia}
      </div>
    </div>
    <div class="titulo">
      <h1>Factura</h1>
      <div class="numero">${escapar(invoice.numero)}</div>
      <span class="badge" style="background:${COLOR_BADGE[invoice.estado] ?? '#4B5563'}">
        ${escapar(InvoiceStatusLabels[invoice.estado] ?? invoice.estado)}
      </span>
    </div>
  </header>

  <div class="bloques">
    <div class="bloque">
      <h2>Facturar a</h2>
      <div class="principal">${escapar(invoice.clienteNombre)}</div>
      <div class="dato">
        ${invoice.clienteDocumento ? `NIF/CIF ${escapar(invoice.clienteDocumento)}<br />` : ''}
        ${invoice.clienteDireccion ? `${escapar(invoice.clienteDireccion)}<br />` : ''}
        ${invoice.clienteEmail ? escapar(invoice.clienteEmail) : ''}
      </div>
    </div>
    <div class="bloque">
      <h2>Datos de la factura</h2>
      <div class="meta-fila"><span>Número</span><strong>${escapar(invoice.numero)}</strong></div>
      <div class="meta-fila"><span>Fecha de emisión</span><strong>${fecha(invoice.fechaEmision)}</strong></div>
      <div class="meta-fila"><span>Ejercicio</span><strong>${escapar(invoice.ejercicio)}</strong></div>
      ${bloqueContrato}
      ${bloqueCobro}
    </div>
  </div>

  <table class="detalle">
    <thead>
      <tr>
        <th>Concepto</th>
        <th class="num">Cantidad</th>
        <th class="num">Precio unitario</th>
        <th class="num">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="4">Sin líneas de detalle.</td></tr>'}
    </tbody>
  </table>

  <div class="totales">
    <table>
      <tr>
        <td class="etiqueta">Base imponible</td>
        <td class="valor">${euros(invoice.baseImponible)}</td>
      </tr>
      <tr>
        <td class="etiqueta">IVA (${numero(invoice.tipoIva)} %)</td>
        <td class="valor">${euros(invoice.cuotaIva)}</td>
      </tr>
      <tr class="total">
        <td class="etiqueta" style="color:#FFFFFF">Total factura</td>
        <td class="valor">${euros(invoice.total)}</td>
      </tr>
    </table>
  </div>

  ${bloqueNotas}

  ${bloquePago}

  <footer class="pie">
    ${escapar(AGENCY.nombre)} · CIF ${escapar(AGENCY.cif)} · ${escapar(AGENCY.web)}<br />
    ${escapar(AGENCY_LEGAL_NOTE)}
  </footer>
</body>
</html>`;
};
