import type { ReactNode } from 'react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  /**
   * Versión en tarjeta de una fila. Cuando se indica, por debajo de `md` la
   * tabla se sustituye por tarjetas apiladas: en un móvil de 390 px una tabla
   * de siete columnas solo enseña dos y pierde la cabecera al desplazarse.
   */
  renderMobileCard?: (item: T) => ReactNode;
}

export function Table<T extends { id?: number | string }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No hay datos disponibles',
  isLoading = false,
  className = '',
  renderMobileCard,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center px-4 py-12 ${className}`}>
        <p className="text-gray-500 text-sm text-center select-none">{emptyMessage}</p>
      </div>
    );
  }

  const tabla = (
    <table className="w-full border-collapse">
      <thead>
        <tr className="backdrop-blur-md bg-white/30 border-b border-white/30">
          {columns.map((column, index) => (
            <th
              key={index}
              className={`px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider select-none ${column.className || ''}`}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="backdrop-blur-sm bg-white/20 divide-y divide-white/20">
        {data.map((item, rowIndex) => (
          <tr
            key={item.id ?? rowIndex}
            onClick={() => onRowClick?.(item)}
            className={`hover:bg-white/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
          >
            {columns.map((column, colIndex) => (
              <td
                key={colIndex}
                className={`px-4 py-3 text-sm text-gray-900 ${column.className || ''}`}
              >
                {column.render
                  ? column.render(item)
                  : (item[column.key as keyof T] as ReactNode)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!renderMobileCard) {
    return <div className={`overflow-x-auto ${className}`}>{tabla}</div>;
  }

  return (
    <div className={className}>
      {/* Móvil y tableta vertical: una tarjeta por registro */}
      <ul className="divide-y divide-white/30 backdrop-blur-sm bg-white/20 md:hidden">
        {data.map((item, rowIndex) => (
          <li key={item.id ?? rowIndex} className="p-4">
            {renderMobileCard(item)}
          </li>
        ))}
      </ul>

      {/* Escritorio: la tabla de siempre */}
      <div className="hidden md:block overflow-x-auto">{tabla}</div>
    </div>
  );
}
