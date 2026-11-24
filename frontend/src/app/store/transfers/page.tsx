"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getStoreTransfers, updateStoreTransferStatus, deleteStoreTransfer } from "@/features/store/api/store.api";
import { 
  ArrowRightLeft, Send, Download, Plus, Search, FileText, Package, Truck, 
  RotateCcw, Calendar, CheckCircle2, Clock, XCircle, PackageCheck, Eye, Edit, Trash2, X, BarChart3 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableBottomControls } from "@/shared/components/DataTableControls";
import { useAuthStore } from "@/shared/store/auth.store";
import { TransferStatistics } from "@/features/store/components/TransferStatistics";
import { formatDate } from "@/shared/utils/date";
import { normalizeStoreName } from "@/shared/utils/store";
import { useResizableColumns } from "@/shared/hooks/useResizableColumns";
import { ResizableTh } from "@/shared/components/ResizableHeader";
import { TransferEditModal } from "@/features/store/components/TransferEditModal";
import { TransferDetailModal } from "@/features/store/components/TransferDetailModal";
import { toast } from "sonner";

export default function StoreTransfersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [allTransfers, setAllTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(true);

  // Modals state
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Search & Filter State
  const [searchDoc, setSearchDoc] = useState("");
  const [searchMaterial, setSearchMaterial] = useState("");
  const [searchVehicle, setSearchVehicle] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [fromStoreFilter, setFromStoreFilter] = useState("ALL");
  const [toStoreFilter, setToStoreFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'outgoing') setActiveTab('outgoing');
    else if (tab === 'incoming') setActiveTab('incoming');

    const dash = searchParams.get('dashboard');
    if (dash === 'false') setShowStats(false);
    else if (dash === 'true') setShowStats(true);
  }, [searchParams]);

  const { user } = useAuthStore();
  const currentStoreCircle = user?.assignedCircle || '';
  const isSuperOrAdmin =
    user?.role?.name === 'Super Admin' ||
    user?.role?.name === 'Admin' ||
    user?.role?.name === 'CEO' ||
    user?.role?.name === 'Project Director' ||
    user?.role?.name === 'Project Manager' ||
    user?.role?.permissions?.includes('*') ||
    !currentStoreCircle ||
    currentStoreCircle.toLowerCase() === 'all';

  const canEditOrDelete = isSuperOrAdmin;

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await getStoreTransfers();
      setAllTransfers(res.data || []);
    } catch (error) {
      console.error("Failed to load store transfers", error);
    } finally {
      setLoading(false);
    }
  };

  const clean = (str: string) => (str || '').toLowerCase().replace(/store|circle/gi, '').trim();
  const currentCleanStore = clean(currentStoreCircle);

  const matchesStore = (transferStore: string) => {
    if (isSuperOrAdmin || !currentCleanStore || currentCleanStore === 'all') return true;
    const norm = clean(transferStore);
    if (!norm) return true;
    // Check full name match
    if (norm.includes(currentCleanStore) || currentCleanStore.includes(norm)) return true;
    // Check normalized last-part match (e.g. "rohru - rohru" -> "rohru")
    const lastPart = clean(normalizeStoreName(transferStore));
    return lastPart.includes(currentCleanStore) || currentCleanStore.includes(lastPart);
  };

  // 1. Filter by Active Tab & Store Ownership
  const tabTransfers = useMemo(() => {
    if (activeTab === 'incoming') {
      return allTransfers.filter((t: any) => t.status !== 'REJECTED' && matchesStore(t.toStore));
    } else {
      return allTransfers.filter((t: any) => matchesStore(t.fromStore));
    }
  }, [allTransfers, activeTab, currentStoreCircle, isSuperOrAdmin]);

  // 2. Dynamic Unique Stores for dropdown filters
  const uniqueFromStores = useMemo(() => {
    const s = new Set<string>();
    tabTransfers.forEach((t: any) => {
      const n = normalizeStoreName(t.fromStore);
      if (n) s.add(n);
    });
    return Array.from(s).sort();
  }, [tabTransfers]);

  const uniqueToStores = useMemo(() => {
    const s = new Set<string>();
    tabTransfers.forEach((t: any) => {
      const n = normalizeStoreName(t.toStore);
      if (n) s.add(n);
    });
    return Array.from(s).sort();
  }, [tabTransfers]);

  // 3. Multi-Criteria Filter Pipeline
  const filteredTransfers = useMemo(() => {
    return tabTransfers.filter((t: any) => {
      // Status Filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      // From Store Filter
      if (fromStoreFilter !== 'ALL') {
        const norm = normalizeStoreName(t.fromStore).toLowerCase();
        if (norm !== fromStoreFilter.toLowerCase()) return false;
      }

      // To Store Filter
      if (toStoreFilter !== 'ALL') {
        const norm = normalizeStoreName(t.toStore).toLowerCase();
        if (norm !== toStoreFilter.toLowerCase()) return false;
      }

      // Date Range Filter
      if (startDate) {
        const dStr = t.requestDate ? new Date(t.requestDate).toISOString().split('T')[0] : '';
        if (dStr && dStr < startDate) return false;
      }
      if (endDate) {
        const dStr = t.requestDate ? new Date(t.requestDate).toISOString().split('T')[0] : '';
        if (dStr && dStr > endDate) return false;
      }

      // Document Search: Challan No, MIN No, GR No
      if (searchDoc.trim()) {
        const q = searchDoc.toLowerCase().trim();
        const ch = (t.challanNo || '').toLowerCase();
        const min = (t.minNo || '').toLowerCase();
        const minB = (t.minBookNo || '').toLowerCase();
        const gr = (t.grNumber || '').toLowerCase();
        if (!ch.includes(q) && !min.includes(q) && !minB.includes(q) && !gr.includes(q)) return false;
      }

      // Material / Item Search: item description, code, loaSerialNo, vendor
      if (searchMaterial.trim()) {
        const q = searchMaterial.toLowerCase().trim();
        const vendor = (t.vendorName || '').toLowerCase();
        const matchesItem = (t.items || []).some((item: any) => {
          const desc = (item.description || '').toLowerCase();
          const code = (item.tempCode || '').toLowerCase();
          const loa = (item.loaSerialNo || '').toLowerCase();
          const name = (item.itemName || item.name || '').toLowerCase();
          return desc.includes(q) || code.includes(q) || loa.includes(q) || name.includes(q);
        });
        if (!vendor.includes(q) && !matchesItem) return false;
      }

      // Vehicle / Driver Search: truckNumber, driverName, driverMobile, transportName
      if (searchVehicle.trim()) {
        const q = searchVehicle.toLowerCase().trim();
        const truck = (t.truckNumber || '').toLowerCase();
        const driver = (t.driverName || '').toLowerCase();
        const mobile = (t.driverMobile || '').toLowerCase();
        const transport = (t.transportName || '').toLowerCase();
        if (!truck.includes(q) && !driver.includes(q) && !mobile.includes(q) && !transport.includes(q)) return false;
      }

      return true;
    });
  }, [tabTransfers, statusFilter, fromStoreFilter, toStoreFilter, startDate, endDate, searchDoc, searchMaterial, searchVehicle]);

  const activeFilterCount = (statusFilter !== 'ALL' ? 1 : 0) +
    (fromStoreFilter !== 'ALL' ? 1 : 0) +
    (toStoreFilter !== 'ALL' ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (searchDoc.trim() ? 1 : 0) +
    (searchMaterial.trim() ? 1 : 0) +
    (searchVehicle.trim() ? 1 : 0);

  const handleClearFilters = () => {
    setSearchDoc("");
    setSearchMaterial("");
    setSearchVehicle("");
    setStatusFilter("ALL");
    setFromStoreFilter("ALL");
    setToStoreFilter("ALL");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
  };

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems
  } = useClientTable(filteredTransfers);

  // Resizable columns configuration
  const initialColWidths: Record<string, number> = {
    requestDate: 130,
    challanNo: 150,
    fromStore: 170,
    toStore: 170,
    itemsCount: 180,
    status: 160,
    actions: 170
  };
  const { colWidths, handleMouseDown } = useResizableColumns('store-transfers-table', initialColWidths);

  const totalTableWidth = useMemo(() => {
    return Object.values(colWidths).reduce((sum, w) => sum + (Number(w) || 100), 0);
  }, [colWidths]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending PD Approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
            Pending PD Approval
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-blue-500" />
            Approved
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
            <Truck className="w-3 h-3 text-purple-500" />
            In Transit
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <PackageCheck className="w-3 h-3 text-emerald-600" />
            Received
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
            <XCircle className="w-3 h-3 text-red-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 whitespace-nowrap">
            {status || 'Pending'}
          </span>
        );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transfer? This action cannot be undone.")) return;
    try {
      await deleteStoreTransfer(id);
      toast.success("Transfer deleted successfully");
      fetchTransfers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete transfer");
    }
  };

  return (
    <div className="flex-1 bg-white min-h-screen p-3 sm:p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header with Title and New Request Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Inter-Store Transfers ({activeTab === 'incoming' ? 'Incoming' : 'Outgoing'})
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage and track inter-store transfers across circular stores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push('/store/transfers/request')}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs font-semibold h-9 px-3.5"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Transfer Request
            </Button>
          </div>
        </div>

        {/* Tab Navigation & Dashboard Toggle */}
        <div className="flex space-x-1 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'incoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Incoming Transfers (Action Required)</span>
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'outgoing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Outgoing Transfers</span>
          </button>
          
          <div className="flex-1"></div>
          
          <button 
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center justify-center px-3 py-1.5 my-1.5 rounded-md border transition-colors text-sm font-medium ${
              showStats 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {showStats ? "Hide Dashboard" : "Dashboard"}
          </button>
        </div>

        {/* Dashboard Section */}
        {showStats && (
          loading ? (
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-100/80 rounded-xl border border-slate-200"></div>
              ))}
            </div>
          ) : tabTransfers.length > 0 ? (
            <div className="mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
              <TransferStatistics transfers={tabTransfers} type={activeTab} />
            </div>
          ) : null
        )}

        {/* Main Content Box */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading transfers...</div>
          ) : (
            <>
              {/* Search & Filter Toolbar */}
              <div className="p-4 bg-white border-b border-slate-200 space-y-3">
                {/* Row 1: Search Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* General Search */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 pr-3 py-2 transition-all outline-none"
                      placeholder="Search all columns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Document Search */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 pr-3 py-2 transition-all outline-none"
                      placeholder="Challan / MIN / GR No..."
                      value={searchDoc}
                      onChange={(e) => setSearchDoc(e.target.value)}
                    />
                    {searchDoc && (
                      <button onClick={() => setSearchDoc('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Material Search */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Package className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 pr-3 py-2 transition-all outline-none"
                      placeholder="Item / Temp Code / Vendor..."
                      value={searchMaterial}
                      onChange={(e) => setSearchMaterial(e.target.value)}
                    />
                    {searchMaterial && (
                      <button onClick={() => setSearchMaterial('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Vehicle / Driver Search */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Truck className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      className="bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-9 pr-3 py-2 transition-all outline-none"
                      placeholder="Truck No / Driver / Transport..."
                      value={searchVehicle}
                      onChange={(e) => setSearchVehicle(e.target.value)}
                    />
                    {searchVehicle && (
                      <button onClick={() => setSearchVehicle('')} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Row 2: Dropdown Filters & Date Range */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 border-t border-slate-100">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg block w-full p-2 outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Pending PD Approval">Pending PD Approval</option>
                      <option value="Approved">Approved</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="RECEIVED">Received</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>

                  {/* From Store Filter */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">From Store</label>
                    <select
                      value={fromStoreFilter}
                      onChange={(e) => setFromStoreFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg block w-full p-2 outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ALL">All Origin Stores</option>
                      {uniqueFromStores.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* To Store Filter */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">To Store</label>
                    <select
                      value={toStoreFilter}
                      onChange={(e) => setToStoreFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg block w-full p-2 outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ALL">All Dest Stores</option>
                      {uniqueToStores.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg block w-full p-2 outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg block w-full p-2 outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Clear Filters Button */}
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      disabled={activeFilterCount === 0 && !searchTerm}
                      className="w-full h-8 text-xs text-slate-600 hover:text-slate-900 border-slate-200 disabled:opacity-40"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Clear {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Table with Resizable Columns */}
              <div className="overflow-x-auto">
                <table 
                  className="w-full text-sm text-left whitespace-nowrap table-fixed border-collapse"
                  style={{ minWidth: `${Math.max(totalTableWidth, 1000)}px` }}
                >
                  <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <ResizableTh id="requestDate" width={colWidths.requestDate} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Request Date</ResizableTh>
                      <ResizableTh id="challanNo" width={colWidths.challanNo} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Challan No</ResizableTh>
                      <ResizableTh id="fromStore" width={colWidths.fromStore} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">From Store</ResizableTh>
                      <ResizableTh id="toStore" width={colWidths.toStore} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">To Store</ResizableTh>
                      <ResizableTh id="itemsCount" width={colWidths.itemsCount} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Items Count</ResizableTh>
                      <ResizableTh id="status" width={colWidths.status} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200 text-center">Status</ResizableTh>
                      <th style={{ width: `${colWidths.actions}px`, minWidth: `${colWidths.actions}px` }} className="px-4 py-3 text-center sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.05)] border-l border-slate-200">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                          No matching transfer records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((t: any) => (
                        <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                          <td style={{ width: `${colWidths.requestDate}px` }} className="px-4 py-3 border-r border-slate-100 font-medium text-slate-900 overflow-hidden text-ellipsis">
                            {formatDate(t.requestDate)}
                          </td>
                          <td style={{ width: `${colWidths.challanNo}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-700 font-medium overflow-hidden text-ellipsis" title={t.challanNo || '-'}>
                            {t.challanNo || '-'}
                          </td>
                          <td style={{ width: `${colWidths.fromStore}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-600 overflow-hidden text-ellipsis" title={normalizeStoreName(t.fromStore)}>
                            {normalizeStoreName(t.fromStore)}
                          </td>
                          <td style={{ width: `${colWidths.toStore}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-600 overflow-hidden text-ellipsis" title={normalizeStoreName(t.toStore)}>
                            {normalizeStoreName(t.toStore)}
                          </td>
                          <td style={{ width: `${colWidths.itemsCount}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-600 overflow-hidden text-ellipsis" title={(t.items || []).map((i: any) => i.description || i.tempCode).filter(Boolean).join(', ')}>
                            <span className="font-semibold text-slate-800">{t.items?.length || 0}</span> items
                            {t.items?.[0]?.description && (
                              <span className="text-xs text-slate-400 block truncate font-normal">
                                {t.items[0].description}
                              </span>
                            )}
                          </td>
                          <td style={{ width: `${colWidths.status}px` }} className="px-4 py-3 border-r border-slate-100 text-center overflow-hidden text-ellipsis">
                            {getStatusBadge(t.status)}
                          </td>
                          <td style={{ width: `${colWidths.actions}px` }} className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 transition-colors z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.02)] border-l border-slate-200">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Workflow Actions */}
                              {t.status === 'Pending PD Approval' ? (
                                <span className="text-amber-600 font-medium text-xs flex items-center justify-center gap-1 italic">
                                  Awaiting PD
                                </span>
                              ) : activeTab === 'incoming' ? (
                                t.status === 'PENDING' ? (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await updateStoreTransferStatus(t._id, 'Approved');
                                        toast.success("Transfer approved");
                                        fetchTransfers();
                                      } catch (e) {
                                        console.error(e);
                                        toast.error("Failed to approve transfer");
                                      }
                                    }}
                                    className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded font-semibold text-xs transition-colors"
                                  >
                                    Approve
                                  </button>
                                ) : t.status === 'IN_TRANSIT' || t.status === 'Approved' ? (
                                  <button
                                    onClick={() => router.push(`/store/transfers/receive/${t._id}`)}
                                    className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg font-semibold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    Receive
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedTransferId(t._id);
                                      setIsDetailOpen(true);
                                    }}
                                    className="text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded font-medium text-xs flex items-center gap-1 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View
                                  </button>
                                )
                              ) : (
                                /* Outgoing tab */
                                t.status === 'Approved' ? (
                                  <button
                                    onClick={() => router.push(`/store/transfers/dispatch/${t._id}`)}
                                    className="text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-300 px-2.5 py-1 rounded font-semibold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    Dispatch
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedTransferId(t._id);
                                      setIsDetailOpen(true);
                                    }}
                                    className="text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded font-medium text-xs flex items-center gap-1 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View
                                  </button>
                                )
                              )}

                              {/* Privileged Edit and Delete buttons */}
                              {canEditOrDelete && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedTransferId(t._id);
                                      setIsEditOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                    title="Edit Transfer"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(t._id)}
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete Transfer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <DataTableBottomControls
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={setPageSize}
                totalItems={totalItems}
              />
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <TransferDetailModal
        transferId={selectedTransferId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTransferId(null);
        }}
      />

      {/* Edit Modal */}
      <TransferEditModal
        transferId={selectedTransferId}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedTransferId(null);
        }}
        onSuccess={() => {
          fetchTransfers();
          setIsEditOpen(false);
          setSelectedTransferId(null);
        }}
      />
    </div>
  );
}
