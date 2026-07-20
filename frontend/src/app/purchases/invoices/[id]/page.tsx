"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPurchaseInvoiceById, deletePurchaseInvoice } from '@/features/purchases/api/purchases.api';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Edit, Trash2, Printer, FileText, CheckCircle2, AlertCircle, Clock, Banknote, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function PurchaseInvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setIsLoading(true);
        const data = await getPurchaseInvoiceById(params.id);
        setInvoice(data);
      } catch (err) {
        console.error('Failed to fetch invoice:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (params.id) fetchInvoice();
  }, [params.id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deletePurchaseInvoice(params.id);
        router.push('/purchases/invoices');
      } catch (error) {
        console.error('Failed to delete invoice:', error);
        alert('Failed to delete invoice');
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

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* Header */}
      <div className="flex-none h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0 z-10 shadow-sm">
        <div className="flex items-center space-x-4">
          <Link href="/purchases/invoices">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-slate-800">{invoice.invoiceNumber}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex items-center ${getStatusColor(invoice.status)}`}>
              {getStatusIcon(invoice.status)}
              {invoice.status.toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="h-9 border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" className="h-9 border-slate-300 text-blue-600 hover:bg-blue-50 border-blue-200 hover:border-blue-300">
            <Edit className="w-4 h-4 mr-2" /> Edit
          </Button>
          <Button variant="outline" className="h-9 border-slate-300 text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-[1000px] mx-auto space-y-8">
          
          {/* Lifecycle Flowchart */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Life cycle of an Invoice</h2>
            <p className="text-sm text-slate-500 mb-8">Follow the status of your invoice through its lifecycle.</p>
            
            <div className="flex flex-col md:flex-row items-center justify-center relative w-full px-12">
              
              {/* Main Line */}
              <div className="flex items-center space-x-4 md:space-x-8 relative z-10">
                {workflowNodes.map((node, i) => {
                  const isActive = currentStatus === node.id;
                  const isPast = ['Sent', 'Unpaid', 'Overdue', 'Partially Paid', 'Paid'].includes(currentStatus) && node.id === 'Draft' || 
                                 ['Unpaid', 'Overdue', 'Partially Paid', 'Paid'].includes(currentStatus) && node.id === 'Sent' ||
                                 ['Overdue', 'Partially Paid', 'Paid'].includes(currentStatus) && node.id === 'Unpaid';
                  
                  return (
                    <React.Fragment key={node.id}>
                      {/* Node */}
                      <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 ${isActive ? `border-${node.color}-500 bg-${node.color}-50 text-${node.color}-700 shadow-sm` : isPast ? 'border-green-500 text-green-600 bg-white' : 'border-slate-200 text-slate-400 bg-white'} transition-colors duration-300 bg-white`}>
                        <node.icon className={`w-5 h-5 ${isActive ? `text-${node.color}-500` : isPast ? 'text-green-500' : 'text-slate-400'}`} />
                        <span className="font-bold text-sm">{node.label}</span>
                      </div>
                      
                      {/* Connector to next */}
                      {i < workflowNodes.length - 1 && (
                        <div className={`h-0.5 w-8 md:w-16 border-t-2 border-dashed ${isPast ? 'border-green-400' : 'border-slate-300'}`}></div>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Connector to Branches */}
                <div className={`h-0.5 w-8 md:w-16 border-t-2 border-dashed ${['Overdue', 'Partially Paid', 'Paid'].includes(currentStatus) ? 'border-blue-400' : 'border-slate-300'}`}></div>

                {/* Branches Container */}
                <div className="flex flex-col space-y-4 relative">
                  {endNodes.map((node) => {
                    const isActive = currentStatus === node.id;
                    const isPassedPartialToPaid = currentStatus === 'Paid' && node.id === 'Partially Paid';
                    const displayColor = isActive ? node.color : isPassedPartialToPaid ? 'green' : 'slate';
                    
                    return (
                      <div key={node.id} className="relative flex items-center">
                        <div className={`absolute -left-12 h-0.5 w-12 border-t-2 border-dashed ${isActive || isPassedPartialToPaid ? `border-${node.color}-400` : 'border-slate-300'}`}></div>
                        
                        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 ${isActive ? `border-${node.color}-500 bg-${node.color}-50 text-${node.color}-700 shadow-sm` : isPassedPartialToPaid ? 'border-green-500 text-green-600 bg-white' : 'border-slate-200 text-slate-400 bg-white'} transition-colors duration-300 bg-white relative z-10 w-[170px] justify-center`}>
                          <node.icon className={`w-5 h-5 ${isActive ? `text-${node.color}-500` : isPassedPartialToPaid ? 'text-green-500' : 'text-slate-400'}`} />
                          <span className="font-bold text-sm">{node.label}</span>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Vertical connector for branches */}
                  <div className={`absolute -left-12 top-1/2 -translate-y-1/2 h-[calc(100%-2.5rem)] border-l-2 border-dashed ${['Overdue', 'Partially Paid', 'Paid'].includes(currentStatus) ? 'border-blue-400' : 'border-slate-300'}`}></div>
                  
                  {/* Partial to Paid extra line if Paid */}
                  <div className={`absolute right-1/2 translate-x-[4rem] top-[calc(50%+1rem)] h-[4.5rem] border-r-2 border-dashed ${currentStatus === 'Paid' ? 'border-green-400 opacity-100' : 'opacity-0'} pointer-events-none rounded-br-xl`}></div>
                  <div className={`absolute right-1/2 translate-x-[4rem] bottom-[1.2rem] w-8 border-b-2 border-dashed ${currentStatus === 'Paid' ? 'border-green-400 opacity-100' : 'opacity-0'} pointer-events-none`}></div>
                </div>

              </div>
            </div>
            
          </div>

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
              <div className="flex justify-between border-b border-slate-200 pb-8 mb-8">
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
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
                <div className="text-right bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Balance Due</p>
                  <p className="text-2xl font-bold text-slate-800">₹{invoice.balanceDue.toFixed(2)}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-sm text-left mb-8">
                <thead className="border-b-2 border-slate-800 text-slate-800">
                  <tr>
                    <th className="py-3 font-semibold w-10">#</th>
                    <th className="py-3 font-semibold">Item & Description</th>
                    <th className="py-3 font-semibold text-center">Qty</th>
                    <th className="py-3 font-semibold text-right">Rate</th>
                    <th className="py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.lineItems.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-4 text-slate-500 align-top">{i + 1}</td>
                      <td className="py-4 align-top">
                        <p className="font-medium text-slate-800">{item.itemName}</p>
                        {item.description && <p className="text-slate-500 text-xs mt-1">{item.description}</p>}
                      </td>
                      <td className="py-4 text-center align-top">{item.quantity}</td>
                      <td className="py-4 text-right align-top text-slate-600">{item.rate.toFixed(2)}</td>
                      <td className="py-4 text-right font-medium text-slate-800 align-top">{(item.quantity * item.rate).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Sub Total</span>
                    <span>{invoice.subTotal.toFixed(2)}</span>
                  </div>
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Discount ({invoice.discountPercentage}%)</span>
                      <span className="text-red-500">-{invoice.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Tax Amount</span>
                      <span>{invoice.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.adjustment !== 0 && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Adjustment</span>
                      <span>{invoice.adjustment > 0 ? `+${invoice.adjustment.toFixed(2)}` : invoice.adjustment.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-slate-800 pt-3 border-t border-slate-200">
                    <span>Total</span>
                    <span>₹{invoice.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium text-green-600 pt-1">
                    <span>Amount Paid</span>
                    <span>-₹{invoice.amountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-red-600 pt-2 border-t border-slate-200">
                    <span>Balance Due</span>
                    <span>₹{invoice.balanceDue.toFixed(2)}</span>
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
        </div>
      </div>
    </div>
  );
}
