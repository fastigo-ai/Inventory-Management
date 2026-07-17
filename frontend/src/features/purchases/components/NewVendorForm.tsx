"use client";

import React, { useState } from 'react';
import { Mail, Info, DownloadCloud, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export function NewVendorForm() {
  const [activeTab, setActiveTab] = useState('other');
  
  const [paymentStage, setPaymentStage] = useState('');
  const [paymentType, setPaymentType] = useState('');

  const tabs = [
    { id: 'other', label: 'Other Details' },
    { id: 'address', label: 'Address' },
    { id: 'contact', label: 'Contact Persons' },
    { id: 'bank', label: 'Bank Details' },
    { id: 'custom', label: 'Custom Fields' },
    { id: 'reporting', label: 'Reporting Tags' },
    { id: 'remarks', label: 'Remarks' },
  ];

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center px-8 py-4 border-b border-slate-200 shrink-0">
        <h1 className="text-[22px] font-semibold text-slate-800">New Vendor</h1>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8 flex flex-col">
          

          {/* Primary Details Grid */}
          <div className="space-y-6 max-w-3xl">
             
             {/* Primary Contact */}
             <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-6">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mt-2">
                  Primary Contact <Info className="w-4 h-4 text-slate-400" />
                </label>
                <div className="grid grid-cols-[120px_1fr_1fr] gap-4">
                  <select className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:border-blue-500 bg-white">
                    <option>Salutation</option>
                  </select>
                  <input type="text" placeholder="First Name" className="border border-blue-400 shadow-[0_0_0_2px_rgba(191,219,254,0.5)] rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
                  <input type="text" placeholder="Last Name" className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
                </div>
             </div>

             {/* Company Name */}
             <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
                <label className="text-sm font-semibold text-slate-700">Company Name</label>
                <input type="text" className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white w-full" />
             </div>

             {/* Display Name */}
             <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
                <label className="text-sm font-semibold text-red-500 flex items-center gap-1.5">
                  Display Name* <Info className="w-4 h-4 text-slate-400" />
                </label>
                <select className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:border-blue-500 bg-white w-full">
                  <option>Select or type to add</option>
                </select>
             </div>

             {/* Email Address */}
             <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  Email Address <Info className="w-4 h-4 text-slate-400" />
                </label>
                <div className="relative w-full">
                  <input type="email" className="w-full border border-slate-200 rounded-md pl-10 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
             </div>

             {/* Phone */}
             <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-6">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mt-2">
                  Phone <Info className="w-4 h-4 text-slate-400" />
                </label>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex">
                    <select className="border border-slate-200 border-r-0 rounded-l-md px-2 py-2 text-sm text-slate-700 focus:outline-none bg-slate-50 w-20 shrink-0">
                      <option>+91</option>
                    </select>
                    <input type="text" placeholder="Work Phone" className="flex-1 border border-slate-200 rounded-r-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
                  </div>
                  <div className="flex">
                    <select className="border border-slate-200 border-r-0 rounded-l-md px-2 py-2 text-sm text-slate-700 focus:outline-none bg-slate-50 w-20 shrink-0">
                      <option>+91</option>
                    </select>
                    <input type="text" placeholder="Mobile" className="flex-1 border border-slate-200 rounded-r-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
                  </div>
                </div>
             </div>

             {/* Vendor Language */}
             <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6 pb-6">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  Vendor Language <Info className="w-4 h-4 text-slate-400" />
                </label>
                <select className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white w-1/2">
                  <option>English</option>
                </select>
             </div>

          </div>

          {/* Tabs Section */}
          <div className="mt-8 border-b border-slate-200">
             <div className="flex space-x-8">
               {tabs.map((tab) => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`pb-3 text-[13px] font-semibold transition-colors relative ${
                     activeTab === tab.id ? 'text-blue-600' : 'text-slate-600 hover:text-slate-800'
                   }`}
                 >
                   {tab.label}
                   {activeTab === tab.id && (
                     <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-600"></div>
                   )}
                 </button>
               ))}
             </div>
          </div>

          {/* Tab Content (Other Details) */}
          {activeTab === 'other' && (
            <div className="py-8 space-y-6 max-w-3xl">
               
               {/* PAN */}
               <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    PAN <Info className="w-4 h-4 text-slate-400" />
                  </label>
                  <input type="text" className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white w-full" />
               </div>

               {/* GST Treatment & GSTIN (Added as requested) */}
               <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-6">
                  <label className="text-sm font-semibold text-red-500 flex items-center gap-1.5 mt-2">
                    GST Treatment* <Info className="w-4 h-4 text-slate-400" />
                  </label>
                  <div className="space-y-4">
                     <select className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white w-full">
                       <option>Registered Business - Regular</option>
                       <option>Registered Business - Composition</option>
                       <option>Unregistered Business</option>
                     </select>
                     
                     <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                       <label className="text-sm font-semibold text-red-500">GSTIN*</label>
                       <input type="text" placeholder="Ex: 29XXXXX9999X1ZX" className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
                     </div>
                  </div>
               </div>

               {/* MSME Registered */}
               <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6 pt-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    MSME Registered? <Info className="w-4 h-4 text-slate-400" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                    This vendor is MSME registered
                  </label>
               </div>

               {/* Currency */}
               <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6 pt-4">
                  <label className="text-sm font-semibold text-slate-700">Currency</label>
                  <select className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white w-full">
                    <option>INR - Indian Rupee</option>
                  </select>
               </div>
               
               {/* Payment Terms */}
               <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-6">
                  <label className="text-sm font-semibold text-slate-700 mt-2">Payment Terms</label>
                  <div className="space-y-4">
                     <select 
                       value={paymentStage} 
                       onChange={(e) => { setPaymentStage(e.target.value); setPaymentType(''); }} 
                       className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white w-full max-w-[200px]"
                     >
                       <option value="">Select Stage</option>
                       <option value="1st stage">1st stage</option>
                       <option value="2nd stage">2nd stage</option>
                       <option value="3rd stage">3rd stage</option>
                     </select>
                     
                     {paymentStage && (
                       <select 
                         value={paymentType} 
                         onChange={(e) => setPaymentType(e.target.value)} 
                         className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white w-full max-w-[200px] block"
                       >
                         <option value="">Select Type</option>
                         <option value="Advance">Advance</option>
                         <option value="Adhoc">Adhoc</option>
                         <option value="Before Advance">Before Advance</option>
                         <option value="After Advance">After Advance</option>
                       </select>
                     )}
                     
                     {paymentStage && paymentType && (
                       <div className="flex items-center space-x-2">
                         <input 
                           type="number" 
                           placeholder="Value" 
                           className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white w-[120px]" 
                         />
                         <select className="border border-slate-200 rounded-md px-2 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white w-[80px]">
                           <option value="%">%</option>
                           <option value="Amount">Amount</option>
                         </select>
                       </div>
                     )}
                  </div>
               </div>

               {/* TDS Section */}
               <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-6">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    TDS <HelpCircle className="w-4 h-4 text-slate-400" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                    Enable TDS for this vendor
                  </label>
               </div>

            </div>
          )}

          <div className="pb-16"></div>
        </div>
      </div>

      {/* Sticky Footer Area */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <div className="flex gap-3">
           <button className="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md shadow-sm transition-colors">
             Save
           </button>
           <button className="px-5 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors border border-slate-200">
             Cancel
           </button>
         </div>
      </div>
    </div>
  );
}
