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

  const fetchReceives = async (currentPage = 1, currentSearch = "") => {
    try {
      setIsLoading(true);
      const res = await getPurchaseInvoices({ page: currentPage, limit: 50, search: currentSearch });
      setReceives(res.data?.prs || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to load Purchase Invoices", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceives(page, debouncedSearch);
  }, [page, debouncedSearch]);

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
        <div className="h-14 px-6 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
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
