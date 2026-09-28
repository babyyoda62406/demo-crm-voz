import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX } from 'react-icons/fi';

export type FilterValue = string | number | undefined;

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'date';
  placeholder?: string;
  options?: { value: string | number; label: string }[];
  /** Valor mínimo de los campos numéricos. Por defecto 0: no hay filtros negativos. */
  min?: number;
}

interface FilterBarProps {
  fields: FilterField[];
  values: Record<string, FilterValue>;
  onChange: (key: string, value: FilterValue) => void;
  onClear: () => void;
  onSearch?: () => void;
  className?: string;
}

const controlClasses =
  'w-full px-3 py-2 backdrop-blur-md bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-white/50 text-gray-900 placeholder-gray-600 text-base';

export function FilterBar({
  fields,
  values,
  onChange,
  onClear,
  onSearch,
  className = '',
}: FilterBarProps) {
  const { t } = useTranslation('commons');
  const hasActiveFilters = Object.values(values).some(
    (value) => value !== undefined && value !== null && value !== '',
  );

  /** Enter en cualquier campo lanza la búsqueda, sin tener que ir al botón. */
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !onSearch) return;
    event.preventDefault();
    onSearch();
  };

  return (
    <div
      className={`backdrop-blur-xl bg-white/20 p-4 rounded-lg shadow-lg border border-white/30 ${className}`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-base font-medium text-gray-900 mb-1 select-none">
              {field.label}
            </label>
            {field.type === 'text' && (
              <input
                type="text"
                value={values[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                onKeyDown={handleEnter}
                placeholder={field.placeholder}
                className={controlClasses}
              />
            )}
            {field.type === 'date' && (
              <input
                type="date"
                value={values[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value || undefined)}
                onKeyDown={handleEnter}
                className={`${controlClasses} cursor-pointer`}
              />
            )}
            {field.type === 'select' && (
              <select
                value={values[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value || undefined)}
                className={`${controlClasses} cursor-pointer`}
              >
                <option value="">{t('pagination.all')}</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {field.type === 'number' && (
              <input
                type="number"
                min={field.min ?? 0}
                value={values[field.key] ?? ''}
                onChange={(e) =>
                  onChange(field.key, e.target.value ? Number(e.target.value) : undefined)
                }
                onKeyDown={handleEnter}
                placeholder={field.placeholder}
                className={controlClasses}
              />
            )}
          </div>
        ))}

        <div className="flex items-end gap-2">
          {onSearch && (
            <button
              onClick={onSearch}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors flex items-center gap-2 cursor-pointer select-none shadow-md"
            >
              <FiSearch className="w-4 h-4" />
              {t('filterBar.search')}
            </button>
          )}
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="px-4 py-2 backdrop-blur-md bg-white/40 text-gray-800 border border-white/30 rounded-lg hover:bg-white/50 transition-colors flex items-center gap-2 cursor-pointer select-none"
            >
              <FiX className="w-4 h-4" />
              {t('filterBar.clear')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
