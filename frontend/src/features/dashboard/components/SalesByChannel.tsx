import React from 'react';
import { ChevronDown, Flag } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function SalesByChannel() {
  return (
    <Card className="flex flex-col h-[320px] border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="font-semibold text-slate-800">Sales By Channel</h3>
        <button className="text-xs font-medium flex items-center gap-1 text-slate-600 hover:text-slate-800">
          This Month <ChevronDown className="w-3 h-3" />
        </button>
      </div>
      
      <div className="px-6 py-4">
        <p className="text-xs text-slate-500 mb-1">Total Sales</p>
        <h4 className="text-xl font-bold text-slate-800">₹100.00</h4>
        <div className="w-full bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden">
           <div className="bg-blue-500 h-full rounded-full w-full"></div>
        </div>
      </div>

      <div className="px-6 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
            <Flag className="w-4 h-4 text-red-400" />
            <span className="text-sm text-slate-700 font-medium">Direct Sales</span>
          </div>
          <span className="text-sm font-semibold text-slate-800">₹100.00</span>
        </div>
      </div>
    </Card>
  );
}
