import { ContractState } from '../enums/contract-state.enum';
import { IPublicContractView } from '../contracts.service';
import { AGENCIA } from './agency.helper';

/**
 * Pagina publica de firma servida directamente por la API.
 *
 * Existe para que el enlace enviado al cliente funcione siempre, incluso si el
 * front de React no esta desplegado. Reproduce la estetica glassmorphism de
 * CRMIA con CSS embebido (no hay assets externos).
 *
 * Reglas de esta pantalla (es la unica que ve el cliente final):
 * - manda la marca de la AGENCIA, no la del software;
 * - no se ensena jerga interna del CRM (el estado «Visto» no significa nada
 *   para el firmante y ademas le revela la traza de apertura);
 * - en movil el contrato NO se mete en un iframe diminuto: se abre a pantalla
 *   completa con el visor del propio telefono.
 */

const escapar = (valor: string | null | undefined): string =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** «23/08/2026 a las 08:36». */
const fechaCorta = (valor: Date | string): string => {
  const fecha = valor instanceof Date ? valor : new Date(valor);
  const partes = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(fecha);

  const buscar = (tipo: Intl.DateTimeFormatPartTypes): string =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${buscar('day')}/${buscar('month')}/${buscar('year')} a las ${buscar('hour')}:${buscar('minute')}`;
};

const ESTILOS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
    min-height:100vh;color:#111827;background-color:#F0F4F9;
    background-image:
      radial-gradient(1100px 780px at 8% -12%, rgba(37,99,235,.20), transparent 62%),
      radial-gradient(900px 700px at 96% 4%, rgba(148,163,184,.28), transparent 58%),
      radial-gradient(1000px 860px at 62% 116%, rgba(59,130,246,.18), transparent 60%),
      linear-gradient(160deg,#F5F8FC 0%,#EAF1F9 42%,#DCE7F5 100%);
    background-attachment:fixed;background-size:cover;padding:16px;
  }
  .wrap{max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:16px;padding-bottom:96px}
  .glass{
    background:rgba(255,255,255,.28);backdrop-filter:blur(18px);
    -webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.4);
    border-radius:16px;box-shadow:0 10px 30px rgba(15,23,42,.08);padding:20px;
  }
  .agencia{display:flex;align-items:center;gap:12px;padding-bottom:14px;margin-bottom:14px;
    border-bottom:1px solid rgba(255,255,255,.55)}
  .sello{width:42px;height:42px;border-radius:12px;flex:none;display:flex;align-items:center;
    justify-content:center;font-weight:700;font-size:17px;color:#fff;
    background:linear-gradient(135deg,#2563EB,#1D4ED8);box-shadow:0 6px 16px rgba(37,99,235,.28)}
  .agencia .nombre{font-size:16px;font-weight:700;line-height:1.25}
  .agencia .claim{font-size:12px;color:#4B5563}
  h1{font-size:21px;font-weight:700;letter-spacing:-.02em}
  .sub{color:#374151;margin-top:6px;font-size:14px}
  .presenta{margin-top:12px;font-size:14px;color:#1F2937;line-height:1.55}
  .visor{height:70vh;min-height:460px;border-radius:12px;overflow:hidden;
    border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.5)}
  .visor iframe{width:100%;height:100%;border:0}
  .vacio{display:flex;align-items:center;justify-content:center;height:100%;
    color:#4B5563;font-size:15px;text-align:center;padding:24px}
  .abrir{display:none;align-items:center;gap:14px;width:100%;text-decoration:none;color:inherit;
    padding:18px;border-radius:14px;border:1px solid rgba(255,255,255,.6);
    background:rgba(255,255,255,.55)}
  .abrir .icono{width:44px;height:44px;border-radius:12px;flex:none;display:flex;
    align-items:center;justify-content:center;font-size:20px;background:rgba(37,99,235,.14);color:#1D4ED8}
  .abrir .titulo{font-weight:700;font-size:15px}
  .abrir .pista{font-size:13px;color:#4B5563;margin-top:2px}
  label{display:block;font-size:14px;font-weight:600;margin-bottom:8px}
  input[type=text]{
    width:100%;padding:14px 16px;border-radius:12px;font-size:16px;color:#111827;
    border:1px solid #D1D5DB;background:rgba(255,255,255,.75);outline:none}
  input[type=text]:focus{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.25)}
  button{
    padding:14px 26px;border:0;border-radius:12px;font-size:16px;font-weight:600;color:#fff;
    background:linear-gradient(90deg,#2563EB,#1D4ED8);cursor:pointer;
    box-shadow:0 8px 20px rgba(37,99,235,.3);transition:transform .15s ease}
  button:hover{transform:scale(1.02)}
  button:disabled{opacity:.55;cursor:not-allowed;transform:none}
  .acciones{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;margin-top:16px}
  .acciones > div{flex:1;min-width:240px}
  .aviso{margin-top:14px;font-size:13px;color:#4B5563;line-height:1.5}
  .ok{display:flex;gap:14px;align-items:flex-start}
  .ok .marca{width:44px;height:44px;border-radius:9999px;flex:none;display:flex;
    align-items:center;justify-content:center;font-size:22px;color:#047857;
    background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.35)}
  .err{margin-top:12px;color:#B91C1C;font-size:14px;font-weight:600;display:none}
  a.descarga{color:#1D4ED8;font-weight:600;text-decoration:none;font-size:14px}
  a.descarga:hover{text-decoration:underline}
  @media (max-width:767px){
    body{padding:12px}
    h1{font-size:19px}
    .visor{display:none}
    .abrir{display:flex}
    .acciones > div{min-width:100%}
    .acciones button{width:100%}
  }
`;

/** Ruta absoluta de los recursos publicos del contrato. */
const rutaBase = (token: string): string =>
  `/api/contracts/public/${encodeURIComponent(token)}`;

/** Cabecera con la marca de la agencia (nunca la del software). */
function cabeceraAgencia(): string {
  const inicial = escapar(AGENCIA.nombre.trim().charAt(0).toUpperCase() || 'A');

  return `
    <div class="agencia">
      <div class="sello">${inicial}</div>
      <div>
        <div class="nombre">${escapar(AGENCIA.nombre)}</div>
        <div class="claim">${escapar(AGENCIA.descripcion)}</div>
      </div>
    </div>`;
}

/** Panel de firma o confirmacion, segun el estado del contrato. */
function bloqueFirma(vista: IPublicContractView, token: string): string {
  if (vista.estado === ContractState.FIRMADO) {
    return `
    <section class="glass">
      <div class="ok">
        <div class="marca">&#10003;</div>
        <div>
          <h2 style="font-size:19px;font-weight:700">Documento firmado</h2>
          <p class="sub">
            Firmado por <strong>${escapar(vista.firmanteNombre)}</strong>
            ${vista.firmadoAt ? ` el ${escapar(fechaCorta(vista.firmadoAt))}` : ''}.
          </p>
          <p class="aviso">
            Ya puedes descargar tu copia firmada desde el enlace de arriba: incluye
            la diligencia con la fecha y la hora de tu firma.
          </p>
        </div>
      </div>
    </section>`;
  }

  return `
  <section class="glass">
    <h2 style="font-size:19px;font-weight:700">Firmar el documento</h2>
    <p class="sub">Escribe tu nombre y apellidos para aceptar el contenido del documento.</p>
    <form class="acciones" id="formFirma" autocomplete="off">
      <div>
        <label for="firmanteNombre">Nombre y apellidos</label>
        <input type="text" id="firmanteNombre" name="firmanteNombre"
               placeholder="Nombre completo del firmante" required />
      </div>
      <button type="submit" id="botonFirmar">Firmar documento</button>
    </form>
    <p class="err" id="error"></p>
    <p class="aviso">
      Al pulsar «Firmar documento» declaras haber leído el documento y aceptar su contenido.
      Se registrará tu nombre, la fecha y la hora de la firma.
    </p>
  </section>
  <script>
    (function () {
      var form = document.getElementById('formFirma');
      var boton = document.getElementById('botonFirmar');
      var error = document.getElementById('error');
      form.addEventListener('submit', function (evento) {
        evento.preventDefault();
        var nombre = document.getElementById('firmanteNombre').value.trim();
        if (nombre.length < 3) {
          error.textContent = 'Indica tu nombre y apellidos completos.';
          error.style.display = 'block';
          return;
        }
        boton.disabled = true;
        boton.textContent = 'Firmando...';
        error.style.display = 'none';
        fetch('${rutaBase(token)}/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firmanteNombre: nombre })
        })
          .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
          .then(function (respuesta) {
            if (!respuesta.ok) { throw new Error(respuesta.body && respuesta.body.message); }
            window.location.reload();
          })
          .catch(function (e) {
            boton.disabled = false;
            boton.textContent = 'Firmar documento';
            error.textContent = e.message || 'No se ha podido registrar la firma.';
            error.style.display = 'block';
          });
      });
    })();
  </script>`;
}

/** Envoltorio comun de las dos paginas publicas. */
function documento(titulo: string, cuerpo: string): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escapar(titulo)}</title>
  <style>${ESTILOS}</style>
