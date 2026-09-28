import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiInfo, FiRefreshCw } from 'react-icons/fi';

import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { getErrorMessage } from '../../../helpers/errorHandler';
import { getSuccessMessage } from '../../../helpers/successHandler';
import { createProrroga } from '../requests/contracts.requests';
import type { Contract } from '../types/contracts.types';

interface ProrrogaModalProps {
  contrato: Contract | null;
  onClose: () => void;
  onCreada: (prorroga: Contract) => void;
}

const controlClasses =
  'w-full px-3 py-2 backdrop-blur-md bg-white/50 border border-white/40 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50';

/**
 * Crea una prórroga a partir de un contrato de alquiler.
 * Los datos de las partes, el inmueble y las fechas del contrato original los
 * precarga el backend; aquí solo se piden las condiciones de la prórroga.
 */
export const ProrrogaModal = ({
  contrato,
  onClose,
  onCreada,
}: ProrrogaModalProps) => {
  const [duracion, setDuracion] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [titulo, setTitulo] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!contrato) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDuracion('');
    setFechaFin('');
    setTitulo('');
  }, [contrato]);

  const crear = async () => {
    if (!contrato) return;

    if (!duracion.trim() || !fechaFin.trim()) {
      toast.error('Indica la duración de la prórroga y la nueva fecha de fin');
      return;
    }

    setCreando(true);
    try {
      const respuesta = await createProrroga(contrato.id, {
        titulo: titulo.trim() || undefined,
        datos: {
          duracionProrroga: duracion.trim(),
          fechaFinProrroga: fechaFin.trim(),
        },
      });
      toast.success(getSuccessMessage(respuesta.flag, respuesta.message));
      onCreada(respuesta.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo crear la prórroga'));
    } finally {
      setCreando(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(contrato)}
      onClose={onClose}
      title="Crear prórroga"
      size="lg"
    >
      {contrato && (
        <div className="space-y-4">
          <div className="rounded-lg backdrop-blur-md bg-white/25 border border-white/30 p-3">
            <p className="font-semibold text-gray-900">{contrato.titulo}</p>
            <p className="text-sm text-gray-600">
              Contrato original {contrato.referencia}
            </p>
          </div>

          <p className="text-sm text-gray-700 flex items-start gap-2">
            <FiInfo className="w-4 h-4 mt-0.5 flex-none text-blue-600" />
            Las partes, el inmueble y las fechas del contrato original se
            copian automáticamente. Solo hace falta indicar las condiciones de
            la prórroga.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="duracion-prorroga"
                className="block text-sm font-semibold text-gray-900 mb-1.5"
              >
                Duración de la prórroga <span className="text-red-600">*</span>
              </label>
              <input
                id="duracion-prorroga"
                type="text"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                placeholder="seis meses"
                className={controlClasses}
              />
            </div>
            <div>
              <label
                htmlFor="fecha-fin-prorroga"
                className="block text-sm font-semibold text-gray-900 mb-1.5"
              >
                Nueva fecha de vencimiento <span className="text-red-600">*</span>
              </label>
              <input
                id="fecha-fin-prorroga"
                type="text"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                placeholder="28 de febrero de 2027"
                className={controlClasses}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="titulo-prorroga"
                className="block text-sm font-semibold text-gray-900 mb-1.5"
              >
                Título (opcional)
              </label>
              <input
                id="titulo-prorroga"
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={`Prórroga · ${contrato.titulo}`}
                className={controlClasses}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} className="!px-5 !py-2">
              Cancelar
            </Button>
            <Button onClick={crear} isLoading={creando} className="!px-5 !py-2">
              <span className="flex items-center gap-2">
                <FiRefreshCw className="w-4 h-4" />
                Generar prórroga
              </span>
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
