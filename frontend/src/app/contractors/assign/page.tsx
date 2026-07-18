"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Settings, UploadCloud, ChevronDown, Search, PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { getContractors, createAssignment } from "@/features/contractors/api/contractors.api";

export default function ContractorAssignmentPage() {
  const router = useRouter();
  
  // Data State
  const [contractors, setContractors] = useState<any[]>([]);
  
  // Form State
  const [contractorId, setContractorId] = useState("");
  const [location, setLocation] = useState("Head Office");
  const [assignmentNumber, setAssignmentNumber] = useState("INV-000002");
  const [orderNumber, setOrderNumber] = useState("");
  const [date, setDate] = useState("");
  const [terms, setTerms] = useState("Due on Receipt");
  const [dueDate, setDueDate] = useState("");
  const [subject, setSubject] = useState("");
  const [warehouseLocation, setWarehouseLocation] = useState("Head Office");
  
  const [lineItems, setLineItems] = useState<any[]>([{ itemName: "", tempCode: "", quantity: 1, rate: 0, discountPercentage: 0, amount: 0 }]);
  
  const [shippingCharges, setShippingCharges] = useState<number>(0);
  const [taxType, setTaxType] = useState<'TDS' | 'TCS' | ''>('');
  const [taxPercentage, setTaxPercentage] = useState<number>(0);
  const [adjustment, setAdjustment] = useState<number>(0);
  
  const [customerNotes, setCustomerNotes] = useState("Thanks for your business.");
  const [termsConditions, setTermsConditions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getContractors().then(res => setContractors(res.data || []));
    setDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date().toISOString().split('T')[0]);
  }, []);

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    
    if (['quantity', 'rate', 'discountPercentage'].includes(field)) {
      const qty = Number(newItems[index].quantity) || 0;
      const rate = Number(newItems[index].rate) || 0;
      const discount = Number(newItems[index].discountPercentage) || 0;
      const base = qty * rate;
      newItems[index].amount = base - (base * (discount / 100));
    }
    
    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { itemName: "", tempCode: "", quantity: 1, rate: 0, discountPercentage: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  // Calculations
  const subTotal = useMemo(() => lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0), [lineItems]);
  const taxAmount = useMemo(() => subTotal * (taxPercentage / 100), [subTotal, taxPercentage]);
  const total = useMemo(() => {
    return subTotal + Number(shippingCharges) - taxAmount + Number(adjustment);
  }, [subTotal, shippingCharges, taxAmount, adjustment]);
  const totalQuantity = useMemo(() => lineItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0), [lineItems]);

  const handleSave = async (status: string) => {
    if (!contractorId) {
      alert("Please select a Contractor (Customer Name)");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        contractorId,
        location,
        assignmentNumber,
        orderNumber,
        date,
        terms,
        dueDate,
        subject,
        warehouseLocation,
        lineItems,
        subTotal,
        shippingCharges,
        taxType,
        taxAmount,
        adjustment,
        total,
        customerNotes,
        termsConditions,
        status
      };

      await createAssignment(payload);
      router.push('/contractors');
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to create assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-white min-h-screen">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <Link href="/contractors" className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-800">New Invoice (Contractor Assignment)</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-8 max-w-[1200px] mx-auto pb-32">
        {/* Header Form */}
        <div className="grid grid-cols-12 gap-x-8 gap-y-6 mb-12">
          
          <div className="col-span-12 md:col-span-8 space-y-5">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-red-500">Customer Name*</label>
              </div>
              <div className="col-span-9 relative">
                <select
                  value={contractorId}
                  onChange={(e) => setContractorId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2]"
                >
                  <option value="" disabled>Select or add a customer</option>
                  {contractors.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute right-0 top-0 bottom-0 w-9 bg-[#3b82f6] text-white flex items-center justify-center rounded-r-md pointer-events-none">
                  <Search className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-slate-700">Location</label>
              </div>
              <div className="col-span-9">
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full md:w-[60%] h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:border-slate-300"
                >
                  <option value="Head Office">Head Office</option>
                  <option value="Branch Office">Branch Office</option>
                </select>
              </div>
            </div>

            <div className="w-full border-b border-slate-100 my-6"></div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-red-500">Invoice#*</label>
              </div>
              <div className="col-span-9 flex items-center gap-2">
                <select className="w-[45%] h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none">
                  <option>Default Transaction Series</option>
                </select>
                <div className="relative w-[50%]">
                  <Input 
                    value={assignmentNumber}
                    onChange={(e) => setAssignmentNumber(e.target.value)}
                    className="h-9 w-full pr-8"
                  />
                  <Settings className="w-4 h-4 text-[#0076f2] absolute right-3 top-2.5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-slate-700">Order Number</label>
              </div>
              <div className="col-span-9">
                <Input 
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="h-9 w-[96.5%]"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-red-500">Invoice Date*</label>
              </div>
              <div className="col-span-9 flex items-center gap-4">
                <Input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 w-[45%]"
                />
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="font-medium mr-1">Terms</span>
                  <select 
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 w-[140px] focus:outline-none"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="font-medium mr-1">Due Date</span>
                  <Input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-9 w-[130px] border-dashed"
                  />
                </div>
              </div>
            </div>

            <div className="w-full border-b border-slate-100 my-6"></div>

            <div className="grid grid-cols-12 gap-4 items-start">
              <div className="col-span-3 pt-1">
                <label className="text-[13px] font-medium text-slate-700 flex items-center gap-1">
                  Subject <span className="w-4 h-4 rounded-full bg-slate-400 text-white text-[10px] flex items-center justify-center font-bold">i</span>
                </label>
              </div>
              <div className="col-span-9">
                <Textarea 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Let your customer know what this Invoice is for"
                  className="min-h-[60px] w-[96.5%] resize-y"
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center mt-6">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-slate-400">Warehouse Location</label>
              </div>
              <div className="col-span-9">
                <div className="flex items-center text-sm font-medium text-slate-700 cursor-pointer border-b border-dashed border-slate-300 w-fit pb-0.5">
                  {warehouseLocation} <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="mb-8 border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-[#f8f9fc] px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800">Item Table</h2>
            <div className="flex items-center gap-4 text-sm text-[#0076f2] font-medium">
              <button className="flex items-center gap-1 hover:underline"><Search className="w-4 h-4"/> Scan Item</button>
              <button className="flex items-center gap-1 hover:underline"><PlusCircle className="w-4 h-4"/> Bulk Actions</button>
            </div>
          </div>
          
          <table className="w-full text-sm">
            <thead className="bg-[#f8f9fc] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[35%]">ITEM DETAILS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">TEMP CODE</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">QUANTITY</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">RATE</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">DISCOUNT</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%]">AMOUNT</th>
                <th className="px-2 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lineItems.map((item, index) => (
                <tr key={index} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Input 
                      placeholder="Type or click to select an item."
                      value={item.itemName} 
                      onChange={(e) => updateLineItem(index, 'itemName', e.target.value)}
                      className="border-transparent bg-transparent h-8 shadow-none focus-visible:ring-1 px-2 font-medium"
                    />
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100">
                    <Input 
                      value={item.tempCode}
                      onChange={(e) => updateLineItem(index, 'tempCode', e.target.value)}
                      className="border-transparent bg-transparent h-8 shadow-none focus-visible:ring-1 px-2"
                    />
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100">
                    <Input 
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                      className="border-transparent bg-transparent h-8 shadow-none focus-visible:ring-1 px-2 text-right"
                    />
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100">
                    <Input 
                      type="number" 
                      value={item.rate}
                      onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                      className="border-transparent bg-transparent h-8 shadow-none focus-visible:ring-1 px-2 text-right"
                    />
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 flex items-center justify-end">
                    <Input 
                      type="number" 
                      value={item.discountPercentage}
                      onChange={(e) => updateLineItem(index, 'discountPercentage', e.target.value)}
                      className="border-slate-200 h-8 shadow-none w-16 text-right rounded-r-none"
                    />
                    <div className="h-8 border border-l-0 border-slate-200 bg-slate-50 px-2 flex items-center text-slate-500 rounded-r-md text-xs font-semibold">
                      % <ChevronDown className="w-3 h-3 ml-1" />
                    </div>
                  </td>
                  <td className="px-4 py-3 border-l border-slate-100 text-right font-semibold text-slate-800">
                    {item.amount.toFixed(2)}
                  </td>
                  <td className="px-2 py-3">
                    <button 
                      onClick={() => removeLineItem(index)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center gap-3">
            <Button onClick={addLineItem} variant="outline" className="h-8 text-[#0076f2] bg-blue-50 border-blue-100 hover:bg-blue-100 text-xs font-semibold">
              <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add New Row <ChevronDown className="w-3 h-3 ml-2" />
            </Button>
            <Button variant="outline" className="h-8 text-[#0076f2] bg-blue-50 border-blue-100 hover:bg-blue-100 text-xs font-semibold">
              <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add Items in Bulk
            </Button>
          </div>
        </div>

        {/* Footer & Calculations */}
        <div className="grid grid-cols-12 gap-8 mb-12">
          {/* Notes */}
          <div className="col-span-12 md:col-span-6 space-y-6">
            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-2 block">Customer Notes</label>
              <Textarea 
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                className="min-h-[80px] text-sm resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">Will be displayed on the invoice</p>
            </div>
            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-2 block">Terms & Conditions</label>
              <Textarea 
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                className="min-h-[80px] text-sm resize-none"
              />
            </div>
            
            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-2 block">Attach File(s) to Invoice</label>
              <Button variant="outline" className="h-8 text-slate-600 text-xs font-semibold">
                <UploadCloud className="w-3.5 h-3.5 mr-2" /> Upload File <ChevronDown className="w-3 h-3 ml-2" />
              </Button>
              <p className="text-[11px] text-slate-400 mt-1">You can upload a maximum of 10 files, 10MB each</p>
            </div>
          </div>

          {/* Calcs */}
          <div className="col-span-12 md:col-span-6">
            <div className="bg-[#f8f9fc] rounded-lg p-6 space-y-4 border border-slate-100">
              <div className="flex justify-between items-center text-sm font-semibold text-slate-800">
                <span>Sub Total</span>
                <span>{subTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Shipping Charges</span>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={shippingCharges}
                    onChange={(e) => setShippingCharges(Number(e.target.value))}
                    className="w-24 h-8 text-right bg-white"
                  />
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center font-bold border border-slate-300">?</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-4 text-slate-600">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="taxType" 
                      checked={taxType === 'TDS'} 
                      onChange={() => setTaxType('TDS')}
                      className="text-[#0076f2] focus:ring-[#0076f2]"
                    /> TDS
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="radio" 
                      name="taxType" 
                      checked={taxType === 'TCS'} 
                      onChange={() => setTaxType('TCS')}
                      className="text-[#0076f2] focus:ring-[#0076f2]"
                    /> TCS
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    onChange={(e) => setTaxPercentage(Number(e.target.value))}
                    className="w-32 h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                  >
                    <option value="0">Select a Tax</option>
                    <option value="5">TDS 5%</option>
                    <option value="10">TDS 10%</option>
                  </select>
                  <span className="w-16 text-right font-medium text-slate-700">- {taxAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <Input placeholder="Adjustment" className="w-24 h-8 text-xs bg-white border-dashed" />
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={adjustment}
                    onChange={(e) => setAdjustment(Number(e.target.value))}
                    className="w-24 h-8 text-right bg-white"
                  />
                  <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center font-bold border border-slate-300">?</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 flex justify-between items-center text-lg font-bold text-slate-900">
                <span>Total ( ₹ )</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-200 p-4 px-8 flex items-center justify-between z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => handleSave('Draft')} 
            variant="outline" 
            className="h-9 px-4 text-slate-700 bg-slate-50 hover:bg-slate-100"
            disabled={isSubmitting}
          >
            Save as Draft
          </Button>
          <div className="flex items-center">
            <Button 
              onClick={() => handleSave('Sent')} 
              className="h-9 px-4 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-r-none border-r border-blue-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save and Send'}
            </Button>
            <Button className="h-9 px-2 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-l-none" disabled={isSubmitting}>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" className="h-9 px-4 hover:bg-slate-100" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="text-sm font-bold text-slate-800">
            Total Amount: ₹ {total.toFixed(2)}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">
            Total Quantity: {totalQuantity}
          </div>
        </div>
      </div>
    </div>
  );
}
