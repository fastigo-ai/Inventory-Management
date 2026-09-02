"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getClientBillById } from '@/features/billing/api/client-billing.api';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PrintClientBillPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params as { id: string };

  const [bill, setBill] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const res = await getClientBillById(id);
        if (res.success) {
          setBill(res.data);
        }
      } catch (error) {
        console.error('Failed to load bill data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) fetchBill();
  }, [id]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading bill...</div>;
  }

  if (!bill) {
    return <div className="p-8 text-center text-red-500">Failed to load bill.</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  const totalBaseAmount = bill.items.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
  const totalGstAmount = totalBaseAmount * 0.18;
  const grandTotalAmount = totalBaseAmount + totalGstAmount;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
      <div className="min-h-screen bg-slate-100 p-8 print:bg-white print:p-0">
        
        {/* Non-printable controls */}
        <div className="max-w-[1400px] mx-auto mb-6 flex justify-between items-center print:hidden">
          <Link href={`/billing/client-billing`}>
            <Button variant="outline" className="bg-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer className="w-4 h-4 mr-2" /> Print Invoice
          </Button>
        </div>

        {/* Printable Area */}
        <div className="max-w-[1400px] mx-auto bg-white p-10 shadow-lg print:shadow-none print:p-0">
        
        {/* Header Section */}
        <div className="flex justify-between items-start border-b-[4px] border-indigo-600 pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Invoice</h1>
            <p className="text-indigo-600 font-semibold tracking-wider uppercase text-sm mt-1">{bill.billType} RUNNING ACCOUNT BILL</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-slate-800">Your Company Name</h2>
            <p className="text-slate-500 text-sm mt-1">123 Enterprise Avenue<br/>Corporate City, 10001<br/>contact@company.com</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bill To</h3>
            <p className="font-bold text-slate-800 text-lg">Client Name</p>
            <p className="text-slate-600 mt-1">Project Circle: <span className="font-semibold text-slate-800">{bill.circle}</span></p>
            <p className="text-slate-600">Project Package: <span className="font-semibold text-slate-800">{bill.package}</span></p>
          </div>
          <div className="bg-indigo-50 p-5 rounded-lg border border-indigo-100">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-slate-500">RA Bill No:</span>
              <span className="font-bold text-indigo-900 text-right">{bill.raBillNo}</span>
              
              <span className="text-slate-500">Date:</span>
              <span className="font-semibold text-slate-800 text-right">{new Date(bill.raBillDate).toLocaleDateString('en-GB')}</span>
              
              <span className="text-slate-500">Stage:</span>
              <span className="font-semibold text-slate-800 text-right">{bill.stage}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-10">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-indigo-600 text-white">
                <th className="py-1.5 px-1 font-semibold">RA Bill No</th>
                <th className="py-1.5 px-1 font-semibold whitespace-nowrap">RA Bill Date</th>
                <th className="py-1.5 px-1 font-semibold">{bill.billType === 'Supply' ? 'MHROV No' : 'JMC No'}</th>
                <th className="py-1.5 px-1 font-semibold">LOA Sr No</th>
                <th className="py-1.5 px-1 font-semibold">Temp Code</th>
                <th className="py-1.5 px-1 font-semibold w-[20%]">Item Name</th>
                {bill.billType === 'Supply' && (
                  <>
                    <th className="py-1.5 px-1 font-semibold">DI No</th>
                    <th className="py-1.5 px-1 font-semibold whitespace-nowrap">DI Date</th>
                    <th className="py-1.5 px-1 font-semibold text-center">DI Qty</th>
                  </>
                )}
                <th className="py-1.5 px-1 font-semibold text-center">{bill.billType === 'Supply' ? 'MHROV Qty' : 'JMC Qty'}</th>
                <th className="py-1.5 px-1 font-semibold text-center">RA Bill Qty</th>
                <th className="py-1.5 px-1 font-semibold text-right">BOQ Rate</th>
                <th className="py-1.5 px-1 font-semibold text-center">GST %</th>
                <th className="py-1.5 px-1 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bill.items.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-1.5 px-1 text-slate-700 whitespace-nowrap">{bill.raBillNo || '-'}</td>
                  <td className="py-1.5 px-1 text-slate-700 whitespace-nowrap">{new Date(bill.raBillDate).toLocaleDateString('en-GB') || '-'}</td>
                  <td className="py-1.5 px-1 font-medium text-slate-800">{item.refNumber || '-'}</td>
                  <td className="py-1.5 px-1 font-medium text-slate-800">{item.loaSrNo || '-'}</td>
                  <td className="py-1.5 px-1 font-medium text-slate-800">{item.tempCode || '-'}</td>
                  <td className="py-1.5 px-1 text-slate-700">
                    <p className="font-semibold line-clamp-2">{item.itemName}</p>
                  </td>
                  {bill.billType === 'Supply' && (
                    <>
                      <td className="py-1.5 px-1 text-slate-700">{item.diNo || '-'}</td>
                      <td className="py-1.5 px-1 text-slate-700 whitespace-nowrap">{item.diDate ? new Date(item.diDate).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="py-1.5 px-1 text-center font-medium text-slate-800">{item.diQty || 0}</td>
                    </>
                  )}
                  <td className="py-1.5 px-1 text-center font-medium text-slate-800">{item.sourceDoneQty || 0}</td>
                  <td className="py-1.5 px-1 text-center font-bold text-slate-900">{item.raBillQty}</td>
                  <td className="py-1.5 px-1 text-right text-slate-700">₹{item.boqRate?.toLocaleString('en-IN') || '0'}</td>
                  <td className="py-1.5 px-1 text-center text-slate-700">18%</td>
                  <td className="py-1.5 px-1 text-right font-bold text-slate-900">₹{(item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-16">
          <div className="w-1/2 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-500 font-medium">Subtotal (Base Amount)</span>
              <span className="text-slate-800 font-bold">₹{totalBaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-medium">GST (18%)</span>
              <span className="text-slate-800 font-semibold">₹{totalGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
              <span className="text-lg font-bold text-indigo-900">Grand Total</span>
              <span className="text-2xl font-black text-indigo-600">₹{grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-8 text-center pt-20 mt-10 border-t border-slate-100">
          <div>
            <div className="border-b border-slate-300 w-3/4 mx-auto mb-2"></div>
            <p className="text-sm font-semibold text-slate-700">Prepared By</p>
            <p className="text-xs text-slate-500 mt-1">Site Engineer</p>
          </div>
          <div>
            <div className="border-b border-slate-300 w-3/4 mx-auto mb-2"></div>
            <p className="text-sm font-semibold text-slate-700">Checked By</p>
            <p className="text-xs text-slate-500 mt-1">Project Manager (PM)</p>
          </div>
          <div>
            <div className="border-b border-slate-300 w-3/4 mx-auto mb-2"></div>
            <p className="text-sm font-semibold text-slate-700">Approved By</p>
            <p className="text-xs text-slate-500 mt-1">Project Director (PD)</p>
          </div>
        </div>

      </div>
    </div>
  );
}
