"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/shared/api/axios';
import { Users, ArrowLeft, Truck, FileCheck } from 'lucide-react';
import Link from 'next/link';

export default function ContractorDetail({ params }: { params: { contractorName: string } }) {
  const [data, setData] = useState<{ mins: any[], invoices: any[] }>({ mins: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const contractorName = decodeURIComponent(params.contractorName);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/reports/contractor-summary/${encodeURIComponent(contractorName)}`);
        setData(res.data.data || { mins: [], invoices: [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contractorName]);

  const totalIssuedValue = data.mins.reduce((sum, min) => {
    const minVal = min.lineItems?.reduce((s: number, item: any) => s + ((item.quantity || 0) * (item.rate || 0)), 0) || 0;
    return sum + minVal;
  }, 0);
  const totalBilledValue = data.invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <Link href="/reports/contractor-summary" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Contractor Summary
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{contractorName}</h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">Detailed deep-dive of MINs Issued and Contractor Bills.</p>
              </div>
            </div>
            
            <div className="flex gap-4 border-l border-slate-200 pl-6">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Issued Value</p>
                <p className="text-lg font-bold text-slate-800">₹{totalIssuedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Billed Value</p>
                <p className="text-lg font-bold text-emerald-600">₹{totalBilledValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Unbilled Liability</p>
                <p className="text-lg font-bold text-red-500">₹{Math.max(0, totalIssuedValue - totalBilledValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-8 flex flex-col gap-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* MINs */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-slate-800">Materials Issued (MINs) ({data.mins.length})</h2>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">Assignment No</th>
                      <th className="px-6 py-3 whitespace-nowrap">Date</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.mins.map((min, idx) => {
                      const val = min.lineItems?.reduce((s: number, item: any) => s + ((item.quantity || 0) * (item.rate || 0)), 0) || 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-semibold text-amber-600">
                            <Link href={`/contractors/assignments/${min._id}`} className="hover:underline">{min.assignmentNumber || 'View MIN'}</Link>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{new Date(min.assignmentDate).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-4 text-right font-medium text-slate-800">
                            ₹{val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      );
                    })}
                    {data.mins.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No materials issued yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contractor Bills */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                <h2 className="font-bold text-slate-800">Contractor Bills ({data.invoices.length})</h2>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">Bill Number</th>
                      <th className="px-6 py-3 whitespace-nowrap">Date</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.invoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-emerald-600">
                          <Link href={`/site-portal/contractor-billing/${inv._id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                          ₹{inv.grandTotal?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0'}
                        </td>
                      </tr>
                    ))}
                    {data.invoices.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No bills found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
