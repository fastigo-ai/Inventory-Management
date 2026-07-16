"use client";

import { useEffect, useState } from "react";
import { getEntityMetadata, getItems } from "@/features/items/api/items.api";
import { exportItemsToCsv } from "@/features/items/api/items.api";
import { DynamicTable } from "@/shared/components/dynamic/DynamicTable";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Settings, Download, Upload, MoreHorizontal } from "lucide-react";
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

  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchItemsData = async () => {
    setIsLoading(true);
    try {
      const [metaRes, itemsRes] = await Promise.all([
        getEntityMetadata('Item'),
        getItems({ page, limit, sortBy: sortBy || undefined, sortOrder })
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
  }, [page, limit, sortBy, sortOrder]);

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

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Items</h1>
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
