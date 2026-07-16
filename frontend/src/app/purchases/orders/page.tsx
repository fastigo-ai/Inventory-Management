"use client";

import React, { useEffect, useState } from 'react';
import { ChevronDown, RefreshCw, Plus, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { getPurchaseOrders, exportPurchaseOrdersToCsv } from '@/features/purchases/api/purchases.api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PurchaseOrderImportModal } from '@/features/purchases/components/PurchaseOrderImportModal';
import { Upload, Download, Loader2 } from 'lucide-react';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportPurchaseOrdersToCsv();
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await getPurchaseOrders();
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch purchase orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer group">
          <h1 className="text-xl font-bold text-slate-800">All Purchase Orders</h1>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchOrders} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <Link href="/purchases/orders/new" className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            New
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center text-slate-500 hover:bg-slate-100 p-2 rounded-md border border-slate-200 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-[13px]">
              <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-slate-500" />
                Import Purchase Orders
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer" disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-500" /> : <Download className="w-4 h-4 mr-2 text-slate-500" />}
                Export Purchase Orders
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
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Purchase Order#</th>
              <th className="px-4 py-3">Reference#</th>
              <th className="px-4 py-3">Vendor Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                  No purchase orders found. Create a new one!
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                  </td>
                  <td className="px-4 py-4 text-slate-800 whitespace-nowrap">
                    {new Date(order.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-4 text-slate-800 font-medium">{order.location || 'Head Office'}</td>
                  <td className="px-4 py-4 text-blue-600 font-medium">
                    <Link href={`/purchases/orders/${order._id}`} className="hover:underline">
                      {order.purchaseOrderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{order.reference || '--'}</td>
                  <td className="px-4 py-4 text-slate-800 max-w-[200px] truncate" title={order.vendorName}>
                    {order.vendorName}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
                      order.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800">
                    ₹ {order.total.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
            {/* Empty state filler rows for aesthetics */}
            {!isLoading && orders.length > 0 && Array.from({ length: Math.max(0, 5 - orders.length) }).map((_, i) => (
              <tr key={`filler-${i}`} className="h-[60px]"><td colSpan={8}></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {isImportModalOpen && (
        <PurchaseOrderImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}
