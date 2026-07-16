"use client";

import { useState } from "react";
import { FieldMetadata } from "./DynamicForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings2, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";

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
  sortDirection
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

  const columns = sortedFields.filter(f => visibleColumns.includes(f.name));

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
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}
                >
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
          <div className="flex items-center justify-between border-t px-4 py-3 bg-slate-50/50 sm:px-6">
            <div className="hidden sm:flex sm:items-center space-x-4">
              <p className="text-sm text-slate-700">
                Showing <span className="font-medium">{(pagination.currentPage - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)}</span> of{' '}
                <span className="font-medium">{pagination.totalItems}</span> results
              </p>
              {onLimitChange && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-500">Rows per page:</span>
                  <select
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={pagination.limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex flex-1 justify-between sm:justify-end space-x-2">
              <button
                onClick={() => onPageChange && onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange && onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
