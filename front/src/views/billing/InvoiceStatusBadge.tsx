import { FiCheckCircle, FiClock, FiSlash } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { InvoiceStatus, InvoiceStatusLabels } from './invoice.types';
import type { InvoiceStatusType } from './invoice.types';

interface InvoiceStatusBadgeProps {
  estado: InvoiceStatusType;
  className?: string;
}

const ESTILOS: Record<InvoiceStatusType, string> = {
  [InvoiceStatus.EMITIDA]: 'bg-blue-500/15 text-blue-800 border-blue-500/30',
  [InvoiceStatus.COBRADA]: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
  [InvoiceStatus.ANULADA]: 'bg-red-500/15 text-red-800 border-red-500/30',
};

const ICONOS: Record<InvoiceStatusType, IconType> = {
  [InvoiceStatus.EMITIDA]: FiClock,
  [InvoiceStatus.COBRADA]: FiCheckCircle,
  [InvoiceStatus.ANULADA]: FiSlash,
};

/** Distintivo de estado de una factura, con color e icono propios. */
export const InvoiceStatusBadge = ({ estado, className = '' }: InvoiceStatusBadgeProps) => {
  const estilo = ESTILOS[estado] ?? 'bg-gray-500/15 text-gray-800 border-gray-500/30';
  const Icono = ICONOS[estado] ?? FiClock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-sm text-xs font-semibold select-none whitespace-nowrap ${estilo} ${className}`}
    >
      <Icono className="w-3.5 h-3.5" />
      {InvoiceStatusLabels[estado] ?? estado}
    </span>
  );
};
