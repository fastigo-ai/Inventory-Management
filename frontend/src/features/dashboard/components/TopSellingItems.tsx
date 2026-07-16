import React from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function TopSellingItems() {
  return (
    <Card className="flex flex-col h-[320px] border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="font-semibold text-slate-800">Top Selling Items</h3>
        <button className="text-xs font-medium flex items-center gap-1 text-slate-600 hover:text-slate-800">
          This Month <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute inset-0 flex items-center justify-center opacity-30 px-12">
          {/* Faint placeholder grid */}
          <div className="w-full flex justify-between">
            <div className="w-24 h-24 bg-slate-100 rounded-lg blur-sm"></div>
            <div className="w-24 h-24 bg-slate-100 rounded-lg blur-sm"></div>
            <div className="w-24 h-24 bg-slate-100 rounded-lg blur-sm"></div>
            <div className="w-24 h-24 bg-slate-100 rounded-lg blur-sm"></div>
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center gap-3 bg-[#f8fbff] border border-blue-100 rounded-xl px-12 py-3 shadow-sm max-w-lg w-full text-sm font-medium text-slate-700">
          <Lightbulb className="w-4 h-4 text-blue-500" />
          You do not have any top selling items yet.
        </div>
      </div>
    </Card>
  );
}
