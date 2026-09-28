import { FiCheckCircle, FiEdit3, FiEye, FiSend, FiSlash } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { ContractState } from '../types/contracts.types';
import type { ContractStateValue } from '../types/contracts.types';
import {
  contractStateClasses,
  contractStateLabels,
} from '../helpers/contracts.helpers';

const iconos: Record<ContractStateValue, IconType> = {
  [ContractState.BORRADOR]: FiEdit3,
  [ContractState.ENVIADO]: FiSend,
  [ContractState.VISTO]: FiEye,
  [ContractState.FIRMADO]: FiCheckCircle,
  [ContractState.ANULADO]: FiSlash,
};

interface ContractStatusBadgeProps {
  estado: ContractStateValue;
  className?: string;
}

/** Distintivo de estado del contrato con su icono y color. */
export const ContractStatusBadge = ({
  estado,
  className = '',
}: ContractStatusBadgeProps) => {
  const Icono = iconos[estado] ?? FiEdit3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-sm text-xs font-semibold select-none whitespace-nowrap ${
        contractStateClasses[estado] ?? contractStateClasses.borrador
      } ${className}`}
    >
      <Icono className="w-3.5 h-3.5" />
      {contractStateLabels[estado] ?? estado}
    </span>
  );
};
