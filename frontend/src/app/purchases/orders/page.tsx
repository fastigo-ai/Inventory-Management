import React from 'react';
import { ChevronDown, RefreshCw, Plus, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export default function PurchaseOrdersPage() {
  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer group">
          <h1 className="text-xl font-bold text-slate-800">All Purchase Orders</h1>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
            <RefreshCw className="w-4 h-4" />
            In Transit Receives
          </button>
          
          <Link href="/purchases/orders/new" className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            New
          </Link>

          <button className="flex items-center justify-center text-slate-500 hover:bg-slate-100 p-2 rounded-md border border-slate-200 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider sticky top-0">
            <tr>
              <th className="px-6 py-3 w-10 text-center">
                <input type="checkbox" className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              </th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Purchase Order#</th>
              <th className="px-4 py-3">Reference#</th>
              <th className="px-4 py-3">Vendor Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Billed</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            <tr className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4 text-center">
                <input type="checkbox" className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              </td>
              <td className="px-4 py-4 text-slate-800 whitespace-nowrap">15/07/2026</td>
              <td className="px-4 py-4 text-slate-800 font-medium">Head Office</td>
              <td className="px-4 py-4 text-blue-600 cursor-pointer hover:underline font-medium">PO-00002</td>
              <td className="px-4 py-4 text-slate-500"></td>
              <td className="px-4 py-4 text-slate-800 max-w-[200px] truncate" title="M/s Dadu Pipes Pvt Ltd">
                M/s Dadu Pipes Pvt Ltd
              </td>
              <td className="px-4 py-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">DRAFT</span>
              </td>
              <td className="px-4 py-4 text-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block"></div>
              </td>
              <td className="px-4 py-4"></td>
              <td className="px-6 py-4 text-right font-semibold text-slate-800">
                ₹ 0.00
              </td>
            </tr>
            {/* Empty state filler rows for aesthetics */}
            <tr className="h-[60px]"><td colSpan={10}></td></tr>
            <tr className="h-[60px]"><td colSpan={10}></td></tr>
            <tr className="h-[60px]"><td colSpan={10}></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
