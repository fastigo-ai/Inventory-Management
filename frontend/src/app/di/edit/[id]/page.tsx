"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Settings, UploadCloud, FileText } from "lucide-react";
import Link from "next/link";
import { getDIById, updateDI } from "@/features/di/api/di.api";
import { getPurchaseOrders } from "@/features/purchases/api/purchases.api";
import { getItems } from "@/features/items/api/items.api";

const PACKAGES = ["Package 1 (S/N)", "Package 2 (R/R)"];

export default function EditDIRegistrationPage() {
  const router = useRouter();
  const { id } = useParams();
  
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Load POs and Items on mount
    Promise.all([
      getPurchaseOrders(),
      getItems({ limit: 1000 }),
      getDIById(id as string)
    ]).then(([posRes, itemsRes, diRes]) => {
      setPurchaseOrders(Array.isArray(posRes.data) ? posRes.data : (posRes.data?.pos || posRes.data || []));
      setItems(Array.isArray(itemsRes) ? itemsRes : (itemsRes?.items || []));
      
      // Hydrate DI
      if (diRes) {
        setPurchaseOrderId(diRes.purchaseOrderId || "");
        setDiNumber(diRes.diNumber || "");
        setDate(diRes.date ? new Date(diRes.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setNotes(diRes.notes || "");
        setDiPackage(diRes.package || "");
        setDiCircle(diRes.circle || "");
        setLineItems(diRes.lineItems || []);
        setExistingAttachments(diRes.attachments || []);
      }
      setTimeout(() => setIsInitialLoad(false), 100);
    }).catch(console.error);
  }, [id]);

  // When PO changes, populate line items (skip on initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    if (purchaseOrderId) {
      const po = purchaseOrders.find(p => p._id === purchaseOrderId);
      if (po && po.lineItems) {
        setLineItems(po.lineItems
          .filter((item: any) => !item.isCanceled)
          .map((item: any) => {
            const masterItem = items.find(it => it._id === item.itemId);
            return {
              itemId: item.itemId,
              itemName: item.itemName,
              sku: masterItem?.dynamicData?.sku || '',
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
  }, [purchaseOrderId, purchaseOrders, items]);

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
      formData.append('purchaseOrderId', purchaseOrderId);
      formData.append('date', date);
      formData.append('status', status === 'Draft' ? 'Draft' : 'Pending Receipt');
      if (notes) formData.append('notes', notes);
      if (diPackage) formData.append('package', diPackage);
      if (diCircle) formData.append('circle', diCircle);
      formData.append('lineItems', JSON.stringify(itemsToSave));

      if (existingAttachments.length > 0) {
        formData.append('existingAttachments', JSON.stringify(existingAttachments));
      }
      attachments.forEach(file => {
        formData.append('files', file);
      });

      await updateDI(id as string, formData as any);
      router.push('/di'); // Assuming we will have a list page
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to register DI");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableCircles = diPackage === "Package 1 (S/N)" 
    ? ["Solan", "Nahan"] 
    : diPackage === "Package 2 (R/R)" 
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

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-slate-700">Package</label>
              </div>
              <div className="col-span-9">
                <select
                  value={diPackage}
                  onChange={(e) => setDiPackage(e.target.value)}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select Package</option>
                  {PACKAGES.map((pkg, i) => (
                    <option key={i} value={pkg}>{pkg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <label className="text-[13px] font-medium text-slate-700">Circle</label>
              </div>
              <div className="col-span-9">
                <select
                  value={diCircle}
                  onChange={(e) => setDiCircle(e.target.value)}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled>Select Circle</option>
                  {availableCircles.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
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
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%]">LOA SERIAL NO</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-[25%]">ITEM DETAILS</th>
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
                    {item.readOnly ? (
                      <Input 
                        value={item.sku || ''} 
                        readOnly
                        className="border-transparent bg-transparent h-8 shadow-none focus-visible:ring-0 px-0 font-medium"
                      />
                    ) : (
                      <>
                        <Input
                          type="text"
                          list={`items-list-${index}`}
                          placeholder="Search LOA No..."
                          value={item.searchQuery ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateLineItem(index, 'searchQuery', val);
                            const selected = items.find(it => `[${it.dynamicData?.sku || it.dynamicData?.tempCode || 'N/A'}] ${it.dynamicData?.name || 'Unnamed Item'}` === val);
                            if (selected) {
                              const po = purchaseOrders.find(p => p._id === purchaseOrderId);
                              const poLineItem = po?.lineItems?.find((li: any) => li.itemId === selected._id);
                              
                              updateLineItem(index, 'itemId', selected._id);
                              updateLineItem(index, 'itemName', selected.dynamicData?.name || '');
                              updateLineItem(index, 'tempCode', selected.dynamicData?.tempCode || '');
                              updateLineItem(index, 'orderedQuantity', poLineItem ? (poLineItem.quantity || 0) : 0);
                            } else {
                              updateLineItem(index, 'itemId', '');
                              updateLineItem(index, 'itemName', '');
                              updateLineItem(index, 'tempCode', '');
                              updateLineItem(index, 'orderedQuantity', 0);
                            }
                          }}
                          className="h-8 w-full border-slate-200 bg-white shadow-sm focus-visible:ring-1 text-sm font-medium"
                        />
                        <datalist id={`items-list-${index}`}>
                          {items.map(it => {
                            const sku = it.dynamicData?.sku || it.dynamicData?.tempCode || 'N/A';
                            const name = it.dynamicData?.name || 'Unnamed Item';
                            return (
                              <option key={it._id} value={`[${sku}] ${name}`} />
                            );
                          })}
                        </datalist>
                      </>
                    )}
                  </td>
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
                    <select
                      value={item.circle}
                      onChange={(e) => updateLineItem(index, 'circle', e.target.value)}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:bg-slate-50 disabled:text-slate-400"
                      disabled={!item.package}
                    >
                      <option value="" disabled>Select Circle</option>
                      {item.package === "Package 1 (S/N)" && (
                        <>
                          <option value="Solan">Solan</option>
                          <option value="Nahan">Nahan</option>
                        </>
                      )}
                      {item.package === "Package 2 (R/R)" && (
                        <>
                          <option value="Rohru">Rohru</option>
                          <option value="Rampur">Rampur</option>
                        </>
                      )}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.package}
                      onChange={(e) => {
                        updateLineItem(index, 'package', e.target.value);
                        updateLineItem(index, 'circle', ''); // Reset circle when package changes
                      }}
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-950"
                    >
                      <option value="" disabled>Select Package</option>
                      <option value="Package 1 (S/N)">Package 1 (S/N)</option>
                      <option value="Package 2 (R/R)">Package 2 (R/R)</option>
                    </select>
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
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
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
          </div>
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
            <div>
              <label className="text-[13px] font-medium text-slate-700 mb-2 block">Attachments (PDF Only)</label>
              
              <div className="mt-1 flex justify-center rounded-lg border border-dashed border-slate-300 px-6 py-8 hover:bg-slate-50 transition-colors bg-white relative group">
                <div className="text-center">
                  <UploadCloud className="mx-auto h-10 w-10 text-slate-300 group-hover:text-blue-500 transition-colors" aria-hidden="true" />
                  <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-transparent font-semibold text-blue-600 focus-within:outline-none hover:text-blue-500"
                    >
                      <span>Upload files</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        accept="application/pdf"
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            const files = Array.from(e.target.files);
                            const validFiles = files.filter(f => f.type === 'application/pdf');
                            if (validFiles.length !== files.length) {
                              alert('Only PDF files are allowed.');
                            }
                            setAttachments(prev => [...prev, ...validFiles]);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs leading-5 text-slate-500 mt-1">PDF documents up to 10MB</p>
                </div>
              </div>

              {(existingAttachments.length > 0 || attachments.length > 0) && (
                <ul role="list" className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
                  {existingAttachments.map((file, index) => (
                    <li key={`existing-${index}`} className="flex items-center justify-between py-3 pl-3 pr-4 text-sm leading-6 hover:bg-slate-50 transition-colors">
                      <div className="flex w-0 flex-1 items-center">
                        <FileText className="h-5 w-5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                        <div className="ml-4 flex min-w-0 flex-1 gap-2">
                          <span className="truncate font-medium text-slate-700">{file.name}</span>
                          <span className="flex-shrink-0 text-slate-400">Already Uploaded</span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setExistingAttachments(existingAttachments.filter((_, i) => i !== index))}
                          className="font-medium text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {attachments.map((file, index) => (
                    <li key={`new-${index}`} className="flex items-center justify-between py-3 pl-3 pr-4 text-sm leading-6 hover:bg-slate-50 transition-colors">
                      <div className="flex w-0 flex-1 items-center">
                        <FileText className="h-5 w-5 flex-shrink-0 text-blue-500" aria-hidden="true" />
                        <div className="ml-4 flex min-w-0 flex-1 gap-2">
                          <span className="truncate font-medium text-slate-700">{file.name}</span>
                          <span className="flex-shrink-0 text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                          className="font-medium text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
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
