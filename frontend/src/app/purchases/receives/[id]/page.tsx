"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getPurchaseReceiveById, deletePurchaseReceive, getPurchaseReceives } from '@/features/purchases/api/purchases.api';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Edit, Trash2, Printer, FileText, CheckCircle2, AlertCircle, Clock, Banknote, HelpCircle, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { AuditTimeline } from '@/shared/components/audit/AuditTimeline';
import { PdfPreview } from '@/shared/components/PdfPreview';
import { numberToWords } from '@/shared/utils/numberToWords';
import { API_BASE_URL } from '@/shared/api/axios';

export default function PurchaseReceiveDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [invoice, setInvoice] = useState<any>(null);
  const [receives, setReceives] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [isPdfView, setIsPdfView] = useState(true);

  useEffect(() => {
    const fetchReceives = async () => {
      try {
        const res = await getPurchaseReceives();
        setReceives(res.data?.prs || []);
      } catch (err) {
        console.error('Failed to fetch receives list:', err);
      }
    };
    fetchReceives();
  }, []);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setIsLoading(true);
        const data = await getPurchaseReceiveById(id);
        
        // Ensure billingCompany is populated if it's missing but billingFrom is present
        if (data && !data.billingCompany && data.billingFrom) {
           const { getBillingCompanies } = await import('@/features/settings/api/billingCompanies.api');
           const res = await getBillingCompanies();
           const company = (res.data || []).find((c: any) => c.name === data.billingFrom);
           if (company) {
             data.billingCompany = company;
           }
        }

        // Fetch vendor details to display address, phone, and GST
        if (data && data.vendorName) {
           const { getVendors } = await import('@/features/vendors/api/vendors.api');
           try {
             const vendorsRes = await getVendors({ limit: 5000 });
             const vendorsList = vendorsRes.vendors || vendorsRes.items || vendorsRes.data || [];
             const vendor = vendorsList.find((v: any) => (v.dynamicData?.companyName || v.dynamicData?.displayName || v.name || v._id) === data.vendorName);
             if (vendor) {
               data.vendorAddress = vendor.dynamicData?.address || vendor.dynamicData?.billingAddress || vendor.dynamicData?.['billing.street1'] || '-';
               const phoneObj = vendor.dynamicData?.phone || vendor.dynamicData?.mobile;
               let phoneStr = '-';
               if (typeof phoneObj === 'string') {
                 phoneStr = phoneObj;
               } else if (typeof phoneObj === 'object' && phoneObj !== null) {
                 phoneStr = phoneObj.work || phoneObj.mobile || '-';
               } else {
                 phoneStr = vendor.dynamicData?.['phone.work'] || vendor.dynamicData?.['phone.mobile'] || '-';
               }
               data.vendorPhone = phoneStr;
               data.vendorGst = vendor.dynamicData?.gstNumber || vendor.dynamicData?.gstin || vendor.dynamicData?.taxId || '-';
             }
           } catch (e) {
             console.error("Failed to fetch vendors", e);
           }
        }
        
        // Calculate totals if missing
        if (data) {
          data.subTotal = data.lineItems?.reduce((acc: number, item: any) => {
             const qty = item.totalInvoiceQuantity ?? item.invoiceQuantity ?? item.quantity ?? 0;
             return acc + (qty * item.rate);
          }, 0) || 0;
          data.taxAmount = data.lineItems?.reduce((acc: number, item: any) => {
             const qty = item.totalInvoiceQuantity ?? item.invoiceQuantity ?? item.quantity ?? 0;
             const itemAmount = qty * (item.rate || 0);
             const taxRate = item.gstType === 'Intra State' ? ((item.cgst || 0) + (item.sgst || 0)) : (item.igst || 0);
             return acc + ((itemAmount * taxRate) / 100);
          }, 0) || 0;
          data.invoiceNumber = data.purchaseReceiveNumber;
          data.date = data.receiveDate;
        }

        setInvoice(data);
      } catch (err) {
        console.error('Failed to fetch receive:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchInvoice();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this purchase receive?')) {
      try {
        await deletePurchaseReceive(id);
        router.push('/purchases/receives');
      } catch (error) {
        console.error('Failed to delete receive:', error);
        alert('Failed to delete receive');
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
  }

  if (!invoice) {
    return <div className="p-8 text-center text-slate-500">Invoice not found</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-600 border-slate-300';
      case 'Sent': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Unpaid': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Overdue': return 'bg-red-100 text-red-700 border-red-300';
      case 'Partially Paid': return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 'Paid': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft': return <FileText className="w-4 h-4 mr-1.5" />;
      case 'Sent': return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
      case 'Unpaid': return <HelpCircle className="w-4 h-4 mr-1.5" />;
      case 'Overdue': return <AlertCircle className="w-4 h-4 mr-1.5" />;
      case 'Partially Paid': return <Clock className="w-4 h-4 mr-1.5" />;
      case 'Paid': return <Banknote className="w-4 h-4 mr-1.5" />;
      default: return null;
    }
  };

  const currentStatus = invoice.status;
  
  // Status workflow nodes
  const workflowNodes = [
    { id: 'Draft', label: 'DRAFT', icon: FileText, color: 'slate' },
    { id: 'Sent', label: 'SENT', icon: CheckCircle2, color: 'blue' },
    { id: 'Unpaid', label: 'UNPAID', icon: HelpCircle, color: 'blue' },
  ];

  // For the branching statuses at the end
  const endNodes = [
    { id: 'Overdue', label: 'OVERDUE', icon: AlertCircle, color: 'red' },
    { id: 'Partially Paid', label: 'PARTIALLY PAID', icon: Clock, color: 'indigo' },
    { id: 'Paid', label: 'PAID', icon: Banknote, color: 'green' }
  ];

  const handleApproveReceipt = async () => {
    if (window.confirm('Are you sure you want to approve this Invoice and receive items into inventory?')) {
      try {
        const { updatePurchaseInvoiceReceiptStatus } = await import('@/features/purchases/api/purchases.api');
        await updatePurchaseInvoiceReceiptStatus(id, 'Received');
        setInvoice({ ...invoice, receiptStatus: 'Received' });
      } catch (error) {
        console.error('Failed to update receipt status:', error);
        alert('Failed to update receipt status');
      }
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 border-t border-slate-200 print:block print:h-auto print:bg-white print:border-none">
      {/* LEFT SIDEBAR (Master List) */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 print:hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">In Transit</h3>
          <Button variant="ghost" size="sm" onClick={() => router.push('/purchases/receives')} className="text-blue-600 hover:text-blue-700 h-8 text-xs hover:bg-blue-50">View All</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {receives.map(pr => (
            <Link 
              key={pr._id} 
              href={`/purchases/receives/${pr._id}`} 
              className={`block p-3 rounded-md border transition-colors ${pr._id === id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-transparent hover:bg-slate-50'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`font-semibold ${pr._id === id ? 'text-blue-700' : 'text-slate-800'}`}>{pr.purchaseReceiveNumber}</span>
                <span className="text-xs text-slate-500">{new Date(pr.receiveDate).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="text-sm text-slate-600 truncate mb-1">{pr.vendorName}</div>
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    pr.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                  {pr.status}
                </span>
                <span className="text-xs font-semibold text-slate-700">₹{((pr.lineItems || []).reduce((acc: number, item: any) => {
                  const qty = item.totalInvoiceQuantity ?? item.invoiceQuantity ?? item.quantity ?? 0;
                  return acc + (qty * (item.rate || 0));
                }, 0)).toFixed(2)}</span>
              </div>
            </Link>
          ))}
          {receives.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">No receives found.</div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE (Detail View) */}
      <div className="flex-1 flex flex-col min-w-0 print:block">
      {/* Header bar */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0 gap-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-full shrink-0" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">{invoice.invoiceNumber}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex items-center ${getStatusColor(invoice.status)}`}>
              {getStatusIcon(invoice.status)}
              {invoice.status.toUpperCase()}
            </span>
            {invoice.receiptStatus === 'Received' && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md border bg-green-100 text-green-700 border-green-300 ml-2">
                RECEIVED
              </span>
            )}
          </div>
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg shrink-0">
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
        
        <div className="flex flex-wrap items-center gap-2">
          {(!invoice.receiptStatus || invoice.receiptStatus === 'Pending Receipt') ? (
            <Button onClick={handleApproveReceipt} className="h-9 bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Receipt
            </Button>
          ) : (
            <Button onClick={() => router.push(`/store/inventory/inward/${id}`)} className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
              Register Inward
            </Button>
          )}
          <div className="hidden sm:block w-px h-6 bg-slate-200 mx-2"></div>
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setIsPdfView(false)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${!isPdfView ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Standard
            </button>
            <button
              onClick={() => setIsPdfView(true)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${isPdfView ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              PDF View
            </button>
          </div>
          <Button variant="outline" className="h-9 border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button 
            variant="outline" 
            className="h-9 border-slate-300 text-blue-600 hover:bg-blue-50 border-blue-200 hover:border-blue-300"
            onClick={() => router.push(`/purchases/receives/${id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" className="h-9 border-slate-300 text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 print:overflow-visible print:block print:p-0">
        <div className="max-w-[1000px] mx-auto space-y-8">
          
          {activeTab === 'history' ? (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 mb-8 border-b border-slate-100 pb-4">Audit History</h2>
              <AuditTimeline entityType="PurchaseReceive" entityId={params.id as string} />
            </div>
          ) : isPdfView ? (
            <div className="flex justify-center w-full py-8 overflow-x-auto">
              <div className="bg-white p-10 min-h-[1056px] w-full max-w-[816px] min-w-[600px] mx-auto box-border text-[13px] relative font-sans leading-tight shadow-sm border border-slate-200 overflow-hidden">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6 border-b-2 border-teal-600 pb-4">
                  <div>
                    <h1 className="text-3xl font-black text-indigo-900 tracking-wider mb-2 uppercase break-words pr-4">{invoice.billingCompany?.name || invoice.vendorName || "VENDOR NAME"}</h1>
                    <div className="bg-teal-600 text-white font-bold py-1.5 px-4 rounded-sm inline-block mb-3 text-sm">
                      TAX INVOICE
                    </div>
                    <p className="text-slate-800 mb-0.5 whitespace-pre-wrap">{invoice.billingCompany?.address || 'Address Details'}</p>
                  </div>
                  <div className="text-right flex flex-col items-end pt-2">
                    {invoice.billingCompany?.logoUrl ? (
                      <img src={invoice.billingCompany.logoUrl.startsWith('http') ? invoice.billingCompany.logoUrl : `${API_BASE_URL}${invoice.billingCompany.logoUrl}`} alt="Logo" className="w-32 object-contain mb-3" />
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 rounded-sm mb-3 flex items-center justify-center border border-slate-200">
                        <span className="text-indigo-900 font-bold text-xl">LOGO</span>
                      </div>
                    )}
                    {invoice.billingCompany?.phone && <p className="text-slate-800 font-semibold mb-0.5">Tel : {invoice.billingCompany.phone}</p>}
                    {invoice.billingCompany?.email && <p className="text-slate-800">Email : {invoice.billingCompany.email}</p>}
                  </div>
                </div>

                {/* Title & Meta */}
                <div className="flex items-center justify-center border border-black p-1 bg-slate-50 mb-4 font-bold">
                  <div className="text-xl tracking-widest">TAX INVOICE</div>
                </div>

                {/* Dual Column Info */}
                <div className="flex border border-black mb-6">
                  {/* Left Column: Customer Detail */}
                  <div className="w-[45%] border-r border-black">
                    <div className="font-bold text-center border-b border-black py-1 bg-slate-100">Customer Detail</div>
                    <div className="p-3">
                      <table className="w-full">
                        <tbody>
                          <tr>
                            <td className="w-24 font-bold align-top py-1">M/S</td>
                            <td className="align-top py-1 font-semibold">{invoice.vendorName || 'Customer Name'}</td>
                          </tr>
                          <tr>
                            <td className="font-bold align-top py-1">Address</td>
                            <td className="align-top py-1 whitespace-pre-wrap">{invoice.vendorAddress || '-'}</td>
                          </tr>
                          <tr>
                            <td className="font-bold align-top py-1">Phone</td>
                            <td className="align-top py-1">{invoice.vendorPhone || '-'}</td>
                          </tr>
                          <tr>
                            <td className="font-bold align-top py-1">GSTIN</td>
                            <td className="align-top py-1">{invoice.vendorGst || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Right Column: Invoice Detail */}
                  <div className="w-[55%] p-3">
                    <table className="w-full h-full text-xs sm:text-[13px]">
                      <tbody>
                        <tr>
                          <td className="w-20 sm:w-24 py-1 font-medium">Invoice No.</td>
                          <td className="py-1 font-bold whitespace-nowrap">{invoice.invoiceNumber}</td>
                          <td className="w-20 py-1 font-medium pl-1 sm:pl-2">Invoice Date</td>
                          <td className="py-1 text-right whitespace-nowrap">{new Date(invoice.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-black mb-6">
                  <table className="w-full text-center border-collapse">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border border-black p-2 w-8 text-[11px]">Sr. No.</th>
                        <th className="border border-black p-2 text-[11px] text-left">Item Name</th>
                        <th className="border border-black p-2 w-16 text-[11px]">HSN / SAC</th>
                        <th className="border border-black p-2 w-16 text-[11px]">Tot Inv Qty</th>
                        <th className="border border-black p-2 w-10 text-[11px]">SRT</th>
                        <th className="border border-black p-2 w-10 text-[11px]">ACT</th>
                        <th className="border border-black p-2 w-16 text-[11px]">Rate</th>
                        <th className="border border-black p-2 w-20 text-[11px]">Amount</th>
                        <th className="border border-black p-1 w-20 text-[11px]">GST Type</th>
                        <th className="border border-black p-1 text-[11px]">CGST %</th>
                        <th className="border border-black p-1 text-[11px]">SGST %</th>
                        <th className="border border-black p-1 text-[11px]">IGST %</th>
                        <th className="border border-black p-2 w-20 text-[11px]">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lineItems?.map((item: any, idx: number) => {
                        const qty = item.totalInvoiceQuantity ?? item.invoiceQuantity ?? item.quantity ?? 0;
                        const itemAmount = qty * (item.rate || 0);
                        const taxRate = item.gstType === 'Intra State' ? ((item.cgst || 0) + (item.sgst || 0)) : (item.igst || 0);
                        const taxAmount = (itemAmount * taxRate) / 100;
                        const rowTotal = itemAmount + taxAmount;
                        return (
                          <tr key={idx} className="h-10">
                            <td className="border-x border-black p-2 text-center align-top">{idx + 1}</td>
                            <td className="border-x border-black p-2 text-left font-semibold align-top">{item.itemName}</td>
                            <td className="border-x border-black p-2 text-center align-top">{item.hsnCode || '-'}</td>
                            <td className="border-x border-black p-2 text-center align-top">{qty} {item.unit || 'NOS'}</td>
                            <td className="border-x border-black p-2 text-center align-top">{item.srt || 0}</td>
                            <td className="border-x border-black p-2 text-center align-top">{item.act || 0}</td>
                            <td className="border-x border-black p-2 text-right align-top">{item.rate?.toFixed(2)}</td>
                            <td className="border-x border-black p-2 text-right align-top">{itemAmount.toFixed(2)}</td>
                            <td className="border-x border-black p-2 text-center align-top">{item.gstType || 'Intra State'}</td>
                            <td className="border-x border-black p-2 text-center align-top">{item.cgst || 0}</td>
                            <td className="border-x border-black p-2 text-center align-top">{item.sgst || 0}</td>
                            <td className="border-x border-black p-2 text-center align-top">{item.igst || 0}</td>
                            <td className="border-x border-black p-2 text-right align-top">{rowTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {/* Empty padding rows for fixed height */}
                      {Array.from({ length: Math.max(0, 5 - (invoice.lineItems?.length || 0)) }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-10">
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                          <td className="border-x border-black"></td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="border-t border-black font-bold bg-slate-100">
                        <td className="border border-black p-2 text-right" colSpan={3}>Total :</td>
                        <td className="border border-black p-2 text-center">{invoice.lineItems?.reduce((acc: number, item: any) => acc + ((item.totalInvoiceQuantity ?? item.invoiceQuantity ?? item.quantity) || 0), 0)}</td>
                        <td className="border border-black p-2 text-center">{invoice.lineItems?.reduce((acc: number, item: any) => acc + (item.srt || 0), 0)}</td>
                        <td className="border border-black p-2 text-center">{invoice.lineItems?.reduce((acc: number, item: any) => acc + (item.act || 0), 0)}</td>
                        <td className="border border-black p-2 bg-white"></td>
                        <td className="border border-black p-2 text-right">{invoice.subTotal?.toFixed(2)}</td>
                        <td className="border border-black p-2 bg-white" colSpan={4}></td>
                        <td className="border border-black p-2 text-right">{(invoice.subTotal + (invoice.taxAmount || 0)).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer Section (Words & Bank Details) */}
                <div className="flex border border-black mb-6">
                  {/* Left Column: Words & Bank */}
                  <div className="w-2/3 border-r border-black flex flex-col">
                    <div className="border-b border-black">
                      <div className="font-bold text-center border-b border-black py-1 bg-slate-100 text-xs">Total in words</div>
                      <div className="p-3 text-center text-sm uppercase tracking-wide">
                        {numberToWords(invoice.subTotal + (invoice.taxAmount || 0))} RUPEES ONLY
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <div className="flex p-3 justify-between items-center h-full">
                        {/* Empty Space for alignment */}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Tax Breakdown & Sign */}
                  <div className="w-1/3 flex flex-col">
                    <table className="w-full text-sm border-b border-black">
                      <tbody>
                        <tr className="border-b border-slate-300">
                          <td className="p-2">Taxable Amount</td>
                          <td className="p-2 text-right font-semibold">{invoice.subTotal?.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-2">Add : Tax</td>
                          <td className="p-2 text-right font-semibold">{invoice.taxAmount?.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-slate-300 font-bold">
                          <td className="p-2">Total Tax</td>
                          <td className="p-2 text-right">{invoice.taxAmount?.toFixed(2)}</td>
                        </tr>
                        <tr className="font-bold text-base bg-slate-100 border-b border-black">
                          <td className="p-2">Total Amount After Tax</td>
                          <td className="p-2 text-right">₹{(invoice.subTotal + (invoice.taxAmount || 0)).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="px-2 pt-1 text-[10px] text-right" colSpan={2}>(E & O.E.)</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex-1 flex flex-col p-2 text-center text-xs relative">
                      <p className="font-semibold mb-2">Certified that the particulars given above are true and correct.</p>
                      <p className="font-bold text-sm">For {invoice.vendorName || "GUJARAT FREIGHT TOOLS"}</p>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                        <div className="transform -rotate-12 border-2 border-black p-2 inline-block font-bold uppercase">
                          This is a computer generated<br/>invoice no signature required.
                        </div>
                      </div>
                      <div className="mt-auto pt-16 border-t border-black font-semibold mx-4">
                        Authorised Signatory
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="border border-black text-xs flex">
                  <div className="w-2/3 border-r border-black p-2">
                    <p className="font-bold mb-1 border-b border-black pb-1 uppercase bg-slate-100 px-2 -mx-2 -mt-2">Terms and Conditions</p>
                    <p className="pt-2">Subject to Maharashtra Junction.</p>
                    <p>Our Responsibility Ceases as soon as goods leaves our Premises.</p>
                    <p>Goods once sold will not taken back.</p>
                    <p>Delivery Ex-Premises.</p>
                  </div>
                  <div className="w-1/3 flex flex-col justify-end p-2 border-t mt-12">
                    <p className="font-semibold pt-1 border-t border-black text-center mt-auto">Customer Signature</p>
                  </div>
                </div>

                <div className="mt-2 text-sm text-center text-slate-500 font-medium">
                  Thank you for shopping with us!
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Invoice Document Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-10">
              {/* Doc Header */}
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-3xl font-light text-slate-800 mb-2">INVOICE</h2>
                  <p className="text-sm font-semibold text-slate-500">#{invoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{invoice.vendorName}</h3>
                  <p className="text-slate-500 text-sm">Vendor / Supplier</p>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex flex-col gap-8 border-b border-slate-200 pb-8 mb-8">
                <div className="flex justify-between">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-6">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Invoice Date</p>
                      <p className="text-sm font-medium text-slate-800">{new Date(invoice.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Due Date</p>
                      <p className="text-sm font-medium text-slate-800">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '--'}</p>
                    </div>
                    {invoice.purchaseOrderNumber && (
                      <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Purchase Order</p>
                        <p className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">{invoice.purchaseOrderNumber}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right bg-slate-50 p-4 rounded-lg border border-slate-100 shrink-0">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Value</p>
                    <p className="text-2xl font-bold text-slate-800">₹{(invoice.subTotal + (invoice.taxAmount || 0)).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-sm text-left mb-8">
                <thead className="border-b-2 border-slate-800 text-slate-800">
                  <tr>
                    <th className="py-3 font-semibold w-10">#</th>
                    <th className="py-3 font-semibold">Item & Description</th>
                    <th className="py-3 font-semibold text-center">Qty</th>
                    <th className="py-3 font-semibold text-center">SRT</th>
                    <th className="py-3 font-semibold text-center">ACT</th>
                    <th className="py-3 font-semibold text-right">Rate</th>
                    <th className="py-3 font-semibold text-right">Amount</th>
                    <th className="py-3 font-semibold text-center">GST Type</th>
                    <th className="py-3 font-semibold text-center">CGST %</th>
                    <th className="py-3 font-semibold text-center">SGST %</th>
                    <th className="py-3 font-semibold text-center">IGST %</th>
                    <th className="py-3 font-semibold text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.lineItems.map((item: any, i: number) => {
                    const qty = item.totalInvoiceQuantity ?? item.invoiceQuantity ?? item.quantity ?? 0;
                    return (
                    <tr key={i}>
                      <td className="py-4 text-slate-500 align-top">{i + 1}</td>
                      <td className="py-4 align-top">
                        <p className="font-medium text-slate-800">{item.itemName}</p>
                        {item.description && <p className="text-slate-500 text-xs mt-1">{item.description}</p>}
                      </td>
                      <td className="py-4 text-center align-top">{qty}</td>
                      <td className="py-4 text-center align-top">{item.srt || 0}</td>
                      <td className="py-4 text-center align-top">{item.act || 0}</td>
                      <td className="py-4 text-right align-top text-slate-600">{item.rate?.toFixed(2)}</td>
                      <td className="py-4 text-right font-medium text-slate-800 align-top">{(qty * (item.rate || 0)).toFixed(2)}</td>
                      <td className="py-4 text-center align-top">{item.gstType || 'Intra State'}</td>
                      <td className="py-4 text-center align-top">{item.cgst || 0}</td>
                      <td className="py-4 text-center align-top">{item.sgst || 0}</td>
                      <td className="py-4 text-center align-top">{item.igst || 0}</td>
                      <td className="py-4 text-right font-medium text-slate-800 align-top">
                        {(
                          (qty * (item.rate || 0)) + 
                          ((qty * (item.rate || 0)) * (item.gstType === 'Intra State' ? ((item.cgst || 0) + (item.sgst || 0)) : (item.igst || 0))) / 100
                        ).toFixed(2)}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Sub Total</span>
                    <span>{invoice.subTotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 pb-3 border-b border-slate-100">
                    <span>Tax Amount</span>
                    <span>{invoice.taxAmount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-slate-800 pt-2">
                    <span>Total</span>
                    <span>₹{(invoice.subTotal + invoice.taxAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-12 pt-8 border-t border-slate-200">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Notes</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>
            
            {/* Payment Banner based on status */}
            {invoice.status === 'Draft' && (
              <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-sm font-medium text-slate-600">
                This invoice is currently in DRAFT state. Edit and send to finalize.
              </div>
            )}
            {invoice.balanceDue > 0 && invoice.status !== 'Draft' && (
              <div className="bg-blue-50 p-4 border-t border-blue-200 flex justify-between items-center">
                <span className="text-sm font-medium text-blue-800">You have a balance due of ₹{invoice.balanceDue.toFixed(2)} on this invoice.</span>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Record Payment
                </Button>
              </div>
            )}
            {invoice.balanceDue <= 0 && invoice.status !== 'Draft' && (
              <div className="bg-green-50 p-4 border-t border-green-200 text-center text-sm font-bold text-green-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                This invoice is fully paid!
              </div>
            )}
          </div>

            </>
          )}

          {/* Attachments Page (Rendered below main view) */}
          {invoice.attachments && invoice.attachments.length > 0 && (
            <div className="max-w-[800px] mx-auto bg-white shadow-[0_0_15px_rgba(0,0,0,0.05)] rounded-sm mt-4 mb-12 px-6 py-12 md:px-8 border border-slate-200 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-full print:break-before-page">
              <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-wider border-b border-slate-200 pb-2">Attachments</h3>
              <div className="flex flex-col gap-8">
                {invoice.attachments.map((attachment: any, idx: number) => {
                  const fileUrl = attachment.url.startsWith('http') ? attachment.url : `${API_BASE_URL}${attachment.url}`;
                  const isImage = (attachment.url && attachment.url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) != null) || (attachment.name && attachment.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null);
                  const isPdf = (attachment.url && attachment.url.match(/\.pdf(\?.*)?$/i) != null) || (attachment.name && attachment.name.match(/\.pdf$/i) != null);
                  return (
                    <div key={idx} className="flex flex-col gap-4 print:break-inside-avoid print:break-before-page">
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-2">
                        <Paperclip className="w-4 h-4" /> {attachment.name}
                      </a>
                      {isImage ? (
                        <img src={fileUrl} alt={attachment.name} className="max-w-full max-h-[1000px] object-contain border border-slate-200 rounded p-1 print:max-h-none print:border-none" />
                      ) : isPdf ? (
                        <PdfPreview fileUrl={fileUrl} />
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
        </div>
      </div>
      </div>
    </div>
  );
}
