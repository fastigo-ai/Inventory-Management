'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, FileText, CheckCircle, SearchX } from 'lucide-react';
import { 
  getContractorInvoices, 
  getHandoverCertificates 
} from '@/features/contractor-billing/api/contractor-billing.api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useClientTable } from '@/shared/hooks/useClientTable';
import { DataTableTopControls, DataTableBottomControls } from '@/shared/components/DataTableControls';

export default function ContractorBillingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [handoverCertificates, setHandoverCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, hoRes] = await Promise.all([
        getContractorInvoices(),
        getHandoverCertificates()
      ]);
      setInvoices(invRes.data || []);
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
  }, []);

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
    pageData: invoicePageData,
    searchQuery: invSearchQuery,
    setSearchQuery: setInvSearchQuery,
    currentPage: invCurrentPage,
    setCurrentPage: setInvCurrentPage,
    rowsPerPage: invRowsPerPage,
    setRowsPerPage: setInvRowsPerPage,
    totalPages: invTotalPages,
    totalItems: invTotalItems,
  } = useClientTable(invoices, {
    searchableFields: ['invoiceNumber', 'contractorId.name', 'workOrderId.workOrderNumber', 'stage', 'status'],
    defaultSort: { field: 'createdAt', direction: 'desc' }
  });

  const {
    pageData: hoPageData,
    searchQuery: hoSearchQuery,
    setSearchQuery: setHoSearchQuery,
    currentPage: hoCurrentPage,
    setCurrentPage: setHoCurrentPage,
    rowsPerPage: hoRowsPerPage,
    setRowsPerPage: setHoRowsPerPage,
    totalPages: hoTotalPages,
    totalItems: hoTotalItems,
  } = useClientTable(handoverCertificates, {
    searchableFields: ['certificateNumber', 'contractorId.name', 'locationDetails.package', 'locationDetails.circle', 'status'],
    defaultSort: { field: 'createdAt', direction: 'desc' }
  });

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Contractor Billing</h1>
          <p className="text-gray-500 mt-1">Manage multi-stage invoices and handover certificates.</p>
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
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="w-full">
        <div className="flex space-x-1 border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'invoices' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('invoices')}
          >
            <FileText className="h-4 w-4" />
            Invoices
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

        {activeTab === 'invoices' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <DataTableTopControls
              searchQuery={invSearchQuery}
              onSearchChange={setInvSearchQuery}
              rowsPerPage={invRowsPerPage}
              onRowsPerPageChange={setInvRowsPerPage}
              searchPlaceholder="Search invoices..."
            />
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Invoice #</th>
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
                          <p className="text-base font-medium text-gray-900 mb-1">No invoices found</p>
                          <p className="text-sm">We couldn't find any invoices matching your criteria.</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => router.push('/site-portal/contractor-billing/new')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Invoice
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
                          <div className="font-medium text-gray-900">{inv.contractorId?.name || 'Unknown'}</div>
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
            {!loading && invoices.length > 0 && (
              <DataTableBottomControls
                currentPage={invCurrentPage}
                totalPages={invTotalPages}
                onPageChange={setInvCurrentPage}
                totalItems={invTotalItems}
                rowsPerPage={invRowsPerPage}
              />
            )}
          </div>
        )}

        {activeTab === 'handover' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <DataTableTopControls
              searchQuery={hoSearchQuery}
              onSearchChange={setHoSearchQuery}
              rowsPerPage={hoRowsPerPage}
              onRowsPerPageChange={setHoRowsPerPage}
              searchPlaceholder="Search certificates..."
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
                          <div className="font-medium text-gray-900">{hc.contractorId?.name || 'Unknown'}</div>
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
                onPageChange={setHoCurrentPage}
                totalItems={hoTotalItems}
                rowsPerPage={hoRowsPerPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
