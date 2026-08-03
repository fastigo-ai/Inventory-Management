import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}) => {
  const generatePagination = (current: number, totalPagesCount: number) => {
    if (totalPagesCount <= 7) return Array.from({ length: totalPagesCount }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', totalPagesCount];
    if (current >= totalPagesCount - 3) return [1, '...', totalPagesCount - 4, totalPagesCount - 3, totalPagesCount - 2, totalPagesCount - 1, totalPagesCount];
    return [1, '...', current - 1, current, current + 1, '...', totalPagesCount];
  };

  return (
    <div className="h-16 px-6 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 font-medium">
      <p className="text-sm text-slate-500">
        Showing {limit} out of {total}
      </p>
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {generatePagination(page, totalPages).map((p, i) => (
          <button
            key={i}
            onClick={() => typeof p === 'number' && onPageChange(p)}
            disabled={p === '...'}
            className={`min-w-[32px] h-8 flex items-center justify-center rounded text-sm ${
              p === page
                ? 'border border-[#42b4b4] text-[#42b4b4]'
                : p === '...'
                ? 'text-slate-400 cursor-default'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex items-center text-sm text-slate-500">
        <span className="mr-3">Rows per page</span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-[#42b4b4]"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
};
