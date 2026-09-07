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
  const totalGstAmount = bill.items.reduce((sum: number, item: any) => sum + (item.gstAmount || 0), 0);
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
          <Link href={`/billing/client-billing/${id}`}>
            <Button variant="outline" className="bg-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </Link>
          <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </Button>
        </div>

        {/* Printable Area */}
        <div className="w-full mx-auto bg-white p-10 md:p-14 shadow-lg print:shadow-none print:p-0 print:w-full">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fastigo Pvt Ltd</h1>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wider mb-2">Client RA Bill</h2>
              <p className="text-sm text-slate-500 font-medium">Type: {bill.billType} | Stage: {bill.stage}</p>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-2 gap-12 mb-12">
            {/* Left Col */}
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold text-slate-800 bg-slate-100 p-2 mb-2">Project Details</h3>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
                  <div className="font-semibold text-slate-700">Circle</div>
                  <div className="border border-slate-300 px-2 py-0.5">{bill.circle}</div>
                  <div className="font-semibold text-slate-700">Package</div>
                  <div className="border border-slate-300 px-2 py-0.5">{bill.package}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 bg-slate-100 p-2 mb-2">Client Details</h3>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
                  <div className="font-semibold text-slate-700">Client</div>
                  <div className="border border-slate-300 px-2 py-0.5">Government Authority</div>
                  <div className="font-semibold text-slate-700">Address</div>
                  <div className="border border-slate-300 px-2 py-0.5 whitespace-pre-wrap">Headquarters</div>
                </div>
              </div>
            </div>

            {/* Right Col */}
            <div>
              <div className="mt-8">
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm justify-end ml-auto max-w-[250px]">
                  <div className="font-semibold text-slate-700">RA Bill No.</div>
                  <div className="border border-slate-300 px-2 py-0.5 bg-white text-right font-medium">{bill.raBillNo}</div>
                  <div className="font-semibold text-slate-700">Date</div>
                  <div className="border border-slate-300 px-2 py-0.5 bg-white text-right">{new Date(bill.raBillDate).toLocaleDateString('en-GB')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Work Details</h3>
            <table className="w-full text-xs md:text-sm border-collapse border border-slate-400 print:text-[10px]">
              <thead>
                <tr className="bg-slate-200">
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-left font-bold text-slate-800">Ref / JMC</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-left font-bold text-slate-800">Item Name</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center font-bold text-slate-800">Temp Code</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center font-bold text-slate-800">LOA Sr No</th>
                  {bill.billType === 'Supply' && (
                    <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center font-bold text-slate-800">DI No</th>
                  )}
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">RA Qty</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">BOQ Rate</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">Base Amt</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">GST Amt</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-slate-700">{item.refNumber || '-'}</td>
                    <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-slate-700"><p className="line-clamp-2">{item.itemName}</p></td>
                    <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center text-slate-700">{item.tempCode || '-'}</td>
                    <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center text-slate-700">{item.loaSrNo || '-'}</td>
                    {bill.billType === 'Supply' && (
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center text-slate-700">{item.diNo || '-'}</td>
                    )}
                    <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right text-slate-700">{item.raBillQty}</td>
                    <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right text-slate-700">₹{item.boqRate?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '0'}</td>
                    <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right text-slate-700">₹{(item.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right text-slate-700">₹{(item.gstAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">₹{((item.totalAmount || 0) + (item.gstAmount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <td colSpan={bill.billType === 'Supply' ? 7 : 6} className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right">Grand Total</td>
                  <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right">₹{totalBaseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right">₹{totalGstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right">₹{grandTotalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 text-center pt-20 mt-10">
            <div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-2"></div>
              <p className="text-sm font-semibold text-slate-700">Prepared By</p>
              <p className="text-xs text-slate-500 mt-1">Site Engineer</p>
            </div>
            <div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-2"></div>
              <p className="text-sm font-semibold text-slate-700">Checked By</p>
              <p className="text-xs text-slate-500 mt-1">Project Manager (PM)</p>
            </div>
            <div>
              <div className="border-b border-slate-400 w-3/4 mx-auto mb-2"></div>
              <p className="text-sm font-semibold text-slate-700">Approved By</p>
              <p className="text-xs text-slate-500 mt-1">Project Director (PD)</p>
            </div>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}
