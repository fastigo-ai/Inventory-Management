"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Edit, MoreHorizontal, Mail, FileText, ArrowDownToLine, PackageOpen, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { getPurchaseOrderById, getPurchaseOrders } from '@/features/purchases/api/purchases.api';
import { numberToWords } from '@/shared/utils/numberToWords';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrdersList();
  }, []);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrdersList = async () => {
    try {
      const res = await getPurchaseOrders();
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch PO list:', err);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const orderData = await getPurchaseOrderById(id);
      if (orderData) {
        setOrder(orderData);
      }
    } catch (err) {
      console.error('Failed to fetch PO:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !order) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading Purchase Order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
          <p className="text-slate-500">The purchase order you're looking for doesn't exist.</p>
          <button onClick={() => router.push('/purchases/orders')} className="text-blue-500 hover:underline font-medium">
            Go back to Purchase Orders
          </button>
        </div>
      </div>
    );
  }

  // Calculations for display
  const subTotal = order.subTotal || 0;
  const discountAmount = (subTotal * (order.discountPercentage || 0)) / 100;
  let freightAmount = 0;
  if (order.freightInsuranceType === 'Exclusive') {
    if (order.freightInsuranceValueType === 'Percentage') {
      freightAmount = ((subTotal - discountAmount) * (order.freightInsuranceAmount || 0)) / 100;
    } else {
      freightAmount = Number(order.freightInsuranceAmount || 0);
    }
  }
  const taxableAmountForGst = subTotal - discountAmount + freightAmount;

  const isSent = order.status === 'Sent' || order.status === 'Issued';

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar List */}
      <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-3 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-1 cursor-pointer">
            All Purchase Or... <span className="text-[10px] text-slate-400 ml-1">▼</span>
          </h2>
          <div className="flex gap-2">
            <button onClick={() => router.push('/purchases/orders/new')} className="bg-blue-500 text-white rounded p-1.5 hover:bg-blue-600 transition shadow-sm">
              <Plus className="w-4 h-4" />
            </button>
            <button className="border border-slate-200 rounded p-1.5 text-slate-500 hover:bg-slate-50 transition shadow-sm bg-white">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {orders.map(o => (
            <Link key={o._id} href={`/purchases/orders/${o._id}`} className={`block border-b border-slate-100 p-4 hover:bg-slate-50/80 transition-colors ${o._id === id ? 'bg-blue-50/30 relative' : ''}`}>
               {o._id === id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
               <div className="flex items-start gap-3">
                 <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-blue-500 w-3.5 h-3.5 cursor-pointer" onClick={(e) => e.stopPropagation()} />
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start mb-1.5">
                     <p className="text-[13px] font-semibold text-slate-700 truncate pr-2" title={o.vendorName}>{o.vendorName}</p>
                     <p className="text-[13px] font-bold text-slate-800 whitespace-nowrap">₹{o.total.toFixed(2)}</p>
                   </div>
                   <div className="flex justify-between items-center text-[11px] text-slate-500 mb-2">
                     <p>{o.purchaseOrderNumber} &nbsp;•&nbsp; {new Date(o.date).toLocaleDateString('en-GB')}</p>
                   </div>
                   <div>
                     <span className={`text-[10px] font-bold uppercase ${o.status === 'Sent' || o.status === 'Issued' ? 'text-blue-500' : 'text-slate-400'}`}>
                       {o.status === 'Sent' ? 'ISSUED' : o.status}
                     </span>
                   </div>
                 </div>
               </div>
            </Link>
          ))}
          {orders.length === 0 && (
             <div className="p-4 text-center text-sm text-slate-500">No orders found.</div>
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100/50 h-screen overflow-hidden">
        {/* Top Header / Actions */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/purchases/orders')} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 md:hidden">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Location: {order.location || 'Head Office'}</p>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">{order.purchaseOrderNumber}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => router.push(`/purchases/orders/${order._id}/edit`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
              <Mail className="w-3.5 h-3.5" /> Send Email
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
              <FileText className="w-3.5 h-3.5" /> PDF/Print <span className="text-[9px] ml-1">▼</span>
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
              <PackageOpen className="w-3.5 h-3.5" /> Receive
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
              <ArrowDownToLine className="w-3.5 h-3.5" /> Convert to Bill <span className="text-[9px] ml-1">▼</span>
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button className="flex items-center justify-center p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors border border-transparent">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button onClick={() => router.push('/purchases/orders')} className="flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-20 scrollbar-thin scrollbar-thumb-slate-300">
          
          {/* WHAT'S NEXT Banner */}
          <div className="max-w-[850px] mx-auto mt-6 px-4">
            <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">💡</span>
                <span className="text-sm text-slate-700">
                  <strong className="text-blue-900 font-bold">WHAT'S NEXT?</strong> Convert it to a bill or create a receive to complete your purchase.
                </span>
              </div>
              <div className="flex gap-2">
                <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition-colors">Convert to Bill</button>
                <button className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded shadow-sm transition-colors">Receive</button>
              </div>
            </div>
          </div>

          <div className="max-w-[850px] mx-auto mt-6 px-4 flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-400">
                Receive Status: <span className="text-blue-500 font-semibold uppercase">{order.status === 'Sent' ? 'To Be Received' : 'Yet To Be Received'}</span> 
                <span className="mx-2 text-slate-300">|</span> 
                Bill Status: <span className="text-amber-500 font-semibold uppercase">Yet To Be Billed</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                Show PDF View
                <div className="w-8 h-4 bg-blue-500 rounded-full relative cursor-pointer shadow-inner">
                  <div className="w-3 h-3 bg-white rounded-full absolute top-0.5 right-0.5 shadow"></div>
                </div>
              </div>
          </div>

          {/* PDF Document Container */}
          <div className="max-w-[800px] mx-auto bg-white shadow-[0_0_15px_rgba(0,0,0,0.05)] rounded-sm min-h-[1056px] mt-4 mb-12 relative overflow-hidden border border-slate-200">
            
            {/* Draft/Issued Ribbon */}
            <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden z-10 pointer-events-none">
              <div className={`absolute top-5 -left-9 w-36 text-white text-[10px] font-bold text-center py-1 -rotate-45 shadow-md uppercase tracking-wider ${isSent ? 'bg-blue-500' : 'bg-slate-400'}`}>
                {isSent ? 'ISSUED' : 'DRAFT'}
              </div>
            </div>

            <div className="p-12">
              {/* Header */}
              <div className="flex justify-between items-start pb-6 mb-8">
                <div className="flex flex-col gap-2">
                  <img src="/logoholistic.png" alt="Holistic Logo" className="h-16 object-contain self-start" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-light text-slate-800 uppercase tracking-widest mb-1">Purchase Order</h2>
                  <p className="text-slate-600 text-sm font-medium">#{order.purchaseOrderNumber}</p>
                </div>
              </div>

              {/* Holistic Address */}
              <div className="text-[11px] text-slate-600 space-y-0.5 mb-8">
                <p className="font-bold text-slate-800 text-xs">Holistic Techno</p>
                <p>Uttar Pradesh</p>
                <p>India</p>
                <p>95655954341</p>
                <p className="text-blue-600">info@holistic.co</p>
              </div>

              {/* Vendor and Deliver To */}
              <div className="grid grid-cols-2 gap-12 mb-10">
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Vendor Address</p>
                  <p className="font-bold text-blue-600 text-xs">{order.vendorName}</p>
                  <p>C-3/A, THIRD FLOOR, OFFICE NO-308-309, MS CHAMBERS, ARUNA</p>
                  <p>PARK, Laxmi Park</p>
                  <p>New Delhi</p>
                  <p>110092</p>
                  <p>India</p>
                </div>
                
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Deliver To</p>
                  <p className="font-bold text-slate-800 text-xs">{order.deliveryAddressId || 'Head Office'}</p>
                  <p>Uttar Pradesh</p>
                  <p>India</p>
                  <p>95655954341</p>
                  <p className="text-blue-600">info@holistic.co</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex justify-end mb-4">
                <div className="text-[11px] flex gap-12">
                  <span className="font-bold text-slate-400">Date :</span>
                  <span className="font-semibold text-slate-800">{new Date(order.date).toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-[11px] mb-6">
                <thead className="bg-[#242424] text-white">
                  <tr>
                    <th className="px-3 py-2 text-center font-semibold w-10">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Item & Description</th>
                    <th className="px-3 py-2 text-right font-semibold w-24">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold w-24">Rate</th>
                    <th className="px-3 py-2 text-right font-semibold w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lineItems.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="px-3 py-4 text-center text-slate-600 align-top">{idx + 1}</td>
                      <td className="px-3 py-4 align-top">
                        <p className="font-bold text-slate-800">{item.itemName}</p>
                        {(item.description || item.tempCode) && (
                           <p className="text-slate-500 mt-1 whitespace-pre-wrap">{item.description || item.tempCode}</p>
                        )}
                      </td>
                      <td className="px-3 py-4 text-right text-slate-800 align-top">{item.quantity} {item.unit || 'Nos'}</td>
                      <td className="px-3 py-4 text-right text-slate-800 align-top">{item.rate.toFixed(2)}</td>
                      <td className="px-3 py-4 text-right font-bold text-slate-800 align-top">{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-10">
                <div className="w-64 space-y-3 text-[11px]">
                  <div className="flex justify-between text-slate-600 px-2">
                    <span>Sub Total</span>
                    <span>{order.subTotal?.toFixed(2) || '0.00'}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 px-2">
                    <span>Discount ({order.discountPercentage || 0}%)</span>
                    <span>-{discountAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-slate-600 px-2">
                    <span>Freight & Insurance</span>
                    <span>{freightAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 px-2">
                    <span>CGST ({order.cgstPercentage || 0}%)</span>
                    <span>{(taxableAmountForGst * ((order.cgstPercentage || 0) / 100)).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 px-2">
                    <span>SGST ({order.sgstPercentage || 0}%)</span>
                    <span>{(taxableAmountForGst * ((order.sgstPercentage || 0) / 100)).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 px-2">
                    <span>IGST ({order.igstPercentage || 0}%)</span>
                    <span>{(taxableAmountForGst * ((order.igstPercentage || 0) / 100)).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 px-2">
                    <span>{order.taxType || 'TDS/TCS'} ({order.taxPercentage || 0}%)</span>
                    <span>-{order.taxAmount?.toFixed(2) || '0.00'}</span>
                  </div>

                  <div className="flex justify-between text-slate-600 px-2">
                    <span>Adjustment</span>
                    <span>{order.adjustment?.toFixed(2) || '0.00'}</span>
                  </div>

                  <div className="flex justify-between font-bold text-slate-800 py-2 border-y border-slate-200 px-2 bg-slate-50/50">
                    <span>Total</span>
                    <span>₹ {order.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-end justify-between mb-16">
                {/* Total In Words */}
                <div className="text-[11px] text-slate-600 flex-1">
                  <p className="mb-1 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Total In Words</p>
                  <p className="font-bold italic text-slate-800">{numberToWords(order.total)}</p>
                </div>

                {/* Authorized Signature */}
                <div className="text-[11px] text-slate-600 text-center w-64 pt-8">
                  <div className="border-b border-slate-800 w-full mb-1"></div>
                  <span className="font-semibold text-slate-500">Authorized Signature</span>
                </div>
              </div>

              <div className="text-center mt-16 text-[10px] text-slate-400">
                PDF Template : "Standard Template" <span className="text-blue-500 cursor-pointer hover:underline ml-1">Change</span>
              </div>
              
              {/* Custom Fields */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-[10px] font-bold text-slate-800 mb-4 uppercase tracking-wider">Custom Fields</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-[11px]">
                  {order.lineItems[0]?.circle && (
                    <div className="flex">
                      <span className="w-32 text-slate-500 font-medium">Circle</span>
                      <span className="font-semibold text-slate-800">: {order.lineItems[0].circle}</span>
                    </div>
                  )}
                  {order.lineItems[0]?.package && (
                    <div className="flex">
                      <span className="w-32 text-slate-500 font-medium">Package</span>
                      <span className="font-semibold text-slate-800">: {order.lineItems[0].package}</span>
                    </div>
                  )}
                  {order.lineItems[0]?.loaSerialNo && (
                    <div className="flex">
                      <span className="w-32 text-slate-500 font-medium">LOA Serial No</span>
                      <span className="font-semibold text-slate-800">: {order.lineItems[0].loaSerialNo}</span>
                    </div>
                  )}
                  {(order.paymentTerms || order.paymentTermStage || order.paymentTermType || order.paymentTermAmount) && (
                    <div className="flex">
                      <span className="w-32 text-slate-500 font-medium">Payment Terms</span>
                      <span className="font-semibold text-slate-800">: {order.paymentTerms || `${order.paymentTermStage || ''} ${order.paymentTermType || ''} ${order.paymentTermAmount || ''}`.trim()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes and Terms */}
              <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px]">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-800 mb-2 uppercase tracking-wider">Notes</h3>
                  <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{order.notes || '--'}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold text-slate-800 mb-2 uppercase tracking-wider">Terms & Conditions</h3>
                  <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{order.termsConditions || '--'}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
