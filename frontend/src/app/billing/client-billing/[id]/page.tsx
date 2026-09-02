"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getClientBillById, updateClientBillStatus } from '@/features/billing/api/client-billing.api';
import { FileText, Edit, Printer, ArrowLeft, Download, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ClientBillDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [bill, setBill] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const unwrappedParams = use(params);

  useEffect(() => {
    fetchBill();
  }, [unwrappedParams.id]);

  const fetchBill = async () => {
    try {
      const res = await getClientBillById(unwrappedParams.id);
      if (res.success && res.data) {
        setBill(res.data);
      } else {
        toast.error('Bill not found');
        router.push('/billing/client-billing');
      }
    } catch (error) {
      toast.error('Failed to fetch bill details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'ApprovePM' | 'ApprovePD' | 'Reject') => {
    const statusMap = {
      'ApprovePM': 'Pending PD Approval',
      'ApprovePD': 'Approved',
      'Reject': 'Rejected'
    };
    const newStatus = statusMap[action];
    
    if (action === 'Reject') {
      const remarks = window.prompt("Please enter rejection remarks:");
      if (!remarks) return;
      try {
        const res = await updateClientBillStatus(bill._id, { status: newStatus, rejectionRemarks: remarks });
        if (res.success) {
          toast.success(`Bill updated to ${newStatus}`);
          fetchBill();
        }
      } catch (error) {
        toast.error('Failed to update status');
      }
      return;
    }

    try {
      const res = await updateClientBillStatus(bill._id, { status: newStatus });
      if (res.success) {
        toast.success(`Bill updated to ${newStatus}`);
        fetchBill();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-4 h-4" /> Approved</span>;
      case 'Pending PM Approval':
      case 'Pending PD Approval':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"><Clock className="w-4 h-4" /> {status}</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-rose-100 text-rose-800"><XCircle className="w-4 h-4" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800"><FileText className="w-4 h-4" /> {status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Loading Bill Details...</p>
      </div>
    );
  }

  if (!bill) return null;

  const totalBase = bill.items?.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0) || 0;
  const gstAmount = totalBase * 0.18;
  const grandTotal = totalBase + gstAmount;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/billing/client-billing">
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              RA Bill: {bill.raBillNo}
            </h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              Generated on {new Date(bill.raBillDate).toLocaleDateString('en-GB')}
              <span className="text-slate-300">|</span>
              {bill.billType} - {bill.stage}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {bill.status === 'Pending PM Approval' && (
            <>
              <Button onClick={() => handleAction('ApprovePM')} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4 mr-2" /> Approve (PM)
              </Button>
              <Button variant="destructive" onClick={() => handleAction('Reject')}>
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
            </>
          )}
          {bill.status === 'Pending PD Approval' && (
            <>
              <Button onClick={() => handleAction('ApprovePD')} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4 mr-2" /> Approve (PD)
              </Button>
              <Button variant="destructive" onClick={() => handleAction('Reject')}>
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
            </>
          )}
          <Link href={`/billing/client-billing/${bill._id}/edit`}>
            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <Edit className="w-4 h-4 mr-2" />
              Edit Bill
            </Button>
          </Link>
          <Link href={`/billing/client-billing/${bill._id}/print`}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Printer className="w-4 h-4 mr-2" />
              Print Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Status & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-start">
          <p className="text-sm font-medium text-slate-500 mb-2">Current Status</p>
          {getStatusBadge(bill.status)}
          {bill.rejectionRemarks && (
            <p className="text-xs text-rose-600 mt-3 font-medium bg-rose-50 p-2 rounded-lg border border-rose-100">
              Rejection Reason: {bill.rejectionRemarks}
            </p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Base Amount</p>
          <p className="text-3xl font-semibold text-slate-800">
            ₹{totalBase.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FileText className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-indigo-600 mb-1 relative z-10">Grand Total (with 18% GST)</p>
          <p className="text-3xl font-bold text-indigo-900 relative z-10">
            ₹{grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Item Details Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800">Bill Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">RA Bill No</th>
                <th className="px-4 py-3 font-semibold">RA Bill Date</th>
                <th className="px-4 py-3 font-semibold">{bill.billType === 'Supply' ? 'MHROV No' : 'JMC No'}</th>
                <th className="px-4 py-3 font-semibold">LOA Sr No</th>
                <th className="px-4 py-3 font-semibold">Temp Code</th>
                <th className="px-4 py-3 font-semibold text-slate-800 min-w-[200px]">Item Name</th>
                {bill.billType === 'Supply' && (
                  <>
                    <th className="px-4 py-3 font-semibold">DI No</th>
                    <th className="px-4 py-3 font-semibold">DI Date</th>
                    <th className="px-4 py-3 font-semibold">DI Qty</th>
                  </>
                )}
                <th className="px-4 py-3 font-semibold">{bill.billType === 'Supply' ? 'MHROV Qty' : 'JMC Qty'}</th>
                <th className="px-4 py-3 font-semibold">RA Bill Qty</th>
                <th className="px-4 py-3 font-semibold">BOQ Rate</th>
                <th className="px-4 py-3 font-semibold">GST %</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bill.items?.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{bill.raBillNo || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(bill.raBillDate).toLocaleDateString('en-GB') || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.refNumber || '-'}</td>
                  <td className="px-4 py-3">{item.loaSrNo || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.tempCode || '-'}</td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-xs" title={item.itemName}>{item.itemName}</td>
                  {bill.billType === 'Supply' && (
                    <>
                      <td className="px-4 py-3 text-slate-500">{item.diNo || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{item.diDate ? new Date(item.diDate).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="px-4 py-3 text-slate-500 text-center">{item.diQty || 0}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-slate-500 text-center">{item.sourceDoneQty || 0}</td>
                  <td className="px-4 py-3 text-center font-medium">{item.raBillQty || 0}</td>
                  <td className="px-4 py-3 text-slate-600">₹{item.boqRate?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0'}</td>
                  <td className="px-4 py-3 text-slate-500 text-center">18%</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">₹{item.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Uploaded Documents */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800">Attached Documents</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-4">
            {bill.invoiceDocUrl && (
              <a href={bill.invoiceDocUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">Invoice Copy</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Download className="w-3 h-3" /> Click to view</p>
                </div>
              </a>
            )}
            
            {bill.diDocUrl && (
              <a href={bill.diDocUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">DI Copy</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Download className="w-3 h-3" /> Click to view</p>
                </div>
              </a>
            )}

            {bill.mhrovDocUrl && (
              <a href={bill.mhrovDocUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">MHROV Copy</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Download className="w-3 h-3" /> Click to view</p>
                </div>
              </a>
            )}
            
            {bill.additionalDocsUrls?.map((doc: any, idx: number) => (
              <a key={idx} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{doc.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Download className="w-3 h-3" /> Click to view</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
