"use client";

import React, { useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, Plus, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPurchaseInvoices } from '@/features/purchases/api/purchases.api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const res = await getPurchaseInvoices();
      if (res.success) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch purchase invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-600';
      case 'Sent': return 'bg-blue-100 text-blue-700';
      case 'Unpaid': return 'bg-yellow-100 text-yellow-700';
      case 'Overdue': return 'bg-red-100 text-red-700';
      case 'Partially Paid': return 'bg-indigo-100 text-indigo-700';
      case 'Paid': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer group">
          <h1 className="text-xl font-bold text-slate-800">All Purchase Invoices</h1>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchInvoices} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <Link href="/purchases/invoices/new" className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            New
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center text-slate-500 hover:bg-slate-100 p-2 rounded-md border border-slate-200 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-[13px]">
              <DropdownMenuItem className="cursor-pointer">
                Export Invoices
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <th className="px-4 py-3">Invoice#</th>
              <th className="px-4 py-3">Order#</th>
              <th className="px-4 py-3">Vendor Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Due Date</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-right">Balance Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse border-b border-slate-100">
                    <td className="px-6 py-4 text-center"><div className="w-4 h-4 bg-slate-200 rounded mx-auto"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-40"></div></td>
                    <td className="px-4 py-4"><div className="h-5 bg-slate-200 rounded-full w-20"></div></td>
                    <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="px-6 py-4 flex justify-end"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="px-6 py-4 flex justify-end"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                  </tr>
                ))}
              </>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                  No purchase invoices found. Create a new one!
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr 
                  key={invoice._id} 
                  onClick={() => router.push(`/purchases/invoices/${invoice._id}`)}
                  className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                  </td>
                  <td className="px-4 py-4 text-slate-800 whitespace-nowrap">
                    {new Date(invoice.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-4 text-blue-600 font-medium">
                    <Link href={`/purchases/invoices/${invoice._id}`} className="hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{invoice.purchaseOrderNumber || '--'}</td>
                  <td className="px-4 py-4 text-slate-800 max-w-[200px] truncate" title={invoice.vendorName}>
                    {invoice.vendorName}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-800 whitespace-nowrap">
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : '--'}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800">
                    ₹ {invoice.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800">
                    ₹ {(invoice.balanceDue || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
            {/* Empty state filler rows for aesthetics */}
            {!isLoading && invoices.length > 0 && Array.from({ length: Math.max(0, 5 - invoices.length) }).map((_, i) => (
              <tr key={`filler-${i}`} className="h-[60px]"><td colSpan={9}></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
