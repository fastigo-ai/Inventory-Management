"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Settings } from "lucide-react";
import Link from "next/link";
import { createDI } from "@/features/di/api/di.api";
import { getPurchaseOrders } from "@/features/purchases/api/purchases.api";

export default function NewDIRegistrationPage() {
  const router = useRouter();
  
  // Data State
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  
  // Form State
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [diNumber, setDiNumber] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load POs on mount
    getPurchaseOrders().then(res => setPurchaseOrders(Array.isArray(res.data) ? res.data : (res.data?.pos || res.data || [])));
    
    // Default Date
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  // When PO changes, populate line items
  useEffect(() => {
    if (purchaseOrderId) {
      const po = purchaseOrders.find(p => p._id === purchaseOrderId);
      if (po && po.lineItems) {
        setLineItems(po.lineItems.map((item: any) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          tempCode: item.tempCode || '',
          package: item.package || po.package1 || '',
          circle: item.circle || po.circle || '',
          orderedQuantity: item.quantity || 0,
          quantity: item.quantity || 0 // Default to full quantity for inspection
        })));
      } else {
        setLineItems([]);
      }
    } else {
      setLineItems([]);
    }
  }, [purchaseOrderId, purchaseOrders]);

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    setLineItems(newItems);
  };

  const removeLineItem = (index: number) => {
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  const handleSave = async (status: string) => {
    if (!purchaseOrderId) {
      alert("Please select a Purchase Order.");
      return;
    }
    if (!diNumber) {
      alert("Please enter a DI Number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        diNumber,
        purchaseOrderId,
        date,
        notes,
        lineItems: lineItems.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          tempCode: item.tempCode,
          package: item.package,
          circle: item.circle,
          quantity: Number(item.quantity) || 0
        })).filter(i => i.quantity > 0)
      };

      await createDI(payload);
      router.push('/di'); // Assuming we will have a list page
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to register DI");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-white min-h-screen">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link href="/di" className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-800">New DI Registration</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto pb-32">
        {/* Form Fields */}
        <div className="grid grid-cols-12 gap-8 mb-12">
          {/* Left Column */}
          <div className="col-span-12 md:col-span-8 space-y-6">
            
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-red-500">Purchase Order*</label>
              </div>
              <div className="col-span-9">
                <select
                  value={purchaseOrderId}
                  onChange={(e) => setPurchaseOrderId(e.target.value)}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select Purchase Order</option>
                  {purchaseOrders.map((po, index) => (
                    <option key={po._id || index} value={po._id}>
                      {po.purchaseOrderNumber} - {po.vendorName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-red-500">DI Number*</label>
              </div>
              <div className="col-span-9">
                <Input 
                  value={diNumber}
                  onChange={(e) => setDiNumber(e.target.value)}
                  placeholder="e.g. DI-2026-001"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-red-500">DI Date*</label>
              </div>
              <div className="col-span-9">
                <Input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="mb-12 border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-[#f8f9fc] px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800">Approved DI Items</h2>
          </div>
          
          <table className="w-full">
            <thead className="bg-[#f8f9fc] border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[35%]">ITEM DETAILS</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">TEMP CODE</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CIRCLE</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">PACKAGE</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">ORDERED QTY</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%]">DI QUANTITY</th>
                <th className="px-4 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((item, index) => (
                <tr key={index} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Input 
                      value={item.itemName} 
                      readOnly
                      className="border-transparent bg-transparent h-8 shadow-none focus-visible:ring-0 px-0 font-medium"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input 
                      value={item.tempCode}
                      onChange={(e) => updateLineItem(index, 'tempCode', e.target.value)}
                      className="h-8 shadow-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input 
                      value={item.circle}
                      onChange={(e) => updateLineItem(index, 'circle', e.target.value)}
                      className="h-8 shadow-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input 
                      value={item.package}
                      onChange={(e) => updateLineItem(index, 'package', e.target.value)}
                      className="h-8 shadow-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-slate-500">{item.orderedQuantity}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                      className="h-8 shadow-none text-right"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => removeLineItem(index)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Select a Purchase Order to view items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Notes */}
        <div className="grid grid-cols-12 gap-8 mb-8">
          <div className="col-span-12 md:col-span-6 space-y-4">
            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-2 block">Inspector Notes</label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes from the government inspection..."
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-200 p-4 px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => handleSave('Draft')} 
            variant="outline" 
            className="h-9 px-4 text-slate-700 bg-slate-50"
            disabled={isSubmitting}
          >
            Save as Draft
          </Button>
          <Button 
            onClick={() => handleSave('Sent')} 
            className="h-9 px-4 bg-[#3b82f6] hover:bg-blue-600 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registering...' : 'Register DI'}
          </Button>
          <Button variant="ghost" className="h-9 px-4" onClick={() => router.push('/di')}>
            Cancel
          </Button>
        </div>
        <div className="text-right flex items-center gap-8">
          <div className="text-xs text-slate-500">
            Total DI Items: <span className="font-semibold text-slate-800">{lineItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
