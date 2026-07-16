import React from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function TopStockedItems() {
  return (
    <Card className="flex flex-col h-[320px] border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white relative">
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="font-semibold text-slate-800">Top Stocked Items</h3>
        <button className="text-xs font-medium flex items-center gap-1 text-slate-500 hover:text-slate-800">
          As of: <span className="text-slate-700 ml-1">This Month</span> <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      
      <div className="px-6 pb-2">
        <div className="flex bg-slate-100 p-0.5 rounded-full w-fit">
          <button className="px-4 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-full shadow-sm">
            By Quantity
          </button>
          <button className="px-4 py-1.5 text-xs font-medium text-slate-600 rounded-full hover:bg-slate-200/50 transition-colors">
            By Value
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 flex items-end justify-center opacity-30 px-6 pb-6 gap-4">
           {/* Faint placeholder bars */}
           <div className="w-8 h-12 bg-slate-200 rounded-t-sm"></div>
           <div className="w-8 h-20 bg-slate-200 rounded-t-sm"></div>
           <div className="w-8 h-16 bg-slate-200 rounded-t-sm"></div>
           <div className="w-8 h-24 bg-slate-200 rounded-t-sm"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center gap-3 bg-[#f8fbff] border border-blue-100 rounded-xl px-6 py-4 shadow-sm w-[80%] text-sm font-medium text-slate-700">
          <Lightbulb className="w-5 h-5 text-blue-500 shrink-0" />
          <span className="leading-tight text-center">No sales recorded during this period.</span>
        </div>
      </div>
    </Card>
  );
}
