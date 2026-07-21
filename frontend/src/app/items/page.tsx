"use client";

import { useEffect, useState } from "react";
import { getEntityMetadata, getItems, bulkDeleteItems } from "@/features/items/api/items.api";
import { exportItemsToCsv } from "@/features/items/api/items.api";
import { DynamicTable } from "@/shared/components/dynamic/DynamicTable";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Settings, Download, Upload, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportModal } from "@/features/items/components/ImportModal";

export default function ItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const page = parseInt(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sortBy') || null;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
  const limit = parseInt(searchParams.get('limit') || '50');
  const isDeleted = searchParams.get('isDeleted') === 'true';

  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(() => {
    const filters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        filters[key.replace('filter_', '')] = value;
      }
    });
    return filters;
  });

  const handleColumnFilterChange = (columnName: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [columnName]: value }));
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      const updates: Record<string, string | null> = { page: '1' };
      
      searchParams.forEach((val, key) => {
        if (key.startsWith('filter_')) {
          updates[key] = null;
        }
      });
      
      Object.entries(columnFilters).forEach(([key, val]) => {
        if (val) {
          updates[`filter_${key}`] = val;
        }
      });
      
      let hasChanges = false;
      const currentParams = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null && currentParams.has(key)) hasChanges = true;
        if (val !== null && currentParams.get(key) !== val) hasChanges = true;
      });
      
      if (hasChanges) {
        updateUrl(updates);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [columnFilters, searchParams]);

  const fetchItemsData = async () => {
    setIsLoading(true);
    try {
      const urlFilters: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (key.startsWith('filter_')) {
          urlFilters[key.replace('filter_', '')] = value;
        }
      });
      const [metaRes, itemsRes] = await Promise.all([
        getEntityMetadata('Item'),
        getItems({ page, limit, sortBy: sortBy || undefined, sortOrder, isDeleted, filters: urlFilters })
      ]);
      setFields(metaRes.fields);
      setItems(itemsRes.items || itemsRes);
      setPagination(itemsRes.pagination || null);
    } catch (error) {
      console.error("Failed to load items data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsData();
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage.toString() });
  };

  const handleLimitChange = (newLimit: number) => {
    updateUrl({ limit: newLimit.toString(), page: '1' });
  };

  const handleSortChange = (column: string, order: 'asc' | 'desc') => {
    updateUrl({ sortBy: column, sortOrder: order, page: '1' }); // reset to page 1 on sort
  };

  const handleRowClick = (row: any) => {
    const queryString = searchParams.toString();
    const targetUrl = `/items/${row._id}${queryString ? `?${queryString}` : ''}`;
    router.push(targetUrl);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportItemsToCsv();
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} items? This cannot be undone.`)) {
      return;
    }
    
    setIsDeletingBulk(true);
    try {
      await bulkDeleteItems(selectedIds);
      toast.success(`${selectedIds.length} items deleted successfully.`);
      setSelectedIds([]);
      fetchItemsData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete items');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  if (isLoading && fields.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Items</h1>
            {isLoading && fields.length > 0 && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </div>
          <p className="text-sm text-slate-500 mt-1">Metadata-driven inventory management</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/settings/preferences/items">
            <Button variant="outline" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Customize Fields</span>
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 h-9 px-2">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-[13px]">
              <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-slate-500" />
                Import Items
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer" disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-500" /> : <Download className="w-4 h-4 mr-2 text-slate-500" />}
                Export Items
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/items/new">
            <Button className="flex items-center space-x-2 bg-[#0076f2] hover:bg-[#0060c5] text-white">
              <Plus className="w-4 h-4" />
              <span>New Item</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-md w-fit">
        <button
          onClick={() => updateUrl({ isDeleted: null, page: '1' })}
          className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${!isDeleted ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
        >
          Active
        </button>
        <button
          onClick={() => updateUrl({ isDeleted: 'true', page: '1' })}
          className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${isDeleted ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
        >
          Trash
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="text-sm text-indigo-800 font-medium">
            {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedIds([])}
              className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleDeleteSelected}
              disabled={isDeletingBulk}
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
            >
              {isDeletingBulk ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <DynamicTable 
        fields={fields} 
        data={items} 
        pagination={pagination}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSortChange={handleSortChange}
        onRowClick={handleRowClick}
        sortColumn={sortBy}
        sortDirection={sortOrder}
        enableSelection={true}
        onSelectionChange={setSelectedIds}
        selectedIds={selectedIds}
        columnFilters={columnFilters}
        onColumnFilterChange={handleColumnFilterChange}
      />

      {isImportModalOpen && (
        <ImportModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={() => {
            fetchItemsData();
          }} 
        />
      )}
    </div>
  );
}
