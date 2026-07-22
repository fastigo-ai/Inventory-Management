import React from 'react';
import { Clock, ArrowRight, ClipboardList, ShieldAlert } from 'lucide-react';

export function PendingActions({ summary = {} }: { summary?: any }) {
  const pendingReceipts = summary.pendingReceiptsCount || 0;
  const pendingVerification = summary.pendingVerificationCount || 0;
  const totalValue = summary.totalStockValue || 0;
  const totalItems = summary.totalItemsInStock || 0;

  return (
    <div className="flex flex-col gap-6">
      {/* System Summary Widget */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <h3 className="font-medium text-indigo-100 mb-6 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-200" />
          System Overview
        </h3>
        
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-indigo-100 text-sm mb-1">Total Inventory Value</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl">₹</span>
              <span className="text-4xl font-bold tracking-tight">{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="w-full h-px bg-white/20"></div>
          <div>
            <p className="text-indigo-100 text-sm mb-1">Total Stocked SKUs</p>
            <p className="text-2xl font-bold tracking-tight">{totalItems}</p>
          </div>
        </div>
      </div>

      {/* Action Items Widget */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Pending Tasks
          </h3>
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">
            {pendingReceipts + pendingVerification}
          </span>
        </div>
        
        <div className="space-y-3 flex-1">
          <div className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Store Receipts</p>
                <p className="text-xs text-slate-500 mt-0.5">Awaiting physical inward</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{pendingReceipts}</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            </div>
          </div>

          <div className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Quality Checks</p>
                <p className="text-xs text-slate-500 mt-0.5">Verified / Inspection</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">{pendingVerification}</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>
          </div>
        </div>
        
        <button className="w-full mt-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
          View Task Board
        </button>
      </div>
    </div>
  );
}
