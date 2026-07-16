import React from 'react';
import { ShoppingCart, ShoppingBag, Archive, ChevronRight } from 'lucide-react';

export function PendingActions() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-[calc(100vh-140px)] flex flex-col shadow-sm">
      <div className="flex p-1 bg-slate-50 border-b border-slate-200 m-2 rounded-lg">
        <button className="flex-1 bg-white shadow-sm text-xs font-semibold text-slate-800 py-1.5 rounded-md">Pending Actions</button>
        <button className="flex-1 text-xs font-medium text-slate-500 py-1.5 hover:text-slate-700 transition-colors">Recent Activities</button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {/* SALES SECTION */}
        <div className="mt-4">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 tracking-wider">
            <ShoppingCart className="w-4 h-4 text-orange-400" />
            SALES
          </div>
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                To Be Packed
              </div>
              <span className="font-semibold text-slate-800">1</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                To Be Shipped
              </div>
              <span className="font-semibold text-slate-800">0</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                To Be Delivered
              </div>
              <span className="font-semibold text-slate-800">0</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                To Be Invoiced
              </div>
              <span className="font-semibold text-slate-800">1</span>
            </div>
          </div>
        </div>

        {/* PURCHASES SECTION */}
        <div className="mt-6">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 tracking-wider">
            <ShoppingBag className="w-4 h-4 text-orange-400" />
            PURCHASES
          </div>
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                To Be Received
              </div>
              <span className="font-semibold text-slate-800">0</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                Receive In Progress
              </div>
              <span className="font-semibold text-slate-800">0</span>
            </div>
          </div>
        </div>

        {/* INVENTORY SECTION */}
        <div className="mt-6">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 tracking-wider">
            <Archive className="w-4 h-4 text-orange-400" />
            INVENTORY
          </div>
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer group">
              <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                Below Reorder Level
              </div>
              <span className="font-semibold text-slate-800">0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
