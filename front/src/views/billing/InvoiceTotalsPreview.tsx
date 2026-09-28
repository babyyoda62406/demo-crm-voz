import { formatCurrency } from '../../helpers/formatters';
import { aNumero } from './invoice.helpers';

interface InvoiceTotalsPreviewProps {
  baseImponible: number;
  cuotaIva: number;
  total: number;
  /** Tipo de IVA tal como está en el formulario, para rotular la fila. */
  tipoIva: string;
}

/** Desglose de importes que se recalcula con cada tecla del formulario. */
export const InvoiceTotalsPreview = ({
  baseImponible,
  cuotaIva,
  total,
  tipoIva,
}: InvoiceTotalsPreviewProps) => (
  <div className="backdrop-blur-md bg-white/40 rounded-xl border border-white/30 p-4 shadow-sm">
    <dl className="space-y-2 max-w-sm ml-auto">
      <div className="flex items-center justify-between gap-6 text-sm">
        <dt className="text-gray-700">Base imponible</dt>
        <dd className="font-semibold text-gray-900 tabular-nums">
          {formatCurrency(baseImponible)}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-6 text-sm">
        <dt className="text-gray-700">
          IVA ({new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(
            aNumero(tipoIva),
          )}{' '}
          %)
        </dt>
        <dd className="font-semibold text-gray-900 tabular-nums">
          {formatCurrency(cuotaIva)}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-6 pt-2 border-t border-white/40">
        <dt className="text-base font-bold text-gray-900">Total factura</dt>
        <dd className="text-xl font-bold text-blue-700 tabular-nums drop-shadow-sm">
          {formatCurrency(total)}
        </dd>
      </div>
    </dl>
  </div>
);
