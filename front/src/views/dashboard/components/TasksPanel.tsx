import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiUserX,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { NotificationPriority } from '../dashboard.types';
import type { TareaHoy } from '../dashboard.types';

interface TasksPanelProps {
  tareas: TareaHoy[];
  loading?: boolean;
  /** Lanza a mano el motor de reglas para recalcular los avisos. */
  onRevisar?: () => void;
  revisando?: boolean;
}

/** Icono por tipo de aviso; el resto cae en la campana genérica. */
const ICONOS: Record<string, IconType> = {
  aviso_prorroga: FiRefreshCw,
  contrato_sin_firmar: FiFileText,
  cliente_sin_actividad: FiUserX,
  factura_vencida: FiClock,
};

/** Distintivo de color por prioridad. */
const PRIORIDAD_ESTILO: Record<string, string> = {
  [NotificationPriority.ALTA]: 'text-red-700 bg-red-500/15 border-red-500/30',
  [NotificationPriority.MEDIA]: 'text-amber-700 bg-amber-500/15 border-amber-500/30',
  [NotificationPriority.BAJA]: 'text-blue-700 bg-blue-500/15 border-blue-500/30',
};

/**
 * Traduce los días que faltan a un texto que se pueda leer sin pensar.
 * Positivo = queda tiempo; negativo = ya se ha pasado el plazo.
 */
const plazoTexto = (dias: number): string => {
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  if (dias > 1) return `En ${dias} días`;
  if (dias === -1) return 'Venció ayer';
  return `Hace ${Math.abs(dias)} días`;
};

/**
 * Tareas y alertas del día calculadas por el motor de reglas: prórrogas a 30
 * días, contratos enviados sin firmar, clientes parados y cobros atrasados.
 *
 * Al pulsar un aviso se navega al módulo al que apunta (`enlace`), de modo que
 * durante la demo se puede saltar del panel al contrato concreto.
 *
 * La lista ocupa todo el alto que le sobra a la sección —que se estira para
 * igualar al embudo de al lado—, así que se ven los avisos que anuncia el
 * contador en vez de quedarse tres tras un scroll sin barra visible.
 */
export const TasksPanel = ({
  tareas,
  loading = false,
  onRevisar,
  revisando = false,
}: TasksPanelProps) => {
  const navigate = useNavigate();

  return (
    <section className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4 flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-gray-900 whitespace-nowrap">
          <FiAlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          Tareas de hoy
          {!loading && tareas.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-800 tabular-nums">
              {tareas.length}
            </span>
          )}
        </h2>

        {onRevisar && (
          <button
            type="button"
            onClick={onRevisar}
            disabled={revisando}
            title="Volver a evaluar las reglas de alertas"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm bg-white/30 border border-white/30 text-xs font-medium text-gray-700 hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${revisando ? 'animate-spin' : ''}`} />
            Revisar
          </button>
        )}
      </header>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((fila) => (
            <div key={fila} className="h-16 rounded-lg bg-white/40 animate-pulse" />
          ))}
        </div>
      ) : tareas.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-8 gap-2">
          <FiCheckCircle className="w-9 h-9 text-emerald-600" />
          <p className="text-sm font-medium text-gray-800">Nada pendiente por hoy</p>
          <p className="text-xs text-gray-600 max-w-xs">
            No hay prórrogas próximas, contratos sin firmar ni clientes parados.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
          {tareas.map((tarea) => {
            const Icono = ICONOS[tarea.tipo] ?? FiBell;
            const estilo =
              PRIORIDAD_ESTILO[tarea.prioridad] ??
              'text-gray-700 bg-gray-500/15 border-gray-500/30';
            const vencido = tarea.dias < 0;

            return (
              <li key={tarea.clave}>
                <button
                  type="button"
                  onClick={() => tarea.enlace && navigate(tarea.enlace)}
                  disabled={!tarea.enlace}
                  className="w-full text-left flex items-start gap-3 p-3 rounded-lg backdrop-blur-md bg-white/40 border border-white/30 hover:bg-white/60 disabled:hover:bg-white/40 disabled:cursor-default transition-colors cursor-pointer"
                >
                  <span
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border backdrop-blur-sm flex-shrink-0 ${estilo}`}
                  >
                    <Icono className="w-4 h-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <strong className="text-sm font-semibold text-gray-900 truncate">
                        {tarea.titulo}
                      </strong>
                      <span
                        className={`text-xs font-semibold flex-shrink-0 tabular-nums ${
                          vencido ? 'text-red-700' : 'text-gray-600'
                        }`}
                      >
                        {plazoTexto(tarea.dias)}
                      </span>
                    </span>
                    <span className="block text-xs text-gray-700 mt-0.5 line-clamp-2">
                      {tarea.mensaje}
                    </span>
                    <span className="block text-[11px] text-gray-500 mt-1">
                      {tarea.tipoLabel}
                      {tarea.entidadNombre ? ` · ${tarea.entidadNombre}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
