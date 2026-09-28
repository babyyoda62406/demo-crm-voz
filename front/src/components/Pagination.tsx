import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const { t } = useTranslation('commons');
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
      return pages;
    }

    if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    pages.push('...');
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 backdrop-blur-xl bg-white/20 border-t border-white/30 rounded-b-lg select-none">
      <div className="flex items-center gap-3 md:gap-4">
        <span className="text-sm md:text-base text-gray-900 font-medium">
          {t('pagination.showing')} {startRecord} {t('pagination.to')} {endRecord}{' '}
          {t('pagination.of')} {totalRecords} {t('pagination.records')}
        </span>
        {onPageSizeChange && (
          <div className="hidden sm:flex items-center gap-2">
            <label htmlFor="pageSize" className="text-base text-gray-900 font-medium">
              {t('pagination.perPage')}
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-base backdrop-blur-md bg-white/40 border border-white/30 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer text-gray-900"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
          className={`flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center rounded-lg transition-colors ${
            currentPage <= 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-900 hover:bg-white/30 cursor-pointer'
          }`}
        >
          <FiChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                  ...
                </span>
              );
            }

            return (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page as number)}
                className={`inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center px-2 text-base rounded-lg transition-colors cursor-pointer ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-900 hover:bg-white/30 backdrop-blur-sm bg-white/20'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Página siguiente"
          className={`flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center rounded-lg transition-colors ${
            currentPage >= totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-900 hover:bg-white/30 cursor-pointer'
          }`}
        >
          <FiChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
