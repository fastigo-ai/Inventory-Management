"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/shared/api/axios';
import { PackageOpen, ArrowLeft, FileText, Receipt, Truck } from 'lucide-react';
import Link from 'next/link';

export default function ItemDetail({ params }: { params: { itemId: string } }) {
  const [data, setData] = useState<{ pos: any[], dis: any[], invoices: any[], mins: any[] }>({ pos: [], dis: [], invoices: [], mins: [] });
  const [loading, setLoading] = useState(true);
  const itemId = params.itemId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/reports/summary/item-summary/${itemId}`);
        setData(res.data.data || { pos: [], dis: [], invoices: [], mins: [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [itemId]);

  const getItemQty = (lineItems: any[]) => {
    const item = lineItems.find((i: any) => i.itemId?.toString() === itemId.toString());
    return item ? (item.quantity || 0) : 0;
  };
  
  const getItemName = () => {
    if (data.pos.length > 0) return data.pos[0].lineItems.find((i:any)=>i.itemId?.toString()===itemId)?.itemName || 'Item Details';
    if (data.dis.length > 0) return data.dis[0].lineItems.find((i:any)=>i.itemId?.toString()===itemId)?.itemName || 'Item Details';
    return 'Item Details';
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <Link href="/reports/item-summary" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Item Summary
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <PackageOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{!loading ? getItemName() : 'Loading...'}</h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">Full Traceability Report.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-8 flex flex-col gap-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Purchase Orders */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h2 className="font-bold text-slate-800">Purchase Orders ({data.pos.length})</h2>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">PO Number</th>
                      <th className="px-6 py-3 whitespace-nowrap">Vendor</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Ordered Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.pos.map((po, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-indigo-600">
                          <Link href={`/purchases/orders/${po._id}`} className="hover:underline">{po.purchaseOrderNumber}</Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{po.vendorName}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                          {getItemQty(po.lineItems)}
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

            {/* DIs */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-slate-800">Dispatch Instructions ({data.dis.length})</h2>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">DI Number</th>
                      <th className="px-6 py-3 whitespace-nowrap">Date</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Dispatched Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.dis.map((di, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-blue-600">
                          <Link href={`/di/${di._id}`} className="hover:underline">{di.diNumber}</Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{new Date(di.date).toLocaleDateString('en-GB')}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                          {getItemQty(di.lineItems)}
                        </td>
                      </tr>
                    ))}
                    {data.dis.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No DIs found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase Invoices */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" />
                <h2 className="font-bold text-slate-800">Invoices Received ({data.invoices.length})</h2>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">Invoice No</th>
                      <th className="px-6 py-3 whitespace-nowrap">Vendor</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Invoiced Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.invoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-emerald-600">
                          <Link href={`/purchases/invoices/${inv._id}`} className="hover:underline">{inv.PurchaseInvoiceNumber || inv.invoiceNumber}</Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{inv.vendorName}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                          {getItemQty(inv.lineItems)}
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

            {/* MINs */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-slate-800">Issued to Contractors ({data.mins.length})</h2>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">MIN Number</th>
                      <th className="px-6 py-3 whitespace-nowrap">Contractor</th>
                      <th className="px-6 py-3 text-right whitespace-nowrap">Issued Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.mins.map((min, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-amber-600">
                          <Link href={`/contractors/assignments/${min._id}`} className="hover:underline">{min.assignmentNumber}</Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{min.contractorFarmName}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                          {getItemQty(min.lineItems)}
                        </td>
                      </tr>
                    ))}
                    {data.mins.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">Not issued to any contractors yet.</td>
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
