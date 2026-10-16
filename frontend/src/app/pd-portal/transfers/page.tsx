"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Truck, 
  PackageCheck, 
  Eye, 
  Filter, 
  Search, 
  AlertCircle,
  Building2,
  Calendar,
  UserCheck,
  FileText,
  ShieldCheck,
  Send
} from "lucide-react";
import { 
  getStoreTransfers, 
  approveStoreTransferByPD, 
  rejectStoreTransferByPD 
} from "@/features/store/api/store.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuthStore } from "@/shared/store/auth.store";

export default function PDStoreTransfersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'pending';
  
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCircle, setSelectedCircle] = useState("All");

  // Selected transfer for Detail / Action Modal
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionRemarks, setActionRemarks] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { user } = useAuthStore();

  const pdScopeInfo = useMemo(() => {
    const pkg = (user?.assignedPackage || '').toLowerCase();
    const circle = (user?.assignedCircle || '').toLowerCase();
    const isSuper = user?.role?.name === 'Super Admin' || user?.role?.name === 'CEO' || user?.role?.permissions?.includes('*');

    if (isSuper) {
      return {
        title: "All Circles & Packages",
        description: "Super Admin / Executive Jurisdiction",
        circles: ['All', 'Solan', 'Kumarhatti', 'Nalagarh', 'Nahan', 'Rohru', 'Rampur'],
        badgeColor: "bg-purple-100 text-purple-800 border-purple-200"
      };
    }

    if (pkg.includes('package 2') || pkg.includes('r/r') || circle.includes('rohru') || circle.includes('rampur')) {
      return {
        title: "Rohru & Rampur",
        description: "Package 2 (R/R) Jurisdiction",
        circles: ['All', 'Rohru', 'Rampur'],
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200"
      };
    }

    // Default: Package 1 (S/N)
    return {
      title: "Solan & Nahan",
      description: "Package 1 (S/N) Jurisdiction (Solan, Kumarhatti, Nalagarh, Nahan)",
      circles: ['All', 'Solan', 'Kumarhatti', 'Nalagarh', 'Nahan'],
      badgeColor: "bg-blue-100 text-blue-800 border-blue-200"
    };
  }, [user]);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await getStoreTransfers();
      setTransfers(res.data || []);
    } catch (error) {
      console.error("Failed to fetch store transfers", error);
      toast.error("Failed to load store transfers");
    } finally {
      setLoading(false);
    }
  };

  // Filter transfers by tab, circle, and search term
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t: any) => {
      // Tab filter
      if (activeTab === 'pending' && t.status !== 'Pending PD Approval') return false;
      if (activeTab === 'approved' && t.status !== 'Approved') return false;
      if (activeTab === 'in_transit' && t.status !== 'IN_TRANSIT') return false;
      if (activeTab === 'received' && t.status !== 'RECEIVED') return false;
      if (activeTab === 'rejected' && t.status !== 'REJECTED') return false;

      // Circle filter
      if (selectedCircle !== 'All') {
        const sc = selectedCircle.toLowerCase();
        const fromMatch = (t.fromStore || '').toLowerCase().includes(sc);
        const toMatch = (t.toStore || '').toLowerCase().includes(sc);
        if (!fromMatch && !toMatch) return false;
      }

      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const fromStr = (t.fromStore || '').toLowerCase();
        const toStr = (t.toStore || '').toLowerCase();
        const challan = (t.challanNo || '').toLowerCase();
        const min = (t.minNo || '').toLowerCase();
        const hasItemMatch = (t.items || []).some((it: any) => 
          (it.description || '').toLowerCase().includes(term) ||
          (it.tempCode || '').toLowerCase().includes(term)
        );
        return fromStr.includes(term) || toStr.includes(term) || challan.includes(term) || min.includes(term) || hasItemMatch;
      }

      return true;
    });
  }, [transfers, activeTab, selectedCircle, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const pending = transfers.filter((t: any) => t.status === 'Pending PD Approval').length;
    const approved = transfers.filter((t: any) => t.status === 'Approved').length;
    const inTransit = transfers.filter((t: any) => t.status === 'IN_TRANSIT').length;
    const received = transfers.filter((t: any) => t.status === 'RECEIVED').length;
    const rejected = transfers.filter((t: any) => t.status === 'REJECTED').length;
    return { pending, approved, inTransit, received, rejected, total: transfers.length };
  }, [transfers]);

  const handleOpenReview = (transfer: any) => {
    setSelectedTransfer(transfer);
    setActionRemarks("");
    setRejectionReason("");
    setIsRejectMode(false);
    setIsModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedTransfer) return;
    try {
      setIsActionLoading(true);
      await approveStoreTransferByPD(selectedTransfer._id, actionRemarks);
      toast.success(`Transfer from ${selectedTransfer.fromStore} to ${selectedTransfer.toStore} approved successfully!`);
      setIsModalOpen(false);
      fetchTransfers();
    } catch (error: any) {
      console.error("Approve failed", error);
      toast.error(error.response?.data?.message || "Failed to approve transfer");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTransfer) return;
    if (!rejectionReason.trim()) {
      toast.error("Please enter a reason for rejecting this transfer.");
      return;
    }
    try {
      setIsActionLoading(true);
      await rejectStoreTransferByPD(selectedTransfer._id, rejectionReason);
      toast.success("Store transfer has been rejected.");
      setIsModalOpen(false);
      fetchTransfers();
    } catch (error: any) {
      console.error("Reject failed", error);
      toast.error(error.response?.data?.message || "Failed to reject transfer");
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending PD Approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            Pending PD Approval
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            Approved (Ready for Dispatch)
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Truck className="w-3.5 h-3.5 text-purple-500" />
            In Transit
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
            Received
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <span>Project Director Portal</span>
              <span>/</span>
              <span className="text-slate-800 font-medium">Store Transfers</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
              Inter-Store Transfer Authorizations
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Review, approve, or reject material stock transfer requests between store locations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className={`px-3.5 py-2 rounded-lg border text-xs flex items-center gap-2.5 font-medium ${pdScopeInfo.badgeColor}`}>
              <Building2 className="w-4 h-4 shrink-0" />
              <div>
                <div className="font-bold text-xs">{pdScopeInfo.title}</div>
                <div className="opacity-80 text-[11px]">{pdScopeInfo.description}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => setActiveTab('pending')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-50/80 border-amber-300 shadow-sm ring-1 ring-amber-300'
                : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Awaiting Decision</span>
              <span className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-900">{stats.pending}</div>
            <div className="text-xs text-amber-700 mt-1 flex items-center gap-1 font-medium">
              Requires PD Sign-off
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('approved')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-blue-50/80 border-blue-300 shadow-sm ring-1 ring-blue-300'
                : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Approved / Transit</span>
              <span className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                <Truck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-blue-900">{stats.approved + stats.inTransit}</div>
            <div className="text-xs text-blue-600 mt-1 font-medium">
              {stats.approved} ready to dispatch • {stats.inTransit} in transit
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('received')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'received'
                ? 'bg-emerald-50/80 border-emerald-300 shadow-sm ring-1 ring-emerald-300'
                : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Completed Transfers</span>
              <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                <PackageCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-900">{stats.received}</div>
            <div className="text-xs text-emerald-600 mt-1 font-medium">
              Successfully received at destination
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-50/80 border-indigo-300 shadow-sm ring-1 ring-indigo-300'
                : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Transfers</span>
              <span className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                <ArrowRightLeft className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              {stats.rejected} rejected
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Pending Approvals</span>
                {stats.pending > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {stats.pending}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('approved')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'approved'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approved ({stats.approved})</span>
              </button>

              <button
                onClick={() => setActiveTab('in_transit')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'in_transit'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>In Transit ({stats.inTransit})</span>
              </button>

              <button
                onClick={() => setActiveTab('received')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'received'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <PackageCheck className="w-4 h-4" />
                <span>Received ({stats.received})</span>
              </button>

              <button
                onClick={() => setActiveTab('rejected')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'rejected'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Rejected ({stats.rejected})</span>
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>All ({stats.total})</span>
              </button>
            </div>

            {/* Filter inputs */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search stores, items, challan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 w-64 text-xs"
                />
              </div>

              <select
                value={selectedCircle}
                onChange={(e) => setSelectedCircle(e.target.value)}
                className="h-9 px-3 rounded-md border border-slate-300 text-xs font-medium text-slate-700 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {pdScopeInfo.circles.map((c: string) => (
                  <option key={c} value={c}>
                    {c === 'All' ? `All Stores (${pdScopeInfo.title})` : `${c} Store`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Request Date</th>
                  <th className="px-6 py-3.5">Transfer Route</th>
                  <th className="px-6 py-3.5">Material Summary</th>
                  <th className="px-6 py-3.5">Challan / MIN</th>
                  <th className="px-6 py-3.5">Transport</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-center">PD Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-medium">Loading store transfers...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <AlertCircle className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="font-semibold text-slate-700">No transfers found</span>
                        <span className="text-xs text-slate-400">
                          {activeTab === 'pending'
                            ? "Great! No store transfers currently require your approval."
                            : "No store transfer records match the selected filters."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((t: any) => {
                    const totalQty = (t.items || []).reduce((acc: number, it: any) => acc + (Number(it.requestedQty) || Number(it.dispatchedQty) || 0), 0);
                    const firstItem = t.items?.[0]?.description || 'Material';
                    const remainingCount = (t.items?.length || 1) - 1;
                    const isPkg2 = (t.originPackage || t.fromStore || '').toLowerCase().includes('rohru') || (t.originPackage || t.fromStore || '').toLowerCase().includes('rampur');
                    const originPkgLabel = t.originPackage || (isPkg2 ? 'Package 2 (R/R)' : 'Package 1 (S/N)');

                    return (
                      <tr key={t._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-slate-900">
                            {new Date(t.requestDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-400">
                            Req by: {t.requestedBy ? `${t.requestedBy.firstName || ''} ${t.requestedBy.lastName || ''}`.trim() || t.requestedBy.email : 'Store Manager'}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                              {t.fromStore}
                            </span>
                            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                              {t.toStore}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                              isPkg2 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {originPkgLabel}
                            </span>
                            {t.remarks && (
                              <span className="text-xs text-slate-500 line-clamp-1 italic">
                                "{t.remarks}"
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800 line-clamp-1">
                            {firstItem} {remainingCount > 0 && <span className="text-xs text-indigo-600 font-semibold">(+{remainingCount} more)</span>}
                          </div>
                          <div className="text-xs text-slate-500">
                            Total: <span className="font-semibold text-slate-700">{totalQty} units</span> across {t.items?.length || 0} items
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <div className="font-mono text-slate-700">CH: {t.challanNo || '-'}</div>
                          <div className="font-mono text-slate-400">MIN: {t.minNo || '-'}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <div className="text-slate-800 font-medium">{t.transportName || '-'}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{t.truckNumber || '-'}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(t.status)}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {t.status === 'Pending PD Approval' ? (
                            <Button
                              onClick={() => handleOpenReview(t)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 rounded-lg shadow-sm font-semibold flex items-center gap-1.5 mx-auto"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Review & Decide
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => handleOpenReview(t)}
                              className="text-xs h-8 px-3 rounded-lg font-medium flex items-center gap-1.5 mx-auto text-slate-600"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Details
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Review & Action Modal */}
      {isModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Store Transfer Review
                    {selectedTransfer.status === 'Pending PD Approval' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                        Action Required
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    ID: {selectedTransfer._id} • Created: {new Date(selectedTransfer.requestDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Route Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Source Store (Origin)</span>
                  <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    {selectedTransfer.fromStore}
                  </div>
                  <div className="mt-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {selectedTransfer.originPackage || (selectedTransfer.fromStore?.match(/rohru|rampur/i) ? 'Package 2 (R/R) • Rohru & Rampur' : 'Package 1 (S/N) • Solan & Nahan')}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block mb-1">Destination Store</span>
                  <div className="text-base font-bold text-indigo-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    {selectedTransfer.toStore}
                  </div>
                  <div className="mt-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      {selectedTransfer.destinationPackage || (selectedTransfer.toStore?.match(/rohru|rampur/i) ? 'Package 2 (R/R) • Rohru & Rampur' : 'Package 1 (S/N) • Solan & Nahan')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transfer Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Status</span>
                  <div>{getStatusBadge(selectedTransfer.status)}</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Challan No</span>
                  <span className="font-semibold text-slate-800">{selectedTransfer.challanNo || '-'}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">MIN No</span>
                  <span className="font-semibold text-slate-800">{selectedTransfer.minNo || '-'}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Vehicle No</span>
                  <span className="font-semibold text-slate-800">{selectedTransfer.truckNumber || '-'}</span>
                </div>
              </div>

              {selectedTransfer.remarks && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-xs">
                  <span className="font-bold text-amber-800 block mb-0.5">Store Manager Remark:</span>
                  <span className="text-amber-900">{selectedTransfer.remarks}</span>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center justify-between">
                  <span>Materials to Transfer ({selectedTransfer.items?.length || 0})</span>
                  <span className="text-xs font-normal text-slate-500">
                    Total Qty: {selectedTransfer.items?.reduce((a: number, b: any) => a + (Number(b.requestedQty) || Number(b.dispatchedQty) || 0), 0)}
                  </span>
                </h3>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="px-4 py-2.5">#</th>
                        <th className="px-4 py-2.5">Temp Code</th>
                        <th className="px-4 py-2.5">Description</th>
                        <th className="px-4 py-2.5 text-right">Transfer Qty</th>
                        <th className="px-4 py-2.5">Unit</th>
                        <th className="px-4 py-2.5">LOA Sr. No</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedTransfer.items || []).map((it: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-mono font-medium text-slate-700">{it.tempCode || '-'}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{it.description || it.itemName}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-indigo-600">{it.requestedQty || it.dispatchedQty}</td>
                          <td className="px-4 py-2.5 text-slate-600">{it.unit || 'Nos'}</td>
                          <td className="px-4 py-2.5 text-slate-500">{it.loaSerialNo || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PD Approval / Rejection Audit Info if already decided */}
              {selectedTransfer.pdApprovedAt && (
                <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-800">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Approved by Project Director
                  </div>
                  <div>Approved At: {new Date(selectedTransfer.pdApprovedAt).toLocaleString()}</div>
                  {selectedTransfer.pdApprovalRemarks && (
                    <div className="italic">Remarks: "{selectedTransfer.pdApprovalRemarks}"</div>
                  )}
                </div>
              )}

              {selectedTransfer.rejectedAt && (
                <div className="p-3 bg-red-50/70 rounded-lg border border-red-200 text-xs text-red-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-800">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Rejected by Project Director
                  </div>
                  <div>Rejected At: {new Date(selectedTransfer.rejectedAt).toLocaleString()}</div>
                  <div>Reason: "{selectedTransfer.rejectionReason || 'No reason provided'}"</div>
                </div>
              )}

              {/* Action Form if Pending */}
              {selectedTransfer.status === 'Pending PD Approval' && (
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  {!isRejectMode ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Approval Notes / Remarks (Optional)
                      </label>
                      <Input
                        placeholder="Add any instructions or conditions for this transfer..."
                        value={actionRemarks}
                        onChange={(e) => setActionRemarks(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-red-700 mb-1">
                        Reason for Rejection (Required)
                      </label>
                      <Input
                        placeholder="Explain why this store transfer cannot be authorized..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="text-xs border-red-300 focus:border-red-500"
                      />
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs h-9"
              >
                Close
              </Button>

              {selectedTransfer.status === 'Pending PD Approval' && (
                <div className="flex items-center gap-2">
                  {!isRejectMode ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setIsRejectMode(true)}
                        className="text-xs h-9 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        disabled={isActionLoading}
                      >
                        <XCircle className="w-4 h-4 mr-1.5" />
                        Reject
                      </Button>
                      <Button
                        onClick={handleApprove}
                        className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          "Processing..."
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Approve Transfer
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setIsRejectMode(false)}
                        className="text-xs h-9"
                        disabled={isActionLoading}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleReject}
                        className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
                        disabled={isActionLoading || !rejectionReason.trim()}
                      >
                        {isActionLoading ? "Rejecting..." : "Confirm Rejection"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
