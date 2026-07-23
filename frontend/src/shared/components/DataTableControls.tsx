import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataTableTopControlsProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  pageSize: number;
  setPageSize: (val: number) => void;
  totalItems: number;
}

export function DataTableTopControls({ 
  searchTerm, 
  setSearchTerm, 
  pageSize, 
  setPageSize,
  totalItems
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
      
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <span className="text-sm text-slate-500 font-medium">Show</span>
        <select 
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          <option value={10}>10</option>
          <option value={30}>30</option>
          <option value={60}>60</option>
          <option value={100}>100</option>
        </select>
        <span className="text-sm text-slate-500 font-medium">entries</span>
        <span className="text-xs text-slate-400 ml-2">({totalItems} total)</span>
      </div>
    </div>
  );
}

interface DataTableBottomControlsProps {
  currentPage: number;
  setCurrentPage: (val: number) => void;
  totalPages: number;
}

export function DataTableBottomControls({
  currentPage,
  setCurrentPage,
  totalPages
}: DataTableBottomControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-white border-t border-slate-200">
      <span className="text-sm text-slate-500">
        Page <span className="font-semibold text-slate-700">{currentPage}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
      </span>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
