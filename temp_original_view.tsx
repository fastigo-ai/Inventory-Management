"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Edit, MoreHorizontal, Paperclip, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getPurchaseOrderById } from '@/features/purchases/api/purchases.api';
import { API_BASE_URL } from "@/shared/api/axios";

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const res = await getPurchaseOrderById(id);
      if (res.success) {
        setOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch PO:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading Purchase Order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
          <p className="text-slate-500">The purchase order you're looking for doesn't exist or has been deleted.</p>
          <button onClick={() => router.push('/purchases/orders')} className="text-blue-500 hover:underline font-medium">
            Go back to Purchase Orders
          </button>
        </div>
      </div>
    );
  }

  const isSent = order.status === 'Sent';

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      {/* Top Header / Actions */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/purchases/orders')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-800">{order.purchaseOrderNumber}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${
                isSent ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {isSent && <CheckCircle2 className="w-3 h-3" />}
                {order.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{order.vendorName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button className="flex items-center justify-center p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors border border-transparent">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-8 justify-between">
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vendor Details</p>
                <p className="text-base font-semibold text-slate-800">{order.vendorName}</p>
                <p className="text-sm text-slate-600 mt-1">Delivery Address: <span className="font-medium text-slate-800">{order.deliveryAddressId || 'Head Office'}</span></p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-12 gap-y-4 flex-1">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Order Date</p>
                <p className="text-sm font-medium text-slate-800">{new Date(order.date).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Expected Delivery</p>
                <p className="text-sm font-medium text-slate-800">{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-GB') : '--'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reference#</p>
                <p className="text-sm font-medium text-slate-800">{order.reference || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Terms</p>
                <p className="text-sm font-medium text-slate-800">{order.paymentTerms || '--'}</p>
              </div>
            </div>
          </div>

          {/* Items Table Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
               <h2 className="font-bold text-slate-800">Order Items</h2>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-white border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Item Details</th>
                      <th className="px-6 py-3">Account</th>
                      <th className="px-6 py-3 text-right">Quantity</th>
                      <th className="px-6 py-3 text-right">Rate</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.lineItems.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{item.itemName}</p>
                          {item.tempCode && <p className="text-xs text-slate-500 mt-0.5">Code: {item.tempCode}</p>}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{item.account || '--'}</td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-slate-600">Γé╣ {item.rate.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-800">Γé╣ {item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>

          {/* Bottom Section: Notes & Totals */}
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left: Notes & Attachments */}
            <div className="flex-1 space-y-6">
               {(order.notes || order.termsConditions) && (
                 <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                   {order.notes && (
                     <div>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                       <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.notes}</p>
                     </div>
                   )}
                   {order.notes && order.termsConditions && <hr className="border-slate-100" />}
                   {order.termsConditions && (
                     <div>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Terms & Conditions</p>
                       <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.termsConditions}</p>
                     </div>
                   )}
                 </div>
               )}

               {order.attachments && order.attachments.length > 0 && (
                 <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                     <Paperclip className="w-4 h-4" /> Attachments ({order.attachments.length})
                   </p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     {order.attachments.map((file: any, i: number) => (
                       <a 
                         key={i} 
                         href={`${API_BASE_URL}${file.url}`} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
                       >
                         <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center shrink-0">
                           <Paperclip className="w-5 h-5 text-blue-600" />
                         </div>
                         <div className="overflow-hidden">
                           <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700">{file.name}</p>
                           <p className="text-xs text-slate-500">View Document</p>
                         </div>
                       </a>
                     ))}
                   </div>
                 </div>
               )}
            </div>

            {/* Right: Totals */}
            <div className="w-full lg:w-[350px]">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                 <div className="flex justify-between text-sm">
                   <span className="text-slate-600">Sub Total</span>
                   <span className="font-semibold text-slate-800">Γé╣ {order.subTotal.toFixed(2)}</span>
                 </div>
                 {order.discountAmount > 0 && (
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-600">Discount ({order.discountPercentage}%)</span>
                     <span className="font-semibold text-slate-800">- Γé╣ {order.discountAmount.toFixed(2)}</span>
                   </div>
                 )}
                 {order.taxAmount > 0 && (
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-600">{order.taxType} ({order.taxPercentage}%)</span>
                     <span className="font-semibold text-slate-800">- Γé╣ {order.taxAmount.toFixed(2)}</span>
                   </div>
                 )}
                 {order.adjustment !== 0 && (
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-600">Adjustment</span>
                     <span className="font-semibold text-slate-800">Γé╣ {order.adjustment.toFixed(2)}</span>
                   </div>
                 )}
                 <hr className="border-slate-200" />
                 <div className="flex justify-between text-base">
                   <span className="font-bold text-slate-800">Total Amount</span>
                   <span className="font-bold text-slate-900">Γé╣ {order.total.toFixed(2)}</span>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
