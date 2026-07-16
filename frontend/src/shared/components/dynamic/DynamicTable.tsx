"use client";

import { useState } from "react";
import { FieldMetadata } from "./DynamicForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings2 } from "lucide-react";

interface DynamicTableProps {
  fields: FieldMetadata[];
  data: any[];
}

export function DynamicTable({ fields, data }: DynamicTableProps) {
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

      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
              {columns.map(col => (
                <TableHead key={col.name} className="font-semibold text-slate-700">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={row._id || i}>
                {columns.map(col => (
                  <TableCell key={col.name} className="text-slate-600">
                    {typeof row.dynamicData?.[col.name] === 'boolean' 
                      ? (row.dynamicData?.[col.name] ? 'Yes' : 'No') 
                      : row.dynamicData?.[col.name] ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
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
    </div>
  );
}
