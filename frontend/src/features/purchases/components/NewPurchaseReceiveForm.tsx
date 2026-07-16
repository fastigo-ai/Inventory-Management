import React from 'react';
import { X, Settings, FileUp, ChevronDown, ArchiveRestore } from 'lucide-react';
import Link from 'next/link';

export function NewPurchaseReceiveForm() {
  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <ArchiveRestore className="w-5 h-5 text-slate-700" />
          <h1 className="text-xl font-bold text-slate-800">New Purchase Receive</h1>
        </div>
        <Link href="/purchases/receives" className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </Link>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8 flex flex-col gap-8">
          
          {/* Top Form Section - Vendor & PO */}
          <div className="grid grid-cols-[160px_1fr] md:grid-cols-[200px_450px] items-start gap-4">
            
            {/* Vendor Name */}
            <div className="flex flex-col">
               <label className="text-sm font-semibold text-red-500">Vendor Name*</label>
               <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 ml-1 shadow-[0_0_0_4px_rgba(219,234,254,1)]"></span>
            </div>
            <div className="relative">
              <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white appearance-none pr-10 font-medium">
                <option>FASTIGO TECHNOLOGY PRIVATE LIMITED</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2 text-slate-400 pointer-events-none items-center">
                <span className="text-red-400 font-bold hover:text-red-500 cursor-pointer pointer-events-auto">×</span>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {/* Purchase Order */}
            <label className="text-sm font-semibold text-red-500 mt-2">Purchase Order#*</label>
            <div className="relative mt-2">
              <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:border-blue-500 bg-white appearance-none pr-8">
                <option>Select a Purchase Order</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Details Grid Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
             
             {/* Left Column */}
             <div className="space-y-6">
                
                {/* Purchase Receive# */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-red-300">Purchase Receive#*</label>
                  <div className="relative">
                    <input type="text" className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 pr-10 bg-slate-50/30" />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-500">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Received Date */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-red-300">Received Date*</label>
                  <input type="text" defaultValue="16/07/2026" className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50/30" />
                </div>
                
                {/* DI NO */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400">DI NO</label>
                  <input type="text" className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-slate-50/30" />
                </div>
                
                {/* Package Name */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400">Package Name</label>
                  <div className="relative">
                    <select className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm appearance-none focus:outline-none focus:border-blue-500 bg-slate-50/30"></select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
                
                {/* Package 2 */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400">Package 2</label>
                  <div className="relative">
                    <select className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm appearance-none focus:outline-none focus:border-blue-500 bg-slate-50/30"></select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
                
                {/* SKU */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400">SKU</label>
                  <input type="text" className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-slate-50/30" />
                </div>

                {/* Unit */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400">Unit</label>
                  <div className="relative">
                    <select className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm appearance-none focus:outline-none focus:border-blue-500 bg-slate-50/30"></select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>

             </div>

             {/* Right Column */}
             <div className="space-y-6 pt-[124px]">
                
                {/* DI Date */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400">DI Date</label>
                  <input type="text" placeholder="dd/MM/yyyy" className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm text-slate-400 focus:outline-none focus:border-blue-500 bg-slate-50/30" />
                </div>
                
                {/* Package 1 */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400">Package 1</label>
                  <div className="relative">
                    <select className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm appearance-none focus:outline-none focus:border-blue-500 bg-slate-50/30"></select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
                
                {/* LOA SERIAL NO */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[11px]">LOA SERIAL NO</label>
                  <input type="text" className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-slate-50/30" />
                </div>
                
                {/* ITEM NAME */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-[11px]">ITEM NAME</label>
                  <input type="text" className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-slate-50/30" />
                </div>
                
                {/* Quantity */}
                <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label className="text-sm font-semibold text-slate-400">Quantity</label>
                  <input type="text" className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-slate-50/30" />
                </div>

             </div>
          </div>

          {/* Item Table Section */}
          <div className="mt-4">
             <div className="border border-slate-100 rounded-md overflow-hidden bg-slate-50/20">
               <table className="w-full text-sm text-left">
                  <thead className="bg-transparent border-b border-slate-100 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-4 w-[40%]">ITEMS & DESCRIPTION</th>
                      <th className="px-4 py-4">TEMP CODE</th>
                      <th className="px-4 py-4">ORDERED</th>
                      <th className="px-4 py-4">RECEIVED</th>
                      <th className="px-4 py-4">IN TRANSIT</th>
                      <th className="px-4 py-4">QUANTITY TO RECEIVE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-300 font-medium">
                        Item Table
                      </td>
                    </tr>
                  </tbody>
               </table>
             </div>
          </div>

          {/* Bottom Section (Notes & Upload) */}
          <div className="flex flex-col max-w-xl gap-8 pt-4">
             {/* Notes */}
             <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-400">Notes (For Internal Use)</label>
               <textarea 
                 rows={4} 
                 className="w-full border border-slate-100 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 resize-none bg-slate-50/20"
               />
             </div>
             
             {/* File Upload */}
             <div>
                <p className="text-sm font-semibold text-slate-400 mb-2">Attach File(s) to Purchase Receive</p>
                <div className="w-48">
                  <button className="w-full flex items-center justify-center gap-2 border border-slate-100 bg-slate-50/50 rounded-md py-2.5 hover:bg-slate-100 transition-colors">
                      <FileUp className="w-4 h-4 text-slate-300" />
                      <span className="text-sm font-medium text-slate-300">Upload File <ChevronDown className="w-3 h-3 inline ml-1" /></span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 mt-2">You can upload a maximum of 5 files, 10MB each</p>
             </div>
          </div>
          
          <div className="pb-16"></div>

        </div>
      </div>

      {/* Sticky Footer Area */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="flex gap-3">
           <button className="px-4 py-2 text-sm font-semibold text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors border border-slate-100">
             Save as Draft
           </button>
           <div className="flex rounded-md shadow-sm">
             <button className="px-4 py-2 text-sm font-semibold text-white bg-blue-300 hover:bg-blue-400 rounded-l-md transition-colors">
               Save as Received
             </button>
             <button className="px-2 py-2 text-white bg-blue-300 hover:bg-blue-400 rounded-r-md transition-colors border-l border-blue-200/50 flex items-center justify-center">
               <ChevronDown className="w-4 h-4" />
             </button>
           </div>
           <button className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors border border-transparent">
             Cancel
           </button>
         </div>
      </div>
    </div>
  );
}
