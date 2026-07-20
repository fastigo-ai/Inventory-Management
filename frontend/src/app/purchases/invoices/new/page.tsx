"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Table as TableIcon, Trash2, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { createPurchaseInvoice, getNextPurchaseInvoiceNumber } from "@/features/purchases/api/purchases.api";
import { getVendors } from "@/features/vendors/api/vendors.api";

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  
  // Data State
  const [vendors, setVendors] = useState<any[]>([]);
  
  // Form State
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  
  // Financials
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [cgstPercentage, setCgstPercentage] = useState(0);
  const [sgstPercentage, setSgstPercentage] = useState(0);
  const [igstPercentage, setIgstPercentage] = useState(0);
  const [adjustment, setAdjustment] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  useEffect(() => {
    // Load vendors on mount
    getVendors({ limit: 100 }).then(res => setVendors(res.vendors || res));
    getNextPurchaseInvoiceNumber().then(res => {
      if (res.data?.fullNumber && !invoiceNumber) {
        setInvoiceNumber(res.data.fullNumber);
      } else if (res.data?.prefix && res.data?.nextNumber) {
        setInvoiceNumber(`${res.data.prefix}${res.data.nextNumber}`);
      }
    });
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'rate') {
      const qty = Number(newItems[index].quantity) || 0;
      const rate = Number(newItems[index].rate) || 0;
      newItems[index].amount = qty * rate;
    }

    setLineItems(newItems);
  };

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        itemName: '',
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ]);
  };

  const calculateTotals = () => {
    const subTotal = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const discountAmount = (subTotal * discountPercentage) / 100;
    const taxableAmount = subTotal - discountAmount;
    
    const cgstAmount = (taxableAmount * cgstPercentage) / 100;
    const sgstAmount = (taxableAmount * sgstPercentage) / 100;
    const igstAmount = (taxableAmount * igstPercentage) / 100;
    const taxAmount = cgstAmount + sgstAmount + igstAmount;
    
    const total = taxableAmount + taxAmount + adjustment;
    const balanceDue = total - amountPaid;

    return { subTotal, discountAmount, taxAmount, total, balanceDue };
  };

  const handleSubmit = async (status: 'Draft' | 'Sent') => {
    if (!vendorName || !invoiceNumber || !date) {
      alert("Please fill in the required fields");
      return;
    }

    try {
      const { subTotal, discountAmount, taxAmount, total, balanceDue } = calculateTotals();
      
      const payload = {
        vendorName,
        invoiceNumber,
        date,
        dueDate,
        notes,
        lineItems,
        subTotal,
        cgstPercentage,
        sgstPercentage,
        igstPercentage,
        discountPercentage,
        discountAmount,
        taxAmount,
        adjustment,
        total,
        amountPaid,
        balanceDue,
        status,
      };

      await createPurchaseInvoice(payload);
      router.push('/purchases/invoices');
    } catch (error) {
      console.error("Failed to create Invoice", error);
      alert("Failed to save Purchase Invoice");
    }
  };

  const totals = calculateTotals();

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* Header */}
      <div className="flex-none h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shadow-sm z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl text-slate-800 font-bold">New Purchase Invoice</h1>
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-md">DRAFT</span>
        </div>
        <Link href="/purchases/invoices">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-[1100px] mx-auto space-y-6">
          
          {/* Top Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="col-span-1 lg:col-span-2">
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">Vendor Name <span className="text-red-500">*</span></label>
                <select 
                  className="w-full h-10 rounded-lg text-[13px] border border-slate-300 px-3 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                >
                  <option value="">Select a Vendor</option>
                  {vendors.map(v => (
                    <option key={v._id} value={v.dynamicData?.companyName || v.dynamicData?.displayName || v._id}>
                      {v.dynamicData?.companyName || v.dynamicData?.displayName || v._id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">Invoice# <span className="text-red-500">*</span></label>
                <Input 
                  className="h-10 text-[13px] rounded-lg border-slate-300 focus:border-blue-500 transition-colors"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-00001"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">Invoice Date <span className="text-red-500">*</span></label>
                <Input 
                  type="date"
                  className="h-10 text-[13px] rounded-lg border-slate-300 focus:border-blue-500 transition-colors"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">Due Date</label>
                <Input 
                  type="date"
                  className="h-10 text-[13px] rounded-lg border-slate-300 focus:border-blue-500 transition-colors"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

            </div>
          </div>

          {/* Item Table */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <TableIcon className="w-4 h-4 mr-2 text-blue-500" /> Items
              </h3>
              <Button variant="outline" size="sm" onClick={handleAddItem} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                <Plus className="w-4 h-4 mr-1" /> Add Line Item
              </Button>
            </div>
            
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3 min-w-[200px]">ITEM DETAILS</th>
                    <th className="px-4 py-3 w-32 text-center">QTY</th>
                    <th className="px-4 py-3 w-40 text-right">RATE</th>
                    <th className="px-4 py-3 w-40 text-right">AMOUNT</th>
                    <th className="px-4 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                        No items added yet. Click &apos;Add Line Item&apos; to begin.
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="px-4 py-4 text-center text-sm text-slate-500 align-top">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Input 
                            placeholder="Item Name" 
                            className="h-9 mb-2 text-[13px] border-slate-200"
                            value={item.itemName}
                            onChange={(e) => updateLineItem(index, 'itemName', e.target.value)}
                          />
                          <Textarea 
                            placeholder="Description (optional)" 
                            className="h-16 text-[13px] border-slate-200 resize-none"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Input 
                            type="number" 
                            className="h-9 text-[13px] text-center border-slate-200"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Input 
                            type="number" 
                            className="h-9 text-[13px] text-right border-slate-200"
                            value={item.rate}
                            onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-4 align-top text-right font-medium text-slate-800 pt-6">
                          ₹{(Number(item.amount) || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-4 align-top text-center pt-6">
                          <button 
                            className="text-red-400 hover:text-red-600 transition-colors"
                            onClick={() => {
                              const newItems = [...lineItems];
                              newItems.splice(index, 1);
                              setLineItems(newItems);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col md:flex-row justify-between mt-8 gap-8">
              <div className="flex-1">
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">Notes</label>
                <Textarea 
                  className="min-h-[120px] text-[13px] rounded-lg border-slate-200" 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes or terms..."
                />
              </div>
              
              <div className="w-full md:w-80 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="space-y-4 text-[13px]">
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Sub Total</span>
                    <span>₹{totals.subTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Discount (%)</span>
                    <Input 
                      type="number" 
                      className="w-20 h-8 text-right text-[13px]" 
                      value={discountPercentage} 
                      onChange={(e) => setDiscountPercentage(Number(e.target.value))} 
                    />
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>CGST (%)</span>
                    <Input 
                      type="number" 
                      className="w-20 h-8 text-right text-[13px]" 
                      value={cgstPercentage} 
                      onChange={(e) => setCgstPercentage(Number(e.target.value))} 
                    />
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>SGST (%)</span>
                    <Input 
                      type="number" 
                      className="w-20 h-8 text-right text-[13px]" 
                      value={sgstPercentage} 
                      onChange={(e) => setSgstPercentage(Number(e.target.value))} 
                    />
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Adjustment</span>
                    <Input 
                      type="number" 
                      className="w-24 h-8 text-right text-[13px]" 
                      value={adjustment} 
                      onChange={(e) => setAdjustment(Number(e.target.value))} 
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex justify-between font-bold text-lg text-slate-800">
                    <span>Total</span>
                    <span>₹{totals.total.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-200">
                    <span className="font-semibold text-green-700">Amount Paid</span>
                    <Input 
                      type="number" 
                      className="w-24 h-8 text-right text-[13px] border-green-200 focus:border-green-500" 
                      value={amountPaid} 
                      onChange={(e) => setAmountPaid(Number(e.target.value))} 
                    />
                  </div>

                  <div className="flex justify-between font-bold text-base text-red-600 pt-2">
                    <span>Balance Due</span>
                    <span>₹{totals.balanceDue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-none h-16 border-t border-slate-200 flex items-center justify-end px-6 space-x-3 bg-white shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button variant="secondary" className="bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200" onClick={() => handleSubmit('Draft')}>
          Save as Draft
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" onClick={() => handleSubmit('Sent')}>
          Save and Send
        </Button>
      </div>
    </div>
  );
}
