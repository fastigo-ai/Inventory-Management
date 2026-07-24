"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, User, Table as TableIcon, Trash2, Plus, Settings, Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Select from "react-select";
import { createPurchaseInvoice, getNextPurchaseInvoiceNumber } from "@/features/purchases/api/purchases.api";
import { getVendors } from "@/features/vendors/api/vendors.api";
import { getItems } from "@/features/items/api/items.api";
import { getDIs } from "@/features/di/api/di.api";

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  
  // Data State
  const [vendors, setVendors] = useState<any[]>([]);
  
  // Form State
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [diNumber, setDiNumber] = useState("");
  const [diDate, setDiDate] = useState("");
  const [dis, setDis] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  
  // Custom dropdown states
  const [openDropdown, setOpenDropdown] = useState<{ type: string, index: number } | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

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
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element;
      if (!target.closest('.item-dropdown-container')) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Load vendors on mount
    getVendors({ limit: 100 }).then(res => setVendors(res.vendors || res));
    getItems({ limit: 5000 }).then(data => setItemsList(data.items || data)).catch(err => console.error(err));
    getDIs().then(res => setDis(res.data || [])).catch(console.error);
    
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
    
    if (field === 'quantity' || field === 'rate' || field === 'cgst' || field === 'sgst' || field === 'igst' || field === 'gstType') {
      const qty = Number(newItems[index].quantity) || 0;
      const rate = Number(newItems[index].rate) || 0;
      newItems[index].amount = qty * rate;
      
      const cgst = Number(newItems[index].cgst) || 0;
      const sgst = Number(newItems[index].sgst) || 0;
      const igst = Number(newItems[index].igst) || 0;
      const taxRate = newItems[index].gstType === 'Intra State' ? (cgst + sgst) : igst;
      newItems[index].totalAmount = newItems[index].amount + (newItems[index].amount * taxRate / 100);
    }

    setLineItems(newItems);
  };

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        package: '',
        circle: '',
        tempCode: '',
        itemName: '',
        description: '',
        loaSerialNo: '',
        hsnCode: '',
        poQuantity: '',
        poDate: '',
        srt: 0,
        act: 0,
        totalInventory: 0,
        unit: '',
        gstType: 'Intra State',
        cgst: 0,
        sgst: 0,
        igst: 0,
        quantity: 1,
        rate: 0,
        amount: 0,
        totalAmount: 0
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
          package: getVal('package'),
          circle: getVal('circle'),
          tempCode: getVal('tempCode') || getVal('sku') || getVal('itemCode'),
          itemName: getVal('name') || getVal('itemDescription') || 'Item',
          description: getVal('description') || getVal('itemDescription') || '',
          loaSerialNo: getVal('loaSerialNo') || '',
          hsnCode: getVal('hsnCode') || getVal('hsn') || '',
          poQuantity: '',
          poDate: '',
          srt: Number(getVal('srt')) || 0,
          act: Number(getVal('act')) || 0,
          totalInventory: Number(getVal('totalInventory')) || 0,
          unit: getVal('unit') || '',
          gstType: getVal('gstType') || 'Intra State',
          cgst: Number(getVal('cgst')) || 0,
          sgst: Number(getVal('sgst')) || 0,
          igst: Number(getVal('igst')) || 0,
          quantity,
          rate,
          amount: quantity * rate,
          totalAmount: 0
        };
      }
      return null;
    }).filter(item => item !== null);

    setLineItems([...lineItems, ...newItems]);
    setIsBulkModalOpen(false);
    setSelectedBulkItems([]);
  };

  const exportSelectedToCsv = () => {
    const headers = ['Item ID', 'Package', 'Circle', 'Temp Code', 'Item Name', 'Description', 'LOA Serial No', 'HSN Code', 'PO Quantity', 'SRT', 'ACT', 'Total Inventory', 'Unit', 'CGST', 'SGST', 'IGST', 'Quantity', 'Rate', 'Amount'];
    
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
          escapeCsv(getVal('package')),
          escapeCsv(getVal('circle')),
          escapeCsv(getVal('tempCode') || getVal('sku') || getVal('itemCode')),
          escapeCsv(getVal('name') || getVal('itemDescription') || 'Item'),
          escapeCsv(getVal('description') || getVal('itemDescription')),
          escapeCsv(getVal('loaSerialNo')),
          escapeCsv(getVal('hsnCode') || getVal('hsn')),
          escapeCsv(''), // PO Quantity
          escapeCsv(getVal('srt')),
          escapeCsv(getVal('act')),
          escapeCsv(getVal('totalInventory')),
          escapeCsv(getVal('unit')),
          escapeCsv(getVal('cgst')),
          escapeCsv(getVal('sgst')),
          escapeCsv(getVal('igst')),
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
        if (row.length >= 19) {
          const itemId = row[0];
          if (itemId) {
             const quantity = Number(row[16]) || 1;
             const rate = Number(row[17]) || 0;
             newItems.push({
                itemId: itemId,
                package: row[1] || '',
                circle: row[2] || '',
                tempCode: row[3] || '',
                itemName: row[4] || 'Item',
                description: row[5] || '',
                loaSerialNo: row[6] || '',
                hsnCode: row[7] || '',
                poQuantity: row[8] || '',
                srt: Number(row[9]) || 0,
                act: Number(row[10]) || 0,
                totalInventory: Number(row[11]) || 0,
                unit: row[12] || '',
                cgst: Number(row[13]) || 0,
                sgst: Number(row[14]) || 0,
                igst: Number(row[15]) || 0,
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

    const hasMissingMandatory = lineItems.some(item => !item.package || !item.circle);
    if (hasMissingMandatory) {
      alert("Package and Circle are mandatory for all items");
      return;
    }

    try {
      const { subTotal, discountAmount, taxAmount, total, balanceDue } = calculateTotals();
      
      const payload = {
        vendorName,
        invoiceNumber,
        date,
        dueDate,
        diNumber,
        diDate,
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

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">DI Number</label>
                <Input 
                  className="h-10 text-[13px] rounded-lg border-slate-300 focus:border-blue-500 transition-colors"
                  value={diNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDiNumber(val);
                    const foundDi = dis.find(d => d.diNumber === val);
                    if (foundDi && foundDi.date) {
                      setDiDate(new Date(foundDi.date).toISOString().split('T')[0]);
                    }
                  }}
                  list="di-numbers"
                  placeholder="Select or enter DI No."
                />
                <datalist id="di-numbers">
                  {dis.map(d => (
                    <option key={d._id} value={d.diNumber} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">DI Issue Date</label>
                <Input 
                  type="date"
                  className="h-10 text-[13px] rounded-lg border-slate-300 focus:border-blue-500 transition-colors"
                  value={diDate}
                  onChange={(e) => setDiDate(e.target.value)}
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
            
            <div className="border border-slate-200 rounded-lg overflow-x-auto pb-4">
              <table className="w-full text-sm text-left whitespace-nowrap min-w-[2000px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-2 py-3 font-bold text-slate-500 whitespace-nowrap text-left"><span className="bg-blue-600 text-white px-1.5 py-0.5 rounded">PACKAGE</span> <span className="text-red-500">*</span></th>
                    <th className="px-2 py-3 font-bold text-slate-500 whitespace-nowrap text-left"><span className="bg-blue-600 text-white px-1.5 py-0.5 rounded">CIRCLE</span> <span className="text-red-500">*</span></th>
                    <th className="px-3 py-3 min-w-[140px]">Temp Code</th>
                    <th className="px-3 py-3 min-w-[180px]">Item Name</th>
                    <th className="px-3 py-3 min-w-[200px]">Description</th>
                    <th className="px-3 py-3 min-w-[120px]">LOA Serial No</th>
                    <th className="px-3 py-3 min-w-[100px]">HSN Code</th>
                    <th className="px-3 py-3 min-w-[100px]">PO Qty</th>
                    <th className="px-3 py-3 min-w-[120px]">PO Date</th>
                    <th className="px-3 py-3 min-w-[100px] text-center">Inv Qty</th>
                    <th className="px-3 py-3 min-w-[80px]">Unit</th>
                    <th className="px-3 py-3 min-w-[80px] text-right">SRT</th>
                    <th className="px-3 py-3 min-w-[80px] text-right">ACT</th>
                    <th className="px-3 py-3 min-w-[100px] text-right">Tot Inv</th>
                    <th className="px-3 py-3 min-w-[120px] text-right">Rate</th>
                    <th className="px-4 py-3 min-w-[120px] text-right">Amount</th>
                    <th className="px-3 py-3 min-w-[120px]">GST Type</th>
                    <th className="px-3 py-3 min-w-[80px] text-right">CGST %</th>
                    <th className="px-3 py-3 min-w-[80px] text-right">SGST %</th>
                    <th className="px-3 py-3 min-w-[80px] text-right">IGST %</th>
                    <th className="px-4 py-3 min-w-[120px] text-right">Total Amount</th>
                    <th className="px-4 py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={20} className="px-4 py-12 text-center text-slate-500 text-sm">
                        No items added yet. Click &apos;Add Line Item&apos; to begin.
                      </td>
                    </tr>
                  ) : (
                    lineItems.map((item, index) => {
                      const allPackages = Array.from(new Set(itemsList.map(i => i.dynamicData?.package).filter(Boolean)));
                      const circles = Array.from(new Set(itemsList.map(i => i.dynamicData?.circle).filter(Boolean)));
                      const tempCodes = Array.from(new Set(itemsList.map(i => i.dynamicData?.tempCode || i.dynamicData?.sku || i.dynamicData?.itemCode).filter(Boolean)));
                      const itemNames = Array.from(new Set(itemsList.map(i => i.dynamicData?.name || i.dynamicData?.itemDescription || i._id)));
                      const loaSerialNos = Array.from(new Set(itemsList.map(i => {
                        const d = i.dynamicData || {};
                        const loaKey = Object.keys(d).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === 'loaserialno' || k.toLowerCase().replace(/[^a-z0-9]/g, '') === 'loaserial' || k.toLowerCase() === 'sku');
                        return loaKey ? d[loaKey] : null;
                      }).filter(Boolean)));

                      const handleItemSelection = (identifier: string, type: 'name' | 'tempCode' | 'description' | 'loaSerialNo') => {
                        const selectedItem = itemsList.find(i => {
                          if (type === 'name') return (i.dynamicData?.name || i.dynamicData?.itemDescription || i._id) === identifier;
                          if (type === 'tempCode') return (i.dynamicData?.tempCode || i.dynamicData?.sku || i.dynamicData?.itemCode) === identifier;
                          if (type === 'description') return (i.dynamicData?.description || i.dynamicData?.itemDescription) === identifier;
                          if (type === 'loaSerialNo') {
                            const d = i.dynamicData || {};
                            const loaKey = Object.keys(d).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === 'loaserialno' || k.toLowerCase().replace(/[^a-z0-9]/g, '') === 'loaserial' || k.toLowerCase() === 'sku');
                            return (loaKey ? String(d[loaKey]) : '') === String(identifier);
                          }
                          return false;
                        });
                        if (selectedItem) {
                           const d = selectedItem.dynamicData || {};
                           const getVal = (key: string) => {
                             if (d[key] !== undefined) return d[key];
                             const lowerKey = key.toLowerCase();
                             let foundKey = Object.keys(d).find(k => k.toLowerCase() === lowerKey);
                             if (foundKey) return d[foundKey];
                             const alphaNumKey = lowerKey.replace(/[^a-z0-9]/g, '');
                             foundKey = Object.keys(d).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === alphaNumKey);
                             if (foundKey) return d[foundKey];
                             if (key === 'loaSerialNo' && d['sku']) return d['sku'];
                             return '';
                           };
                           
                           let pkg = getVal('package');
                           if (pkg) {
                             const p = String(pkg).toLowerCase();
                             if (p.includes('1') || p.includes('s/n') || p.includes('solan') || p.includes('nahan')) pkg = 'Package 1 (S/N)';
                             else if (p.includes('2') || p.includes('r/r') || p.includes('rampur') || p.includes('rohru')) pkg = 'Package 2 (R/R)';
                           }
                           
                           let circ = getVal('circle');
                           if (circ) {
                             const c = String(circ).toLowerCase();
                             if (c.includes('solan')) circ = 'Solan';
                             else if (c.includes('nahan')) circ = 'Nahan';
                             else if (c.includes('rampur')) circ = 'Rampur';
                             else if (c.includes('rohru')) circ = 'Rohru';
                           }
                           const newItems = [...lineItems];
                           newItems[index] = {
                             ...newItems[index],
                             itemId: selectedItem._id,
                             itemName: getVal('name') || getVal('itemDescription') || selectedItem._id || newItems[index].itemName,
                             package: pkg || newItems[index].package,
                             circle: circ || newItems[index].circle,
                             tempCode: getVal('tempCode') || getVal('sku') || getVal('itemCode') || newItems[index].tempCode,
                             description: getVal('description') || getVal('itemDescription') || newItems[index].description,
                             loaSerialNo: getVal('loaSerialNo') || getVal('loaSerial') || getVal('sku') || '',
                             hsnCode: getVal('hsnCode') || getVal('hsn') || '',
                             srt: Number(getVal('srt')) || 0,
                             act: Number(getVal('act')) || 0,
                             totalInventory: Number(getVal('totalInventory')) || 0,
                             unit: getVal('unit') || '',
                             gstType: newItems[index].gstType || 'Intra State',
                             cgst: Number(getVal('cgst')) || 0,
                             sgst: Number(getVal('sgst')) || 0,
                             igst: Number(getVal('igst')) || 0,
                             rate: Number(getVal('price') || getVal('costPrice') || getVal('sellingPrice')) || newItems[index].rate
                           };
                           newItems[index].amount = (Number(newItems[index].quantity) || 0) * (Number(newItems[index].rate) || 0);
                           const taxRate = newItems[index].gstType === 'Intra State' ? (newItems[index].cgst + newItems[index].sgst) : newItems[index].igst;
                           newItems[index].totalAmount = newItems[index].amount + (newItems[index].amount * taxRate / 100);
                           setLineItems(newItems);
                        } else {
                           updateLineItem(index, type === 'name' ? 'itemName' : type === 'tempCode' ? 'tempCode' : type === 'loaSerialNo' ? 'loaSerialNo' : 'description', identifier);
                        }
                      };

                      return (
                        <tr key={index} className="hover:bg-slate-50/50 bg-white">
                          <td className="px-4 py-2 text-center text-[13px] text-slate-500 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-2 py-2">
                            <select className="w-full h-8 text-[12px] border border-slate-200 rounded px-2 focus:border-blue-500 outline-none bg-transparent"
                              value={item.package || ''}
                              onChange={e => {
                                updateLineItem(index, 'package', e.target.value);
                                updateLineItem(index, 'circle', '');
                              }}
                            >
                              <option value="">Select</option>
                              <option value="Package 1 (S/N)">Package 1 (S/N)</option>
                              <option value="Package 2 (R/R)">Package 2 (R/R)</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <select className="w-full h-8 text-[12px] border border-slate-200 rounded px-2 focus:border-blue-500 outline-none bg-transparent"
                              value={item.circle || ''}
                              onChange={e => updateLineItem(index, 'circle', e.target.value)}
                            >
                              <option value="">Select</option>
                              
                              
                                
                                  <option value="Solan">Solan</option>
                                  <option value="Nahan">Nahan</option>
                                  <option value="Rampur">Rampur</option>
                                  <option value="Rohru">Rohru</option>
                               
                            
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <Select
                              options={tempCodes.map(tc => ({ value: tc, label: tc }))}
                              value={item.tempCode ? { value: item.tempCode, label: item.tempCode } : null}
                              onChange={(selected: any) => {
                                if (selected) handleItemSelection(selected.value as string, 'tempCode');
                                else updateLineItem(index, 'tempCode', '');
                              }}
                              onInputChange={(inputValue, { action }) => {
                                if (action === 'input-change') updateLineItem(index, 'tempCode', inputValue);
                              }}
                              placeholder="Select"
                              isClearable
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              styles={{
                                control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', boxShadow: 'none' }),
                                valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                menu: (base) => ({ ...base, fontSize: '12px', minWidth: '200px' }),
                                option: (base) => ({ ...base, padding: '8px 12px' })
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Select
                              options={itemNames.map(n => ({ value: n, label: n }))}
                              value={item.itemName ? { value: item.itemName, label: item.itemName } : null}
                              onChange={(selected: any) => {
                                if (selected) handleItemSelection(selected.value as string, 'name');
                                else updateLineItem(index, 'itemName', '');
                              }}
                              onInputChange={(inputValue, { action }) => {
                                if (action === 'input-change') updateLineItem(index, 'itemName', inputValue);
                              }}
                              placeholder="Select Item"
                              isClearable
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              styles={{
                                control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', boxShadow: 'none' }),
                                valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                menu: (base) => ({ ...base, fontSize: '12px', minWidth: '300px' }),
                                option: (base) => ({ ...base, padding: '8px 12px' })
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Select
                              options={Array.from(new Set(itemsList.map(i => i.dynamicData?.description || i.dynamicData?.itemDescription).filter(Boolean))).map(d => ({ value: d, label: String(d) }))}
                              value={item.description ? { value: item.description, label: item.description } : null}
                              onChange={(selected: any) => {
                                if (selected) handleItemSelection(selected.value as string, 'description');
                                else updateLineItem(index, 'description', '');
                              }}
                              onInputChange={(inputValue, { action }) => {
                                if (action === 'input-change') updateLineItem(index, 'description', inputValue);
                              }}
                              placeholder="Desc"
                              isClearable
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              styles={{
                                control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', boxShadow: 'none' }),
                                valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                menu: (base) => ({ ...base, fontSize: '12px', minWidth: '300px' }),
                                option: (base) => ({ ...base, padding: '8px 12px' })
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Select
                              options={loaSerialNos.map(loa => ({ value: String(loa), label: String(loa) }))}
                              value={item.loaSerialNo ? { value: String(item.loaSerialNo), label: String(item.loaSerialNo) } : null}
                              onChange={(selected: any) => {
                                if (selected) handleItemSelection(selected.value as string, 'loaSerialNo');
                                else updateLineItem(index, 'loaSerialNo', '');
                              }}
                              onInputChange={(inputValue, { action }) => {
                                if (action === 'input-change') updateLineItem(index, 'loaSerialNo', inputValue);
                              }}
                              placeholder="LOA Serial"
                              isClearable
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                              styles={{
                                control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '12px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', boxShadow: 'none' }),
                                valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                input: (base) => ({ ...base, margin: 0, padding: 0 }),
                                indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                menu: (base) => ({ ...base, fontSize: '12px', minWidth: '200px' }),
                                option: (base) => ({ ...base, padding: '8px 12px' })
                              }}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input placeholder="HSN" className="h-8 text-[12px] border-slate-200 bg-transparent px-2" value={item.hsnCode || ''} onChange={(e) => updateLineItem(index, 'hsnCode', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input placeholder="PO Qty" className="h-8 text-[12px] border-slate-200 bg-transparent px-2" value={item.poQuantity || ''} onChange={(e) => updateLineItem(index, 'poQuantity', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="date" className="h-8 text-[12px] border-slate-200 bg-transparent px-2" value={item.poDate ? String(item.poDate).split('T')[0] : ''} onChange={(e) => updateLineItem(index, 'poDate', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" className="h-8 text-[12px] border-slate-200 px-2 text-center bg-transparent" value={item.quantity || 1} onChange={(e) => updateLineItem(index, 'quantity', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input placeholder="Unit" className="h-8 text-[12px] border-slate-200 bg-transparent px-2" value={item.unit || ''} onChange={(e) => updateLineItem(index, 'unit', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" placeholder="0" className="h-8 text-[12px] border-slate-200 bg-transparent px-2 text-right" value={item.srt || 0} onChange={(e) => updateLineItem(index, 'srt', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" placeholder="0" className="h-8 text-[12px] border-slate-200 bg-transparent px-2 text-right" value={item.act || 0} onChange={(e) => updateLineItem(index, 'act', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" placeholder="0" className="h-8 text-[12px] border-slate-200 bg-transparent px-2 text-right" value={item.totalInventory || 0} onChange={(e) => updateLineItem(index, 'totalInventory', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" className="h-8 text-[12px] border-slate-200 px-2 text-right bg-transparent" value={item.rate || 0} onChange={(e) => updateLineItem(index, 'rate', e.target.value)} />
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-slate-700 text-[13px]">
                            ₹{(Number(item.amount) || 0).toFixed(2)}
                          </td>
                          <td className="px-2 py-2">
                            <select 
                              className="w-full h-8 text-[12px] border border-slate-200 rounded px-2 focus:border-blue-500 outline-none bg-transparent"
                              value={item.gstType || 'Intra State'}
                              onChange={(e) => updateLineItem(index, 'gstType', e.target.value)}
                            >
                              <option value="Intra State">Intra State</option>
                              <option value="Inter State">Inter State</option>
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" placeholder="0" disabled={item.gstType === 'Inter State'} className={`h-8 text-[12px] border-slate-200 px-2 text-right ${item.gstType === 'Inter State' ? 'bg-slate-100 text-slate-400' : 'bg-transparent'}`} value={item.gstType === 'Inter State' ? '' : (item.cgst || 0)} onChange={(e) => updateLineItem(index, 'cgst', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" placeholder="0" disabled={item.gstType === 'Inter State'} className={`h-8 text-[12px] border-slate-200 px-2 text-right ${item.gstType === 'Inter State' ? 'bg-slate-100 text-slate-400' : 'bg-transparent'}`} value={item.gstType === 'Inter State' ? '' : (item.sgst || 0)} onChange={(e) => updateLineItem(index, 'sgst', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" placeholder="0" disabled={item.gstType === 'Intra State'} className={`h-8 text-[12px] border-slate-200 px-2 text-right ${item.gstType === 'Intra State' ? 'bg-slate-100 text-slate-400' : 'bg-transparent'}`} value={item.gstType === 'Intra State' ? '' : (item.igst || 0)} onChange={(e) => updateLineItem(index, 'igst', e.target.value)} />
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-blue-700 text-[13px]">
                            ₹{(Number(item.totalAmount) || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button className="text-red-400 hover:text-red-600 transition-colors p-1" onClick={() => {
                              const newItems = [...lineItems];
                              newItems.splice(index, 1);
                              setLineItems(newItems);
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
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
