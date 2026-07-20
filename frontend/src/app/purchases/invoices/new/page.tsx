"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Table as TableIcon, Trash2, Plus, Settings, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createPurchaseInvoice, getNextPurchaseInvoiceNumber } from "@/features/purchases/api/purchases.api";
import { getVendors } from "@/features/vendors/api/vendors.api";
import { getItems } from "@/features/items/api/items.api";

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

  // Bulk Modal State
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [selectedBulkItems, setSelectedBulkItems] = useState<string[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load vendors on mount
    getVendors({ limit: 100 }).then(res => setVendors(res.vendors || res));
    getItems({ limit: 5000 }).then(data => setItemsList(data.items || data)).catch(err => console.error(err));
    
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

  const handleBulkAdd = () => {
    const newItems = selectedBulkItems.map(itemId => {
      const selectedItem = itemsList.find(i => i._id === itemId);
      if (selectedItem) {
        const d = selectedItem.dynamicData || {};
        const getVal = (key: string) => {
          if (d[key] !== undefined) return d[key];
          const lowerKey = key.toLowerCase();
          const foundKey = Object.keys(d).find(k => k.toLowerCase() === lowerKey);
          return foundKey ? d[foundKey] : '';
        };

        const quantity = 1;
        const rate = getVal('price') || getVal('costPrice') || getVal('sellingPrice') || 0;
        
        return {
          itemId: selectedItem._id,
          itemName: getVal('name') || getVal('itemDescription') || 'Item',
          description: getVal('description') || getVal('itemDescription') || '',
          quantity,
          rate,
          amount: quantity * rate
        };
      }
      return null;
    }).filter(item => item !== null);

    setLineItems([...lineItems, ...newItems]);
    setIsBulkModalOpen(false);
    setSelectedBulkItems([]);
  };

  const exportSelectedToCsv = () => {
    const headers = ['Item ID', 'Temp Code', 'Item Name', 'Description', 'HSN Code', 'Package', 'Circle', 'Quantity', 'Rate', 'Amount'];
    
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = [headers];

    selectedBulkItems.forEach(itemId => {
      const selectedItem = itemsList.find(i => i._id === itemId);
      if (selectedItem) {
        const d = selectedItem.dynamicData || {};
        const getVal = (key: string) => {
          if (d[key] !== undefined) return d[key];
          const lowerKey = key.toLowerCase();
          const foundKey = Object.keys(d).find(k => k.toLowerCase() === lowerKey);
          return foundKey ? d[foundKey] : '';
        };
        
        const qty = 1;
        const rate = getVal('price') || getVal('costPrice') || getVal('sellingPrice') || 0;
        const amount = qty * rate;

        rows.push([
          escapeCsv(selectedItem._id),
          escapeCsv(getVal('tempCode') || getVal('sku') || getVal('itemCode')),
          escapeCsv(getVal('name') || getVal('itemDescription') || 'Item'),
          escapeCsv(getVal('description') || getVal('itemDescription')),
          escapeCsv(getVal('hsnCode') || getVal('hsn')),
          escapeCsv(getVal('package')),
          escapeCsv(getVal('circle')),
          escapeCsv(qty),
          escapeCsv(rate),
          escapeCsv(amount)
        ]);
      }
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bulk_items.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows: string[][] = [];
      let row: string[] = [];
      let inQuotes = false;
      let val = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
          if (inQuotes && text[i+1] === '"') {
            val += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(val);
          val = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && text[i+1] === '\n') i++;
          row.push(val);
          if (row.length > 1 || row[0] !== '') rows.push(row);
          row = [];
          val = '';
        } else {
          val += char;
        }
      }
      if (val || row.length > 0) {
        row.push(val);
        rows.push(row);
      }

      if (rows.length < 2) {
        toast.error('Invalid or empty CSV file.');
        return;
      }
      
      const dataRows = rows.slice(1);
      const newItems: any[] = [];
      let added = 0;
      dataRows.forEach(row => {
        if (row.length >= 9) {
          const itemId = row[0];
          if (itemId) {
             const quantity = Number(row[7]) || 1;
             const rate = Number(row[8]) || 0;
             newItems.push({
                itemId: itemId,
                itemName: row[2] || 'Item',
                description: row[3] || '',
                quantity,
                rate,
                amount: quantity * rate
             });
             added++;
          }
        }
      });
      
      if (added > 0) {
         setLineItems([...lineItems, ...newItems]);
         toast.success(`Imported ${added} items successfully!`);
         setIsBulkModalOpen(false);
         setSelectedBulkItems([]);
      } else {
         toast.error('No valid items found in the CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsBulkModalOpen(true)} className="text-[#3b82f6] text-[13px] font-medium flex items-center gap-1 hover:underline px-3 py-1.5 border border-transparent">
                  <Settings className="w-4 h-4" /> Bulk Actions
                </button>
                <Button variant="outline" size="sm" onClick={handleAddItem} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Plus className="w-4 h-4 mr-1" /> Add Line Item
                </Button>
              </div>
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

      {/* Bulk Add Items Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Add Items in Bulk</h2>
              <button type="button" onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-200 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search items by name or code..."
                  className="w-full border border-slate-200 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white shadow-sm"
                  value={bulkSearchQuery}
                  onChange={(e) => setBulkSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 w-10">
                      <input
                        type="checkbox"
                        className="rounded text-blue-500 focus:ring-blue-500 cursor-pointer"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBulkItems(itemsList.map(i => i._id));
                          } else {
                            setSelectedBulkItems([]);
                          }
                        }}
                        checked={selectedBulkItems.length === itemsList.length && itemsList.length > 0}
                      />
                    </th>
                    <th className="px-4 py-2 font-bold text-slate-500">Item Name</th>
                    <th className="px-4 py-2 font-bold text-slate-500">Temp Code</th>
                    <th className="px-4 py-2 font-bold text-slate-500 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemsList
                    .filter(item => {
                      const query = (bulkSearchQuery || '').toLowerCase();
                      const name = String(item.dynamicData?.name || item.dynamicData?.itemDescription || '').toLowerCase();
                      const code = String(item.dynamicData?.tempCode || item.dynamicData?.sku || '').toLowerCase();
                      return name.includes(query) || code.includes(query);
                    })
                    .map(item => (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
                        setSelectedBulkItems(prev => prev.includes(item._id) ? prev.filter(id => id !== item._id) : [...prev, item._id]);
                      }}>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded text-blue-500 focus:ring-blue-500 cursor-pointer"
                            checked={selectedBulkItems.includes(item._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBulkItems([...selectedBulkItems, item._id]);
                              } else {
                                setSelectedBulkItems(selectedBulkItems.filter(id => id !== item._id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.dynamicData?.name || item.dynamicData?.itemDescription || 'Unnamed Item'}</td>
                        <td className="px-4 py-3 text-slate-500">{item.dynamicData?.tempCode || '--'}</td>
                        <td className="px-4 py-3 text-slate-700 text-right">{(item.dynamicData?.price || item.dynamicData?.costPrice || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {itemsList.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">No items found in your inventory.</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">{selectedBulkItems.length} items selected</span>
              <div className="flex gap-3">
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={csvInputRef} 
                  onChange={handleImportCsv} 
                  className="hidden" 
                />
                <button type="button" onClick={() => csvInputRef.current?.click()} className="px-4 py-2 text-sm font-medium text-[#3b82f6] bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
                  Import CSV
                </button>
                <button type="button" onClick={exportSelectedToCsv} disabled={selectedBulkItems.length === 0} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Export to CSV
                </button>
                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleBulkAdd} disabled={selectedBulkItems.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-[#3b82f6] rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Add Selected Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
