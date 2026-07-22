"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Edit, MoreHorizontal, Mail, FileText, ArrowDownToLine, PackageOpen, Plus, X, ChevronDown, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { getPurchaseOrderById, getPurchaseOrders, deletePurchaseOrder, updatePurchaseOrder } from '@/features/purchases/api/purchases.api';
import { getLocations } from '@/features/settings/api/locations.api';
import { getVendors } from '@/features/vendors/api/vendors.api';
import { numberToWords } from '@/shared/utils/numberToWords';
import { toast } from 'sonner';
import { AuditTimeline } from '@/shared/components/audit/AuditTimeline';
import { API_BASE_URL } from '@/shared/api/axios';
import { PdfPreview } from '@/shared/components/PdfPreview';

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  // UI States
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDeliveryDateModalOpen, setIsDeliveryDateModalOpen] = useState(false);
  const [isCancelItemsModalOpen, setIsCancelItemsModalOpen] = useState(false);
  
  // Temporary states for modals
  const [tempDeliveryDate, setTempDeliveryDate] = useState<string>('');
  const [tempCanceledItems, setTempCanceledItems] = useState<Set<number>>(new Set());
  const [isPdfView, setIsPdfView] = useState(true);

  useEffect(() => {
    fetchOrdersList();
    fetchVendorsAndLocations();
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

  const fetchVendorsAndLocations = async () => {
    try {
      const [locsRes, vendorsRes] = await Promise.all([
        getLocations(),
        getVendors({ limit: 5000 })
      ]);
      if (locsRes.success) {
        setLocationsList(locsRes.data);
      }
      if (vendorsRes) {
        setVendorsList(vendorsRes.vendors || vendorsRes.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch vendors/locations:', err);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const orderData = await getPurchaseOrderById(id);
      if (orderData) {
        setOrder(orderData);
        if (orderData.deliveryDate) {
          setTempDeliveryDate(new Date(orderData.deliveryDate).toISOString().split('T')[0]);
        }
        const canceled = new Set<number>();
        orderData.lineItems?.forEach((item: any, idx: number) => {
          if (item.isCanceled) canceled.add(idx);
        });
        setTempCanceledItems(canceled);
      }
    } catch (err) {
      console.error('Failed to fetch PO:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPaymentTerms = (terms: any) => {
    if (!terms) return '--';
    if (typeof terms === 'string') return terms;
    if (Array.isArray(terms)) {
      const validTerms = terms.filter((t: any) => t.stage && t.value);
      if (validTerms.length === 0) return '--';
      return (
        <ul className="list-disc list-inside space-y-1 mt-1">
          {validTerms.map((pt: any, idx: number) => (
            <li key={idx} className="text-xs text-slate-700">
              {pt.value}{pt.unit === 'Percentage' ? '%' : (pt.unit === 'Amount' ? '₹' : '')} {pt.type} on {pt.stage}
              {pt.remark && <span className="italic text-slate-500 ml-1">({pt.remark})</span>}
            </li>
          ))}
        </ul>
      );
    }
    return '--';
  };

  if (isLoading && !order) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-white border-b border-slate-200 gap-4 shrink-0 shadow-sm animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
            <div>
              <div className="w-48 h-6 bg-slate-200 rounded mb-2"></div>
              <div className="w-32 h-4 bg-slate-200 rounded"></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 h-9 bg-slate-200 rounded-md"></div>
            <div className="w-24 h-9 bg-slate-200 rounded-md"></div>
            <div className="w-24 h-9 bg-slate-200 rounded-md"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full space-y-6 animate-pulse">
          {/* Metadata Card Skeleton */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-8 justify-between">
            <div className="space-y-4 flex-1">
              <div>
                <div className="w-24 h-3 bg-slate-200 rounded mb-2"></div>
                <div className="w-32 h-5 bg-slate-200 rounded mb-2"></div>
                <div className="w-48 h-4 bg-slate-200 rounded"></div>
              </div>
              <div className="pt-2">
                <div className="w-20 h-3 bg-slate-200 rounded mb-2"></div>
                <div className="w-32 h-4 bg-slate-200 rounded mb-2"></div>
                <div className="w-48 h-4 bg-slate-200 rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 flex-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i}>
                  <div className="w-20 h-3 bg-slate-200 rounded mb-2"></div>
                  <div className="w-24 h-4 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Items Table Skeleton */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="w-24 h-5 bg-slate-200 rounded"></div>
            </div>
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="w-1/3 h-4 bg-slate-200 rounded"></div>
                  <div className="w-1/4 h-4 bg-slate-200 rounded"></div>
                  <div className="w-1/6 h-4 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
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

  const formatAddress = (addr: any) => {
    if (!addr) return null;
    if (typeof addr === 'string') return addr;
    const parts = [
      addr.attention,
      addr.street1,
      addr.street2,
      addr.city,
      addr.state ? `${addr.state} ${addr.zip || ''}`.trim() : addr.zip,
      addr.country
    ].filter(Boolean);
    return parts.length > 0 ? parts.join('\n') : null;
  };

  const selectedVendor = vendorsList.find(v => (v.dynamicData?.displayName || v.dynamicData?.companyName || v._id) === order.vendorName);
  const vendorBillingAddress = formatAddress(selectedVendor?.dynamicData?.vendorAddresses?.billing) || selectedVendor?.dynamicData?.billingAddress || selectedVendor?.dynamicData?.address || null;

  const selectedDeliveryLocation = locationsList.find(loc => loc.name === order.deliveryAddressId);
  const deliveryAddressStr = selectedDeliveryLocation?.address || null;

  const renderPhone = (phoneData: any) => {
    if (!phoneData) return null;
    if (typeof phoneData === 'string') return <p>{phoneData}</p>;
    
    const mobileStr = phoneData.mobile ? `${phoneData.mobileCountryCode || ''} ${phoneData.mobile}`.trim() : '';
    const workStr = phoneData.work ? `${phoneData.workCountryCode || ''} ${phoneData.work}`.trim() : '';
    
    if (mobileStr && workStr) {
      return (
        <>
          <p>M: {mobileStr}</p>
          <p>W: {workStr}</p>
        </>
      );
    }
    
    if (mobileStr) return <p>{mobileStr}</p>;
    if (workStr) return <p>{workStr}</p>;
    
    return null;
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this Purchase Order?')) return;
    try {
      await deletePurchaseOrder(id);
      toast.success('Purchase Order deleted');
      router.push('/purchases/orders');
    } catch (err) {
      toast.error('Failed to delete Purchase Order');
    }
  };

  const handleUpdateStatus = async (statusUpdates: any, successMessage: string) => {
    try {
      // In updatePurchaseOrder API, we need to pass the whole payload or just what we want to update.
      // But our updatePurchaseOrder expects CreatePurchaseOrderDto, which has required fields.
      // To be safe, we merge the existing order data.
      const payload = {
        ...order,
        ...statusUpdates
      };
      await updatePurchaseOrder(id, payload);
      toast.success(successMessage);
      fetchOrderDetails();
      fetchOrdersList();
      setIsMoreMenuOpen(false);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleClone = () => {
    router.push(`/purchases/orders/new?cloneId=${id}`);
  };

  const saveDeliveryDate = async () => {
    await handleUpdateStatus({ deliveryDate: tempDeliveryDate }, 'Delivery Date updated');
    setIsDeliveryDateModalOpen(false);
  };

  const saveCancelItems = async () => {
    const updatedLineItems = order.lineItems.map((item: any, idx: number) => ({
      ...item,
      isCanceled: tempCanceledItems.has(idx)
    }));
    
    const allCanceled = updatedLineItems.length > 0 && updatedLineItems.every((item: any) => item.isCanceled);
    const updates: any = { lineItems: updatedLineItems };
    
    if (allCanceled) {
      updates.status = 'Cancelled';
    } else if (order.status === 'Cancelled' && !allCanceled) {
      updates.status = 'Draft'; // Revert to Draft if not all are canceled
    }

    await handleUpdateStatus(updates, 'Items canceled successfully');
    setIsCancelItemsModalOpen(false);
  };

  const handleReopenCanceledItems = async () => {
    const updatedLineItems = order.lineItems.map((item: any) => ({
      ...item,
      isCanceled: false
    }));
    await handleUpdateStatus({ lineItems: updatedLineItems, status: 'Draft' }, 'Canceled items reopened successfully');
  };

  return (
    <div className="flex h-screen bg-slate-50 print:bg-white print:h-auto print:block">
      {/* Left Sidebar List */}
      <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col hidden md:flex h-screen sticky top-0 print:hidden">
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
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100/50 h-screen overflow-hidden print:bg-white print:overflow-visible print:h-auto print:block">
        {/* Top Header / Actions */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/purchases/orders')} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 md:hidden">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Location: {order.location || 'Head Office'}</p>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">{order.purchaseOrderNumber}</h1>
            </div>
            <div className="ml-8 flex space-x-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'details' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                History
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {order.status !== 'Cancelled' && (
              <>
                <button onClick={() => router.push(`/purchases/orders/${order._id}/edit`)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
                  <Mail className="w-3.5 h-3.5" /> Send Email
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
              </>
            )}
            
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
              <FileText className="w-3.5 h-3.5" /> PDF/Print <span className="text-[9px] ml-1">▼</span>
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            
            {order.status !== 'Cancelled' && (
              <>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
                  <PackageOpen className="w-3.5 h-3.5" /> Receive
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                {order.status !== 'Draft' && (
                  <>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
                      <ArrowDownToLine className="w-3.5 h-3.5" /> Convert to Bill <span className="text-[9px] ml-1">▼</span>
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                  </>
                )}
              </>
            )}
            <div className="relative">
              <button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className={`flex items-center justify-center p-1.5 text-slate-500 rounded transition-colors border border-transparent ${isMoreMenuOpen ? 'bg-slate-100' : 'hover:bg-slate-100'}`}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {isMoreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 text-xs font-medium text-slate-700">
                    {order.status === 'Cancelled' ? (
                      <>
                        <button onClick={handleReopenCanceledItems} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 transition-colors bg-blue-500/10 mb-1">
                          Reopen canceled items
                        </button>
                        <button onClick={handleClone} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                          Clone
                        </button>
                        <button onClick={handleDelete} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors text-slate-700">
                          Delete
                        </button>
                      </>
                    ) : order.status === 'Draft' ? (
                      <>
                        <button onClick={() => handleUpdateStatus({ status: 'Sent' }, 'Order marked as Issued')} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                          Mark as Issued
                        </button>
                        <button className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                          Convert to Bill
                        </button>
                        <button className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                          Create Receive
                        </button>
                        <button onClick={handleClone} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 transition-colors bg-blue-500/10">
                          Clone
                        </button>
                        <button onClick={handleDelete} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors text-slate-700">
                          Delete
                        </button>
                        <button onClick={() => handleUpdateStatus({ receiveStatus: 'Received' }, 'Order marked as Received')} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                          Mark as Received
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setIsDeliveryDateModalOpen(true); setIsMoreMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                          Expected Delivery Date
                        </button>
                        <button onClick={() => { setIsCancelItemsModalOpen(true); setIsMoreMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                          Cancel Items
                        </button>
                        <button onClick={() => handleUpdateStatus({ status: 'Cancelled' }, 'Order marked as Canceled')} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                          Mark as Canceled
                        </button>
                        <button onClick={handleClone} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                          Clone
                        </button>
                        <button onClick={handleDelete} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors text-slate-700">
                          Delete
                        </button>
                        
                        <div className="my-1 border-b border-slate-100"></div>
                        
                        {order.receiveStatus === 'Received' ? (
                          <button onClick={() => handleUpdateStatus({ receiveStatus: 'Yet To Be Received' }, 'Order marked as Unreceived')} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 transition-colors">
                            Mark as Unreceived
                          </button>
                        ) : (
                          <button onClick={() => handleUpdateStatus({ receiveStatus: 'Received' }, 'Order marked as Received')} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-600 transition-colors">
                            Mark as Received
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button onClick={() => router.push('/purchases/orders')} className="flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-20 scrollbar-thin scrollbar-thumb-slate-300 print:overflow-visible print:pb-0 print:block">
          
          {activeTab === 'history' ? (
            <div className="p-8 max-w-4xl mx-auto mt-6">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800 mb-8 border-b border-slate-100 pb-4">Audit History</h2>
                <AuditTimeline entityType="PurchaseOrder" entityId={id} />
              </div>
            </div>
          ) : (
            <>
              {/* WHAT'S NEXT Banner */}
          {order.status === 'Draft' && (
            <>
              <div className="max-w-[850px] mx-auto mt-6 px-4 print:hidden">
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✨</span>
                    <span className="text-sm text-slate-700">
                      <strong className="text-blue-900 font-bold">WHAT'S NEXT?</strong> Send this purchase order to your vendor or mark it as issued.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition-colors">Send Purchase Order</button>
                    <button onClick={() => handleUpdateStatus({ status: 'Sent' }, 'Order marked as Issued')} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded shadow-sm transition-colors">Mark as Issued</button>
                  </div>
                </div>
              </div>
              <div className="max-w-[850px] mx-auto mt-6 px-4 print:hidden">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="px-4 pt-3 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 border-b-2 border-blue-500 inline-block pb-3 -mb-[2px]">Receives</h3>
                  </div>
                  <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-1">
                    No items received yet! <span className="text-slate-400 cursor-help mx-1" title="You can track received items here.">?</span>
                    <button className="text-blue-600 font-medium hover:underline">New Purchase Invoice</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {order.status === 'Sent' && (
            <div className="max-w-[850px] mx-auto mt-6 px-4 print:hidden">
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
          )}

          <div className="max-w-[850px] mx-auto mt-6 px-4 flex items-center justify-between print:hidden">
              {order.status !== 'Draft' ? (
                <div className="text-[11px] font-bold text-slate-400">
                  Receive Status: <span className={`${order.receiveStatus === 'Received' ? 'text-green-500' : 'text-blue-500'} font-semibold uppercase`}>{order.receiveStatus === 'Received' ? 'RECEIVED' : (order.status === 'Sent' ? 'To Be Received' : 'Yet To Be Received')}</span> 
                  <span className="mx-2 text-slate-300">|</span> 
                  Bill Status: <span className="text-amber-500 font-semibold uppercase">Yet To Be Billed</span>
                </div>
              ) : (
                <div></div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer" onClick={() => setIsPdfView(!isPdfView)}>
                Show PDF View
                <div className={`w-8 h-4 rounded-full relative shadow-inner transition-colors ${isPdfView ? 'bg-blue-500' : 'bg-slate-300'}`}>
                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow transition-all ${isPdfView ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>
          </div>

          {order.lineItems?.filter((i: any) => i.isCanceled).length > 0 && (
            <div className="max-w-[850px] mx-auto mt-6 px-4 print:hidden">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">Canceled items</h3>
                    <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {order.lineItems.filter((i: any) => i.isCanceled).length}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                <div className="p-4 bg-slate-50">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-slate-600">Item Name</th>
                        <th className="px-2 py-2 text-left font-medium text-slate-600">Quantity Ordered</th>
                        <th className="px-2 py-2 text-left font-medium text-slate-600">Quantity canceled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.lineItems.filter((i: any) => i.isCanceled).map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-2 py-3 text-slate-800">{item.itemName}</td>
                          <td className="px-2 py-3 text-slate-600">{item.quantity} {item.unit ? `(${item.unit})` : ''}</td>
                          <td className="px-2 py-3 text-slate-600">{item.quantity} {item.unit ? `(${item.unit})` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Conditional View Rendering */}
          {isPdfView ? (
            <>
            <div className="max-w-[800px] mx-auto bg-white shadow-[0_0_15px_rgba(0,0,0,0.05)] rounded-sm min-h-[1056px] mt-4 mb-12 relative overflow-hidden border border-slate-200 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-full print:overflow-visible print:min-h-0">
            
            {/* Draft/Issued Ribbon */}
            <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden z-10 pointer-events-none">
              <div className={`absolute top-5 -left-9 w-36 text-white text-[10px] font-bold text-center py-1 -rotate-45 shadow-md uppercase tracking-wider ${order.status === 'Cancelled' ? 'bg-slate-700' : isSent ? 'bg-blue-500' : 'bg-slate-400'}`}>
                {order.status === 'Cancelled' ? 'CANCELLED' : isSent ? 'ISSUED' : 'DRAFT'}
              </div>
            </div>

            <div className="px-6 py-12 md:px-8">
              {/* Header */}
              <div className="flex justify-between items-start pb-6 mb-8">
                <div className="flex flex-col gap-2">
                  {order.billingCompany?.logoUrl ? (
                    <img src={order.billingCompany.logoUrl} alt={order.billingCompany.name} className="h-16 object-contain self-start" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <img src="/logoholistic.png" alt="Holistic Logo" className="h-16 object-contain self-start" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-light text-slate-800 uppercase tracking-widest mb-1">Purchase Order</h2>
                  <p className="text-slate-600 text-sm font-medium">#{order.purchaseOrderNumber}</p>
                </div>
              </div>

              {/* Billing Company Address */}
              <div className="text-[11px] text-slate-600 space-y-0.5 mb-8">
                <p className="font-bold text-slate-800 text-xs">{order.billingCompany?.name || 'Holistic Techno'}</p>
                {order.billingCompany?.address ? (
                  <div className="whitespace-pre-wrap">{order.billingCompany.address}</div>
                ) : (
                  <>
                    <p>Uttar Pradesh</p>
                    <p>India</p>
                  </>
                )}
                {order.billingCompany?.phone ? <p>{order.billingCompany.phone}</p> : (!order.billingCompany && <p>95655954341</p>)}
                {order.billingCompany?.email ? <p className="text-blue-600">{order.billingCompany.email}</p> : (!order.billingCompany && <p className="text-blue-600">info@holistic.co</p>)}
              </div>

              {/* Vendor and Deliver To */}
              <div className="grid grid-cols-2 gap-12 mb-10">
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Vendor Address</p>
                  <p className="font-bold text-blue-600 text-xs">{order.vendorName}</p>
                  {vendorBillingAddress ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{vendorBillingAddress}</div>
                  ) : (
                    <p className="italic text-slate-400">No address provided</p>
                  )}
                  {renderPhone(selectedVendor?.dynamicData?.phone)}
                </div>
                
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">Deliver To</p>
                  <p className="font-bold text-slate-800 text-xs">{order.deliveryAddressId || 'Head Office'}</p>
                  {deliveryAddressStr ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{deliveryAddressStr}</div>
                  ) : (
                    <p className="italic text-slate-400">No address provided</p>
                  )}
                  {renderPhone(selectedDeliveryLocation?.phone)}
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
              <table className="w-full text-[11px] mb-6 border border-slate-200">
                <thead className="bg-[#fcfdff] border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-center font-bold text-[#5e7790] uppercase w-10 border-r border-slate-200">SR.NO</th>
                    <th className="px-3 py-2 text-left font-bold text-[#5e7790] uppercase border-r border-slate-200">TEMP CODE</th>
                    <th className="px-3 py-2 text-left font-bold text-[#5e7790] uppercase border-r border-slate-200">DESCRIPTION</th>
                    <th className="px-3 py-2 text-left font-bold text-[#5e7790] uppercase border-r border-slate-200">NAME</th>
                    <th className="px-3 py-2 text-left font-bold text-[#5e7790] uppercase border-r border-slate-200">PACKAGE</th>
                    <th className="px-3 py-2 text-left font-bold text-[#5e7790] uppercase border-r border-slate-200">CIRCLE</th>
                    <th className="px-3 py-2 text-center font-bold text-[#5e7790] uppercase border-r border-slate-200">UNIT</th>
                    <th className="px-3 py-2 text-right font-bold text-[#5e7790] uppercase border-r border-slate-200 w-16">QTY</th>
                    <th className="px-3 py-2 text-right font-bold text-[#5e7790] uppercase border-r border-slate-200 w-20">RATE</th>
                    <th className="px-3 py-2 text-right font-bold text-[#5e7790] uppercase w-24">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lineItems.map((item: any, idx: number) => (
                    <tr key={idx} className={`border-b border-slate-200 last:border-b-0 ${item.isCanceled ? 'opacity-50 line-through bg-slate-50' : ''}`}>
                      <td className="px-3 py-3 text-center text-slate-600 align-top border-r border-slate-200">{idx + 1}</td>
                      <td className="px-3 py-3 text-slate-600 align-top border-r border-slate-200">{item.tempCode || '--'}</td>
                      <td className="px-3 py-3 text-slate-600 align-top border-r border-slate-200 whitespace-pre-wrap">{item.description || '--'}</td>
                      <td className="px-3 py-3 font-medium text-slate-800 align-top border-r border-slate-200">{item.itemName}</td>
                      <td className="px-3 py-3 text-slate-600 align-top border-r border-slate-200">{item.package || '--'}</td>
                      <td className="px-3 py-3 text-slate-600 align-top border-r border-slate-200">{item.circle || '--'}</td>
                      <td className="px-3 py-3 text-center text-slate-600 align-top border-r border-slate-200">{item.unit || 'Nos'}</td>
                      <td className="px-3 py-3 text-right text-slate-800 align-top border-r border-slate-200">{item.quantity}</td>
                      <td className="px-3 py-3 text-right text-slate-800 align-top border-r border-slate-200">{item.rate.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-bold text-slate-800 align-top">{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-10">
                <div className="w-80 space-y-3 text-[11px]">
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
                  {order.circle && (
                    <div className="flex">
                      <span className="w-32 text-slate-500 font-medium">Circle</span>
                      <span className="font-semibold text-slate-800">: {order.circle}</span>
                    </div>
                  )}
                  {order.package && (
                    <div className="flex">
                      <span className="w-32 text-slate-500 font-medium">Package</span>
                      <span className="font-semibold text-slate-800">: {order.package}</span>
                    </div>
                  )}
                  {order.lineItems[0]?.loaSerialNo && (
                    <div className="flex">
                      <span className="w-32 text-slate-500 font-medium">LOA Serial No</span>
                      <span className="font-semibold text-slate-800">: {order.lineItems[0].loaSerialNo}</span>
                    </div>
                  )}
                  {(order.paymentTerms || order.paymentTermStage || order.paymentTermType || order.paymentTermAmount) && (
                    <div className="flex items-start">
                      <span className="w-32 text-slate-500 font-medium">Payment Terms</span>
                      <div className="font-semibold text-slate-800 flex items-start gap-1">
                        <span>:</span>
                        <div>{renderPaymentTerms(order.paymentTerms)}</div>
                      </div>
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

          {/* Attachments Page (Rendered below main PDF view) */}
          {order.attachments && order.attachments.length > 0 && (
            <div className="max-w-[800px] mx-auto bg-white shadow-[0_0_15px_rgba(0,0,0,0.05)] rounded-sm mt-4 mb-12 px-6 py-12 md:px-8 border border-slate-200 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-full print:break-before-page">
              <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-wider border-b border-slate-200 pb-2">Attachments</h3>
              <div className="flex flex-col gap-8">
                {order.attachments.map((attachment: any, idx: number) => {
                  const isImage = attachment.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
                  const isPdf = attachment.url.match(/\.pdf$/i) != null;
                  return (
                    <div key={idx} className="flex flex-col gap-4 print:break-inside-avoid print:break-before-page">
                      <a href={`${API_BASE_URL}${attachment.url}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-2">
                        <Paperclip className="w-4 h-4" /> {attachment.name}
                      </a>
                      {isImage ? (
                        <img src={`${API_BASE_URL}${attachment.url}`} alt={attachment.name} className="max-w-full max-h-[1000px] object-contain border border-slate-200 rounded p-1 print:max-h-none print:border-none" />
                      ) : isPdf ? (
                        <PdfPreview fileUrl={`${API_BASE_URL}${attachment.url}`} />
                      ) : (
                        <div className="w-full h-24 bg-slate-50 border border-slate-200 rounded flex flex-col items-center justify-center p-4 text-center text-slate-400">
                          <span className="text-xs">Document Preview not available. Please click the link above to view/download.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>
          ) : (
            /* Normal Dashboard View */
            <div className="max-w-5xl mx-auto space-y-6 mt-4 mb-12 px-4 print:hidden">
              {/* Metadata Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-8 justify-between">
                <div className="space-y-4 flex-1">
                  {order.billingCompany && (
                    <div className="pb-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing From</p>
                      <div className="flex items-center gap-3 mb-1">
                        {order.billingCompany.logoUrl && (
                          <img src={order.billingCompany.logoUrl} alt={order.billingCompany.name} className="w-8 h-8 object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        )}
                        <p className="text-base font-semibold text-slate-800">{order.billingCompany.name}</p>
                      </div>
                      <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mb-1">{order.billingCompany.address}</div>
                      {order.billingCompany.phone && <p className="text-sm text-slate-500">{order.billingCompany.phone}</p>}
                    </div>
                  )}
                  
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vendor Details</p>
                    <p className="text-base font-semibold text-blue-600 mb-1">{order.vendorName}</p>
                    {vendorBillingAddress ? (
                      <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mb-1">{vendorBillingAddress}</div>
                    ) : (
                      <p className="text-sm italic text-slate-400 mb-1">No address provided</p>
                    )}
                    {renderPhone(selectedVendor?.dynamicData?.phone)}
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Deliver To</p>
                    <p className="text-sm font-semibold text-slate-800 mb-1">{order.deliveryAddressId || 'Head Office'}</p>
                    {deliveryAddressStr ? (
                      <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed mb-1">{deliveryAddressStr}</div>
                    ) : (
                      <p className="text-sm italic text-slate-400 mb-1">No address provided</p>
                    )}
                    {renderPhone(selectedDeliveryLocation?.phone)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 flex-1">
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
                    <div className="text-sm font-medium text-slate-800">{renderPaymentTerms(order.paymentTerms)}</div>
                  </div>
                  {order.package && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Package</p>
                      <p className="text-sm font-medium text-slate-800">{order.package}</p>
                    </div>
                  )}
                  {order.circle && (
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Circle</p>
                      <p className="text-sm font-medium text-slate-800">{order.circle}</p>
                    </div>
                  )}
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
                          <th className="px-6 py-3">#</th>
                          <th className="px-6 py-3">Item Details</th>
                          <th className="px-6 py-3">Account</th>
                          <th className="px-6 py-3">Package</th>
                          <th className="px-6 py-3">Circle</th>
                          <th className="px-6 py-3 text-right">Quantity</th>
                          <th className="px-6 py-3 text-right">Rate</th>
                          <th className="px-6 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.lineItems.map((item: any, idx: number) => (
                          <tr key={idx} className={`hover:bg-slate-50 transition-colors ${item.isCanceled ? 'opacity-50 bg-slate-50' : ''}`}>
                            <td className="px-6 py-4 text-slate-500">{idx + 1}</td>
                            <td className="px-6 py-4">
                              <p className={`font-medium text-slate-800 flex items-center gap-2 ${item.isCanceled ? 'line-through' : ''}`}>
                                {item.itemName} 
                                {item.isCanceled && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase no-underline">Canceled</span>}
                              </p>
                              {item.tempCode && <p className="text-xs text-slate-500 mt-0.5">Code: {item.tempCode}</p>}
                              {item.description && <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{item.description}</p>}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{item.account || '--'}</td>
                            <td className="px-6 py-4 text-slate-600">{item.package || '--'}</td>
                            <td className="px-6 py-4 text-slate-600">{item.circle || '--'}</td>
                            <td className="px-6 py-4 text-right font-medium text-slate-800">{item.quantity} <span className="text-xs text-slate-500 font-normal">{item.unit || 'Nos'}</span></td>
                            <td className="px-6 py-4 text-right text-slate-600">₹ {item.rate.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-800">₹ {item.amount.toFixed(2)}</td>
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
                  {/* Notes & Terms */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.notes || '--'}</p>
                    </div>
                    <hr className="border-slate-100" />
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Terms & Conditions</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.termsConditions || '--'}</p>
                    </div>
                  </div>

                  {order.attachments && order.attachments.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Paperclip className="w-4 h-4" /> Attachments ({order.attachments.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {order.attachments.map((file: any, i: number) => (
                          <a 
                            key={i} 
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${file.url}`} 
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

                  {/* Custom Fields */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Custom Fields</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {order.lineItems[0]?.circle && (
                        <div>
                          <span className="block text-slate-500 text-xs mb-0.5">Circle</span>
                          <span className="font-medium text-slate-800">{order.lineItems[0].circle}</span>
                        </div>
                      )}
                      {order.lineItems[0]?.package && (
                        <div>
                          <span className="block text-slate-500 text-xs mb-0.5">Package</span>
                          <span className="font-medium text-slate-800">{order.lineItems[0].package}</span>
                        </div>
                      )}
                      {order.lineItems[0]?.loaSerialNo && (
                        <div>
                          <span className="block text-slate-500 text-xs mb-0.5">LOA Serial No</span>
                          <span className="font-medium text-slate-800">{order.lineItems[0].loaSerialNo}</span>
                        </div>
                      )}
                      {(order.paymentTerms || order.paymentTermStage || order.paymentTermType || order.paymentTermAmount) && (
                        <div>
                          <span className="block text-slate-500 text-xs mb-0.5">Payment Terms</span>
                          <div className="font-medium text-slate-800">{renderPaymentTerms(order.paymentTerms)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Totals */}
                <div className="w-full lg:w-[380px]">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sub Total</span>
                      <span className="font-semibold text-slate-800">₹ {(order.subTotal || 0).toFixed(2)}</span>
                    </div>
                    {(order.discountAmount || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Discount ({order.discountPercentage || 0}%)</span>
                        <span className="font-semibold text-slate-800">- ₹ {order.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-slate-600">Freight & Insurance</span>
                      <span className="font-semibold text-slate-800">₹ {freightAmount.toFixed(2)}</span>
                    </div>

                    {(order.cgstPercentage || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">CGST ({order.cgstPercentage}%)</span>
                        <span className="font-semibold text-slate-800">₹ {(taxableAmountForGst * ((order.cgstPercentage || 0) / 100)).toFixed(2)}</span>
                      </div>
                    )}

                    {(order.sgstPercentage || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">SGST ({order.sgstPercentage}%)</span>
                        <span className="font-semibold text-slate-800">₹ {(taxableAmountForGst * ((order.sgstPercentage || 0) / 100)).toFixed(2)}</span>
                      </div>
                    )}

                    {(order.igstPercentage || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">IGST ({order.igstPercentage}%)</span>
                        <span className="font-semibold text-slate-800">₹ {(taxableAmountForGst * ((order.igstPercentage || 0) / 100)).toFixed(2)}</span>
                      </div>
                    )}

                    {(order.taxAmount || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">{order.taxType || 'TDS/TCS'} ({order.taxPercentage || 0}%)</span>
                        <span className="font-semibold text-slate-800">- ₹ {order.taxAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {(order.adjustment || 0) !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Adjustment</span>
                        <span className="font-semibold text-slate-800">₹ {order.adjustment.toFixed(2)}</span>
                      </div>
                    )}
                    <hr className="border-slate-200" />
                    <div className="flex justify-between text-base">
                      <span className="font-bold text-slate-800">Total Amount</span>
                      <span className="font-bold text-slate-900">₹ {(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Total In Words */}
                  <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
                    <p className="mb-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Total In Words</p>
                    <p className="font-bold italic text-slate-700 text-sm">{numberToWords(order.total)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {isDeliveryDateModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Expected Delivery Date</h3>
              <button onClick={() => setIsDeliveryDateModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              <input type="date" value={tempDeliveryDate} onChange={(e) => setTempDeliveryDate(e.target.value)} className="w-full border border-slate-200 rounded p-2 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsDeliveryDateModalOpen(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors">Cancel</button>
              <button onClick={saveDeliveryDate} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {isCancelItemsModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-semibold text-slate-800">Cancel Items</h3>
              <button onClick={() => setIsCancelItemsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded mb-4">
                <strong>Warning:</strong> Canceling items cannot be reversed. Please be sure before applying cancellation.
              </div>
              <p className="text-xs text-slate-500 mb-3">Select the items you want to mark as canceled.</p>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left w-10"></th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Item</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lineItems.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <input 
                            type="checkbox" 
                            checked={tempCanceledItems.has(idx)}
                            onChange={(e) => {
                              const newSet = new Set(tempCanceledItems);
                              if (e.target.checked) newSet.add(idx);
                              else newSet.delete(idx);
                              setTempCanceledItems(newSet);
                            }}
                            className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-800 font-medium">{item.itemName}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.rate.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
              <button onClick={() => setIsCancelItemsModalOpen(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors">Close</button>
              <button onClick={saveCancelItems} className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors">Apply Cancellation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
