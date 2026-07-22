import React from 'react';
import { Lightbulb, ChevronDown, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function TopStockedItems({ items = [] }: { items?: any[] }) {
  // Normalize the max quantity for simple bar chart math
  const maxQty = items.length > 0 ? Math.max(...items.map((i) => i.quantity)) : 0;

  return (
    <Card className="flex flex-col h-[320px] border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-500" />
          Top Stocked Items
        </h3>
      </div>
      
      <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center justify-center gap-3 bg-[#f8fbff] border border-blue-100 rounded-xl px-6 py-4 shadow-sm text-sm font-medium text-slate-700">
              <Lightbulb className="w-5 h-5 text-blue-500 shrink-0" />
              <span>No items in stock.</span>
            </div>
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-slate-700 truncate mr-4">{item.name}</span>
                <span className="text-slate-600 font-semibold">{item.quantity}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(2, (item.quantity / maxQty) * 100)}%` }}
                ></div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
