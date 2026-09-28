import type { IconType } from 'react-icons';
import { FiArrowDownRight, FiArrowUpRight } from 'react-icons/fi';

interface MetricCardProps {
  etiqueta: string;
  /** Cifra ya formateada (número o importe). */
  valor: string;
  icono: IconType;
  /** Clases de color del distintivo del icono. */
  color: string;
  /** Texto pequeño bajo la cifra: contexto del dato. */
  detalle?: string;
  /** Variación porcentual respecto al periodo anterior. */
  variacion?: number | null;
  loading?: boolean;
  onClick?: () => void;
}

/**
 * Tarjeta de titular del panel: número grande sobre cristal.
 *
 * Si recibe `onClick` se comporta como botón (navega al módulo correspondiente);
 * si no, se pinta como un bloque estático para no ofrecer una pista falsa.
 */
export const MetricCard = ({
  etiqueta,
  valor,
  icono: Icono,
  color,
  detalle,
  variacion,
  loading = false,
  onClick,
}: MetricCardProps) => {
  const hayVariacion = typeof variacion === 'number' && Number.isFinite(variacion);
  const sube = hayVariacion && (variacion as number) >= 0;

  const contenido = (
    <>
      <div className="flex items-start justify-between gap-2 md:gap-3">
        <span className="min-w-0 text-xs font-semibold text-gray-700 uppercase tracking-wide select-none">
          {etiqueta}
        </span>
        <span
          className={`inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg border backdrop-blur-sm flex-shrink-0 ${color}`}
        >
          <Icono className="w-4.5 h-4.5" />
        </span>
      </div>

      {/* En dos columnas de móvil un importe como «3.170,20 €» no cabe a 30 px:
          la cifra baja de tamaño y, si aun así se pasa, parte por el espacio. */}
      <p className="mt-2 md:mt-3 text-xl md:text-3xl font-bold text-gray-900 tabular-nums drop-shadow-sm break-words">
        {loading ? '···' : valor}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 min-h-5">
        {hayVariacion && !loading && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
              sube ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {sube ? (
              <FiArrowUpRight className="w-3.5 h-3.5" />
            ) : (
              <FiArrowDownRight className="w-3.5 h-3.5" />
            )}
            {`${sube ? '+' : ''}${(variacion as number).toFixed(1).replace('.', ',')} %`}
          </span>
        )}
        {detalle && <span className="text-xs text-gray-600 truncate">{detalle}</span>}
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className="backdrop-blur-xl bg-white/30 rounded-xl border border-white/30 shadow-lg p-3 md:p-4">
        {contenido}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left backdrop-blur-xl bg-white/30 rounded-xl border border-white/30 shadow-lg p-3 md:p-4 transition-all duration-200 hover:bg-white/40 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer select-none"
    >
      {contenido}
    </button>
  );
};
