"use client";

import { useEffect, useState } from "react";
import { getEntityMetadata, getVendors } from "@/features/vendors/api/vendors.api";
import { exportVendorsToCsv } from "@/features/vendors/api/vendors.api";
import { DynamicTable } from "@/shared/components/dynamic/DynamicTable";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Settings, Download, Upload, MoreHorizontal, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportModal } from "@/features/vendors/components/ImportModal";

export default function VendorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const page = parseInt(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sortBy') || null;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
  const limit = parseInt(searchParams.get('limit') || '50');
  const searchQuery = searchParams.get('search') || '';
  const currentStatus = searchParams.get('status') || null;

  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);

  const fetchVendorsData = async () => {
    setIsLoading(true);
    try {
      const [metaRes, vendorsRes] = await Promise.all([
        getEntityMetadata('Vendor'),
        getVendors({ page, limit, sortBy: sortBy || undefined, sortOrder, search: searchQuery || undefined, status: currentStatus || undefined })
      ]);
      setFields(metaRes.fields);
      setVendors(vendorsRes.vendors || vendorsRes);
      setPagination(vendorsRes.pagination || null);
    } catch (error) {
      console.error("Failed to load vendors data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorsData();
  }, [page, limit, sortBy, sortOrder, searchQuery, currentStatus]);

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
    const targetUrl = `/purchases/vendors/${row._id}${queryString ? `?${queryString}` : ''}`;
    router.push(targetUrl);
  };

  const handleEdit = (row: any) => {
    router.push(`/purchases/vendors/${row._id}/edit`);
  };

  const handleDelete = async (row: any) => {
    if (window.confirm(`Are you sure you want to delete vendor "${row.dynamicData?.companyName || row.dynamicData?.displayName || 'Unknown'}"?`)) {
      try {
        const { deleteVendor } = await import('@/features/vendors/api/vendors.api');
        await deleteVendor(row._id);
        fetchVendorsData();
      } catch (error) {
        console.error("Failed to delete vendor", error);
        alert("Failed to delete vendor.");
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search: searchInput || null, page: '1' });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportVendorsToCsv();
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Vendors</h1>
          <p className="text-sm text-slate-500 mt-1">Metadata-driven vendor management</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/settings/preferences/vendors">
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
                Import Vendors
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer" disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-500" /> : <Download className="w-4 h-4 mr-2 text-slate-500" />}
                Export Vendors
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/purchases/vendors/new">
            <Button className="flex items-center space-x-2 bg-[#0076f2] hover:bg-[#0060c5] text-white">
              <Plus className="w-4 h-4" />
              <span>New Vendor</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-md w-fit">
          <button
            onClick={() => updateUrl({ status: null, page: '1' })}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${!currentStatus ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
          >
            All
          </button>
          <button
            onClick={() => updateUrl({ status: 'Active', page: '1' })}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${currentStatus === 'Active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
          >
            Active
          </button>
          <button
            onClick={() => updateUrl({ status: 'Inactive', page: '1' })}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${currentStatus === 'Inactive' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
          >
            Inactive
          </button>
        </div>

        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by company, contact name, or phone..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </form>
      </div>

      <DynamicTable 
        fields={fields} 
        data={vendors} 
        pagination={pagination}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSortChange={handleSortChange}
        onRowClick={handleRowClick}
        onEdit={handleEdit}
        onDelete={handleDelete}
        sortColumn={sortBy}
        sortDirection={sortOrder}
      />

      {isImportModalOpen && (
        <ImportModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={() => {
            fetchVendorsData();
          }} 
        />
      )}
    </div>
  );
}
