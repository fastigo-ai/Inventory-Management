"use client";

import { useState } from "react";
import { FieldMetadata } from "./DynamicForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings2, ChevronUp, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";

interface DynamicTableProps {
  fields: FieldMetadata[];
  data: any[];
  pagination?: {
    totalItems: number;
    currentPage: number;
    limit: number;
    totalPages: number;
  };
  onSortChange?: (column: string, order: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onRowClick?: (row: any) => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  enableSelection?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectedIds?: string[];
}

export function DynamicTable({ 
  fields, 
  data,
  pagination,
  onSortChange,
  onPageChange,
  onLimitChange,
  onRowClick,
  sortColumn,
  sortDirection,
  enableSelection = false,
  onSelectionChange,
  selectedIds = []
}: DynamicTableProps) {
  // Only show fields that are visible by default, active, and sort by order
  const sortedFields = [...fields].filter(f => f.active !== false).sort((a,b) => a.order - b.order);
  const defaultVisible = sortedFields.filter(f => f.visible).map(f => f.name);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisible);
  const [showConfig, setShowConfig] = useState(false);
  
  const toggleColumn = (name: string) => {
    setVisibleColumns(prev => 
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  const handleSort = (columnName: string) => {
    if (onSortChange) {
      let order: 'asc' | 'desc' = 'asc';
      if (sortColumn === columnName) {
        order = sortDirection === 'asc' ? 'desc' : 'asc';
      }
      onSortChange(columnName, order);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      // Select all on current page
      const newSelectedIds = data.map(row => row._id);
      onSelectionChange(newSelectedIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const isAllSelected = data.length > 0 && selectedIds.length === data.length && data.every(row => selectedIds.includes(row._id));

  const columns = sortedFields.filter(f => visibleColumns.includes(f.name));

  const getPageNumbers = () => {
    if (!pagination) return [];
    const { currentPage, totalPages } = pagination;
    const pages: (number | string)[] = [];
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 5);
    
    if (endPage - startPage < 5) {
      startPage = Math.max(1, endPage - 5);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    if (endPage < totalPages) {
      pages.push('...');
    }
    
    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 font-medium bg-white px-3 py-2 border rounded-md shadow-sm transition-colors"
        >
          <Settings2 className="w-4 h-4" />
          <span>Customize Columns</span>
        </button>
      </div>

      {showConfig && (
        <div className="p-4 bg-white border rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
          <p className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">Visible Columns</p>
          <div className="flex flex-wrap gap-4">
            {sortedFields.map(field => (
              <label key={field.name} className="flex items-center space-x-2 text-sm cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={visibleColumns.includes(field.name)} 
                  onChange={() => toggleColumn(field.name)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700">{field.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md border bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                {enableSelection && (
                  <TableHead className="w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold text-slate-700 w-16 text-center select-none">
                  Sr. No
                </TableHead>
              {columns.map(col => (
                <TableHead 
                  key={col.name} 
                  className="font-semibold text-slate-700 cursor-pointer hover:bg-slate-200 select-none group transition-colors"
                  onClick={() => handleSort(col.name)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.label}</span>
                    <div className="flex flex-col">
                      {sortColumn === col.name ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity" />
                      )}
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => {
              const srNo = pagination ? (pagination.currentPage - 1) * pagination.limit + i + 1 : i + 1;
              return (
                <TableRow 
                  key={row._id || i}
                  onClick={(e) => {
                    // Prevent row click if clicking on the checkbox or its cell
                    const target = e.target as HTMLElement;
                    if (target.tagName !== 'INPUT' && target.closest('td:first-child') === null) {
                      onRowClick && onRowClick(row);
                    }
                  }}
                  className={onRowClick ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}
                >
                  {enableSelection && (
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        checked={selectedIds.includes(row._id)}
                        onChange={() => handleSelectRow(row._id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-slate-600 text-center font-medium text-xs bg-slate-50/30">
                    {srNo}
                  </TableCell>
                  {columns.map(col => (
                    <TableCell key={col.name} className="text-slate-600">
                      {typeof row.dynamicData?.[col.name] === 'boolean' 
                        ? (row.dynamicData?.[col.name] ? 'Yes' : 'No') 
                        : row.dynamicData?.[col.name] ?? '-'}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500">
                  No records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        
        {pagination && pagination.totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t px-4 py-3 bg-white sm:px-6 h-16">
            
            {/* Left: Showing X out of Y */}
            <div className="flex items-center text-[13px] text-slate-500 w-full sm:w-1/3 justify-center sm:justify-start mb-4 sm:mb-0">
               Showing {Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)} out of {pagination.totalItems}
            </div>

            {/* Middle: Pagination Controls */}
            <div className="flex items-center justify-center space-x-1 w-full sm:w-1/3 mb-4 sm:mb-0">
              <button
                onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
              
              <div className="flex items-center space-x-1">
                {getPageNumbers().map((pageNum, idx) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-sm tracking-widest">...</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange && onPageChange(pageNum as number)}
                      className={`min-w-[28px] h-[28px] flex items-center justify-center text-[13px] transition-colors ${
                        pageNum === pagination.currentPage
                          ? 'border border-[#0099ab] text-[#0099ab] rounded-[4px] font-medium'
                          : 'text-slate-500 hover:text-slate-800 rounded-[4px]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-[18px] h-[18px]" strokeWidth={1.5} />
              </button>
            </div>

            {/* Right: Rows per page */}
            <div className="flex items-center justify-center sm:justify-end space-x-3 text-[13px] text-slate-500 w-full sm:w-1/3">
               <span>Rows per page</span>
               {onLimitChange && (
                 <select
                    className="h-8 rounded-[4px] border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    value={pagination.limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                 >
                    <option value={10}>10</option>
                    <option value={16}>16</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                 </select>
               )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