</head>
<body>
  <main class="wrap">
${cuerpo}
    <footer style="text-align:center;color:#6B7280;font-size:13px;padding-bottom:16px">
      ${escapar(AGENCIA.nombre)}${AGENCIA.contacto ? ` &middot; ${escapar(AGENCIA.contacto)}` : ''}
    </footer>
  </main>
</body>
</html>`;
}

/** HTML completo de la pagina publica de firma. */
export function renderPublicSignPage(
  vista: IPublicContractView,
  token: string,
): string {
  const rutaPdf = `${rutaBase(token)}/pdf`;

  const visor = vista.tienePdf
    ? `<div class="visor"><iframe src="${rutaPdf}#toolbar=1" title="Documento"></iframe></div>
       <a class="abrir" href="${rutaPdf}" target="_blank" rel="noopener">
         <span class="icono">&#128196;</span>
         <span>
           <span class="titulo">Abrir el contrato en PDF</span>
           <span class="pista">Se abre a pantalla completa para que puedas leerlo con calma.</span>
         </span>
       </a>`
    : `<div class="visor"><div class="vacio">
         El documento en PDF todavía no está disponible.<br />
         Contacta con la agencia para recibirlo.
       </div></div>`;

  const cuerpo = `
    <header class="glass">
      ${cabeceraAgencia()}
      <h1>${escapar(vista.titulo)}</h1>
      <p class="sub">${escapar(vista.plantilla)} &middot; Referencia ${escapar(vista.referencia)}</p>
      <p class="presenta">
        ${escapar(AGENCIA.nombre)} te envía este documento para que lo revises y lo firmes.
        Si tienes cualquier duda, responde al mensaje con el que lo recibiste.
      </p>
      ${
        vista.tienePdf
          ? `<p style="margin-top:14px"><a class="descarga" href="${rutaPdf}" download>Descargar el documento en PDF</a></p>`
          : ''
      }
    </header>

    <section class="glass" style="padding:14px">${visor}</section>

    ${bloqueFirma(vista, token)}`;

  return documento(`${vista.titulo} · Firma de documento`, cuerpo);
}

/**
 * Pagina para un enlace que ya no sirve (token inexistente, mal pegado en
 * WhatsApp o contrato anulado). Antes de esto el cliente veia el JSON crudo del
 * filtro de excepciones.
 */
export function renderPublicSignErrorPage(mensaje: string): string {
  const cuerpo = `
    <header class="glass">
      ${cabeceraAgencia()}
      <h1>Este enlace ya no está disponible</h1>
      <p class="sub">${escapar(mensaje)}</p>
      <p class="presenta">
        Puede que el enlace se haya cortado al copiarlo o que el documento ya no
        esté vigente. Ponte en contacto con ${escapar(AGENCIA.nombre)} y te
        enviamos uno nuevo${AGENCIA.contacto ? ` (${escapar(AGENCIA.contacto)})` : ''}.
      </p>
    </header>`;

  return documento('Enlace no disponible', cuerpo);
}
