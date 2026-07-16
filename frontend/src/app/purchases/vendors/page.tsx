import React from 'react';
import { ChevronDown, Plus, MoreHorizontal, Search, AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function VendorsPage() {
  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer group">
          <h1 className="text-xl font-bold text-slate-800">Active Vendors</h1>
          <ChevronDown className="w-4 h-4 text-blue-600 transition-colors" />
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-md transition-colors mr-2">
            <AlertTriangle className="w-4 h-4 fill-orange-100" />
            Update MSME Details
            <ChevronRight className="w-3 h-3 ml-1" />
          </button>
          
          <Link href="/purchases/vendors/new" className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md shadow-sm transition-colors">
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Company Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Work Phone</th>
              <th className="px-4 py-3 text-right">Payables (BCY)</th>
              <th className="px-4 py-3 text-right">Unused Credits (BCY)</th>
              <th className="px-6 py-3 w-10 text-right">
                <Search className="w-4 h-4 inline-block text-slate-400" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            <tr className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4 text-center">
                <input type="checkbox" className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              </td>
              <td className="px-4 py-4"><span className="text-blue-600 hover:underline cursor-pointer font-medium">M/s Dadu Pipes Pvt Ltd</span></td>
              <td className="px-4 py-4 text-slate-800 font-medium">M/s Dadu Pipes Pvt Ltd</td>
              <td className="px-4 py-4 text-slate-700">sales6@dadupipes.com</td>
              <td className="px-4 py-4 text-slate-500"></td>
              <td className="px-4 py-4 text-right font-medium text-slate-800">₹0.00</td>
              <td className="px-4 py-4 text-right font-medium text-slate-800">₹0.00</td>
              <td className="px-6 py-4"></td>
            </tr>
            <tr className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4 text-center">
                <input type="checkbox" className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              </td>
              <td className="px-4 py-4"><span className="text-blue-600 hover:underline cursor-pointer font-medium max-w-[200px] truncate block">FASTIGO TECHNOLOGY PRIVATE LIMITED</span></td>
              <td className="px-4 py-4 text-slate-800 font-medium">FASTIGO TECHNOLOGY PRIVATE LIMITED</td>
              <td className="px-4 py-4 text-slate-700">akhil@fastigo.co</td>
              <td className="px-4 py-4 text-slate-500"></td>
              <td className="px-4 py-4 text-right font-medium text-slate-800">₹0.00</td>
              <td className="px-4 py-4 text-right font-medium text-slate-800">₹0.00</td>
              <td className="px-6 py-4"></td>
            </tr>
            <tr className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4 text-center">
                <input type="checkbox" className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
              </td>
              <td className="px-4 py-4"><span className="text-blue-600 hover:underline cursor-pointer font-medium max-w-[200px] truncate block">HOLISTIC TECHNOENGINEERS PRIVATE LIMITED</span></td>
              <td className="px-4 py-4 text-slate-800 font-medium max-w-[250px]">HOLISTIC TECHNOENGINEERS PRIVATE LIMITED</td>
              <td className="px-4 py-4 text-slate-700"></td>
              <td className="px-4 py-4 text-slate-500"></td>
              <td className="px-4 py-4 text-right font-medium text-slate-800">₹0.00</td>
              <td className="px-4 py-4 text-right font-medium text-slate-800">₹0.00</td>
              <td className="px-6 py-4"></td>
            </tr>
            {/* Empty state filler rows for aesthetics */}
            <tr className="h-[60px]"><td colSpan={8}></td></tr>
            <tr className="h-[60px]"><td colSpan={8}></td></tr>
            <tr className="h-[60px]"><td colSpan={8}></td></tr>
            <tr className="h-[60px]"><td colSpan={8}></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
