import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDownload,
  FiExternalLink,
  FiFileText,
} from 'react-icons/fi';

import { Button } from '../../components/Button';

import { mensajeDeApi } from './helpers/contracts.helpers';
import {
  getPublicContract,
  getPublicPdfUrl,
  signPublicContract,
} from './requests/contracts.requests';
import type { PublicContractView as VistaPublica } from './types/contracts.types';
import { ContractState } from './types/contracts.types';

/**
 * Vista pública de firma (ruta `/firmar/:token`, SIN autenticación).
 *
 * Es la ÚNICA pantalla del producto que ve el cliente final, y la abrirá casi
 * siempre desde el móvil, así que manda el móvil:
 * - por debajo de 768 px el contrato no se mete en un iframe diminuto (a esa
 *   escala una página A4 deja el texto en unos 4 px, ilegible): se abre a
 *   pantalla completa con el visor del propio teléfono;
 * - el bloque de firma queda anclado abajo, siempre a mano;
 * - la cabecera lleva la marca de la agencia, no la del software, y no se
 *   enseña el estado interno del CRM («Visto» no significa nada para quien
 *   firma, y además le revela que se traza cuándo abre el enlace).
 */
export const PublicSignView = () => {
  const { token = '' } = useParams<{ token: string }>();

  const [contrato, setContrato] = useState<VistaPublica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [firmando, setFirmando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setContrato(await getPublicContract(token));
    } catch (err) {
      setError(
        mensajeDeApi(err, 'El enlace de firma no es válido o ha caducado'),
      );
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    // Sincronización con la API: el estado se actualiza dentro de la promesa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  const firmar = async () => {
    if (nombre.trim().length < 3) {
      toast.error('Indica tu nombre y apellidos completos');
      return;
    }

    setFirmando(true);
    try {
      const respuesta = await signPublicContract(token, nombre.trim());
      setContrato(respuesta.data);
      toast.success('Documento firmado correctamente');
    } catch (err) {
      toast.error(mensajeDeApi(err, 'No se ha podido registrar la firma'));
    } finally {
      setFirmando(false);
    }
  };

  if (cargando) {
    return (
      <div className="auth-background min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="auth-background min-h-screen flex items-center justify-center p-5">
        <div className="backdrop-blur-xl bg-white/30 rounded-2xl shadow-xl border border-white/40 p-7 max-w-md text-center space-y-3">
          <FiAlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900">
            Este enlace ya no está disponible
          </h1>
          <p className="text-gray-700">{error}</p>
          <p className="text-sm text-gray-600">
            Puede que se haya cortado al copiarlo o que el documento ya no esté
            vigente. Ponte en contacto con la agencia que te lo envió y te
            mandarán uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  const firmado = contrato.estado === ContractState.FIRMADO;
  const urlPdf = getPublicPdfUrl(token, contrato.firmadoAt);
  const inicial = (contrato.agenciaNombre || 'A').trim().charAt(0).toUpperCase();

  return (
    <div className="auth-background min-h-screen p-3 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Cabecera con la marca de la agencia */}
        <header className="backdrop-blur-xl bg-white/30 rounded-2xl shadow-lg border border-white/40 p-5 sm:p-6">
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/50">
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-lg shadow-md flex-none">
              {inicial}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 leading-tight truncate">
                {contrato.agenciaNombre}
              </p>
              <p className="text-xs text-gray-600">
                {contrato.agenciaDescripcion}
              </p>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 drop-shadow-sm">
            {contrato.titulo}
          </h1>
          <p className="mt-1 text-sm text-gray-700">
            {contrato.plantilla} · Referencia {contrato.referencia}
          </p>
          <p className="mt-3 text-sm text-gray-800 leading-relaxed">
            {contrato.agenciaNombre} te envía este documento para que lo revises
            y lo firmes. Si tienes cualquier duda, responde al mensaje con el que
            lo recibiste.
          </p>

          {contrato.tienePdf && (
            <a
              href={urlPdf}
              download={`${contrato.referencia}.pdf`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
            >
              <FiDownload className="w-4 h-4" />
              Descargar el documento en PDF
            </a>
          )}
        </header>

        {/* Documento */}
        {contrato.tienePdf ? (
          <>
            {/* Móvil: el PDF se abre a pantalla completa con el visor del
                teléfono. Dentro de una tarjeta de 330 px sería ilegible. */}
            <a
              href={urlPdf}
              target="_blank"
              rel="noreferrer"
              className="md:hidden flex items-center gap-3 p-4 rounded-2xl backdrop-blur-xl bg-white/35 border border-white/50 shadow-lg active:scale-[0.99] transition-transform"
            >
              <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/15 text-blue-700 flex-none">
                <FiFileText className="w-6 h-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-gray-900">
                  Abrir el contrato en PDF
                </span>
                <span className="block text-sm text-gray-600">
                  Se abre a pantalla completa para que puedas leerlo con calma.
                </span>
              </span>
              <FiExternalLink className="w-5 h-5 text-gray-600 flex-none" />
            </a>

            {/* Escritorio: visor incrustado */}
            <section className="hidden md:block backdrop-blur-xl bg-white/25 rounded-2xl shadow-lg border border-white/40 p-3">
              <iframe
                src={urlPdf}
                title="Documento a firmar"
                className="w-full h-[65vh] min-h-[420px] rounded-xl border-0 bg-white/60"
              />
            </section>
          </>
        ) : (
          <section className="backdrop-blur-xl bg-white/25 rounded-2xl shadow-lg border border-white/40 p-6 text-center">
            <p className="text-gray-700 max-w-sm mx-auto">
              El documento en PDF todavía no está disponible. Contacta con la
              agencia para recibirlo.
            </p>
          </section>
        )}

        {/* Firma: anclada abajo para que el botón esté siempre a mano */}
        <section className="sticky bottom-2 z-10 backdrop-blur-xl bg-white/45 rounded-2xl shadow-xl border border-white/50 p-5 sm:p-6">
          {firmado ? (
            <div className="flex items-start gap-4">
              <FiCheckCircle className="w-9 h-9 text-emerald-600 flex-none" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Documento firmado
                </h2>
                <p className="mt-1 text-gray-700 text-sm">
                  Firmado por <strong>{contrato.firmanteNombre}</strong>
                  {contrato.firmadoAt && ` el ${fechaLegible(contrato.firmadoAt)}`}
                  . Ya puedes descargar tu copia: incluye la diligencia con la
                  fecha y la hora de tu firma.
                </p>
                <a
                  href={urlPdf}
                  download={`${contrato.referencia}.pdf`}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
                >
                  <FiDownload className="w-4 h-4" />
                  Descargar el documento firmado
                </a>
              </div>
            </div>
          ) : (
            // Compacto en móvil: el bloque va anclado abajo y cuanto menos
            // ocupe, más contrato se ve por detrás.
            <div className="space-y-2 sm:space-y-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Firmar el documento
                </h2>
                <p className="mt-1 text-gray-700 text-sm hidden sm:block">
                  Escribe tu nombre y apellidos para aceptar su contenido.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="firmante"
                    className="block text-sm font-semibold text-gray-900 mb-1.5"
                  >
                    Nombre y apellidos
                  </label>
                  <input
                    id="firmante"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre completo del firmante"
                    autoComplete="name"
                    className="w-full px-4 py-3 text-base backdrop-blur-md bg-white/70 border border-white/60 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <Button
                  onClick={firmar}
                  isLoading={firmando}
                  className="w-full sm:w-auto !py-3.5 sm:!py-3 text-base"
                >
                  Firmar documento
                </Button>
              </div>

              <p className="text-[11px] sm:text-xs text-gray-600 leading-snug sm:leading-relaxed">
                Al pulsar «Firmar documento» declaras haber leído el documento y
                aceptar su contenido. Se registrará tu nombre, la fecha y la hora
                de la firma, y quedarán recogidos en el propio PDF.
              </p>
            </div>
          )}
        </section>

        <footer className="text-center text-sm text-gray-600 pb-4">
          {contrato.agenciaNombre}
        </footer>
      </div>
    </div>
  );
};

/** «23/08/2026 a las 08:36», sin segundos y con ceros a la izquierda. */
const fechaLegible = (valor: string): string => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';

  const partes = new Intl.DateTimeFormat('es-ES', {
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
