"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Settings, UploadCloud, ChevronDown, User, Table as TableIcon, Trash2, Paperclip, FileText, Plus, Loader2, Search } from "lucide-react";
import Link from "next/link";
import Select from "react-select";
import { createPurchaseReceive, getNextPurchaseReceiveNumber } from "@/features/purchases/api/purchases.api";
import { getVendors } from "@/features/vendors/api/vendors.api";
import { getPurchaseOrders } from "@/features/purchases/api/purchases.api";
import { getItems } from "@/features/items/api/items.api";
import { uploadDocument } from "@/features/documents/api/documents.api";
import { getBillingCompanies } from "@/features/settings/api/billingCompanies.api";

export default function NewPurchaseReceivePage() {
  const router = useRouter();
  
  // Data State
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  
  // Form State
  const [vendorName, setVendorName] = useState("");
  const [purchaseOrderInput, setPurchaseOrderInput] = useState("");
  const [purchaseReceiveNumber, setPurchaseReceiveNumber] = useState("");
  const [receiveDate, setReceiveDate] = useState("");
  const [billingFrom, setBillingFrom] = useState("");
  const [billingCompanies, setBillingCompanies] = useState<any[]>([]);
  
  // Extra fields
  const [diNo, setDiNo] = useState("");
  const [diDate, setDiDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [openDropdown, setOpenDropdown] = useState<{ type: string, index: number } | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.item-dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    // Load vendors on mount
    getVendors({ limit: 100 }).then(res => setVendors(res.vendors || res));
    getPurchaseOrders().then(res => setPurchaseOrders(Array.isArray(res.data) ? res.data : (res.data?.pos || res.data || [])));
    getItems({ limit: 1000 }).then(res => setItemsList(res.items || res.data || res));
    getBillingCompanies().then(res => setBillingCompanies(res.data || []));
    getNextPurchaseReceiveNumber().then(res => {
      if (res.data?.fullNumber && !purchaseReceiveNumber) {
        setPurchaseReceiveNumber(res.data.fullNumber);
      }
    });
  }, []);

  // When vendor changes, set dates and filter POs
  useEffect(() => {
    if (vendorName) {
      if (!receiveDate) {
        setReceiveDate(new Date().toISOString().split('T')[0]);
      }
      
      const vendorPOs = purchaseOrders.filter(po => po.vendorName === vendorName);
      if (vendorPOs.length > 0) {
        setPurchaseOrderInput(vendorPOs[0].purchaseOrderNumber);
      } else {
        setPurchaseOrderInput(""); // Reset PO when vendor changes and no POs exist
      }
    }
  }, [vendorName, purchaseOrders]);

  // When PO changes, populate line items
  useEffect(() => {
    if (purchaseOrderInput) {
      const po = purchaseOrders.find(p => p.purchaseOrderNumber === purchaseOrderInput);
      if (po && po.lineItems) {
        setLineItems(po.lineItems
          .filter((item: any) => !item.isCanceled)
          .map((item: any) => ({
          isManual: false,
          itemId: item.itemId,
          package: item.package || '',
          circle: item.circle || '',
          tempCode: item.tempCode || '',
          itemName: item.itemName,
          itemDescription: item.description || item.itemDescription || '',
          loaSerialNo: item.loaSerialNo || '',
          hsnCode: item.hsnCode || '',
          poQuantity: item.quantity || 0,
          poDate: item.poDate || '',
          srt: 0,
          act: 0,
          totalInvoiceQuantity: 0,
          unit: item.unit || '',
          gstType: item.gstType || 'Intra State',
          cgst: item.cgst || 0,
          sgst: item.sgst || 0,
          igst: item.igst || 0,
          invoiceQuantity: item.quantity || 0,
          rate: item.rate || 0,
          amount: 0,
          totalAmount: 0
        })));
      } else {
        setLineItems([]);
      }
    } else {
      setLineItems([]);
    }
  }, [purchaseOrderInput, purchaseOrders]);

  // Recalculate amount when quantityToReceive or rate changes
  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    
    // Auto calculate amount and total quantity
    if (field === 'srt' || field === 'act' || field === 'rate' || field === 'cgst' || field === 'sgst' || field === 'igst' || field === 'gstType') {
      const srt = Number(newItems[index].srt) || 0;
      const act = Number(newItems[index].act) || 0;
      const rate = Number(newItems[index].rate) || 0;
      newItems[index].totalInvoiceQuantity = srt + act;
      newItems[index].amount = newItems[index].totalInvoiceQuantity * rate;
      
      const cgst = Number(newItems[index].cgst) || 0;
      const sgst = Number(newItems[index].sgst) || 0;
      const igst = Number(newItems[index].igst) || 0;
      const taxRate = newItems[index].gstType === 'Intra State' ? (cgst + sgst) : igst;
      newItems[index].totalAmount = newItems[index].amount + (newItems[index].amount * taxRate / 100);
    }

    setLineItems(newItems);
  };

  const handleSubmit = async (status: 'Draft' | 'Received') => {
    if (!vendorName || !purchaseReceiveNumber || !receiveDate) {
      alert("Please fill in the required fields");
      return;
    }

    const hasInvalidQuantity = lineItems.some(item => (Number(item.totalInvoiceQuantity) || 0) > (Number(item.invoiceQuantity) || 0));
    if (hasInvalidQuantity) {
      alert("Total Invoice Quantity cannot be greater than Invoice Quantity");
      return;
    }

    const hasMissingMandatory = lineItems.some(item => !item.package || !item.circle);
    if (hasMissingMandatory) {
      alert("Package and Circle are mandatory for all items");
      return;
    }

    try {
      const matchedPo = purchaseOrders.find(p => p.purchaseOrderNumber === purchaseOrderInput);
      const payload = {
        vendorName,
        purchaseOrderId: matchedPo ? matchedPo._id : undefined,
        purchaseOrderNumber: purchaseOrderInput || undefined,
        purchaseReceiveNumber,
        receiveDate,
        billingFrom,
        diNo, diDate, 
        notes,
        lineItems,
        status,
        attachments: uploadedDocs.map(doc => ({ name: doc.fileName, url: doc.url }))
      };

      await createPurchaseReceive(payload);
      router.push('/purchases/receives');
    } catch (error) {
      console.error("Failed to create PR", error);
      alert("Failed to save Purchase Invoice");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceType", "Purchase Invoice");
      formData.append("sourceId", purchaseReceiveNumber); // Use PR number as sourceId reference

      const res = await uploadDocument(formData);
      if (res.data) {
        setUploadedDocs([...uploadedDocs, res.data]);
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload document");
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        isManual: true,
        itemId: '',
        package: '',
        circle: '',
        tempCode: '',
        itemName: '',
        itemDescription: '',
        loaSerialNo: '',
        hsnCode: '',
        poQuantity: 0,
        poDate: '',
        srt: 0,
        act: 0,
        totalInvoiceQuantity: 0,
        unit: '',
        gstType: 'Intra State',
        cgst: 0,
        sgst: 0,
        igst: 0,
        invoiceQuantity: 0,
        rate: 0,
        amount: 0,
        totalAmount: 0
      }
    ]);
  };

  const isBlurred = !vendorName;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-none h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-[#f8f9fa]">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          <h1 className="text-xl text-slate-800 font-semibold tracking-tight">New Purchase Invoice</h1>
        </div>
        <Link href="/purchases/receives">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-8 bg-[#fcfcfc]">
        <div className="max-w-[1200px] mx-auto bg-white p-8 shadow-sm border border-slate-200 rounded-lg">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mb-8">
            
            <div className="col-span-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-2">Vendor Name <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <select 
                  className="w-full h-10 rounded-md text-[13px] border border-slate-300 pl-9 pr-3 bg-white focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] appearance-none"
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
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="col-span-2"></div>

            <div className="col-span-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-2">Purchase Order# <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  list="po-list"
                  className="w-full h-10 rounded-md text-[13px] border border-slate-300 px-3 bg-white focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] disabled:bg-slate-50 disabled:text-slate-500"
                  value={purchaseOrderInput}
                  onChange={(e) => setPurchaseOrderInput(e.target.value)}
                  disabled={!vendorName}
                  placeholder="Select or enter a Purchase Order"
                  autoComplete="off"
                />
                <datalist id="po-list">
                  {purchaseOrders
                    .filter(po => !vendorName || po.vendorName === vendorName)
                    .map(po => (
                    <option key={po._id} value={po.purchaseOrderNumber} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-2">Received Date <span className="text-red-500">*</span></label>
              <Input 
                type="date"
                className="h-10 text-[13px] rounded-md border-slate-300"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[13px] font-medium text-slate-700 mb-2">Billing From</label>
              <div className="relative">
                <select 
                  className="w-full h-10 rounded-md text-[13px] border border-slate-300 px-3 bg-white focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] appearance-none"
                  value={billingFrom}
                  onChange={(e) => setBillingFrom(e.target.value)}
                >
                  <option value="">Select Billing Company</option>
                  {billingCompanies.map(c => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

          </div>

          {/* Blurred / Active Section */}
          <div className={`transition-all duration-500 ${isBlurred ? 'opacity-40 blur-[2px] pointer-events-none select-none' : 'opacity-100'}`}>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 mb-12 border-b border-slate-100 pb-8">
              
              <div className="col-span-1">
                <label className="block text-[13px] font-medium text-slate-700 mb-2">Purchase Invoice#</label>
                <div className="relative">
                  <Input 
                    className="h-10 text-[13px] pr-8 rounded-md border-slate-300 bg-slate-50"
                    value={purchaseReceiveNumber}
                    onChange={(e) => setPurchaseReceiveNumber(e.target.value)}
                    placeholder="PR-00001"
                  />
                  <Settings className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-[13px] font-medium text-slate-700 mb-2">DI No</label>
                <Input 
                  className="h-10 text-[13px] rounded-md border-slate-300" 
                  value={diNo} 
                  onChange={e => setDiNo(e.target.value)} 
                  placeholder="Enter DI No"
                />
              </div>
              
              <div className="col-span-1">
                <label className="block text-[13px] font-medium text-slate-700 mb-2">DI Date</label>
                <Input 
                  type="date" 
                  className="h-10 text-[13px] rounded-md border-slate-300" 
                  value={diDate} 
                  onChange={e => setDiDate(e.target.value)} 
                />
              </div>
            </div>

            {/* Item Table */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TableIcon className="w-5 h-5 text-blue-500" />
                  <h3 className="text-[15px] font-semibold text-slate-700">Item Table</h3>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddItem} className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm pb-4">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-[2200px]">
                  <thead className="bg-[#f8f9fa] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-2 py-3 font-bold text-slate-500 whitespace-nowrap text-left"><span className="bg-blue-600 text-white px-1.5 py-0.5 rounded">PACKAGE</span> <span className="text-red-500">*</span></th>
                      <th className="px-2 py-3 font-bold text-slate-500 whitespace-nowrap text-left"><span className="bg-blue-600 text-white px-1.5 py-0.5 rounded">CIRCLE</span> <span className="text-red-500">*</span></th>
                      <th className="px-3 py-3 min-w-[140px]">Temp Code</th>
                      <th className="px-3 py-3 min-w-[180px]">Item Name</th>
                      <th className="px-3 py-3 min-w-[200px]">Description</th>
                      <th className="px-3 py-3 min-w-[120px]">LOA Serial No</th>
                      <th className="px-3 py-3 min-w-[100px]">HSN Code</th>
                      <th className="px-3 py-3 min-w-[100px] text-right">PO Qty</th>
                      <th className="px-3 py-3 min-w-[120px]">PO Date</th>
                      <th className="px-3 py-3 min-w-[100px] text-center">Inv Qty</th>
                      <th className="px-3 py-3 min-w-[80px]">Unit</th>
                      <th className="px-3 py-3 min-w-[80px] text-right">SRT</th>
                      <th className="px-3 py-3 min-w-[80px] text-right">ACT</th>
                      <th className="px-3 py-3 min-w-[100px] text-right">Tot Inv Qty</th>
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
                  <tbody>
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={20} className="px-4 py-8 text-center text-slate-500 text-[13px]">
                          Select a Purchase Order or click 'Add Item' to begin.
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
                               itemDescription: getVal('description') || getVal('itemDescription') || newItems[index].itemDescription,
                               loaSerialNo: getVal('loaSerialNo') || getVal('loaSerial') || getVal('sku') || '',
                               hsnCode: getVal('hsnCode') || getVal('hsn') || '',
                               unit: getVal('unit') || '',
                               gstType: newItems[index].gstType || 'Intra State',
                               cgst: Number(getVal('cgst')) || 0,
                               sgst: Number(getVal('sgst')) || 0,
                               igst: Number(getVal('igst')) || 0,
                               rate: Number(getVal('price') || getVal('costPrice') || getVal('sellingPrice')) || newItems[index].rate
                             };
                             newItems[index].amount = (Number(newItems[index].totalInvoiceQuantity) || 0) * (Number(newItems[index].rate) || 0);
                             const taxRate = newItems[index].gstType === 'Intra State' ? (newItems[index].cgst + newItems[index].sgst) : newItems[index].igst;
                             newItems[index].totalAmount = newItems[index].amount + (newItems[index].amount * taxRate / 100);
                             setLineItems(newItems);
                          } else {
                             updateLineItem(index, type === 'name' ? 'itemName' : type === 'tempCode' ? 'tempCode' : type === 'loaSerialNo' ? 'loaSerialNo' : 'itemDescription', identifier);
                          }
                        };

                        return (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors bg-white">
                            <td className="px-4 py-2 text-center text-[13px] text-slate-500 font-medium">
                              {index + 1}
                            </td>
                            <td className="px-2 py-2">
                              {item.isManual ? (
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
                              ) : (
                                <span className="text-[12px] px-2">{item.package || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {item.isManual ? (
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
                              ) : (
                                <span className="text-[12px] px-2">{item.circle || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {item.isManual ? (
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
                              ) : (
                                <span className="text-[12px] px-2">{item.tempCode || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {item.isManual ? (
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
                              ) : (
                                <span className="text-[12px] font-medium text-slate-700 px-2">{item.itemName || '-'}</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              <Select
                                options={Array.from(new Set(itemsList.map(i => i.dynamicData?.description || i.dynamicData?.itemDescription).filter(Boolean))).map(d => ({ value: d, label: String(d) }))}
                                value={item.itemDescription ? { value: item.itemDescription, label: item.itemDescription } : null}
                                onChange={(selected: any) => {
                                  if (selected) handleItemSelection(selected.value as string, 'description');
                                  else updateLineItem(index, 'itemDescription', '');
                                }}
                                onInputChange={(inputValue, { action }) => {
                                  if (action === 'input-change') updateLineItem(index, 'itemDescription', inputValue);
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
                              <Input type="number" placeholder="PO Qty" className="h-8 text-[12px] border-slate-200 bg-transparent px-2 text-right" value={item.poQuantity || 0} onChange={(e) => updateLineItem(index, 'poQuantity', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="date" className="h-8 text-[12px] border-slate-200 bg-transparent px-2" value={item.poDate ? String(item.poDate).split('T')[0] : ''} onChange={(e) => updateLineItem(index, 'poDate', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" className="h-8 text-[12px] border-slate-200 px-2 text-center bg-transparent" value={item.invoiceQuantity || 0} onChange={(e) => updateLineItem(index, 'invoiceQuantity', e.target.value)} />
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
                              <div className={`h-8 flex items-center justify-end px-2 text-[12px] border border-slate-200 rounded bg-slate-50 ${(Number(item.totalInvoiceQuantity) || 0) > (Number(item.invoiceQuantity) || 0) ? 'text-red-500 font-bold border-red-200 bg-red-50' : 'text-slate-700'}`}>
                                {item.totalInvoiceQuantity || 0}
                              </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Notes */}
              <div>
                <label className="flex items-center text-[13px] text-slate-700 font-medium mb-3">
                  <FileText className="w-4 h-4 mr-2 text-blue-500" /> Notes (For Internal Use)
                </label>
                <Textarea 
                  className="min-h-[120px] text-[13px] resize-y rounded-lg border-slate-200" 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Enter notes for internal use..."
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="flex items-center text-[13px] text-slate-700 font-medium mb-3">
                  <Paperclip className="w-4 h-4 mr-2 text-blue-500" /> Attach File(s) to Purchase Invoice
                </label>
                
                {uploadedDocs.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {uploadedDocs.map(doc => (
                      <div key={doc._id} className="text-[13px] text-blue-600 flex items-center">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="hover:underline">{doc.fileName}</a>
                      </div>
                    ))}
                  </div>
                )}

                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                />
                <div 
                  className="border border-dashed border-blue-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors bg-blue-50/30"
                  onClick={() => !isUploadingDoc && fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center text-[13px] text-blue-600 font-medium">
                    {isUploadingDoc ? (
                      <Loader2 className="w-5 h-5 mb-2 animate-spin" />
                    ) : (
                      <UploadCloud className="w-5 h-5 mb-2" />
                    )}
                    {isUploadingDoc ? "Uploading..." : "Upload File"}
                    <span className="text-slate-400 font-normal mt-1 text-[12px]">or drag and drop</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">You can upload a maximum of 5 files, 10MB each</p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200 mt-12">
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 bg-red-50/50">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
              <div className="flex items-center space-x-3">
                <Button variant="outline" className="text-slate-700 font-medium hover:bg-slate-50 border-slate-300 rounded-md" onClick={() => handleSubmit('Draft')}>
                  Save as Draft
                </Button>
                <div className="flex rounded-md shadow-sm">
                  <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium rounded-r-none border-r border-[#1d4ed8]" onClick={() => handleSubmit('Received')}>
                    Save Changes
                  </Button>
                  <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium rounded-l-none px-2">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>
                <Link href="/purchases/receives">
                  <Button variant="outline" className="text-slate-700 font-medium hover:text-slate-900 hover:bg-slate-100 border-slate-300 rounded-md">
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
