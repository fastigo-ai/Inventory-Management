import React from 'react';
import { ChevronDown, Plus, MoreHorizontal, Search } from 'lucide-react';
import Link from 'next/link';

export default function PurchaseReceivesPage() {
  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer group">
          <h1 className="text-xl font-bold text-slate-800">In Transit</h1>
          <ChevronDown className="w-4 h-4 text-blue-600 transition-colors" />
        </div>

        <div className="flex items-center gap-3">
          <Link href="/purchases/receives/new" className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md shadow-sm transition-colors">
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
        <table className="w-full text-sm text-left relative">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] text-slate-500 font-bold uppercase tracking-wider sticky top-0">
            <tr>
              <th className="px-6 py-3 w-10 text-center">
                <input type="checkbox" className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              </th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Purchase Receive#</th>
              <th className="px-4 py-3">Purchase Order#</th>
              <th className="px-4 py-3">Vendor Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Billed</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-6 py-3 w-10 text-right">
                <Search className="w-4 h-4 inline-block text-slate-400" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr>
              <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                No Purchase Receives to display!
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
