import { Contract } from '../entities/contract.entity';
import { AGENCIA } from './agency.helper';

/**
 * Diligencia de firma electronica: la pagina que se anade al final del PDF
 * cuando el cliente firma desde el enlace publico.
 *
 * Existe porque hasta ahora el PDF firmado era byte a byte identico al no
 * firmado: los datos de la firma solo vivian en la base de datos, asi que el
 * cliente se descargaba «su» contrato y encontraba el hueco de firmas vacio.
 *
 * Se compone en HTML y se convierte a PDF con el motor Chromium de Gotenberg
 * (ver `PdfConverterService.htmlToPdf`), de modo que no hace falta ninguna
 * dependencia nueva para escribir dentro de un PDF.
 */

const escapar = (valor: string | null | undefined): string =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** «23 de agosto de 2026 a las 08:36:27 (hora peninsular espanola)». */
const fechaLarga = (fecha: Date): string => {
  const partes = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(fecha);

  const buscar = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${buscar('day')} de ${buscar('month')} de ${buscar('year')} a las ${buscar('hour')}:${buscar('minute')}:${buscar('second')}`;
};

const ESTILOS = `
  @page { size: A4; margin: 22mm 20mm; }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Liberation Sans',Arial,Helvetica,sans-serif;color:#111827;font-size:11pt;line-height:1.55}
  .marca{display:flex;justify-content:space-between;align-items:flex-start;
    border-bottom:2px solid #1D4ED8;padding-bottom:10px;margin-bottom:26px}
  .marca .agencia{font-size:13pt;font-weight:700;letter-spacing:-.01em}
  .marca .claim{font-size:9pt;color:#4B5563;margin-top:2px}
  .marca .ref{font-size:9pt;color:#4B5563;text-align:right}
  h1{font-size:16pt;font-weight:700;margin-bottom:6px}
  .entradilla{color:#374151;margin-bottom:22px}
  table{width:100%;border-collapse:collapse;margin-bottom:22px}
  th,td{border:1px solid #D1D5DB;padding:9px 12px;text-align:left;vertical-align:top}
  th{width:34%;background:#F3F4F6;font-weight:600;color:#374151}
  td{word-break:break-word}
  .huella{font-family:'Liberation Mono','Courier New',monospace;font-size:8.5pt;letter-spacing:.02em}
  .nota{font-size:9pt;color:#4B5563;border-left:3px solid #D1D5DB;padding-left:12px;line-height:1.6}
  .pie{margin-top:30px;font-size:8.5pt;color:#6B7280;text-align:center;
    border-top:1px solid #E5E7EB;padding-top:10px}
`;

/**
 * HTML de la pagina de diligencia.
 *
 * @param contrato Contrato ya firmado (con firmante, fecha e IP).
 * @param huella SHA-256 del documento sobre el que se estampa la diligencia.
 */
export function renderSignatureDiligencePage(
  contrato: Contract,
  huella: string,
): string {
  const firmadoAt = contrato.firmadoAt ? new Date(contrato.firmadoAt) : new Date();

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Diligencia de firma · ${escapar(contrato.referencia)}</title>
  <style>${ESTILOS}</style>
</head>
<body>
  <div class="marca">
    <div>
      <div class="agencia">${escapar(AGENCIA.nombre)}</div>
      <div class="claim">${escapar(AGENCIA.descripcion)}</div>
    </div>
    <div class="ref">
      Referencia<br /><strong>${escapar(contrato.referencia)}</strong>
    </div>
  </div>

  <h1>Diligencia de firma electrónica</h1>
  <p class="entradilla">
    Se hace constar que el documento que precede ha sido aceptado y firmado
    electrónicamente por el firmante que se identifica a continuación.
  </p>

  <table>
    <tr><th>Documento</th><td>${escapar(contrato.titulo)}</td></tr>
    <tr><th>Referencia del contrato</th><td>${escapar(contrato.referencia)}</td></tr>
    <tr><th>Firmado por</th><td><strong>${escapar(contrato.firmanteNombre)}</strong></td></tr>
    <tr><th>Fecha y hora de la firma</th><td>${escapar(fechaLarga(firmadoAt))}</td></tr>
    <tr><th>Dirección IP del firmante</th><td>${escapar(contrato.firmanteIp || 'no registrada')}</td></tr>
    <tr><th>Identificador de la operación</th><td>${escapar(contrato.referencia)}-${contrato.id}</td></tr>
    <tr><th>Huella del documento (SHA-256)</th><td class="huella">${escapar(huella)}</td></tr>
  </table>

  <p class="nota">
    Firma electrónica simple prestada por ${escapar(AGENCIA.nombre)}. El firmante
    accedió al documento mediante un enlace personal y de un solo uso, declaró
    haberlo leído y aceptó su contenido escribiendo su nombre y apellidos. Esta
    diligencia, la huella criptográfica del documento y la traza de acceso
    constituyen la evidencia de la firma.
  </p>

  <div class="pie">
    ${escapar(AGENCIA.nombre)}${AGENCIA.contacto ? ` · ${escapar(AGENCIA.contacto)}` : ''}
  </div>
</body>
</html>`;
}
