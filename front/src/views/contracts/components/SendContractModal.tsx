import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiCheck,
  FiCopy,
  FiExternalLink,
  FiLink,
  FiMessageCircle,
} from 'react-icons/fi';

import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { sendContract } from '../requests/contracts.requests';
import { mensajeDeApi } from '../helpers/contracts.helpers';
import type { Contract } from '../types/contracts.types';

interface SendContractModalProps {
  contrato: Contract | null;
  onClose: () => void;
  onEnviado: () => void;
}

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Generación del enlace público de firma.
 *
 * Aquí NO se manda ningún correo: el proyecto no tiene servidor de correo, y
 * llamar «Enviar» a esto hacía creer a la persona usuaria (y al cliente que ve la demo)
 * que el destinatario recibía un email. Lo que se hace es crear el enlace y
 * ponérselo fácil de compartir: copiar o WhatsApp.
 */
export const SendContractModal = ({
  contrato,
  onClose,
  onEnviado,
}: SendContractModalProps) => {
  const [destinatario, setDestinatario] = useState('');
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!contrato) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDestinatario(contrato.destinatarioEmail ?? '');
    setEnlace(null);
    setErrorCorreo(null);
  }, [contrato]);

  const generar = async () => {
    if (!contrato) return;

    const correo = destinatario.trim();
    if (correo && !CORREO_VALIDO.test(correo)) {
      setErrorCorreo('Ese correo no es válido. Revísalo o déjalo vacío.');
      return;
    }
    setErrorCorreo(null);

    setEnviando(true);
    try {
      const respuesta = await sendContract(contrato.id, {
        destinatarioEmail: correo || undefined,
      });
      setEnlace(respuesta.data.enlaceAplicacion);
      toast.success('Enlace de firma generado');
      onEnviado();
    } catch (error) {
      toast.error(mensajeDeApi(error, 'No se pudo generar el enlace de firma'));
    } finally {
      setEnviando(false);
    }
  };

  const copiar = async () => {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success('Enlace copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const enlaceWhatsapp = (): string =>
    `https://wa.me/?text=${encodeURIComponent(
      `Hola, te envío el contrato ${contrato?.referencia ?? ''} para su firma. Puedes leerlo y firmarlo desde este enlace: ${enlace ?? ''}`,
    )}`;

  return (
    <Modal
      isOpen={Boolean(contrato)}
      onClose={onClose}
      title="Enviar a firma"
      size="lg"
    >
      {contrato && (
        <div className="space-y-4">
          <div className="rounded-lg backdrop-blur-md bg-white/25 border border-white/30 p-3">
            <p className="font-semibold text-gray-900">{contrato.titulo}</p>
            <p className="text-sm text-gray-600">
              Referencia {contrato.referencia}
              {contrato.clienteNombre ? ` · ${contrato.clienteNombre}` : ''}
            </p>
          </div>

          {enlace ? (
            <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/50 backdrop-blur-md p-4 space-y-3">
              <p className="font-semibold text-emerald-900 flex items-center gap-2">
                <FiCheck className="w-4 h-4" />
                Enlace de firma generado
              </p>
              <p className="text-sm text-emerald-900/80">
                Cópialo y envíaselo al cliente por WhatsApp o por correo. Cuando
                lo abra, el contrato pasará a «Visto»; al firmarlo, a «Firmado».
              </p>
              <code className="block text-xs bg-white/60 border border-white/50 rounded-lg px-3 py-2 text-gray-800 break-all">
                {enlace}
              </code>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() => void copiar()}
                  className="!px-4 !py-2"
                >
                  <span className="flex items-center gap-2">
                    <FiCopy className="w-4 h-4" />
                    Copiar enlace
                  </span>
                </Button>
                <a
                  href={enlaceWhatsapp()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors select-none shadow-sm"
                >
                  <FiMessageCircle className="w-4 h-4" />
                  Enviar por WhatsApp
                </a>
                <a
                  href={enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/30 border border-white/30 text-sm font-semibold text-gray-900 hover:bg-white/45 transition-colors select-none"
                >
                  <FiExternalLink className="w-4 h-4" />
                  Abrir como el cliente
                </a>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="destinatario-envio"
                  className="block text-sm font-semibold text-gray-900 mb-1.5"
                >
                  Correo del destinatario (opcional)
                </label>
                <input
                  id="destinatario-envio"
                  type="email"
                  value={destinatario}
                  onChange={(e) => {
                    setDestinatario(e.target.value);
                    if (errorCorreo) setErrorCorreo(null);
                  }}
                  placeholder="administracion@example.com"
                  aria-invalid={Boolean(errorCorreo)}
                  className={`w-full px-3 py-2 backdrop-blur-md bg-white/50 border rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 ${
                    errorCorreo
                      ? 'border-red-500/70 focus:ring-red-500/40'
                      : 'border-white/40 focus:ring-blue-500/50'
                  }`}
                />
                {errorCorreo ? (
                  <p className="mt-1.5 text-xs font-medium text-red-700">
                    {errorCorreo}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-600">
                    Se guarda como referencia del envío. El enlace lo compartes
                    tú por WhatsApp o por correo.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose} className="!px-5 !py-2">
                  Cancelar
                </Button>
                <Button onClick={generar} isLoading={enviando} className="!px-5 !py-2">
                  <span className="flex items-center gap-2">
                    <FiLink className="w-4 h-4" />
                    Generar enlace de firma
                  </span>
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};
