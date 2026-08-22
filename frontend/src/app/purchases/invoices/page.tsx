"use client";

import { useEffect, useState, useRef } from "react";
import { getPurchaseInvoices, exportPurchaseInvoicesToCsv, getUniqueVendors } from "@/features/purchases/api/purchases.api";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, ChevronDown, Search, Loader2, Upload, Download, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PurchaseInvoiceImportModal } from "@/features/purchases/components/PurchaseInvoiceImportModal";


export default function PurchaseInvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  const sortBy = searchParams.get('sortBy') || 'date';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  const [receives, setReceives] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filter states
  const [vendorsList, setVendorsList] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [filters, setFilters] = useState<Record<string, any>>({
    invoiceNumber: searchParams.get('invoiceNumber') || '',
    status: searchParams.getAll('status') || [],
    receiptStatus: searchParams.getAll('receiptStatus') || [],
    billedStatus: searchParams.getAll('billedStatus') || [],
    vendorName: searchParams.get('vendorName') || '',
    fromDate: searchParams.get('fromDate') || '',
    toDate: searchParams.get('toDate') || '',
    hasPO: searchParams.get('hasPO') || '',
    hasDI: searchParams.get('hasDI') || '',
    minAmount: searchParams.get('minAmount') || '',
    maxAmount: searchParams.get('maxAmount') || '',
  });

  useEffect(() => {
    getUniqueVendors().then(res => setVendorsList(res.data || [])).catch(console.error);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateUrl = (updates: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      params.delete(key);
      if (value !== null && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) value.forEach(v => params.append(key, v));
        } else {
          params.set(key, value);
        }
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateUrl({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      updateUrl({ sortBy: field, sortOrder: 'asc' });
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <span className="ml-1 opacity-20">↕</span>;
    return sortOrder === 'asc' ? <span className="ml-1 text-[#0076f2]">↑</span> : <span className="ml-1 text-[#0076f2]">↓</span>;
  };

  const applyFilters = () => {
    updateUrl({ ...filters, page: '1' });
    setIsFilterOpen(false);
  };
  
  const clearFilters = () => {
    const emptyFilters = {
      invoiceNumber: '', status: [], receiptStatus: [], billedStatus: [],
      vendorName: '', fromDate: '', toDate: '', hasPO: '', hasDI: '',
      minAmount: '', maxAmount: ''
    };
    setFilters(emptyFilters);
    setSearch(""); // Also clear the local search bar text
    updateUrl({ ...emptyFilters, page: '1' });
    setIsFilterOpen(false);
  };
  
  const activeFilterCount = Object.values(filters).filter(v => 
    (Array.isArray(v) ? v.length > 0 : v !== '')
  ).length;

  const [search, setSearch] = useState(searchParams.get("invoiceNumber") || "");

  useEffect(() => {
    const handler = setTimeout(() => {
      if (search !== (searchParams.get('invoiceNumber') || '')) {
        updateUrl({ invoiceNumber: search, page: '1' });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportPurchaseInvoicesToCsv({});
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchReceives = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit, sortBy, sortOrder };
      
      const spFilters: string[] = ['vendorName', 'invoiceNumber', 'fromDate', 'toDate', 'hasPO', 'hasDI', 'minAmount', 'maxAmount'];
      spFilters.forEach(k => {
        if (searchParams.get(k)) params[k] = searchParams.get(k);
      });
      
      const spArrayFilters: string[] = ['status', 'receiptStatus', 'billedStatus'];
      spArrayFilters.forEach(k => {
        const arr = searchParams.getAll(k);
        if (arr && arr.length > 0) params[k] = arr;
      });

      const res = await getPurchaseInvoices(params);
      setReceives(res.data?.prs || []);
      setPagination(res.data?.pagination || null);
    } catch (error) {
      console.error("Failed to load Purchase Invoices", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceives();
  }, [searchParams]);

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 bg-white flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <h1 className="text-[22px] font-bold text-slate-800 tracking-tight">Purchase Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage all your purchase invoices</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/purchases/invoices/new">
            <Button className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-full px-5 py-2 h-auto shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" />
              New Invoice
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center text-slate-500 hover:bg-slate-100 p-2.5 rounded-full border border-slate-200 transition-colors bg-white shadow-sm">
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col space-y-5 bg-[#fcfcfc]">
        
        {/* Quick Status Tabs (Pills) */}
        <div className="flex items-center space-x-3 pt-2">
          <button 
            onClick={() => updateUrl({ status: null, receiptStatus: null, page: '1' })}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${!searchParams.get('status') && !searchParams.get('receiptStatus') ? 'bg-[#ebf5ff] text-blue-600 border-[#bfdbfe]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            All Invoices
          </button>
          <button 
            onClick={() => updateUrl({ status: ['Unpaid', 'Overdue'], receiptStatus: null, page: '1' })}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${searchParams.getAll('status').includes('Unpaid') ? 'bg-[#ebf5ff] text-blue-600 border-[#bfdbfe]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            Unpaid / Overdue
          </button>
          <button 
            onClick={() => updateUrl({ status: null, receiptStatus: ['Pending Receipt'], page: '1' })}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${searchParams.getAll('receiptStatus').includes('Pending Receipt') ? 'bg-[#ebf5ff] text-blue-600 border-[#bfdbfe]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            Pending Store Receipt
          </button>
          <button 
            onClick={() => updateUrl({ status: ['Draft'], receiptStatus: null, page: '1' })}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${searchParams.getAll('status').includes('Draft') ? 'bg-[#ebf5ff] text-blue-600 border-[#bfdbfe]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            Drafts
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Search Invoice No.</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="e.g. INV-0001" 
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={filters.invoiceNumber}
                  onChange={(e) => setFilters({...filters, invoiceNumber: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Vendor Name</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={filters.vendorName}
                onChange={(e) => setFilters({...filters, vendorName: e.target.value})}
              >
                <option value="">All Vendors</option>
                {vendorsList.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">From Date</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-600"
                value={filters.fromDate}
                onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">To Date</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-600"
                value={filters.toDate}
                onChange={(e) => setFilters({...filters, toDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Invoice Status</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={filters.status.length > 0 ? filters.status[0] : ''}
                onChange={(e) => setFilters({...filters, status: e.target.value ? [e.target.value] : []})}
              >
                <option value="">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Store Receipt Status</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                value={filters.receiptStatus.length > 0 ? filters.receiptStatus[0] : ''}
                onChange={(e) => setFilters({...filters, receiptStatus: e.target.value ? [e.target.value] : []})}
              >
                <option value="">All Status</option>
                <option value="Received">Received</option>
                <option value="Pending Receipt">Pending Receipt</option>
                <option value="Partially Received">Partially Received</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Min Amount (₹)</label>
              <input 
                type="number" 
                placeholder="Min Amount"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={filters.minAmount}
                onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Max Amount (₹)</label>
              <input 
                type="number" 
                placeholder="Max Amount"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={filters.maxAmount}
                onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
              />
            </div>
            <div className="col-span-2 flex items-end justify-end space-x-3">
              <button 
                onClick={clearFilters}
                className="px-4 py-2 text-[13px] font-medium text-[#1d4ed8] hover:bg-blue-50 rounded-lg transition-colors flex items-center"
              >
                Clear Filters
              </button>
              <button 
                onClick={applyFilters}
                className="px-5 py-2 text-[13px] font-medium text-white bg-[#1d4ed8] hover:bg-[#1e40af] rounded-lg transition-colors flex items-center shadow-sm"
              >
                <Filter className="w-3.5 h-3.5 mr-1.5" /> Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left table-fixed min-w-[1400px]">
                  <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-4 w-10 bg-white">
                        <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors w-[10%]" onClick={() => handleSort('date')}>
                        <div className="flex items-center text-blue-600">DATE <SortIcon field="date" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors w-[12%]" onClick={() => handleSort('invoiceNumber')}>
                        <div className="flex items-center">PURCHASE INVOICE # <SortIcon field="invoiceNumber" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors w-[12%]" onClick={() => handleSort('purchaseOrderNumber')}>
                        <div className="flex items-center">PURCHASE ORDER # <SortIcon field="purchaseOrderNumber" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors w-[14%]" onClick={() => handleSort('vendorName')}>
                        <div className="flex items-center">VENDOR NAME <SortIcon field="vendorName" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors w-[14%]" onClick={() => handleSort('billingFrom')}>
                        <div className="flex items-center">BILLING FROM <SortIcon field="billingFrom" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors w-[10%]" onClick={() => handleSort('status')}>
                        <div className="flex items-center">INVOICE STATUS <SortIcon field="status" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors w-[10%]" onClick={() => handleSort('receiptStatus')}>
                        <div className="flex items-center">STORE RECEIPT STATUS <SortIcon field="receiptStatus" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors w-[6%]" onClick={() => handleSort('billedStatus')}>
                        <div className="flex items-center">BILLED <SortIcon field="billedStatus" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors text-right w-[6%]" onClick={() => handleSort('totalInventory')}>
                        <div className="flex items-center justify-end">QTY <SortIcon field="totalInventory" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold cursor-pointer hover:bg-slate-50 transition-colors text-right w-[10%]" onClick={() => handleSort('total')}>
                        <div className="flex items-center justify-end text-blue-600">AMOUNT (₹) <SortIcon field="total" /></div>
                      </th>
                      <th className="px-4 py-4 font-semibold w-12 text-center bg-white">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receives.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-20 text-center">
                          <p className="text-[14px] text-slate-500">No Purchase Invoices to display!</p>
                        </td>
                      </tr>
                    ) : (
                      receives.map((pr: any) => (
                        <tr 
                          key={pr._id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/purchases/invoices/${pr._id}`)}
                        >
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                          </td>
                          <td className="px-4 py-4 text-[13px] text-slate-600">
                            {pr.receiveDate ? new Date(pr.receiveDate).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="px-4 py-4 font-medium text-[#1d4ed8]">
                            <Link 
                              href={`/purchases/invoices/${pr._id}`}
                              className="hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {pr.PurchaseInvoiceNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-4 font-medium text-slate-600 text-[13px]">
                            {pr.purchaseOrderNumber || '-'}
                          </td>
                          <td className="px-4 py-4 text-slate-700 text-[13px]">
                            {pr.vendorName}
                          </td>
                          <td className="px-4 py-4 text-slate-600 text-[13px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={pr.billingCompany?.name || pr.billingFrom || '-'}>
                            {pr.billingCompany?.name || pr.billingFrom || '-'}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                              pr.status === 'Paid' ? 'bg-green-100 text-green-700' :
                              pr.status === 'Unpaid' ? 'bg-orange-100 text-orange-700' :
                              pr.status === 'Partially Paid' ? 'bg-blue-100 text-blue-700' :
                              pr.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                              pr.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {pr.status || 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                              pr.storeStatus === 'Received' || pr.storeStatus === 'Accepted' ? 'bg-green-100 text-green-700' :
                              pr.storeStatus === 'Pending' || pr.storeStatus === 'Pending Receipt' ? 'bg-amber-100 text-amber-700' :
                              pr.storeStatus === 'Partially Received' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {pr.storeStatus || 'Draft'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600 text-[13px]">
                            {pr.billed ? 'Billed' : 'Unbilled'}
                          </td>
                          <td className="px-4 py-4 text-slate-700 text-[13px] text-right font-medium">
                            {pr.quantity || 0}
                          </td>
                          <td className="px-4 py-4 text-slate-800 text-[13px] text-right font-medium">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(pr.total || 0)}
                          </td>
                          <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="p-1.5 hover:bg-slate-100 rounded-md transition-colors border border-slate-200 outline-none bg-white">
                                <MoreHorizontal className="w-4 h-4 text-slate-500" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/purchases/invoices/${pr._id}`)}>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Edit Invoice</DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination UI */}
              {pagination && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white mt-auto sticky bottom-0 text-[13px]">
                  <div className="flex-1 flex justify-start">
                    <span className="text-slate-500">
                      Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} entries
                    </span>
                  </div>
                  
                  <div className="flex-1 flex justify-center items-center space-x-1.5">
                    <button
                      onClick={() => updateUrl({ page: (page - 1).toString() })}
                      disabled={page <= 1}
                      className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    {(() => {
                      const pages = [];
                      const totalPages = pagination.totalPages;
                      
                      if (totalPages <= 5) {
                        for (let p = 1; p <= totalPages; p++) pages.push(p);
                      } else {
                        if (page <= 3) {
                          for (let p = 1; p <= 4; p++) pages.push(p);
                          pages.push('...');
                          pages.push(totalPages);
                        } else if (page >= totalPages - 2) {
                          pages.push(1);
                          pages.push('...');
                          for (let p = totalPages - 3; p <= totalPages; p++) pages.push(p);
                        } else {
                          pages.push(1);
                          pages.push('...');
                          pages.push(page - 1);
                          pages.push(page);
                          pages.push(page + 1);
                          pages.push('...');
                          pages.push(totalPages);
                        }
                      }

                      return pages.map((p, index) => {
                        if (p === '...') {
                          return <span key={`ellipsis-${index}`} className="text-slate-400 px-1 tracking-widest">...</span>;
                        }
                        return (
                          <button
                            key={p}
                            onClick={() => updateUrl({ page: p.toString() })}
                            className={`min-w-[32px] h-8 flex items-center justify-center rounded-md text-[13px] border transition-colors ${
                              page === p
                                ? 'border-[#1d4ed8] bg-[#ebf5ff] text-[#1d4ed8] font-semibold'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      });
                    })()}

                    <button
                      onClick={() => updateUrl({ page: (page + 1).toString() })}
                      disabled={page >= pagination.totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 flex justify-end items-center space-x-2">
                    <select
                      value={limit}
                      onChange={(e) => updateUrl({ limit: e.target.value, page: '1' })}
                      className="border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 text-[13px] focus:outline-none focus:border-blue-500 bg-white cursor-pointer shadow-sm"
                    >
                      <option value="10">10 / page</option>
                      <option value="20">20 / page</option>
                      <option value="50">50 / page</option>
                      <option value="100">100 / page</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <PurchaseInvoiceImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={fetchReceives} 
      />
    </div>

  );
}
