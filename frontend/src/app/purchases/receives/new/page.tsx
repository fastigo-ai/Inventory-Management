"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Settings, UploadCloud, ChevronDown } from "lucide-react";
import Link from "next/link";
import { createPurchaseReceive, getNextPurchaseReceiveNumber } from "@/features/purchases/api/purchases.api";
import { getVendors } from "@/features/vendors/api/vendors.api";
import { getPurchaseOrders } from "@/features/purchases/api/purchases.api";
import { uploadDocument } from "@/features/documents/api/documents.api";
import { Loader2 } from "lucide-react";

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
  
  // Extra fields
  const [diNo, setDiNo] = useState("");
  const [diDate, setDiDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load vendors on mount
    getVendors({ limit: 100 }).then(res => setVendors(res.vendors || res));
    getPurchaseOrders().then(res => setPurchaseOrders(Array.isArray(res.data) ? res.data : (res.data?.pos || res.data || [])));
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
          itemId: item.itemId,
          itemName: item.itemName,
          tempCode: item.tempCode || '',
          ordered: item.quantity || 0,
          received: 0,
          inTransit: 0,
          quantityToReceive: item.quantity || 0,
          package: "",
          subPackage: "",
          unit: "",
          rate: item.rate || 0,
          amount: item.amount || 0
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
    
    // Auto calculate amount
    if (field === 'quantityToReceive' || field === 'rate') {
      const qty = Number(newItems[index].quantityToReceive) || 0;
      const rate = Number(newItems[index].rate) || 0;
      newItems[index].amount = qty * rate;
    }

    // Auto reset subPackage when package changes
    if (field === 'package') {
      newItems[index].subPackage = "";
    }

    setLineItems(newItems);
  };

  const handleSubmit = async (status: 'Draft' | 'Received') => {
    if (!vendorName || !purchaseReceiveNumber || !receiveDate) {
      alert("Please fill in the required fields");
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
      alert("Failed to save Purchase Receive");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceType", "Purchase Receive");
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

  const isBlurred = !vendorName;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-none h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-[#f8f9fa]">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          <h1 className="text-xl text-slate-800 font-semibold tracking-tight">New Purchase Receive</h1>
        </div>
        <Link href="/purchases/receives">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-200 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-8 bg-[#fcfcfc]">
        <div className="max-w-[1200px] mx-auto bg-white p-8 shadow-sm border border-slate-200 rounded-lg">
          
          {/* Top Section (Always Active) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
            <div className="md:col-span-2 text-right pt-2">
              <label className="text-[13px] text-red-500 font-medium">Vendor Name*</label>
            </div>
            <div className="md:col-span-5 relative">
              <select 
                className="w-full h-9 rounded text-[13px] border border-slate-300 px-3 bg-white focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2]"
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
              {vendorName && (
                <div className="absolute -left-5 top-2.5">
                  <div className="w-3 h-3 bg-[#4285f4] rounded-full border-2 border-white shadow-sm"></div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-10 pb-6 border-b border-slate-100">
            <div className="md:col-span-2 text-right pt-2">
              <label className="text-[13px] text-red-500 font-medium">Purchase Order#*</label>
            </div>
            <div className="md:col-span-5 relative">
              <input 
                list="po-list"
                className="w-full h-9 rounded text-[13px] border border-slate-300 px-3 bg-white focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] disabled:bg-slate-50 disabled:text-slate-500"
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

          {/* Blurred / Active Section */}
          <div className={`transition-all duration-500 ${isBlurred ? 'opacity-40 blur-[2px] pointer-events-none select-none' : 'opacity-100'}`}>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-y-5 gap-x-6 mb-12">
              
              <div className="md:col-span-2 text-right pt-2">
                <label className="text-[13px] text-red-500 font-medium">Purchase Receive#*</label>
              </div>
              <div className="md:col-span-4 relative">
                <Input 
                  className="h-9 text-[13px] pr-8"
                  value={purchaseReceiveNumber}
                  onChange={(e) => setPurchaseReceiveNumber(e.target.value)}
                />
                <Settings className="w-4 h-4 text-blue-300 absolute right-3 top-2.5" />
              </div>
              <div className="md:col-span-6"></div>

              <div className="md:col-span-2 text-right pt-2">
                <label className="text-[13px] text-red-500 font-medium">Received Date*</label>
              </div>
              <div className="md:col-span-4">
                <Input 
                  type="date"
                  className="h-9 text-[13px]"
                  value={receiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                />
              </div>
              <div className="md:col-span-6"></div>

              <div className="md:col-span-2 text-right pt-2">
                <label className="text-[13px] text-slate-500 font-medium">DI NO</label>
              </div>
              <div className="md:col-span-4">
                <Input className="h-9 text-[13px]" value={diNo} onChange={e => setDiNo(e.target.value)} />
              </div>
              
              <div className="md:col-span-2 text-right pt-2">
                <label className="text-[13px] text-slate-500 font-medium">DI Date</label>
              </div>
              <div className="md:col-span-4">
                <Input type="date" className="h-9 text-[13px]" value={diDate} onChange={e => setDiDate(e.target.value)} />
              </div>
            </div>

            {/* Item Table */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Item Table</h3>
              <div className="border border-slate-200 rounded overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap min-w-[1000px]">
                  <thead className="bg-[#f8f9fa] border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 min-w-[150px]">ITEM DESCRIPTION</th>
                      <th className="px-4 py-3 w-40">PACKAGE</th>
                      <th className="px-4 py-3 w-40">LOCATION</th>
                      <th className="px-4 py-3 w-20 text-center">UNIT</th>
                      <th className="px-4 py-3 w-28 text-right">QUANTITY</th>
                      <th className="px-4 py-3 w-28 text-right">RATE</th>
                      <th className="px-4 py-3 w-28 text-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-[13px]">
                          Select a Purchase Order to view items.
                        </td>
                      </tr>
                    ) : (
                      lineItems.map((item, index) => (
                        <tr key={index} className="border-b border-slate-100 group">
                          <td className="px-4 py-3">
                            <Input 
                              className="h-8 text-[13px] border-transparent group-hover:border-slate-300 focus:border-blue-500 bg-transparent transition-colors"
                              value={item.itemName}
                              onChange={(e) => updateLineItem(index, 'itemName', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              className="w-full h-8 rounded text-[13px] border border-transparent group-hover:border-slate-300 px-2 bg-transparent focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] transition-colors"
                              value={item.package}
                              onChange={(e) => updateLineItem(index, 'package', e.target.value)}
                            >
                              <option value="">Select</option>
                              <option value="Package 1 (S/N)">Package 1 (S/N)</option>
                              <option value="Package 2 (R/R)">Package 2 (R/R)</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              className="w-full h-8 rounded text-[13px] border border-transparent group-hover:border-slate-300 px-2 bg-transparent focus:outline-none focus:border-[#0076f2] focus:ring-1 focus:ring-[#0076f2] transition-colors"
                              value={item.subPackage}
                              onChange={(e) => updateLineItem(index, 'subPackage', e.target.value)}
                              disabled={!item.package}
                            >
                              <option value="">Select Location</option>
                              {item.package === "Package 1 (S/N)" && (
                                <>
                                  <option value="Solan">Solan</option>
                                  <option value="Nahan">Nahan</option>
                                </>
                              )}
                              {item.package === "Package 2 (R/R)" && (
                                <>
                                  <option value="Rampur">Rampur</option>
                                  <option value="Rohru">Rohru</option>
                                </>
                              )}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <Input 
                              className="h-8 text-[13px] text-center border-transparent group-hover:border-slate-300 focus:border-blue-500 bg-transparent transition-colors"
                              value={item.unit}
                              onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                              placeholder="e.g., pcs"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input 
                              type="number" 
                              className="h-8 text-[13px] text-right border-transparent group-hover:border-slate-300 focus:border-blue-500 bg-transparent transition-colors"
                              value={item.quantityToReceive}
                              onChange={(e) => updateLineItem(index, 'quantityToReceive', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input 
                              type="number" 
                              className="h-8 text-[13px] text-right border-transparent group-hover:border-slate-300 focus:border-blue-500 bg-transparent transition-colors"
                              value={item.rate}
                              onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-[13px] font-medium text-slate-700 px-3">
                              ₹{(Number(item.amount) || 0).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-8">
              <label className="block text-[13px] text-slate-500 font-medium mb-2">Notes (For Internal Use)</label>
              <Textarea 
                className="min-h-[100px] text-[13px] resize-y" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Attachments */}
            <div className="mb-12">
              <label className="block text-[13px] text-slate-500 font-medium mb-2">Attach File(s) to Purchase Receive</label>
              
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
                className="border border-dashed border-slate-300 rounded p-4 inline-flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => !isUploadingDoc && fileInputRef.current?.click()}
              >
                <div className="flex items-center text-sm text-[#0076f2] font-medium">
                  {isUploadingDoc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                  {isUploadingDoc ? "Uploading..." : "Upload File"}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">You can upload a maximum of 5 files, 10MB each</p>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center space-x-3 pt-6 border-t border-slate-200">
              <Button variant="outline" className="text-slate-700 font-normal hover:bg-slate-50" onClick={() => handleSubmit('Draft')}>
                Save as Draft
              </Button>
              <div className="flex rounded-md shadow-sm">
                <Button className="bg-[#4285f4] hover:bg-[#3367d6] text-white font-normal rounded-r-none border-r border-[#3367d6]" onClick={() => handleSubmit('Received')}>
                  Save as Received
                </Button>
                <Button className="bg-[#4285f4] hover:bg-[#3367d6] text-white font-normal rounded-l-none px-2">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              <Link href="/purchases/receives">
                <Button variant="ghost" className="text-slate-500 font-normal hover:text-slate-700 hover:bg-slate-100">
                  Cancel
                </Button>
              </Link>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
