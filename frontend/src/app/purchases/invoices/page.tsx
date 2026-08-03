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

  const [receives, setReceives] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filter states
  const [vendorsList, setVendorsList] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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
    updateUrl({ ...emptyFilters, page: '1' });
    setIsFilterOpen(false);
  };
  
  const activeFilterCount = Object.values(filters).filter(v => 
    (Array.isArray(v) ? v.length > 0 : v !== '')
  ).length;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
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

  const fetchReceives = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit };
      
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
      
      {/* Quick Status Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shrink-0 text-sm">
        <div className="flex items-center space-x-2 overflow-x-auto flex-1 mr-4">
          <button 
            onClick={() => updateUrl({ status: null, receiptStatus: null, page: '1' })}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md font-medium transition-colors ${!searchParams.get('status') && !searchParams.get('receiptStatus') ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            All Invoices
          </button>
          <button 
            onClick={() => updateUrl({ status: ['Unpaid', 'Overdue'], receiptStatus: null, page: '1' })}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md font-medium transition-colors ${searchParams.getAll('status').includes('Unpaid') ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Unpaid / Overdue
          </button>
          <button 
            onClick={() => updateUrl({ status: null, receiptStatus: ['Pending Receipt'], page: '1' })}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md font-medium transition-colors ${searchParams.getAll('receiptStatus').includes('Pending Receipt') ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Pending Store Receipt
          </button>
          <button 
            onClick={() => updateUrl({ status: ['Draft'], receiptStatus: null, page: '1' })}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md font-medium transition-colors ${searchParams.getAll('status').includes('Draft') ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Drafts
          </button>
        </div>
        
        {/* Filter Button */}
        <div className="relative shrink-0" ref={filterRef}>
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center px-3 py-1.5 rounded-md border font-medium transition-colors ${activeFilterCount > 0 ? 'bg-[#ebf5ff] border-[#0076f2] text-[#0076f2]' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          
          {/* Filter Popover */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-[450px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">Filter Invoices</h3>
                <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 space-y-5">
                {/* Search */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Search PI Number</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. INV-0001" 
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2]"
                      value={filters.invoiceNumber}
                      onChange={(e) => setFilters({...filters, invoiceNumber: e.target.value})}
                    />
                  </div>
                </div>

                {/* Vendor Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Vendor Name</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] bg-white"
                    value={filters.vendorName}
                    onChange={(e) => setFilters({...filters, vendorName: e.target.value})}
                  >
                    <option value="">All Vendors</option>
                    {vendorsList.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">From Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2]"
                      value={filters.fromDate}
                      onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">To Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2]"
                      value={filters.toDate}
                      onChange={(e) => setFilters({...filters, toDate: e.target.value})}
                    />
                  </div>
                </div>
                
                {/* Statuses Checkboxes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invoice Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Draft', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Void', 'Cancelled'].map(s => (
                      <label key={s} className="flex items-center space-x-2 text-sm text-slate-700">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-[#0076f2] focus:ring-[#0076f2]"
                          checked={filters.status.includes(s)}
                          onChange={(e) => {
                            const newStatus = e.target.checked 
                              ? [...filters.status, s] 
                              : filters.status.filter((st: string) => st !== s);
                            setFilters({...filters, status: newStatus});
                          }}
                        />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Receipt Checkboxes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Store Receipt Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Pending Receipt', 'Partially Received', 'Received'].map(s => (
                      <label key={s} className="flex items-center space-x-2 text-sm text-slate-700">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-[#0076f2] focus:ring-[#0076f2]"
                          checked={filters.receiptStatus.includes(s)}
                          onChange={(e) => {
                            const newStatus = e.target.checked 
                              ? [...filters.receiptStatus, s] 
                              : filters.receiptStatus.filter((st: string) => st !== s);
                            setFilters({...filters, receiptStatus: newStatus});
                          }}
                        />
                        <span>{s}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Amount Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Min Amount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2]"
                      value={filters.minAmount}
                      onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Max Amount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="999999"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2]"
                      value={filters.maxAmount}
                      onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                    />
                  </div>
                </div>
                
                {/* Linkages */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">PO Linkage</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] bg-white"
                      value={filters.hasPO}
                      onChange={(e) => setFilters({...filters, hasPO: e.target.value})}
                    >
                      <option value="">All</option>
                      <option value="true">Has PO</option>
                      <option value="false">Without PO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">DI Linkage</label>
                    <select
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] bg-white"
                      value={filters.hasDI}
                      onChange={(e) => setFilters({...filters, hasDI: e.target.value})}
                    >
                      <option value="">All</option>
                      <option value="true">Has DI</option>
                      <option value="false">Without DI</option>
                    </select>
                  </div>
                </div>
                
              </div>
              
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-lg">
                <Button variant="ghost" onClick={clearFilters} className="text-slate-600">Clear All</Button>
                <Button onClick={applyFilters} className="bg-[#0076f2] hover:bg-[#0066d6] text-white">Apply Filters</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-auto bg-white flex flex-col">
        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="min-w-max w-full flex-1 flex flex-col">
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
              <tbody className="flex-1">
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
            
            {/* Pagination UI */}
            {pagination && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white mt-auto sticky bottom-0 text-[13px]">
                <div className="flex-1 flex justify-start">
                  <span className="text-slate-500">
                    Showing {receives.length} out of {pagination.total}
                  </span>
                </div>
                
                <div className="flex-1 flex justify-center items-center space-x-1">
                  <button
                    onClick={() => updateUrl({ page: (page - 1).toString() })}
                    disabled={page <= 1}
                    className="p-1 mr-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {(() => {
                    const pages = [];
                    const totalPages = pagination.totalPages;
                    
                    if (totalPages <= 7) {
                      for (let p = 1; p <= totalPages; p++) pages.push(p);
                    } else {
                      if (page <= 4) {
                        for (let p = 1; p <= 6; p++) pages.push(p);
                        pages.push('...');
                      } else if (page >= totalPages - 3) {
                        pages.push('...');
                        for (let p = totalPages - 5; p <= totalPages; p++) pages.push(p);
                      } else {
                        pages.push('...');
                        for (let p = page - 1; p <= page + 1; p++) pages.push(p);
                        pages.push('...');
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
                          className={`min-w-[28px] h-7 flex items-center justify-center rounded text-sm mx-0.5 ${
                            page === p
                              ? 'border border-[#20a9a7] text-[#20a9a7] font-medium'
                              : 'text-slate-500 hover:text-slate-800'
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
                    className="p-1 ml-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 flex justify-end items-center space-x-3">
                  <span className="text-slate-500">Rows per page</span>
                  <select
                    value={limit}
                    onChange={(e) => updateUrl({ limit: e.target.value, page: '1' })}
                    className="border border-slate-200 rounded px-2 py-1.5 text-slate-700 text-[13px] focus:outline-none focus:border-[#0076f2] bg-white cursor-pointer"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>



      <PurchaseInvoiceImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={fetchReceives} 
      />
    </div>
  );
}
