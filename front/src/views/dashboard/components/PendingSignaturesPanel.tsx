import { useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiEdit3 } from 'react-icons/fi';
import type { FirmaPendiente } from '../dashboard.types';

interface PendingSignaturesPanelProps {
  firmas: FirmaPendiente[];
  loading?: boolean;
}

/**
 * Contratos enviados o vistos que siguen esperando la firma del cliente,
 * del más antiguo al más reciente.
 *
 * A partir de tres días en espera el plazo se pinta en ámbar y a partir de
 * siete en rojo: es el mismo umbral con el que el motor de reglas dispara la
 * alerta «contrato sin firmar», así que el panel y la campana cuentan lo mismo.
 */
export const PendingSignaturesPanel = ({
  firmas,
  loading = false,
}: PendingSignaturesPanelProps) => {
  const navigate = useNavigate();

  const colorEspera = (dias: number): string => {
    if (dias >= 7) return 'text-red-700';
    if (dias >= 3) return 'text-amber-700';
    return 'text-gray-600';
  };

  return (
    <section className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4 flex flex-col">
      <header className="flex items-center justify-between gap-3 mb-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
          <FiEdit3 className="w-5 h-5 text-blue-600" />
          Pendientes de firma
        </h2>
        {!loading && firmas.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-xs font-bold text-blue-800 tabular-nums">
            {firmas.length}
          </span>
        )}
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((fila) => (
            <div key={fila} className="h-14 rounded-lg bg-white/40 animate-pulse" />
          ))}
        </div>
      ) : firmas.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-6 gap-2">
          <FiCheckCircle className="w-8 h-8 text-emerald-600" />
          <p className="text-sm text-gray-700">No hay contratos esperando firma.</p>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto max-h-72 pr-1">
          {firmas.map((firma) => (
            <li key={firma.id}>
              <button
                type="button"
                onClick={() => navigate('/contratos')}
                className="w-full text-left p-3 rounded-lg backdrop-blur-md bg-white/40 border border-white/30 hover:bg-white/60 transition-colors cursor-pointer"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <strong className="text-sm font-semibold text-gray-900 truncate">
                    {firma.clienteNombre ?? firma.titulo}
                  </strong>
                  <span
                    className={`text-xs font-semibold flex-shrink-0 tabular-nums ${colorEspera(
                      firma.diasEnEspera,
                    )}`}
                  >
                    {firma.diasEnEspera === 0
                      ? 'Enviado hoy'
                      : `${firma.diasEnEspera} ${
                          firma.diasEnEspera === 1 ? 'día' : 'días'
                        } en espera`}
                  </span>
                </span>
                <span className="block text-xs text-gray-700 mt-0.5 truncate">
                  {firma.titulo}
                </span>
                <span className="block text-[11px] text-gray-500 mt-0.5">
                  {firma.referencia} · {firma.estadoLabel}
                  {firma.destinatarioEmail ? ` · ${firma.destinatarioEmail}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
