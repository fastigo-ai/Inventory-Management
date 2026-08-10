'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, FileText, CheckCircle } from 'lucide-react';
import { 
  getContractorInvoices, 
  getHandoverCertificates 
} from '@/features/contractor-billing/api/contractor-billing.api';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ContractorBillingDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('bills');
  const [bills, setBills] = useState<any[]>([]);
  const [handoverCertificates, setHandoverCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Loading bills...
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No bills found. Click 'Create Bill' to begin billing.
                    </td>
                  </tr>
                ) : (
                  bills.map((inv) => (
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
        )}

        {activeTab === 'handover' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Loading certificates...
                    </td>
                  </tr>
                ) : handoverCertificates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No handover certificates found.
                    </td>
                  </tr>
                ) : (
                  handoverCertificates.map((hc) => (
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
        )}
      </div>
    </div>
  );
}
