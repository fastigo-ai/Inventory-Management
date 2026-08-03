import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTableTopControlsProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  pageSize?: number;
  setPageSize?: (val: number) => void;
  totalItems?: number;
}

export function DataTableTopControls({ 
  searchTerm, 
  setSearchTerm, 
}: DataTableTopControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border-b border-slate-200 gap-4">
      <div className="relative w-full sm:w-72">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2 transition-all outline-none"
          placeholder="Search all columns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  );
}

interface DataTableBottomControlsProps {
  currentPage: number;
  setCurrentPage: (val: number) => void;
  totalPages: number;
  pageSize?: number;
  setPageSize?: (val: number) => void;
  totalItems?: number;
}

export function DataTableBottomControls({
  currentPage,
  setCurrentPage,
  totalPages,
  pageSize = 30,
  setPageSize,
  totalItems = 0
}: DataTableBottomControlsProps) {
  if (totalPages <= 1 && totalItems === 0) return null;

  const generatePagination = (current: number, totalPagesCount: number) => {
    if (totalPagesCount <= 7) return Array.from({ length: totalPagesCount }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', totalPagesCount];
    if (current >= totalPagesCount - 3) return [1, '...', totalPagesCount - 4, totalPagesCount - 3, totalPagesCount - 2, totalPagesCount - 1, totalPagesCount];
    return [1, '...', current - 1, current, current + 1, '...', totalPagesCount];
  };

  return (
    <div className="h-16 px-6 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 font-medium">
      <p className="text-sm text-slate-500">
        Showing {pageSize} out of {totalItems}
      </p>
      
      <div className="flex items-center space-x-1">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {generatePagination(currentPage, totalPages).map((p, i) => (
          <button
            key={i}
            onClick={() => typeof p === 'number' && setCurrentPage(p)}
            disabled={p === '...'}
            className={`min-w-[32px] h-8 flex items-center justify-center rounded text-sm ${
              p === currentPage
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
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center text-sm text-slate-500">
        <span className="mr-3">Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => {
            if (setPageSize) {
               setPageSize(Number(e.target.value));
               setCurrentPage(1);
            }
          }}
          className="border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-[#42b4b4]"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={60}>60</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
