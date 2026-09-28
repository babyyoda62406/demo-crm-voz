import { useState } from 'react';
import type { FormEvent } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { useClientActions } from '../hooks/useClients';
import type { Client } from '../requests/clients.requests';

interface DiscardClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onDiscarded: () => void;
}

/** Motivos frecuentes: un clic los rellena y la persona usuaria puede matizarlos. */
const MOTIVOS_FRECUENTES = [
  'Presupuesto insuficiente para la zona',
  'Ha comprado por otro canal',
  'No responde tras varios intentos',
  'Aplaza la decisión',
  'No encaja con nuestros servicios',
];

const controlClasses =
  'w-full px-3 py-2 backdrop-blur-md bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-white/50 text-gray-900 placeholder-gray-600 text-base';

/** Descarta un cliente exigiendo un motivo, que queda en su historial. */
export const DiscardClientModal = ({
  isOpen,
  onClose,
  client,
  onDiscarded,
}: DiscardClientModalProps) => {
  const { discardClient, isSaving } = useClientActions();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const [abiertoPrevio, setAbiertoPrevio] = useState(isOpen);
  if (abiertoPrevio !== isOpen) {
    setAbiertoPrevio(isOpen);
    if (isOpen) {
      setMotivo('');
      setError('');
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;

    if (motivo.trim().length < 3) {
      setError('Indica el motivo del descarte (al menos 3 caracteres).');
      return;
    }

    const descartado = await discardClient(client.id, motivo.trim());
    if (descartado) {
      onDiscarded();
      onClose();
    }
  };

  const nombreCompleto = client
    ? `${client.nombre} ${client.apellidos ?? ''}`.trim()
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Descartar cliente" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200/60 bg-amber-50/40 backdrop-blur-md px-4 py-3">
          <FiAlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            <strong>{nombreCompleto}</strong> pasará a la lista de descartados. No se
            borra nada: podrás reactivarlo cuando quieras y el motivo quedará en su
            historial.
          </p>
        </div>

        <div>
          <label
            className="block text-base font-semibold text-gray-900 mb-2"
            htmlFor="motivo-descarte"
          >
            Motivo del descarte *
          </label>
          <textarea
            id="motivo-descarte"
            rows={3}
            value={motivo}
            onChange={(event) => {
              setMotivo(event.target.value);
              if (error) setError('');
            }}
            placeholder="¿Por qué se descarta a este cliente?"
            className={`${controlClasses} resize-y`}
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
        </div>

        <div>
          <p className="text-sm text-gray-700 mb-2 select-none">Motivos frecuentes</p>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS_FRECUENTES.map((sugerencia) => (
              <button
                key={sugerencia}
                type="button"
                onClick={() => {
                  setMotivo(sugerencia);
                  setError('');
                }}
                className="px-3 py-1.5 rounded-lg border border-white/30 backdrop-blur-md bg-white/30 text-sm text-gray-800 hover:bg-white/45 transition-colors cursor-pointer select-none"
              >
                {sugerencia}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/30">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" isLoading={isSaving}>
            Descartar cliente
          </Button>
        </div>
      </form>
    </Modal>
  );
};
