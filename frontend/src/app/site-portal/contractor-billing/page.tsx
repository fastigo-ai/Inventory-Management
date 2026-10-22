'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FileText, 
  CheckCircle, 
  SearchX, 
  Upload, 
  Trash2, 
  Edit, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import { 
  getContractorInvoices, 
  getHandoverCertificates,
  getBillingAnalytics,
  deleteContractorInvoice
} from '@/features/contractor-billing/api/contractor-billing.api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useClientTable } from '@/shared/hooks/useClientTable';
import { DataTableTopControls, DataTableBottomControls } from '@/shared/components/DataTableControls';
import { ContractorBillBulkUploadModal } from '@/features/site-portal/components/ContractorBillBulkUploadModal';
import { 
  ContractorBillingErpFilters, 
  BillingFilterState, 
  initialBillingFilterState 
} from '@/features/contractor-billing/components/ContractorBillingErpFilters';

export default function ContractorBillingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('bills');
  const [bills, setBills] = useState<any[]>([]);
  const [handoverCertificates, setHandoverCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);

  // Enterprise ERP Filter State
  const [filters, setFilters] = useState<BillingFilterState>(initialBillingFilterState);
  const [invCurrentPage, setInvCurrentPage] = useState(1);
  const [invRowsPerPage, setInvRowsPerPage] = useState(30);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, hoRes] = await Promise.all([
        getContractorInvoices(),
        getHandoverCertificates()
      ]);
      setBills(invRes.data || []);
      setHandoverCertificates(hoRes.data || []);
    } catch (error) {
      console.error('Failed to fetch billing data', error);
      toast.error('Failed to load contractor billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await getBillingAnalytics();
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch billing analytics', error);
    }
  };

  const handleDeleteInvoice = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this bill? This action cannot be undone.')) return;
    try {
      await deleteContractorInvoice(id);
      toast.success('Bill deleted successfully');
      fetchData();
      fetchAnalytics();
    } catch (error) {
      console.error('Failed to delete bill', error);
      toast.error('Failed to delete bill');
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Submitted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Pending PM Approval': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pending Site Approval': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Paid': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setInvCurrentPage(1);
  }, [filters]);

  // Comprehensive Multi-Dimensional Enterprise ERP Filtering & Sorting
  const filteredAndSortedBills = useMemo(() => {
    let result = [...bills];

    // 1. Text Search (multi-column)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter((b: any) => {
        const invNo = String(b.invoiceNumber || '').toLowerCase();
        const cName = String(
          b.contractorId?.dynamicData?.displayName || 
          b.contractorId?.name || 
          b.legacyMetadata?.billedBy || ''
        ).toLowerCase();
        const woNo = String(b.workOrderId?.workOrderNumber || '').toLowerCase();
        const pkg = String(b.workOrderId?.package || b.legacyMetadata?.package || '').toLowerCase();
        const circle = String(b.workOrderId?.circle || b.legacyMetadata?.circle || '').toLowerCase();
        const stage = String(b.stage || '').toLowerCase();
        const status = String(b.status || '').toLowerCase();
        const amt = String(b.grandTotal || '').toLowerCase();

        return invNo.includes(q) || 
               cName.includes(q) || 
               woNo.includes(q) || 
               pkg.includes(q) || 
               circle.includes(q) || 
               stage.includes(q) || 
               status.includes(q) || 
               amt.includes(q);
      });
    }

    // 2. Category / Nature
    if (filters.category !== 'ALL') {
      result = result.filter((b: any) => {
        const isErection = b.billingCategory === 'Erection Bill' || String(b.invoiceNumber || '').includes('/ER/');
        if (filters.category === 'Erection Bill') return isErection;
        if (filters.category === 'Contractor Bill') return !isErection;
        return true;
      });
    }

    // 3. Contractor
    if (filters.contractor !== 'ALL') {
      result = result.filter((b: any) => {
        const cName = b.contractorId?.dynamicData?.displayName || 
                      b.contractorId?.name || 
                      b.legacyMetadata?.billedBy || 
                      'Legacy Data (Unlinked)';
        return cName === filters.contractor;
      });
    }

    // 4. Status
    if (filters.status !== 'ALL') {
      result = result.filter((b: any) => b.status === filters.status);
    }

    // 5. Stage
    if (filters.stage !== 'ALL') {
      result = result.filter((b: any) => String(b.stage || '').trim() === filters.stage);
    }

    // 6. Circle
    if (filters.circle !== 'ALL') {
      result = result.filter((b: any) => {
        const circle = b.workOrderId?.circle || b.legacyMetadata?.circle;
        return String(circle || '').trim() === filters.circle;
      });
    }

    // 7. Package
    if (filters.packageVal !== 'ALL') {
      result = result.filter((b: any) => {
        const pkg = b.workOrderId?.package || b.legacyMetadata?.package;
        return String(pkg || '').trim() === filters.packageVal;
      });
    }

    // 8. Date Range
    if (filters.datePreset !== 'ALL') {
      const now = new Date();
      result = result.filter((b: any) => {
        const d = b.date ? new Date(b.date) : (b.createdAt ? new Date(b.createdAt) : null);
        if (!d || isNaN(d.getTime())) return true;

        if (filters.datePreset === 'TODAY') {
          return d.getFullYear() === now.getFullYear() && 
                 d.getMonth() === now.getMonth() && 
                 d.getDate() === now.getDate();
        }
        if (filters.datePreset === 'THIS_WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return d >= sevenDaysAgo && d <= now;
        }
        if (filters.datePreset === 'THIS_MONTH') {
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        if (filters.datePreset === 'LAST_MONTH') {
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
        }
        if (filters.datePreset === 'THIS_FY') {
          const currYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
          const fyStart = new Date(currYear, 3, 1);
          const fyEnd = new Date(currYear + 1, 2, 31, 23, 59, 59);
          return d >= fyStart && d <= fyEnd;
        }
        if (filters.datePreset === 'CUSTOM') {
          if (filters.startDate) {
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            if (d < start) return false;
          }
          if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
          }
          return true;
        }
        return true;
      });
    }

    // 9. Amount Range
    if (filters.amountRange !== 'ALL') {
      result = result.filter((b: any) => {
        const amt = Number(b.grandTotal || 0);
        if (filters.amountRange === 'UNDER_5L') return amt < 500000;
        if (filters.amountRange === '5L_25L') return amt >= 500000 && amt <= 2500000;
        if (filters.amountRange === '25L_1CR') return amt >= 2500000 && amt <= 10000000;
        if (filters.amountRange === 'OVER_1CR') return amt > 10000000;
        if (filters.amountRange === 'CUSTOM') {
          const min = filters.minAmount ? Number(filters.minAmount) : -Infinity;
          const max = filters.maxAmount ? Number(filters.maxAmount) : Infinity;
          return amt >= min && amt <= max;
        }
        return true;
      });
    }

    // 10. Sorting
    result.sort((a: any, b: any) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      const amtA = Number(a.grandTotal || 0);
      const amtB = Number(b.grandTotal || 0);
      const billA = String(a.invoiceNumber || '');
      const billB = String(b.invoiceNumber || '');
      const cNameA = String(a.contractorId?.dynamicData?.displayName || a.contractorId?.name || a.legacyMetadata?.billedBy || '');
      const cNameB = String(b.contractorId?.dynamicData?.displayName || b.contractorId?.name || b.legacyMetadata?.billedBy || '');

      switch (filters.sortBy) {
        case 'date_asc': return dateA - dateB;
        case 'amount_desc': return amtB - amtA;
        case 'amount_asc': return amtA - amtB;
        case 'bill_asc': return billA.localeCompare(billB);
        case 'contractor_asc': return cNameA.localeCompare(cNameB);
        case 'date_desc':
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [bills, filters]);

  // Aggregate values of currently filtered records
  const filteredTotalAmount = useMemo(() => {
    return filteredAndSortedBills.reduce((sum: number, b: any) => sum + (b.grandTotal || 0), 0);
  }, [filteredAndSortedBills]);

  // Pagination for Bills
  const invTotalItems = filteredAndSortedBills.length;
  const invTotalPages = Math.max(1, Math.ceil(invTotalItems / invRowsPerPage));
  const invoicePageData = useMemo(() => {
    const start = (invCurrentPage - 1) * invRowsPerPage;
    return filteredAndSortedBills.slice(start, start + invRowsPerPage);
  }, [filteredAndSortedBills, invCurrentPage, invRowsPerPage]);

  // Interactive Table Column Sort handler (SAP ALV Grid behavior)
  const handleColumnSort = (column: 'bill' | 'date' | 'contractor' | 'amount') => {
    setFilters(prev => {
      let nextSort: BillingFilterState['sortBy'] = 'date_desc';
      if (column === 'bill') {
        nextSort = prev.sortBy === 'bill_asc' ? 'date_desc' : 'bill_asc';
      } else if (column === 'date') {
        nextSort = prev.sortBy === 'date_desc' ? 'date_asc' : 'date_desc';
      } else if (column === 'amount') {
        nextSort = prev.sortBy === 'amount_desc' ? 'amount_asc' : 'amount_desc';
      } else if (column === 'contractor') {
        nextSort = prev.sortBy === 'contractor_asc' ? 'date_desc' : 'contractor_asc';
      }
      return { ...prev, sortBy: nextSort };
    });
  };

  const renderSortIndicator = (column: 'bill' | 'date' | 'contractor' | 'amount') => {
    if (column === 'bill' && filters.sortBy === 'bill_asc') {
      return <ArrowUp className="w-3.5 h-3.5 text-blue-600 inline ml-1" />;
    }
    if (column === 'date') {
      if (filters.sortBy === 'date_desc') return <ArrowDown className="w-3.5 h-3.5 text-blue-600 inline ml-1" />;
      if (filters.sortBy === 'date_asc') return <ArrowUp className="w-3.5 h-3.5 text-blue-600 inline ml-1" />;
    }
    if (column === 'amount') {
      if (filters.sortBy === 'amount_desc') return <ArrowDown className="w-3.5 h-3.5 text-blue-600 inline ml-1" />;
      if (filters.sortBy === 'amount_asc') return <ArrowUp className="w-3.5 h-3.5 text-blue-600 inline ml-1" />;
    }
    if (column === 'contractor' && filters.sortBy === 'contractor_asc') {
      return <ArrowUp className="w-3.5 h-3.5 text-blue-600 inline ml-1" />;
    }
    return <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-40 group-hover:opacity-100 transition-opacity inline ml-1" />;
  };

  // Handover certificates pagination
  const {
    paginatedData: hoPageData,
    searchTerm: hoSearchQuery,
    setSearchTerm: setHoSearchQuery,
    currentPage: hoCurrentPage,
    setCurrentPage: setHoCurrentPage,
    pageSize: hoRowsPerPage,
    setPageSize: setHoRowsPerPage,
    totalPages: hoTotalPages,
    totalItems: hoTotalItems,
  } = useClientTable(handoverCertificates);

  return (
    <div className="p-3 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Contractor Billing</h1>
          <p className="text-gray-500 mt-1">Enterprise multi-stage billing, verification and handover register.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => router.push('/site-portal/contractor-billing/handover/new')}
          >
            <CheckCircle className="h-4 w-4" />
            Issue Handover
          </Button>
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => setIsBulkUploadModalOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Bulk Upload (Standard)
          </Button>
          <Button 
            variant="outline"
            className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            onClick={() => router.push('/site-portal/contractor-billing/legacy-bulk-upload')}
          >
            <Upload className="h-4 w-4" />
            Bulk Upload (Legacy/Erection)
          </Button>
          <Button 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm"
            onClick={() => router.push('/site-portal/contractor-billing/new')}
          >
            <Plus className="h-4 w-4" />
            Create Bill
          </Button>
        </div>
      </div>

      {/* Analytics Row */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white p-4.5 rounded-xl shadow-xs border border-slate-200 hover:border-slate-300 transition-all">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contractor Bill</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              ₹ {(
                analytics.contractorBillAmount ?? 
                bills.filter((b: any) => b.status !== 'Rejected' && (b.billingCategory === 'Contractor Bill' || String(b.invoiceNumber || '').includes('/CB/'))).reduce((sum: number, b: any) => sum + (b.grandTotal || 0), 0)
              ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {(
                analytics.contractorBillCount ?? 
                bills.filter((b: any) => b.status !== 'Rejected' && (b.billingCategory === 'Contractor Bill' || String(b.invoiceNumber || '').includes('/CB/'))).length
              )} Invoices Recorded
            </p>
          </div>
          <div className="bg-white p-4.5 rounded-xl shadow-xs border border-slate-200 hover:border-slate-300 transition-all">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Erection Bill</h3>
            <p className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
              ₹ {(
                analytics.erectionBillAmount ?? 
                bills.filter((b: any) => b.status !== 'Rejected' && (b.billingCategory === 'Erection Bill' || String(b.invoiceNumber || '').includes('/ER/'))).reduce((sum: number, b: any) => sum + (b.grandTotal || 0), 0)
              ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {(
                analytics.erectionBillCount ?? 
                bills.filter((b: any) => b.status !== 'Rejected' && (b.billingCategory === 'Erection Bill' || String(b.invoiceNumber || '').includes('/ER/'))).length
              )} Invoices Recorded
            </p>
          </div>
          <div className="bg-white p-4.5 rounded-xl shadow-xs border border-slate-200 hover:border-slate-300 transition-all">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Unpaid (Approved/Submitted)</h3>
            <p className="text-2xl font-bold text-rose-600 mt-1.5 tracking-tight">
              ₹ {(
                (analytics.statusDistribution?.find((s: any) => s._id === 'Approved')?.totalAmount || 0) +
                (analytics.statusDistribution?.find((s: any) => s._id === 'Submitted')?.totalAmount || 0)
              ).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {analytics.aging?.oldSubmittedCount || 0} invoices aging over 7 days
            </p>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="w-full">
        <div className="flex space-x-1 border-b border-gray-200 mb-4">
          <button
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'bills' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('bills')}
          >
            <FileText className="h-4 w-4" />
            <span>Bills Register</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {bills.length}
            </span>
          </button>
          <button
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'handover' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('handover')}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Handover Certificates</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {handoverCertificates.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Bills Register */}
        {activeTab === 'bills' && (
          <div className="space-y-4">
            
            {/* Enterprise ERP Filter Component (SAP S/4HANA & Zoho Books) */}
            <ContractorBillingErpFilters
              filters={filters}
              onFilterChange={setFilters}
              rawBills={bills}
              filteredCount={invTotalItems}
              filteredTotalAmount={filteredTotalAmount}
            />

            {/* Table Container */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50/75 border-b border-slate-200">
                    <tr>
                      <th 
                        className="px-6 py-3.5 text-left font-semibold text-slate-900 group cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                        onClick={() => handleColumnSort('bill')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Bill #</span>
                          {renderSortIndicator('bill')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3.5 text-left font-semibold text-slate-900 group cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                        onClick={() => handleColumnSort('date')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Date</span>
                          {renderSortIndicator('date')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3.5 text-left font-semibold text-slate-900 group cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                        onClick={() => handleColumnSort('contractor')}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>Contractor & Location</span>
                          {renderSortIndicator('contractor')}
                        </div>
                      </th>
                      <th className="px-6 py-3.5 text-left font-semibold text-slate-900">
                        Stage
                      </th>
                      <th 
                        className="px-6 py-3.5 text-right font-semibold text-slate-900 group cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                        onClick={() => handleColumnSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>Amount (₹)</span>
                          {renderSortIndicator('amount')}
                        </div>
                      </th>
                      <th className="px-6 py-3.5 text-left font-semibold text-slate-900">
                        Status
                      </th>
                      <th className="px-6 py-3.5 text-right font-semibold text-slate-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="animate-pulse">
                          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                          <td className="px-6 py-4">
                            <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-slate-100 rounded w-24"></div>
                          </td>
                          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-20 ml-auto"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
                        </tr>
                      ))
                    ) : invoicePageData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <SearchX className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-base font-semibold text-slate-900 mb-1">No bills match your filters</p>
                            <p className="text-sm text-slate-500 max-w-sm mb-4">
                              We couldn&apos;t find any bills matching your current filter criteria. Try resetting or adjusting the filters.
                            </p>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setFilters(initialBillingFilterState)}
                                className="flex items-center gap-1.5 text-xs"
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                                Reset Filters
                              </Button>
                              <Button 
                                size="sm"
                                className="text-xs bg-blue-600 hover:bg-blue-700"
                                onClick={() => router.push('/site-portal/contractor-billing/new')}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Create Bill
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      invoicePageData.map((inv) => {
                        const isErection = inv.billingCategory === 'Erection Bill' || String(inv.invoiceNumber || '').includes('/ER/');
                        return (
                          <tr 
                            key={inv._id} 
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            onClick={() => router.push(`/site-portal/contractor-billing/${inv._id}`)}
                          >
                            {/* Bill # */}
                            <td className="px-6 py-4 font-semibold text-blue-600 group-hover:text-blue-700">
                              <div className="flex items-center gap-2">
                                <span>{inv.invoiceNumber}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isErection 
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {isErection ? 'Erection' : 'Contractor'}
                                </span>
                              </div>
                            </td>

                            {/* Date */}
                            <td className="px-6 py-4 text-slate-600">
                              {inv.date ? format(new Date(inv.date), 'dd MMM yyyy') : '-'}
                            </td>

                            {/* Contractor */}
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-900">
                                {inv.contractorId?.dynamicData?.displayName || inv.contractorId?.name || inv.legacyMetadata?.billedBy || 'Legacy Data (Unlinked)'}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>WO: {inv.workOrderId?.workOrderNumber || '-'}</span>
                                { (inv.workOrderId?.package || inv.legacyMetadata?.package) && (
                                  <>
                                    <span>•</span>
                                    <span>Pkg: {inv.workOrderId?.package || inv.legacyMetadata?.package}</span>
                                  </>
                                )}
                                { (inv.workOrderId?.circle || inv.legacyMetadata?.circle) && (
                                  <>
                                    <span>•</span>
                                    <span>Circle: {inv.workOrderId?.circle || inv.legacyMetadata?.circle}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Stage */}
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-0.5 text-xs font-semibold bg-slate-50 text-slate-700 shadow-2xs">
                                {inv.stage || '-'}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="px-6 py-4 text-right font-bold text-slate-900 tabular-nums">
                              ₹ {inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold shadow-2xs ${getStatusColor(inv.status)}`}>
                                {inv.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {['Draft', 'Pending PM Approval', 'Rejected'].includes(inv.status) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => router.push(`/site-portal/contractor-billing/${inv._id}/edit`)}
                                    title="Edit Bill"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {(['Draft', 'Pending PM Approval', 'Pending Site Approval', 'Rejected'].includes(inv.status) || !!inv.legacyMetadata) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                    onClick={(e) => handleDeleteInvoice(e, inv._id)}
                                    title="Delete Bill"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination Controls */}
              {!loading && invTotalItems > 0 && (
                <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>Rows per page:</span>
                    <select
                      value={invRowsPerPage}
                      onChange={(e) => setInvRowsPerPage(Number(e.target.value))}
                      className="border border-slate-200 rounded px-2 py-1 bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value={15}>15</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-slate-400">|</span>
                    <span>
                      Showing {((invCurrentPage - 1) * invRowsPerPage) + 1} - {Math.min(invCurrentPage * invRowsPerPage, invTotalItems)} of {invTotalItems} bills
                    </span>
                  </div>

                  <DataTableBottomControls
                    currentPage={invCurrentPage}
                    totalPages={invTotalPages}
                    setCurrentPage={setInvCurrentPage}
                    totalItems={invTotalItems}
                    pageSize={invRowsPerPage}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Handover Certificates */}
        {activeTab === 'handover' && (
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
            <DataTableTopControls
              searchTerm={hoSearchQuery}
              setSearchTerm={setHoSearchQuery}
              pageSize={hoRowsPerPage}
              setPageSize={setHoRowsPerPage}
            />
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-left font-semibold text-slate-900">Certificate #</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-slate-900">Date</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-slate-900">Contractor</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-slate-900">Location (Pkg/Circle)</th>
                    <th className="px-6 py-3.5 text-left font-semibold text-slate-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`ho-skeleton-${i}`} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-slate-100 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-slate-200 rounded w-40 mb-2"></div>
                          <div className="h-3 bg-slate-100 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                      </tr>
                    ))
                  ) : hoPageData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <SearchX className="w-12 h-12 text-slate-300 mb-3" />
                          <p className="text-base font-semibold text-slate-900 mb-1">No handover certificates found</p>
                          <p className="text-sm text-slate-500 mb-4">We couldn&apos;t find any certificates matching your criteria.</p>
                          <Button 
                            variant="outline" 
                            className="mt-2 text-xs"
                            onClick={() => router.push('/site-portal/contractor-billing/handover/new')}
                          >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Create Certificate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    hoPageData.map((hc) => (
                      <tr key={hc._id} className="hover:bg-slate-50/80 transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-semibold text-blue-600">{hc.certificateNumber}</td>
                        <td className="px-6 py-4 text-slate-600">{format(new Date(hc.date), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{hc.contractorId?.dynamicData?.displayName || hc.contractorId?.name || 'Unknown'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{hc.workOrderId?.workOrderNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-700">
                            Pkg: <span className="font-semibold text-slate-900">{hc.locationDetails?.package || '-'}</span> | 
                            Circle: <span className="font-semibold text-slate-900">{hc.locationDetails?.circle || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold shadow-2xs ${hc.status === 'Issued' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                            {hc.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && handoverCertificates.length > 0 && (
              <DataTableBottomControls
                currentPage={hoCurrentPage}
                totalPages={hoTotalPages}
                setCurrentPage={setHoCurrentPage}
                totalItems={hoTotalItems}
                pageSize={hoRowsPerPage}
              />
            )}
          </div>
        )}
      </div>

      <ContractorBillBulkUploadModal 
        open={isBulkUploadModalOpen} 
        onOpenChange={setIsBulkUploadModalOpen}
        onSuccess={fetchData}
      />
    </div>
  );
}
