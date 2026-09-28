import type { IconType } from 'react-icons';
import {
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiPercent,
  FiSlash,
  FiTrendingUp,
} from 'react-icons/fi';
import { formatCurrency, formatNumber } from '../../helpers/formatters';
import type { InvoiceSummary } from './invoice.types';

interface InvoiceSummaryCardsProps {
  resumen: InvoiceSummary | null;
  loading?: boolean;
  /** Texto que acompaña al bloque para situar el periodo o el cliente. */
  descripcion?: string;
}

interface Tarjeta {
  clave: string;
  etiqueta: string;
  valor: number | null;
  icono: IconType;
  color: string;
}

/**
 * Totales de un conjunto de facturas: cuatro cifras principales y una tira
 * inferior con el desglose de base imponible e IVA.
 *
 * Las facturas anuladas no suman en «facturado», «cobrado» ni «pendiente»:
 * el backend las agrega aparte para que el total del periodo sea el real.
 */
export const InvoiceSummaryCards = ({
  resumen,
  loading = false,
  descripcion,
}: InvoiceSummaryCardsProps) => {
  const tarjetas: Tarjeta[] = [
    {
      clave: 'total',
      etiqueta: 'Total facturado',
      valor: resumen?.total ?? null,
      icono: FiTrendingUp,
      color: 'text-blue-700 bg-blue-500/15 border-blue-500/30',
    },
    {
      clave: 'cobrado',
      etiqueta: 'Cobrado',
      valor: resumen?.totalCobrado ?? null,
      icono: FiCheckCircle,
      color: 'text-emerald-700 bg-emerald-500/15 border-emerald-500/30',
    },
    {
      clave: 'pendiente',
      etiqueta: 'Pendiente de cobro',
      valor: resumen?.totalPendiente ?? null,
      icono: FiClock,
      color: 'text-amber-700 bg-amber-500/15 border-amber-500/30',
    },
    {
      clave: 'anulado',
      etiqueta: 'Anulado',
      valor: resumen?.totalAnulado ?? null,
      icono: FiSlash,
      color: 'text-red-700 bg-red-500/15 border-red-500/30',
    },
  ];

  return (
    <section className="backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 p-3 md:p-4 space-y-3 md:space-y-4">
      {descripcion && (
        <p className="hidden sm:block text-sm font-medium text-gray-700 select-none">{descripcion}</p>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 md:gap-3">
        {tarjetas.map(({ clave, etiqueta, valor, icono: Icono, color }) => (
          <div
            key={clave}
            className="backdrop-blur-md bg-white/40 rounded-lg border border-white/30 p-3 md:p-4 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border backdrop-blur-sm ${color}`}
              >
                <Icono className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide select-none">
                {etiqueta}
              </span>
            </div>
            <p className="mt-2 md:mt-3 text-lg md:text-2xl font-bold text-gray-900 tabular-nums drop-shadow-sm break-words">
              {loading && valor === null ? '···' : formatCurrency(valor)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-sm text-gray-700">
        <span className="inline-flex items-center gap-2">
          <FiFileText className="w-4 h-4 text-blue-600" />
          <strong className="text-gray-900 tabular-nums">
            {resumen ? formatNumber(resumen.numeroFacturas) : '—'}
          </strong>
          facturas
        </span>
        <span className="inline-flex items-center gap-2">
          <FiTrendingUp className="w-4 h-4 text-blue-600" />
          Base imponible
          <strong className="text-gray-900 tabular-nums">
            {formatCurrency(resumen?.baseImponible ?? null)}
          </strong>
        </span>
        <span className="inline-flex items-center gap-2">
          <FiPercent className="w-4 h-4 text-blue-600" />
          IVA repercutido
          <strong className="text-gray-900 tabular-nums">
            {formatCurrency(resumen?.cuotaIva ?? null)}
          </strong>
        </span>
      </div>
    </section>
  );
};
