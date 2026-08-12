'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, FileText, CheckCircle, SearchX } from 'lucide-react';
import { 
  getContractorInvoices, 
  getHandoverCertificates,
  getBillingAnalytics
} from '@/features/contractor-billing/api/contractor-billing.api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useClientTable } from '@/shared/hooks/useClientTable';
import { DataTableTopControls, DataTableBottomControls } from '@/shared/components/DataTableControls';

export default function ContractorBillingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('bills');
  const [bills, setBills] = useState<any[]>([]);
  const [handoverCertificates, setHandoverCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

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

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'Paid': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const {
    paginatedData: invoicePageData,
    searchTerm: invSearchQuery,
    setSearchTerm: setInvSearchQuery,
    currentPage: invCurrentPage,
    setCurrentPage: setInvCurrentPage,
    pageSize: invRowsPerPage,
    setPageSize: setInvRowsPerPage,
    totalPages: invTotalPages,
    totalItems: invTotalItems,
  } = useClientTable(bills);

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
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Contractor Billing</h1>
          <p className="text-gray-500 mt-1">Manage multi-stage bills and handover certificates.</p>
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
            className="flex items-center gap-2"
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
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-500">Stage 1 Billed</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              ₹ {analytics.stageBreakdown?.find((s: any) => s._id.includes('Stage 1'))?.totalAmount?.toLocaleString('en-IN') || 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {analytics.stageBreakdown?.find((s: any) => s._id.includes('Stage 1'))?.count || 0} Invoices
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-500">Stage 2 Billed</h3>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              ₹ {analytics.stageBreakdown?.find((s: any) => s._id.includes('Stage 2'))?.totalAmount?.toLocaleString('en-IN') || 0}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {analytics.stageBreakdown?.find((s: any) => s._id.includes('Stage 2'))?.count || 0} Invoices
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-500">Total Unpaid (Approved/Submitted)</h3>
            <p className="text-2xl font-bold text-rose-600 mt-1">
              ₹ {(
                (analytics.statusDistribution?.find((s: any) => s._id === 'Approved')?.totalAmount || 0) +
                (analytics.statusDistribution?.find((s: any) => s._id === 'Submitted')?.totalAmount || 0)
              ).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {analytics.aging?.oldSubmittedCount || 0} invoices aging over 7 days
            </p>
          </div>
        </div>
      )}

      <div className="w-full">
        <div className="flex space-x-1 border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'bills' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('bills')}
          >
            <FileText className="h-4 w-4" />
            Bills
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'handover' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('handover')}
          >
            <CheckCircle className="h-4 w-4" />
            Handover Certificates
          </button>
        </div>

        {activeTab === 'bills' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <DataTableTopControls
              searchTerm={invSearchQuery}
              setSearchTerm={setInvSearchQuery}
              pageSize={invRowsPerPage}
              setPageSize={setInvRowsPerPage}
            />
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Bill #</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Contractor</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Stage</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Amount (₹)</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`skeleton-${i}`} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                      </tr>
                    ))
                  ) : invoicePageData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <SearchX className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-base font-medium text-gray-900 mb-1">No bills found</p>
                          <p className="text-sm">We couldn't find any bills matching your criteria.</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => router.push('/site-portal/contractor-billing/new')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Bill
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoicePageData.map((inv) => (
                      <tr key={inv._id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-medium text-blue-600">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4">{format(new Date(inv.date), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{inv.contractorId?.dynamicData?.displayName || inv.contractorId?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{inv.workOrderId?.workOrderNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-slate-50 text-slate-700">
                            {inv.stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium">
                          {inv.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!loading && bills.length > 0 && (
              <DataTableBottomControls
                currentPage={invCurrentPage}
                totalPages={invTotalPages}
                setCurrentPage={setInvCurrentPage}
                totalItems={invTotalItems}
                pageSize={invRowsPerPage}
              />
            )}
          </div>
        )}

        {activeTab === 'handover' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <DataTableTopControls
              searchTerm={hoSearchQuery}
              setSearchTerm={setHoSearchQuery}
              pageSize={hoRowsPerPage}
              setPageSize={setHoRowsPerPage}
            />
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Certificate #</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Contractor</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Location (Pkg/Circle)</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`ho-skeleton-${i}`} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-gray-200 rounded w-40 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-24"></div>
                        </td>
                        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                      </tr>
                    ))
                  ) : hoPageData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <SearchX className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-base font-medium text-gray-900 mb-1">No handover certificates found</p>
                          <p className="text-sm">We couldn't find any certificates matching your criteria.</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => router.push('/site-portal/contractor-billing/handover/new')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Certificate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    hoPageData.map((hc) => (
                      <tr key={hc._id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                        <td className="px-6 py-4 font-medium text-blue-600">{hc.certificateNumber}</td>
                        <td className="px-6 py-4">{format(new Date(hc.date), 'dd MMM yyyy')}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{hc.contractorId?.dynamicData?.displayName || hc.contractorId?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{hc.workOrderId?.workOrderNumber}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            Pkg: <span className="font-medium">{hc.locationDetails?.package || '-'}</span> | 
                            Circle: <span className="font-medium">{hc.locationDetails?.circle || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${hc.status === 'Issued' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
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
    </div>
  );
}
