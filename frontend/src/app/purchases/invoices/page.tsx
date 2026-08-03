"use client";

import { useEffect, useState } from "react";
import { getPurchaseInvoices } from "@/features/purchases/api/purchases.api";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, ChevronDown, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PurchaseInvoiceImportModal } from "@/features/purchases/components/PurchaseInvoiceImportModal";
import { Upload, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { exportPurchaseInvoicesToCsv } from "@/features/purchases/api/purchases.api";

export default function PurchaseInvoicesPage() {
  const [receives, setReceives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportPurchaseInvoicesToCsv();
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchReceives = async (currentPage = 1, currentSearch = "", currentLimit = 50) => {
    try {
      setIsLoading(true);
      const res = await getPurchaseInvoices({ page: currentPage, limit: currentLimit, search: currentSearch });
      setReceives(res.data?.prs || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotal(res.data?.pagination?.total || 0);
    } catch (error) {
      console.error("Failed to load Purchase Invoices", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceives(page, debouncedSearch, limit);
  }, [page, debouncedSearch, limit]);

  const generatePagination = (current: number, totalPagesCount: number) => {
    if (totalPagesCount <= 7) return Array.from({ length: totalPagesCount }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', totalPagesCount];
    if (current >= totalPagesCount - 3) return [1, '...', totalPagesCount - 4, totalPagesCount - 3, totalPagesCount - 2, totalPagesCount - 1, totalPagesCount];
    return [1, '...', current - 1, current, current + 1, '...', totalPagesCount];
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-2 text-xl font-semibold text-slate-800 hover:text-slate-600 outline-none cursor-pointer">
              <span>Purchase Invoices</span>
              <ChevronDown className="w-5 h-5 text-[#0076f2]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem>All</DropdownMenuItem>
              <DropdownMenuItem>Draft</DropdownMenuItem>
              <DropdownMenuItem>Received</DropdownMenuItem>
              <DropdownMenuItem>In Transit</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="relative ml-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search Invoice No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 w-64"
            />
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/purchases/invoices/new">
            <Button className="bg-[#4285f4] hover:bg-[#3367d6] text-white rounded">
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center text-slate-500 hover:bg-slate-100 p-2 rounded-md border border-slate-200 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-[13px]">
              <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-slate-500" />
                Import Purchase Invoices
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer" disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-500" /> : <Download className="w-4 h-4 mr-2 text-slate-500" />}
                Export Purchase Invoices
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="min-w-max w-full">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-[#f8f9fa] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded border-slate-300 text-[#0076f2] focus:ring-[#0076f2]" />
                  </th>
                  <th className="px-6 py-3 font-semibold w-[50px]"><svg className="w-4 h-4 text-[#0076f2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg></th>
                  <th className="px-4 py-3 font-semibold">DATE</th>
                  <th className="px-4 py-3 font-semibold">Purchase Invoice#</th>
                  <th className="px-4 py-3 font-semibold">PURCHASE ORDER#</th>
                  <th className="px-4 py-3 font-semibold">VENDOR NAME</th>
                  <th className="px-4 py-3 font-semibold">INVOICE STATUS</th>
                  <th className="px-4 py-3 font-semibold">STORE RECEIPT</th>
                  <th className="px-4 py-3 font-semibold">BILLED</th>
                  <th className="px-4 py-3 font-semibold text-right">QUANTITY</th>
                  <th className="px-4 py-3 font-semibold w-10"><Search className="w-4 h-4 text-slate-400" /></th>
                </tr>
              </thead>
              <tbody>
                {receives.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-20 text-center">
                      <p className="text-[15px] text-slate-500">No Purchase Invoices to display!</p>
                    </td>
                  </tr>
                ) : (
                  receives.map((pr: any) => (
                    <tr 
                      key={pr._id} 
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (pr.status === 'Received') {
                          router.push(`/purchases/invoices/${pr._id}`);
                        } else {
                          router.push(`/purchases/invoices/${pr._id}/edit`);
                        }
                      }}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-slate-300 text-[#0076f2] focus:ring-[#0076f2]" />
                      </td>
                      <td className="px-6 py-3"></td>
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(pr.receiveDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#0076f2]">
                        <Link 
                          href={pr.status === 'Received' ? `/purchases/invoices/${pr._id}` : `/purchases/invoices/${pr._id}/edit`} 
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {pr.PurchaseInvoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {pr.purchaseOrderNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {pr.vendorName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase ${
                          pr.status === 'Received' ? 'bg-green-100 text-green-800' :
                          pr.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {pr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase ${
                          pr.storeStatus === 'Accepted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          pr.storeStatus === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {pr.storeStatus || 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {pr.billed ? 'Billed' : 'Unbilled'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-right font-medium">
                        {pr.quantity || 0}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && receives.length > 0 && (
        <div className="h-16 px-6 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 font-medium">
          <p className="text-sm text-slate-500">
            Showing {limit} out of {total}
          </p>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {generatePagination(page, totalPages).map((p, i) => (
              <button
                key={i}
                onClick={() => typeof p === 'number' && setPage(p)}
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
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-[#42b4b4]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      <PurchaseInvoiceImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={fetchReceives} 
      />
    </div>
  );
}
