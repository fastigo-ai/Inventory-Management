"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/shared/api/axios';
import { Building2, ArrowLeft, FileText, Receipt } from 'lucide-react';
import Link from 'next/link';

export default function VendorDetail({ params }: { params: { vendorName: string } }) {
  const [data, setData] = useState<{ pos: any[], invoices: any[] }>({ pos: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const vendorName = decodeURIComponent(params.vendorName);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/reports/vendor-summary/${encodeURIComponent(vendorName)}`);
        setData(res.data.data || { pos: [], invoices: [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vendorName]);

  const totalOrderedValue = data.pos.reduce((sum, po) => sum + (po.grandTotal || 0), 0);
  const totalInvoicedValue = data.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <Link href="/reports/vendor-summary" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Vendor Summary
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{vendorName}</h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">Detailed deep-dive of Purchase Orders and Invoices.</p>
              </div>
            </div>
            
            <div className="flex gap-4 border-l border-slate-200 pl-6">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Ordered</p>
                <p className="text-lg font-bold text-slate-800">₹{totalOrderedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Invoiced</p>
                <p className="text-lg font-bold text-emerald-600">₹{totalInvoicedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pending</p>
                <p className="text-lg font-bold text-amber-600">₹{Math.max(0, totalOrderedValue - totalInvoicedValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-8 flex flex-col gap-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Purchase Orders */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h2 className="font-bold text-slate-800">Purchase Orders ({data.pos.length})</h2>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">PO Number</th>
                      <th className="px-6 py-3 whitespace-nowrap">Date</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.pos.map((po, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-indigo-600">
                          <Link href={`/purchases/orders/${po._id}`} className="hover:underline">{po.purchaseOrderNumber}</Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{new Date(po.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                          ₹{po.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                      </tr>
                    ))}
                    {data.pos.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No purchase orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoices */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" />
                <h2 className="font-bold text-slate-800">Purchase Invoices ({data.invoices.length})</h2>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">Inv Number</th>
                      <th className="px-6 py-3 whitespace-nowrap">Date</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.invoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-emerald-600">
                          <Link href={`/purchases/invoices/${inv._id}`} className="hover:underline">{inv.PurchaseInvoiceNumber || inv.invoiceNumber}</Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{new Date(inv.receiveDate || inv.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                          ₹{inv.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                      </tr>
                    ))}
                    {data.invoices.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No invoices found.</td>
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
