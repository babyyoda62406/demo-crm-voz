import { useNavigate } from 'react-router-dom';
import { FiActivity } from 'react-icons/fi';
import type { ActividadReciente } from '../dashboard.types';

interface RecentActivityPanelProps {
  actividad: ActividadReciente[];
  loading?: boolean;
}

/**
 * Distancia en palabras entre una fecha y ahora. Se resuelve en el front para
 * que el texto siga siendo correcto aunque la pestaña lleve horas abierta.
 */
const haceTexto = (valor: string): string => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';

  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (minutos < 1) return 'ahora mismo';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;

  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'hace un mes' : `hace ${meses} meses`;
};

/**
 * Últimos apuntes del historial de clientes: llamadas, visitas, correos y
 * cambios de etapa. Es la columna que da sensación de CRM vivo en la demo.
 */
export const RecentActivityPanel = ({
  actividad,
  loading = false,
}: RecentActivityPanelProps) => {
  const navigate = useNavigate();

  return (
    <section className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4 flex flex-col">
      <header className="mb-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
          <FiActivity className="w-5 h-5 text-blue-600" />
          Actividad reciente
        </h2>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((fila) => (
            <div key={fila} className="h-12 rounded-lg bg-white/40 animate-pulse" />
          ))}
        </div>
      ) : actividad.length === 0 ? (
        <p className="text-sm text-gray-600 py-6 text-center">
          Todavía no se ha registrado ningún movimiento en el historial de clientes.
        </p>
      ) : (
        <ol className="relative overflow-y-auto max-h-96 pr-1">
          {actividad.map((apunte, indice) => (
            <li key={apunte.id} className="relative pl-6 pb-4 last:pb-0">
              {/* Hilo vertical del cronograma */}
              {indice < actividad.length - 1 && (
                <span
                  className="absolute left-[5px] top-3 bottom-0 w-px bg-white/60"
                  aria-hidden="true"
                />
              )}
              <span
                className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white/80 shadow-sm"
                aria-hidden="true"
              />

              <button
                type="button"
                onClick={() => navigate('/clientes')}
                className="w-full text-left group cursor-pointer"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <strong className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                    {apunte.clienteNombre}
                  </strong>
                  <span className="text-[11px] text-gray-500 flex-shrink-0 tabular-nums">
                    {haceTexto(apunte.fecha)}
                  </span>
                </span>
                <span className="block text-xs text-gray-700 mt-0.5 line-clamp-2">
                  {apunte.descripcion}
                </span>
                <span className="block text-[11px] text-gray-500 mt-0.5">
                  {apunte.tipoLabel}
                  {apunte.autor ? ` · ${apunte.autor}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
