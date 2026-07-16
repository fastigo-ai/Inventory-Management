import React from 'react';
import { ShoppingBag, X, Search, Settings, FileUp, Plus } from 'lucide-react';
import Link from 'next/link';

export function NewPurchaseOrderForm() {
  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-slate-700" />
          <h1 className="text-xl font-bold text-slate-800">New Purchase Order</h1>
        </div>
        <Link href="/purchases/orders" className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </Link>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 flex flex-col gap-10">
          
          {/* Top Form Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            
            {/* Left Column */}
            <div className="space-y-6">
              {/* Vendor Name */}
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-red-500 flex items-center justify-between">
                  Vendor Name*
                  <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center ml-2 border-2 border-white shadow-sm ring-1 ring-slate-200"><div className="w-2 h-2 bg-blue-500 rounded-full"></div></span>
                </label>
                <div className="flex">
                  <select className="flex-1 border border-blue-400 rounded-l-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="">Select a Vendor</option>
                  </select>
                  <button className="bg-blue-500 text-white px-3 py-2 rounded-r-md hover:bg-blue-600 transition-colors">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Location</label>
                <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                  <option value="head-office">Head Office</option>
                </select>
              </div>

              {/* Delivery Address */}
              <div className="grid grid-cols-[160px_1fr] items-start gap-4 pt-4">
                <label className="text-sm font-semibold text-red-500 mt-1">Delivery Address*</label>
                <div className="space-y-3">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name="delivery_type" className="text-blue-500 focus:ring-blue-500" defaultChecked />
                      Locations
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="radio" name="delivery_type" className="text-blue-500 focus:ring-blue-500" />
                      Customer
                    </label>
                  </div>
                  <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                    <option value="head-office">Head Office</option>
                  </select>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-md p-4 text-sm text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">Head Office</p>
                    <p>Uttar Pradesh</p>
                    <p>India ,</p>
                    <p>91-9599094941</p>
                  </div>
                  
                  <button className="text-sm text-blue-600 hover:underline font-medium">Change destination to deliver</button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Purchase Order Number */}
              <div className="grid grid-cols-[140px_1fr] items-center gap-4 pt-[72px]">
                <label className="text-sm font-semibold text-red-500">Purchase Order#*</label>
                <div className="relative">
                  <input type="text" defaultValue="PO-00003" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 pr-10" />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reference */}
              <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Reference#</label>
                <input type="text" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500" />
              </div>

              {/* Date */}
              <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Date</label>
                <input type="text" defaultValue="16/07/2026" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500" />
              </div>

              {/* Delivery Date & Payment Terms Row */}
              <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Delivery Date</label>
                <div className="grid grid-cols-2 gap-6">
                  <input type="text" placeholder="dd/MM/yyyy" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500" />
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-slate-800 shrink-0">Payment Terms</label>
                    <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                      <option>Due on Receipt</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* PO Quantity & Circle Row */}
              <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">PO Quantity</label>
                <div className="grid grid-cols-2 gap-6">
                  <input type="text" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500" />
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-slate-800 shrink-0">Circle</label>
                    <div className="relative w-full">
                       <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white appearance-none">
                         <option>Package 1(S/N)</option>
                       </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2 text-slate-400 pointer-events-none">
                         <span className="text-red-400 font-bold">×</span>
                         <span className="text-xs">▼</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Package 1 & 2 Row */}
              <div className="grid grid-cols-[140px_1fr] items-center gap-4 pt-2">
                <label className="text-sm font-semibold text-slate-800">Package 1</label>
                <div className="grid grid-cols-2 gap-6">
                  <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                    <option></option>
                  </select>
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-slate-800 shrink-0">Package 2</label>
                    <select className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                      <option></option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Shipment Preference */}
              <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Shipment Preference</label>
                <select className="w-[calc(50%-12px)] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:border-blue-500 bg-white">
                  <option>Choose the shipment preference or type to add</option>
                </select>
              </div>

            </div>
          </div>

          <hr className="border-slate-200 border-dashed my-4" />

          {/* Item Table Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-6 border-b border-slate-200">
               <button className="pb-3 text-sm font-semibold text-slate-800 border-b-2 border-blue-600 flex items-center gap-2">
                 Warehouse Location <span className="text-xs font-normal">Head Office ▼</span>
               </button>
               <button className="pb-3 text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-2">
                 % At Transaction Level ▼
               </button>
            </div>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden">
               <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800">Item Table</h3>
                  <button className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
                    <Settings className="w-4 h-4" /> Bulk Actions
                  </button>
               </div>
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 w-8"></th>
                      <th className="px-4 py-2 w-[30%]">ITEM DETAILS</th>
                      <th className="px-4 py-2 w-[20%]">ACCOUNT</th>
                      <th className="px-4 py-2 w-[15%]">TEMP CODE</th>
                      <th className="px-4 py-2 text-right">QUANTITY</th>
                      <th className="px-4 py-2 text-right">RATE</th>
                      <th className="px-4 py-2 text-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 cursor-grab text-slate-300">⣿</td>
                      <td className="px-4 py-3 text-slate-400">Type or click to select an item.</td>
                      <td className="px-4 py-3">
                         <select className="w-full border-none bg-transparent text-slate-500 focus:outline-none appearance-none">
                            <option>Select an account ▼</option>
                         </select>
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right">1.00</td>
                      <td className="px-4 py-3 text-right">0.00</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">0.00</td>
                    </tr>
                  </tbody>
               </table>
            </div>

            <div className="flex gap-4">
              <button className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors">
                <Plus className="w-4 h-4" /> Add New Row <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              <button className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors">
                <Plus className="w-4 h-4" /> Add Items in Bulk
              </button>
            </div>
          </div>

          {/* Bottom Section (Calculations & Notes) */}
          <div className="flex flex-col lg:flex-row gap-12 pt-6">
             
             {/* Left side: Notes & Terms */}
             <div className="flex-1 space-y-6">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-800">Notes</label>
                 <textarea 
                   rows={3} 
                   placeholder="Will be displayed on purchase order"
                   className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 resize-none"
                 />
               </div>
               
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-800">Terms & Conditions</label>
                 <textarea 
                   rows={4} 
                   placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                   className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 resize-none"
                 />
               </div>
             </div>

             {/* Right side: Totals & File Upload */}
             <div className="w-full lg:w-[400px] space-y-8 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                <div className="space-y-5">
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-semibold text-slate-800">Sub Total</span>
                     <span className="text-sm font-bold text-slate-800">0.00</span>
                   </div>
                   
                   <div className="flex justify-between items-center gap-4">
                     <span className="text-sm text-slate-600">Discount</span>
                     <div className="flex items-center w-32 border border-slate-200 rounded-md overflow-hidden bg-white">
                        <input type="text" defaultValue="0" className="w-full text-right px-2 py-1.5 text-sm focus:outline-none" />
                        <span className="bg-slate-50 px-2 py-1.5 text-sm border-l border-slate-200 text-slate-500">%</span>
                     </div>
                     <span className="text-sm font-semibold text-slate-800">0.00</span>
                   </div>

                   <div className="flex justify-between items-center gap-4">
                     <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                          <input type="radio" name="tax_type" className="text-blue-500" defaultChecked /> TDS
                        </label>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                          <input type="radio" name="tax_type" className="text-blue-500" /> TCS
                        </label>
                     </div>
                     <select className="border border-slate-200 rounded-md px-2 py-1.5 text-sm text-slate-700 focus:outline-none w-28 bg-white">
                       <option>Select a Tax</option>
                     </select>
                     <span className="text-sm font-semibold text-slate-800">- 0.00</span>
                   </div>
                   
                   <div className="flex justify-between items-center gap-4">
                     <span className="text-sm text-slate-600 border border-slate-200 border-dashed rounded-md px-2 py-1.5 bg-slate-50">Adjustment</span>
                     <input type="text" className="w-24 border border-slate-200 rounded-md px-2 py-1.5 text-sm text-right focus:outline-none bg-white" />
                     <span className="text-sm font-semibold text-slate-800">0.00</span>
                   </div>

                   <hr className="border-slate-200" />
                   
                   <div className="flex justify-between items-center">
                     <span className="text-base font-bold text-slate-800">Total</span>
                     <span className="text-lg font-bold text-slate-800">0.00</span>
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                   <p className="text-sm font-semibold text-slate-800 mb-2">Attach File(s) to Purchase Order</p>
                   <button className="w-full flex items-center justify-center gap-2 border border-slate-200 border-dashed bg-white rounded-md py-3 hover:bg-slate-50 transition-colors">
                      <FileUp className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Upload File ▼</span>
                   </button>
                   <p className="text-xs text-slate-400 mt-2 text-center">You can upload a maximum of 10 files, 10MB each</p>
                </div>
             </div>
          </div>
          
          <p className="text-sm text-slate-500 mb-10 pb-10">
            <span className="font-semibold text-slate-700">Additional Fields:</span> Start adding custom fields for your purchase orders by going to 
            <span className="italic ml-1 text-slate-600">Settings ➔ Purchases ➔ Purchase Orders.</span>
          </p>

        </div>
      </div>

      {/* Sticky Footer Area */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="flex gap-3">
           <button className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200">
             Save as Draft
           </button>
           <button className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-md shadow-sm transition-colors">
             Save and Send
           </button>
           <button className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition-colors border border-transparent hover:border-slate-200">
             Cancel
           </button>
         </div>
         <div className="text-sm text-slate-600 font-medium">
           PDF Template: <span className="text-slate-500">'Standard Template'</span> <button className="text-blue-500 hover:underline ml-1">Change</button>
         </div>
      </div>
    </div>
  );
}

// Minimal stub for chevron down in case I forgot to import it in the file above.
const ChevronDown = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
