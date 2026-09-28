import { useState } from 'react';
import type { ReactNode } from 'react';
import { FiChevronDown, FiFilter } from 'react-icons/fi';

interface CollapsibleFiltersProps {
  children: ReactNode;
  /** Cuántos filtros hay activos, para avisar de que el listado está acotado. */
  activos?: number;
  className?: string;
}

/**
 * Barra de filtros plegada en móvil y siempre desplegada en escritorio.
 *
 * En un móvil de 390 px los filtros apilados ocupaban media pantalla antes de
 * enseñar un solo registro; aquí se abren solo cuando hacen falta.
 */
export const CollapsibleFilters = ({
  children,
  activos = 0,
  className = '',
}: CollapsibleFiltersProps) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-expanded={abierto}
        className="md:hidden flex w-full min-h-11 items-center justify-between gap-2 rounded-lg backdrop-blur-xl bg-white/25 border border-white/30 px-4 text-sm font-semibold text-gray-800 shadow-sm cursor-pointer select-none"
      >
        <span className="flex items-center gap-2">
          <FiFilter className="w-4 h-4" />
          Filtros
          {activos > 0 && (
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
              {activos}
            </span>
          )}
        </span>
        <FiChevronDown
          className={`w-4 h-4 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      <div className={`${abierto ? 'mt-3' : 'hidden'} md:mt-0 md:block`}>{children}</div>
    </div>
  );
};
