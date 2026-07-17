import React from 'react';
import { Building } from 'lucide-react';

import { TopStockedItems } from '@/features/dashboard/components/TopStockedItems';
import { SalesByChannel } from '@/features/dashboard/components/SalesByChannel';
import { PendingActions } from '@/features/dashboard/components/PendingActions';

export default function Home() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center">
              <Building className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Holistic TechnoEngineer Pvt Ltd</h1>
              <p className="text-sm text-slate-500 mt-0.5">Fastigo AI</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-800">Zoho Inventory India Helpline: <span className="font-bold">18005726671</span></p>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Mon - Fri • 9:00 AM - 7:00 PM • Toll Free</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-8 flex gap-8">
          <button className="pb-3 text-sm font-semibold text-blue-600 border-b-[3px] border-blue-600">Dashboard</button>
          <button className="pb-3 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Getting Started</button>
          <button className="pb-3 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">Recent Updates</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 flex gap-6 flex-1 bg-slate-50/50">
        {/* Left Column */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <TopStockedItems />
            </div>
            <div className="flex-1 min-w-0">
              <SalesByChannel />
            </div>
          </div>
        </div>
        
        {/* Right Column (Sidebar of dashboard) */}
        <div className="w-[340px] shrink-0">
          <PendingActions />
        </div>
      </div>
    </div>
  );
}
