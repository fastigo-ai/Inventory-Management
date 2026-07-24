"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Settings, UploadCloud, FileText, Search, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { createDI } from "@/features/di/api/di.api";
import { getPurchaseOrders } from "@/features/purchases/api/purchases.api";
import { getItems } from "@/features/items/api/items.api";

const PACKAGES = ["Package 1 (S/N)", "Package 2 (R/R)"];

export default function NewDIRegistrationPage() {
  const router = useRouter();
  
  // Data State
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  
  // Form State
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [diNumber, setDiNumber] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [diPackage, setDiPackage] = useState("");
  const [diCircle, setDiCircle] = useState("");
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [diLetterCopy, setDiLetterCopy] = useState<File | null>(null);
  const [inspectionReportCopy, setInspectionReportCopy] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Add Modal & Custom Dropdown States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [selectedBulkItems, setSelectedBulkItems] = useState<string[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [openNameDropdownId, setOpenNameDropdownId] = useState<number | null>(null);
  const [openTempCodeDropdownId, setOpenTempCodeDropdownId] = useState<number | null>(null);
  
  // Outside click handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.item-dropdown-container')) {
        setOpenDropdownId(null);
        setOpenNameDropdownId(null);
        setOpenTempCodeDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Load POs and Items on mount
    getPurchaseOrders().then(res => setPurchaseOrders(Array.isArray(res.data) ? res.data : (res.data?.pos || res.data || [])));
    getItems({ limit: 1000 }).then(res => setItems(Array.isArray(res) ? res : (res?.items || [])));
    
    // Default Date
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handlePurchaseOrderChange = (poId: string) => {
    setPurchaseOrderId(poId);
    if (poId) {
      const po = purchaseOrders.find(p => p._id === poId);
      if (po && po.lineItems) {
        setLineItems(po.lineItems
          .filter((item: any) => !item.isCanceled)
          .map((item: any) => {
            const masterItem = items.find(it => it._id === item.itemId);
            return {
              itemId: item.itemId,
              itemName: item.itemName,
              sku: item.loaSerialNo || masterItem?.dynamicData?.loaSerialNo || masterItem?.dynamicData?.loaSerialNumber || masterItem?.dynamicData?.['LOA Serial No.'] || masterItem?.dynamicData?.loa || masterItem?.dynamicData?.sku || masterItem?.dynamicData?.tempCode || '',
              tempCode: item.tempCode || '',
              package: item.package || po.package1 || '',
              circle: item.circle || po.circle || '',
              orderedQuantity: item.quantity || 0,
              quantity: item.quantity || 0, // Default to full quantity for inspection
              readOnly: true
            };
        }));
      } else {
        setLineItems([]);
      }
    } else {
      setLineItems([]);
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setLineItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const removeLineItem = (index: number) => {
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  const handleSave = async (status: string) => {
    if (!diNumber) {
      alert("Please enter a DI Number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsToSave = lineItems.map(item => ({
        itemId: item.itemId,
        itemName: item.itemName,
        tempCode: item.tempCode,
        package: item.package,
        circle: item.circle,
        quantity: Number(item.quantity) || 0
      })).filter(i => i.quantity > 0);
      
      const formData = new FormData();
      formData.append('diNumber', diNumber);
      if (purchaseOrderId) formData.append('purchaseOrderId', purchaseOrderId);
      formData.append('date', date);
      formData.append('status', status === 'Draft' ? 'Draft' : 'Active');
      if (notes) formData.append('notes', notes);

      formData.append('lineItems', JSON.stringify(itemsToSave));

      if (diLetterCopy) {
        formData.append('diLetterCopyUrl', diLetterCopy);
      }
      if (inspectionReportCopy) {
        formData.append('inspectionReportCopyUrl', inspectionReportCopy);
      }

      await createDI(formData as any);
      router.push('/di'); // Assuming we will have a list page
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to register DI");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableCircles = diPackage?.includes("Package 1") 
    ? ["Solan", "Nahan"] 
    : diPackage?.includes("Package 2") 
      ? ["Rohru", "Rampur"] 
      : ["Solan", "Nahan", "Rohru", "Rampur"];

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

      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-32">
        {/* Form Fields */}
        <div className="grid grid-cols-12 gap-8 mb-12">
          {/* Left Column */}
          <div className="col-span-12 md:col-span-8 space-y-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4">DI Details</h3>
            
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-slate-700">Purchase Order</label>
              </div>
              <div className="col-span-9">
                <select
                  value={purchaseOrderId}
                  onChange={(e) => handlePurchaseOrderChange(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select Purchase Order</option>
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
                  className="h-10 transition-shadow focus-visible:ring-blue-500"
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
                  className="h-10 transition-shadow focus-visible:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="mb-12 border border-slate-200 rounded-lg overflow-visible">
          <div className="bg-[#f8f9fc] px-4 py-3 border-b border-slate-200 flex justify-between items-center rounded-t-lg">
            <h2 className="text-sm font-semibold text-slate-800">Approved DI Items</h2>
          </div>
          
          <div className="overflow-visible">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-[#f8f9fc] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%] whitespace-nowrap">LOA SERIAL NO</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">TEMP CODE</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%] whitespace-nowrap">ITEM NAME</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">PACKAGE</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">CIRCLE</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-[15%] whitespace-nowrap">DI QUANTITY</th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
              {lineItems.map((item, index) => (
                <tr key={index} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 relative item-dropdown-container">
                    {item.readOnly ? (
                      <Input 
                        value={item.sku || ''} 
                        readOnly
                        className="border-transparent bg-transparent h-8 shadow-none focus-visible:ring-0 px-0 font-medium"
                      />
                    ) : (
                      <div className="relative">
                        <div className="relative w-full flex items-center border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm h-8">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2" />
                          <input
                            type="text"
                            placeholder="Search LOA or Temp Code..."
                            className="w-full bg-transparent pl-7 pr-7 text-[13px] text-[#334155] focus:outline-none cursor-text h-full"
                            value={item.searchQuery ?? ''}
                            onChange={(e) => {
                              updateLineItem(index, 'searchQuery', e.target.value);
                              if (openDropdownId !== index) setOpenDropdownId(index);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openDropdownId !== index) setOpenDropdownId(index);
                              setOpenNameDropdownId(null);
                              setOpenTempCodeDropdownId(null);
                            }}
                          />
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 pointer-events-none" />
                        </div>

                        {openDropdownId === index && (
                          <div
                            className="absolute left-0 top-full mt-1 w-[350px] bg-white border border-slate-200 shadow-xl rounded-md z-50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="max-h-60 overflow-y-auto py-1">
                              {items
                                .filter(it => {
                                  const val = (item.searchQuery ?? '').toLowerCase();
                                  const sku = String(it.dynamicData?.loaSerialNo || it.dynamicData?.loaSerialNumber || it.dynamicData?.['LOA Serial No.'] || it.dynamicData?.loa || it.dynamicData?.sku || it.dynamicData?.tempCode || '').toLowerCase();
                                  const tempCode = String(it.dynamicData?.tempCode || it.tempCode || '').toLowerCase();
                                  return sku.includes(val) || tempCode.includes(val);
                                })
                                .map(it => {
                                  const sku = it.dynamicData?.loaSerialNo || it.dynamicData?.loaSerialNumber || it.dynamicData?.['LOA Serial No.'] || it.dynamicData?.loa || it.dynamicData?.sku || it.dynamicData?.tempCode || 'N/A';
                                  const name = it.dynamicData?.name || it.name || 'Unnamed Item';
                                  const tempCode = it.dynamicData?.tempCode || it.tempCode || '';
                                  return (
                                    <div
                                      key={it._id}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors"
                                      onClick={() => {
                                        const po = purchaseOrders.find(p => p._id === purchaseOrderId);
                                        const poLineItem = po?.lineItems?.find((li: any) => li.itemId === it._id);
                                        
                                        updateLineItem(index, 'itemId', it._id);
                                        updateLineItem(index, 'itemName', name);
                                        updateLineItem(index, 'sku', sku);
                                        updateLineItem(index, 'tempCode', tempCode);
                                        updateLineItem(index, 'package', it.dynamicData?.package || poLineItem?.package1 || '');
                                        updateLineItem(index, 'circle', it.dynamicData?.circle || poLineItem?.circle || '');
                                        updateLineItem(index, 'orderedQuantity', poLineItem ? (poLineItem.quantity || 0) : 0);
                                        updateLineItem(index, 'searchQuery', sku);
                                        setOpenDropdownId(null);
                                      }}
                                    >
                                      <span className="text-sm text-slate-800 font-medium">{name}</span>
                                      <span className="text-[10px] text-slate-500">LOA/SKU: {sku} | Temp Code: {tempCode || '--'}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 item-dropdown-container">
                    {item.readOnly ? (
                      <Input 
                        value={item.tempCode || ''} 
                        readOnly
                        placeholder="--"
                        className="border-transparent bg-transparent h-8 shadow-none focus-visible:ring-0 px-0 font-medium text-sm"
                      />
                    ) : (
                      <div className="relative">
                        <div className="relative w-full flex items-center border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm h-8">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2" />
                          <input
                            type="text"
                            placeholder="Search Temp Code..."
                            className="w-full bg-transparent pl-7 pr-7 text-[13px] text-[#334155] focus:outline-none cursor-text h-full"
                            value={item.tempCode ?? ''}
                            onChange={(e) => {
                              updateLineItem(index, 'tempCode', e.target.value);
                              if (openTempCodeDropdownId !== index) setOpenTempCodeDropdownId(index);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openTempCodeDropdownId !== index) setOpenTempCodeDropdownId(index);
                              setOpenDropdownId(null);
                              setOpenNameDropdownId(null);
                            }}
                          />
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 pointer-events-none" />
                        </div>
                        {openTempCodeDropdownId === index && (
                          <div
                            className="absolute left-0 top-full mt-1 w-[350px] bg-white border border-slate-200 shadow-xl rounded-md z-50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="max-h-60 overflow-y-auto py-1">
                              {items
                                .filter(it => {
                                  const val = (item.tempCode ?? '').toLowerCase();
                                  const tempCode = String(it.dynamicData?.tempCode || it.tempCode || '').toLowerCase();
                                  return tempCode.includes(val);
                                })
                                .map(it => {
                                  const sku = it.dynamicData?.loaSerialNo || it.dynamicData?.loaSerialNumber || it.dynamicData?.['LOA Serial No.'] || it.dynamicData?.loa || it.dynamicData?.sku || it.dynamicData?.tempCode || 'N/A';
                                  const name = it.dynamicData?.name || it.name || 'Unnamed Item';
                                  const tempCode = it.dynamicData?.tempCode || it.tempCode || '';
                                  return (
                                    <div
                                      key={it._id}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors"
                                      onClick={() => {
                                        const po = purchaseOrders.find(p => p._id === purchaseOrderId);
                                        const poLineItem = po?.lineItems?.find((li: any) => li.itemId === it._id);
                                        
                                        updateLineItem(index, 'itemId', it._id);
                                        updateLineItem(index, 'itemName', name);
                                        updateLineItem(index, 'sku', sku);
                                        updateLineItem(index, 'tempCode', tempCode);
                                        updateLineItem(index, 'package', it.dynamicData?.package || poLineItem?.package1 || '');
                                        updateLineItem(index, 'circle', it.dynamicData?.circle || poLineItem?.circle || '');
                                        updateLineItem(index, 'orderedQuantity', poLineItem ? (poLineItem.quantity || 0) : 0);
                                        updateLineItem(index, 'searchQuery', sku);
                                        setOpenTempCodeDropdownId(null);
                                      }}
                                    >
                                      <span className="text-sm text-slate-800 font-medium">{name}</span>
                                      <span className="text-[10px] text-slate-500">LOA/SKU: {sku} | Temp Code: {tempCode || '--'}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 item-dropdown-container">
                    {item.readOnly ? (
                      <Input 
                        value={item.itemName || ''} 
                        readOnly
                        placeholder="Item Name"
                        className="border-transparent bg-transparent h-8 shadow-none focus-visible:ring-0 px-0 font-medium text-sm text-slate-600"
                      />
                    ) : (
                      <div className="relative">
                        <div className="relative w-full flex items-center border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm h-8">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2" />
                          <input
                            type="text"
                            placeholder="Search Item..."
                            className="w-full bg-transparent pl-7 pr-7 text-[13px] text-[#334155] focus:outline-none cursor-text h-full"
                            value={item.itemName ?? ''}
                            onChange={(e) => {
                              updateLineItem(index, 'itemName', e.target.value);
                              if (openNameDropdownId !== index) setOpenNameDropdownId(index);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openNameDropdownId !== index) setOpenNameDropdownId(index);
                              setOpenDropdownId(null);
                              setOpenTempCodeDropdownId(null);
                            }}
                          />
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 pointer-events-none" />
                        </div>
                        {openNameDropdownId === index && (
                          <div
                            className="absolute left-0 top-full mt-1 w-[350px] bg-white border border-slate-200 shadow-xl rounded-md z-50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="max-h-60 overflow-y-auto py-1">
                              {items
                                .filter(it => {
                                  const val = (item.itemName ?? '').toLowerCase();
                                  const name = String(it.dynamicData?.name || it.name || '').toLowerCase();
                                  return name.includes(val);
                                })
                                .map(it => {
                                  const sku = it.dynamicData?.loaSerialNo || it.dynamicData?.loaSerialNumber || it.dynamicData?.['LOA Serial No.'] || it.dynamicData?.loa || it.dynamicData?.sku || it.dynamicData?.tempCode || 'N/A';
                                  const name = it.dynamicData?.name || it.name || 'Unnamed Item';
                                  const tempCode = it.dynamicData?.tempCode || it.tempCode || '';
                                  return (
                                    <div
                                      key={it._id}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors"
                                      onClick={() => {
                                        const po = purchaseOrders.find(p => p._id === purchaseOrderId);
                                        const poLineItem = po?.lineItems?.find((li: any) => li.itemId === it._id);
                                        
                                        updateLineItem(index, 'itemId', it._id);
                                        updateLineItem(index, 'itemName', name);
                                        updateLineItem(index, 'sku', sku);
                                        updateLineItem(index, 'tempCode', tempCode);
                                        updateLineItem(index, 'package', it.dynamicData?.package || poLineItem?.package1 || '');
                                        updateLineItem(index, 'circle', it.dynamicData?.circle || poLineItem?.circle || '');
                                        updateLineItem(index, 'orderedQuantity', poLineItem ? (poLineItem.quantity || 0) : 0);
                                        updateLineItem(index, 'searchQuery', sku);
                                        setOpenNameDropdownId(null);
                                      }}
                                    >
                                      <span className="text-sm text-slate-800 font-medium">{name}</span>
                                      <span className="text-[10px] text-slate-500">LOA/SKU: {sku} | Temp Code: {tempCode || '--'}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.package}
                      onChange={(e) => {
                        updateLineItem(index, 'package', e.target.value);
                        updateLineItem(index, 'circle', ''); 
                      }}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950"
                    >
                      <option value="" disabled>Select Package</option>
                      <option value="Package 1 (S/N)">Package 1 (S/N)</option>
                      <option value="Package 2 (R/R)">Package 2 (R/R)</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.circle}
                      onChange={(e) => updateLineItem(index, 'circle', e.target.value)}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:bg-slate-50 disabled:text-slate-400"
                      disabled={!item.package}
                    >
                      <option value="" disabled>Select Circle</option>
                      {(item.package || '').includes("Package 1") && (
                        <>
                          <option value="Solan">Solan</option>
                          <option value="Nahan">Nahan</option>
                        </>
                      )}
                      {(item.package || '').includes("Package 2") && (
                        <>
                          <option value="Rohru">Rohru</option>
                          <option value="Rampur">Rampur</option>
                        </>
                      )}
                      {!item.package?.includes("Package 1") && !item.package?.includes("Package 2") && (
                        <>
                          <option value="Solan">Solan</option>
                          <option value="Nahan">Nahan</option>
                          <option value="Rohru">Rohru</option>
                          <option value="Rampur">Rampur</option>
                        </>
                      )}
                    </select>
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
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex gap-4 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setLineItems([...lineItems, {
                  itemId: '',
                  itemName: '',
                  tempCode: '',
                  searchQuery: '',
                  package: diPackage,
                  circle: diCircle,
                  orderedQuantity: 0,
                  quantity: 0,
                  readOnly: false
                }]);
              }}
            >
              + Add Item
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkModalOpen(true)}
              className="text-[#3b82f6] border-[#bfdbfe] bg-white hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Items in Bulk
            </Button>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="grid grid-cols-12 gap-8 mb-8">
          <div className="col-span-12 md:col-span-6 space-y-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4">Inspection Notes & Attachments</h3>
            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-2 block">Inspector Notes</label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes from the government inspection..."
                className="min-h-[100px] resize-none"
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-medium text-slate-700 mb-2 block">DI Letter Copy (PDF Only)</label>
                <div className="mt-1 flex justify-center rounded-lg border border-dashed border-slate-300 px-6 py-6 hover:bg-slate-50 transition-colors bg-white relative group">
                  <div className="text-center">
                    <UploadCloud className="mx-auto h-8 w-8 text-slate-300 group-hover:text-blue-500 transition-colors" aria-hidden="true" />
                    <div className="mt-2 flex text-sm leading-6 text-slate-600 justify-center">
                      <label className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-600 focus-within:outline-none hover:text-blue-500">
                        <span>Upload file</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          accept="application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              if (e.target.files[0].type !== 'application/pdf') {
                                alert('Only PDF files are allowed.');
                                return;
                              }
                              setDiLetterCopy(e.target.files[0]);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                {diLetterCopy && (
                  <div className="mt-2 flex items-center justify-between py-2 px-3 border border-slate-200 rounded-md bg-white">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-slate-700 truncate w-48">{diLetterCopy.name}</span>
                    </div>
                    <button onClick={() => setDiLetterCopy(null)} className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[13px] font-medium text-slate-700 mb-2 block">Inspection Report Copy (PDF Only)</label>
                <div className="mt-1 flex justify-center rounded-lg border border-dashed border-slate-300 px-6 py-6 hover:bg-slate-50 transition-colors bg-white relative group">
                  <div className="text-center">
                    <UploadCloud className="mx-auto h-8 w-8 text-slate-300 group-hover:text-blue-500 transition-colors" aria-hidden="true" />
                    <div className="mt-2 flex text-sm leading-6 text-slate-600 justify-center">
                      <label className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-600 focus-within:outline-none hover:text-blue-500">
                        <span>Upload file</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          accept="application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              if (e.target.files[0].type !== 'application/pdf') {
                                alert('Only PDF files are allowed.');
                                return;
                              }
                              setInspectionReportCopy(e.target.files[0]);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                {inspectionReportCopy && (
                  <div className="mt-2 flex items-center justify-between py-2 px-3 border border-slate-200 rounded-md bg-white">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-slate-700 truncate w-48">{inspectionReportCopy.name}</span>
                    </div>
                    <button onClick={() => setInspectionReportCopy(null)} className="text-slate-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-slate-200 p-4 px-8 flex items-center justify-between z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
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

      {/* Bulk Add Items Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
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
                  placeholder="Search items by LOA Serial No, name, or code..."
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
                            setSelectedBulkItems(items.map(i => i._id));
                          } else {
                            setSelectedBulkItems([]);
                          }
                        }}
                        checked={selectedBulkItems.length === items.length && items.length > 0}
                      />
                    </th>
                    <th className="px-4 py-2 font-bold text-slate-500">LOA Serial No / SKU</th>
                    <th className="px-4 py-2 font-bold text-slate-500">Item Name</th>
                    <th className="px-4 py-2 font-bold text-slate-500">Temp Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items
                    .filter(item => {
                      const query = (bulkSearchQuery || '').toLowerCase();
                      const searchSku = String(item.dynamicData?.loaSerialNo || item.dynamicData?.loaSerialNumber || item.dynamicData?.['LOA Serial No.'] || item.dynamicData?.loa || item.dynamicData?.sku || item.dynamicData?.tempCode || '').toLowerCase();
                      const searchName = String(item.dynamicData?.name || item.dynamicData?.itemDescription || item.name || '').toLowerCase();
                      const searchCode = String(item.dynamicData?.tempCode || item.tempCode || '').toLowerCase();
                      return searchSku.includes(query) || searchName.includes(query) || searchCode.includes(query);
                    })
                    .map(item => {
                      const sku = item.dynamicData?.loaSerialNo || item.dynamicData?.loaSerialNumber || item.dynamicData?.['LOA Serial No.'] || item.dynamicData?.loa || item.dynamicData?.sku || item.dynamicData?.tempCode || 'N/A';
                      return (
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
                          <td className="px-4 py-3 text-slate-700 font-medium">{sku}</td>
                          <td className="px-4 py-3 text-slate-600">{item.dynamicData?.name || item.dynamicData?.itemDescription || 'Unnamed Item'}</td>
                          <td className="px-4 py-3 text-slate-500">{item.dynamicData?.tempCode || '--'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {items.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm">No items found in your inventory.</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">{selectedBulkItems.length} items selected</span>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={() => {
                  const po = purchaseOrders.find(p => p._id === purchaseOrderId);
                  const newLineItems = selectedBulkItems.map(itemId => {
                    const item = items.find(i => i._id === itemId);
                    if (item) {
                      const poLineItem = po?.lineItems?.find((li: any) => li.itemId === itemId);
                      const sku = item.dynamicData?.loaSerialNo || item.dynamicData?.loaSerialNumber || item.dynamicData?.['LOA Serial No.'] || item.dynamicData?.loa || item.dynamicData?.sku || item.dynamicData?.tempCode || '';
                      return {
                        itemId: item._id,
                        itemName: item.dynamicData?.name || item.dynamicData?.itemDescription || 'Unnamed Item',
                        tempCode: item.dynamicData?.tempCode || '',
                        sku: sku,
                        searchQuery: sku,
                        package: item.dynamicData?.package || poLineItem?.package1 || '',
                        circle: item.dynamicData?.circle || poLineItem?.circle || '',
                        orderedQuantity: poLineItem ? (poLineItem.quantity || 0) : 0,
                        quantity: 0,
                        readOnly: false
                      };
                    }
                    return null;
                  }).filter(Boolean);

                  if (newLineItems.length > 0) {
                    setLineItems([...lineItems, ...newLineItems]);
                  }
                  setIsBulkModalOpen(false);
                  setSelectedBulkItems([]);
                }} disabled={selectedBulkItems.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-[#3b82f6] rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
