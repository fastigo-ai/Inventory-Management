"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Settings, UploadCloud, ChevronDown, User, Table as TableIcon, Trash2, Paperclip, FileText, Plus, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { getPurchaseReceiveById, updatePurchaseReceive, deletePurchaseReceive } from "@/features/purchases/api/purchases.api";
import { getVendors } from "@/features/vendors/api/vendors.api";
import { getPurchaseOrders } from "@/features/purchases/api/purchases.api";
import { getItems } from "@/features/items/api/items.api";
import { uploadDocument } from "@/features/documents/api/documents.api";
import { getBillingCompanies } from "@/features/settings/api/billingCompanies.api";

export default function EditPurchaseReceivePage() {
  const router = useRouter();
  const params = useParams();
  const prId = params.id as string;
  
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
  const [status, setStatus] = useState<string>("Draft");
  
  // Extra fields
  const [diNo, setDiNo] = useState("");
  const [diDate, setDiDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [dropdownSearchQueries, setDropdownSearchQueries] = useState<{[key: number]: string}>({});

  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Close dropdowns when clicking outside
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    Promise.all([
      getVendors({ limit: 100 }).then(res => setVendors(res.vendors || res)),
      getPurchaseOrders().then(res => setPurchaseOrders(Array.isArray(res.data) ? res.data : (res.data?.pos || res.data || []))),
      getItems({ limit: 1000 }).then(res => setItemsList(res.items || res.data || res)),
      getBillingCompanies().then(res => setBillingCompanies(res.data || [])),
      getPurchaseReceiveById(prId).then(data => {
        setVendorName(data.vendorName || "");
        setPurchaseOrderInput(data.purchaseOrderNumber || "");
        setPurchaseReceiveNumber(data.purchaseReceiveNumber || "");
        setReceiveDate(data.receiveDate ? new Date(data.receiveDate).toISOString().split('T')[0] : "");
        setBillingFrom(data.billingFrom || "");
        setDiNo(data.diNo || "");
        setDiDate(data.diDate ? new Date(data.diDate).toISOString().split('T')[0] : "");
        setNotes(data.notes || "");
        setStatus(data.status || "Draft");
        
        if (data.lineItems) {
          setLineItems(data.lineItems);
        }
        if (data.attachments) {
          setUploadedDocs(data.attachments.map((a: any) => ({ _id: a._id || Math.random().toString(), fileName: a.name, url: a.url })));
        }
      })
    ]).finally(() => {
      setIsLoading(false);
      // Allow the PO auto-fetching logic to run only after initial data is set
      setTimeout(() => setInitialLoadDone(true), 500);
    });
  }, [prId]);

  // When vendor changes, filter POs
  useEffect(() => {
    if (initialLoadDone && vendorName) {
      if (!receiveDate) {
        setReceiveDate(new Date().toISOString().split('T')[0]);
      }
      const vendorPOs = purchaseOrders.filter(po => po.vendorName === vendorName);
      if (vendorPOs.length > 0) {
        setPurchaseOrderInput(vendorPOs[0].purchaseOrderNumber);
      } else {
        setPurchaseOrderInput(""); 
      }
    }
  }, [vendorName, purchaseOrders, initialLoadDone]);

  // When PO changes, populate line items
  useEffect(() => {
    if (initialLoadDone && purchaseOrderInput) {
      const po = purchaseOrders.find(p => p.purchaseOrderNumber === purchaseOrderInput);
      if (po && po.lineItems) {
        setLineItems(po.lineItems.map((item: any) => ({
          itemId: item.itemId,
          loaSerialNo: item.loaSerialNo || '',
          itemName: item.itemName,
          itemDescription: item.description || '',
          tempCode: item.tempCode || '',
          package: item.package || '',
          circle: item.circle || '',
          poQuantity: item.quantity || 0,
          invoiceQuantity: item.quantity || 0,
          srt: 0,
          act: 0,
          totalInvoiceQuantity: 0,
          unit: item.unit || '',
          rate: item.rate || 0,
          amount: 0
        })));
      } else {
        setLineItems([]);
      }
    }
  }, [purchaseOrderInput, purchaseOrders, initialLoadDone]);

  // Recalculate amount when quantityToReceive or rate changes
  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    
    // Auto calculate amount and total quantity
    if (field === 'srt' || field === 'act' || field === 'rate') {
      const srt = Number(newItems[index].srt) || 0;
      const act = Number(newItems[index].act) || 0;
      const rate = Number(newItems[index].rate) || 0;
      newItems[index].totalInvoiceQuantity = srt + act;
      newItems[index].amount = newItems[index].totalInvoiceQuantity * rate;
    }

    setLineItems(newItems);
  };

  const handleSubmit = async (submitStatus: 'Draft' | 'Received') => {
    if (!vendorName || !purchaseReceiveNumber || !receiveDate) {
      alert("Please fill in the required fields");
      return;
    }

    const hasInvalidQuantity = lineItems.some(item => (Number(item.totalInvoiceQuantity) || 0) > (Number(item.invoiceQuantity) || 0));
    if (hasInvalidQuantity) {
      alert("Total Invoice Quantity cannot be greater than Invoice Quantity");
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
        status: submitStatus,
        attachments: uploadedDocs.map(doc => ({ name: doc.fileName, url: doc.url }))
      };

      await updatePurchaseReceive(prId, payload);
      router.push('/purchases/receives');
    } catch (error) {
      console.error("Failed to update PR", error);
      alert("Failed to update Purchase Invoice");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this Purchase Invoice?")) return;
    try {
      await deletePurchaseReceive(prId);
      router.push('/purchases/receives');
    } catch (error) {
      console.error("Failed to delete PR", error);
      alert("Failed to delete Purchase Invoice");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#fcfcfc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4285f4]" />
      </div>
    );
  }

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        isManual: true,
        itemId: '',
        loaSerialNo: '',
        itemName: '',
        itemDescription: '',
        package: '',
        circle: '',
        poQuantity: 0,
        invoiceQuantity: 0,
        srt: 0,
        act: 0,
        totalInvoiceQuantity: 0,
        amount: 0
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
          <h1 className="text-xl text-slate-800 font-semibold tracking-tight">Edit Purchase Invoice</h1>
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
                    disabled // PR number is usually not editable once created
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
              <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-[1000px]">
                  <thead className="bg-[#f8f9fa] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3 min-w-[120px]">LOA SERIAL NO</th>
                      <th className="px-4 py-3 min-w-[300px]">ITEM DESCRIPTION</th>
                      <th className="px-4 py-3 min-w-[150px]">ITEM NAME</th>
                      <th className="px-4 py-3 w-32">PACKAGE</th>
                      <th className="px-4 py-3 min-w-[140px]">CIRCLE</th>
                      <th className="px-4 py-3 min-w-[120px] text-center">PO QTY</th>
                      <th className="px-4 py-3 min-w-[120px] text-center">INV. QTY</th>
                      <th className="px-4 py-3 min-w-[120px] text-center">SRT</th>
                      <th className="px-4 py-3 min-w-[120px] text-center">ACT</th>
                      <th className="px-4 py-3 min-w-[120px] text-center">TOTAL INV QTY</th>
                      <th className="px-4 py-3 w-28 text-right">AMOUNT</th>
                      <th className="px-4 py-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-4 py-8 text-center text-slate-500 text-[13px]">
                          Select a Purchase Order to view items.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center text-[13px] text-slate-500 align-top">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-slate-700 align-top">
                            {item.loaSerialNo || '-'}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-slate-700 whitespace-normal break-words min-w-[300px] align-top">
                            {item.itemDescription || '-'}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-slate-700 align-top relative item-dropdown-container">
                            {item.isManual ? (
                              <>
                                <div className="relative w-full flex items-center border-b border-dashed border-slate-400 pb-1">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-0" />
                                  <input
                                    type="text"
                                    placeholder="Search by name or code..."
                                    className="w-full bg-transparent pl-5 text-[13px] text-[#334155] focus:outline-none cursor-text"
                                    value={dropdownSearchQueries[index] !== undefined ? dropdownSearchQueries[index] : (item.itemName || '')}
                                    onChange={(e) => {
                                      setDropdownSearchQueries(prev => ({ ...prev, [index]: e.target.value }));
                                      if (openDropdownId !== index) setOpenDropdownId(index);
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (openDropdownId !== index) setOpenDropdownId(index);
                                    }}
                                  />
                                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none" />
                                </div>
                                {openDropdownId === index && (
                                  <div
                                    className="absolute left-0 top-full mt-1 w-[300px] bg-white border border-slate-200 shadow-xl rounded-md z-50 overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="max-h-60 overflow-y-auto py-1">
                                      {itemsList
                                        .filter(dbItem => {
                                          const inputValue = dropdownSearchQueries[index] !== undefined ? dropdownSearchQueries[index] : (item.itemName || '');
                                          const sq = String(inputValue).toLowerCase();
                                          const nameStr = String(dbItem.dynamicData?.name || dbItem.dynamicData?.itemDescription || '').toLowerCase();
                                          const codeStr = String(dbItem.dynamicData?.tempCode || dbItem.dynamicData?.sku || '').toLowerCase();
                                          return nameStr.includes(sq) || codeStr.includes(sq);
                                        })
                                        .map(dbItem => (
                                          <div
                                            key={dbItem._id}
                                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors border-b border-slate-100 last:border-0"
                                            onClick={() => {
                                              const d = dbItem.dynamicData || {};
                                              const getVal = (key: string) => {
                                                if (d[key] !== undefined) return d[key];
                                                const lowerKey = key.toLowerCase();
                                                const foundKey = Object.keys(d).find(k => k.toLowerCase() === lowerKey);
                                                return foundKey ? d[foundKey] : '';
                                              };

                                              updateLineItem(index, 'itemId', dbItem._id);
                                              updateLineItem(index, 'itemName', getVal('name') || getVal('itemDescription') || 'Item');
                                              updateLineItem(index, 'itemDescription', getVal('description') || getVal('itemDescription') || '');
                                              updateLineItem(index, 'loaSerialNo', getVal('loaSerialNo') || getVal('loaSerialNumber') || getVal('LOA Serial No.') || getVal('loa') || getVal('sku') || '');
                                              updateLineItem(index, 'package', getVal('package') || '');
                                              updateLineItem(index, 'circle', getVal('circle') || '');
                                              updateLineItem(index, 'rate', getVal('price') || getVal('costPrice') || getVal('sellingPrice') || 0);
                                              
                                              setOpenDropdownId(null);
                                              setDropdownSearchQueries(prev => {
                                                const newQueries = { ...prev };
                                                delete newQueries[index];
                                                return newQueries;
                                              });
                                            }}
                                          >
                                            <span className="text-[13px] text-slate-800 font-medium">{dbItem.dynamicData?.name || dbItem.dynamicData?.itemDescription || 'Unnamed Item'}</span>
                                            <span className="text-[11px] text-slate-500">Code: {dbItem.dynamicData?.tempCode || dbItem.dynamicData?.sku || '--'}</span>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              item.itemName || '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-slate-700 align-top">
                            {item.package || '-'}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <select 
                              className="w-full h-8 rounded text-[13px] border border-slate-200 px-2 bg-white focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] transition-colors"
                              value={item.circle}
                              onChange={(e) => updateLineItem(index, 'circle', e.target.value)}
                            >
                              <option value="">Select</option>
                              <option value="Solan">Solan</option>
                              <option value="Nahan">Nahan</option>
                              <option value="Rampur">Rampur</option>
                              <option value="Rohru">Rohru</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <Input 
                              type="number" 
                              className="h-8 w-full text-[13px] text-center border-slate-200 focus:border-blue-500 bg-white"
                              value={item.poQuantity || 0}
                              onChange={(e) => updateLineItem(index, 'poQuantity', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Input 
                              type="number" 
                              className="h-8 w-full text-[13px] text-center border-slate-200 focus:border-blue-500 bg-white"
                              value={item.invoiceQuantity}
                              onChange={(e) => updateLineItem(index, 'invoiceQuantity', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Input 
                              type="number" 
                              className="h-8 w-full text-[13px] text-center border-slate-200 focus:border-blue-500 bg-white"
                              value={item.srt}
                              onChange={(e) => updateLineItem(index, 'srt', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Input 
                              type="number" 
                              className="h-8 w-full text-[13px] text-center border-slate-200 focus:border-blue-500 bg-white"
                              value={item.act}
                              onChange={(e) => updateLineItem(index, 'act', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <div className={`h-8 flex items-center justify-center text-[13px] border border-slate-200 rounded bg-white ${(Number(item.totalInvoiceQuantity) || 0) > (Number(item.invoiceQuantity) || 0) ? 'text-red-500 font-bold border-red-200' : 'text-slate-700'}`}>
                              {item.totalInvoiceQuantity}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <span className="text-[13px] font-medium text-slate-700 px-3">
                              ₹{(Number(item.amount) || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <button 
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Delete Item"
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
              <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 bg-red-50/50" onClick={handleDelete}>
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
