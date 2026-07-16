"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ShoppingBag, X, Search, Settings, FileUp, Plus, ChevronDown, Trash2, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createPurchaseOrder } from '../api/purchases.api';
import { getItems, getEntityMetadata } from '@/features/items/api/items.api';
import { getLocations } from '@/features/settings/api/locations.api';

interface PurchaseOrderForm {
  vendorName: string;
  location: string;
  deliveryAddressType: string;
  deliveryAddressId: string;
  purchaseOrderNumber: string;
  reference: string;
  date: string;
  deliveryDate: string;
  paymentTerms: string;
  poQuantity: string;
  circle: string;
  package1: string;
  package2: string;
  shipmentPreference: string;
  warehouseLocation: string;
  lineItems: {
    itemId: string;
    itemName: string;
    tempCode: string;
    account: string;
    quantity: number;
    rate: number;
  }[];
  notes: string;
  termsConditions: string;
  discountPercentage: number;
  taxType: string;
  taxPercentage: number;
  adjustment: number;
}

export function NewPurchaseOrderForm() {
  const router = useRouter();
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [circleOptions, setCircleOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedBulkItems, setSelectedBulkItems] = useState<string[]>([]);
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  
  // File attachments state
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States for custom searchable dropdowns in the item table
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownSearchQueries, setDropdownSearchQueries] = useState<Record<string, string>>({});

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<PurchaseOrderForm>({
    defaultValues: {
      vendorName: '',
      location: 'Head Office',
      deliveryAddressType: 'Locations',
      deliveryAddressId: 'Head Office',
      purchaseOrderNumber: `PO-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
      reference: '',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      paymentTerms: 'Due on Receipt',
      poQuantity: '',
      circle: 'Package 1(S/N)',
      package1: '',
      package2: '',
      shipmentPreference: '',
      warehouseLocation: 'Head Office',
      lineItems: [{ itemId: '', itemName: '', tempCode: '', account: '', quantity: 1, rate: 0 }],
      notes: '',
      termsConditions: '',
      discountPercentage: 0,
      taxType: 'TDS',
      taxPercentage: 0,
      adjustment: 0,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  // Watch form values for calculations
  const lineItems = useWatch({ control, name: 'lineItems' });
  const discountPercentage = useWatch({ control, name: 'discountPercentage' }) || 0;
  const taxPercentage = useWatch({ control, name: 'taxPercentage' }) || 0;
  const adjustment = useWatch({ control, name: 'adjustment' }) || 0;

  // Fetch items, metadata, and locations
  useEffect(() => {
    getItems({ limit: 5000 }).then(data => {
      setItemsList(data.items || data);
    }).catch(err => console.error('Failed to fetch items:', err));

    getEntityMetadata('Item').then(data => {
       const circleField = data.fields?.find((f: any) => f.name === 'circle');
       if (circleField && circleField.options) {
          setCircleOptions(circleField.options);
       }
    }).catch(err => console.error('Failed to fetch item metadata:', err));

    getLocations().then(res => {
      if (res.success) {
        setLocationsList(res.data);
      }
    }).catch(err => console.error('Failed to fetch locations:', err));
  }, []);

  // Calculations
  const subTotal = lineItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
  const discountAmount = (subTotal * discountPercentage) / 100;
  const taxAmount = ((subTotal - discountAmount) * taxPercentage) / 100;
  const total = subTotal - discountAmount - taxAmount + Number(adjustment);

  const onSubmit = async (data: PurchaseOrderForm, status: 'Draft' | 'Sent') => {
    try {
      setIsSubmitting(true);
      
      // Ensure itemNames are populated correctly if an itemId is selected
      const processedLineItems = data.lineItems.map(item => {
        if (item.itemId) {
          const selectedItem = itemsList.find(i => i._id === item.itemId);
          if (selectedItem) {
            item.itemName = selectedItem.dynamicData?.name || selectedItem._id;
          }
        }
        return item;
      });
      
      let payloadToSubmit: any;

      if (files.length > 0) {
        const formData = new FormData();
        // Append all text fields
        Object.keys(data).forEach(key => {
          if (key === 'lineItems') {
             formData.append('lineItems', JSON.stringify(processedLineItems));
          } else {
             formData.append(key, (data as any)[key]);
          }
        });
        formData.append('status', status);
        
        // Append files
        files.forEach(file => {
          formData.append('files', file);
        });
        payloadToSubmit = formData;
      } else {
        const payload: any = {
          ...data,
          lineItems: processedLineItems,
          status
        };
        if (!payload.deliveryDate) {
          delete payload.deliveryDate;
        }
        payloadToSubmit = payload;
      }
      
      await createPurchaseOrder(payloadToSubmit);
      toast.success(`Purchase Order saved as ${status}!`);
      router.push('/purchases/orders');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to save Purchase Order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAdd = () => {
    selectedBulkItems.forEach(itemId => {
      const selectedItem = itemsList.find(i => i._id === itemId);
      if (selectedItem) {
        append({
          itemId: selectedItem._id,
          itemName: selectedItem.dynamicData?.name || selectedItem._id,
          tempCode: selectedItem.dynamicData?.tempCode || selectedItem.dynamicData?.sku || selectedItem.dynamicData?.itemCode || '',
          account: '',
          quantity: 1,
          rate: selectedItem.dynamicData?.price || selectedItem.dynamicData?.costPrice || 0,
        });
      }
    });
    setIsBulkModalOpen(false);
    setSelectedBulkItems([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 10) {
        toast.error("You can only upload a maximum of 10 files.");
        return;
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-slate-700" />
          <h1 className="text-xl font-bold text-slate-800">New Purchase Order</h1>
        </div>
        <Link href="/purchases/orders" className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </Link>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 flex flex-col gap-10">
          
          {/* Top Form Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-8">
            
            {/* Left Column */}
            <div className="space-y-6">
              {/* Vendor Name */}
              <div className="grid grid-cols-[160px_24px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-red-500">
                  Vendor Name*
                </label>
                <div className="flex items-center justify-center">
                  <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-blue-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </span>
                </div>
                <div className="flex">
                  <select {...register('vendorName', { required: true })} className="flex-1 border border-blue-400 rounded-l-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white appearance-none">
                    <option value="">Select a Vendor</option>
                    <option value="Acme Corp">Acme Corp</option>
                    <option value="Global Tech">Global Tech</option>
                    <option value="Local Supplier">Local Supplier</option>
                  </select>
                  <button type="button" className="bg-[#3b82f6] text-white px-3 py-2 rounded-r-md hover:bg-blue-600 transition-colors border border-[#3b82f6]">
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[160px_24px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Location</label>
                <div className="col-span-1"></div>
                <select {...register('location')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Select Location</option>
                  {locationsList.map((loc) => (
                    <option key={loc._id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Delivery Address */}
              <div className="grid grid-cols-[160px_24px_1fr] items-start gap-4 pt-2">
                <label className="text-sm font-semibold text-red-500 mt-1">Delivery Address*</label>
                <div className="col-span-1"></div>
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="radio" value="Locations" {...register('deliveryAddressType')} className="text-blue-500 focus:ring-blue-500 cursor-pointer" />
                      Locations
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="radio" value="Customer" {...register('deliveryAddressType')} className="text-blue-500 focus:ring-blue-500 cursor-pointer" />
                      Customer
                    </label>
                  </div>
                  <select {...register('deliveryAddressId')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">Select Delivery Location</option>
                    {locationsList.map((loc) => (
                      <option key={loc._id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                  
                  <div className="bg-slate-50 border border-slate-100 rounded-md p-4 text-sm text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">Head Office</p>
                    <p>Uttar Pradesh</p>
                    <p>India ,</p>
                    <p>91-9599094941</p>
                  </div>
                  
                  <button type="button" className="text-sm text-blue-600 hover:underline font-medium">Change destination to deliver</button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Purchase Order Number */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-red-500">Purchase Order#*</label>
                <div className="relative">
                  <input type="text" {...register('purchaseOrderNumber', { required: true })} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 pr-10 bg-slate-50" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Reference */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Reference#</label>
                <input type="text" {...register('reference')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500" />
              </div>

              {/* Date */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Date</label>
                <input type="date" {...register('date')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
              </div>

              {/* Delivery Date & Payment Terms Row */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Delivery Date</label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <input type="date" {...register('deliveryDate')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500" />
                  <label className="text-sm font-semibold text-slate-800">Payment Terms</label>
                  <select {...register('paymentTerms')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                  </select>
                </div>
              </div>

              {/* PO Quantity & Circle Row */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">PO Quantity</label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <input type="text" {...register('poQuantity')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500" />
                  <label className="text-sm font-semibold text-slate-800 whitespace-nowrap px-4">Circle</label>
                  <div className="relative w-full">
                     <select {...register('circle')} className="w-full border border-slate-200 rounded-md pl-3 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white appearance-none">
                       <option value="">Select Circle</option>
                       {circleOptions.map((opt, i) => (
                         <option key={i} value={opt}>{opt}</option>
                       ))}
                       {circleOptions.length === 0 && <option value="Package 1(S/N)">Package 1(S/N)</option>}
                     </select>
                     <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-400 pointer-events-none">
                       <span className="text-red-400 font-bold text-xs">✕</span>
                       <span className="text-[10px]">▼</span>
                     </div>
                  </div>
                </div>
              </div>
              
              {/* Package 1 & 2 Row */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4 pt-1">
                <label className="text-sm font-semibold text-slate-800">Package 1</label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <select {...register('package1')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                    <option></option>
                  </select>
                  <label className="text-sm font-semibold text-slate-800 whitespace-nowrap">Package 2</label>
                  <select {...register('package2')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                    <option></option>
                  </select>
                </div>
              </div>
              
              {/* Shipment Preference */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Shipment Preference</label>
                <select {...register('shipmentPreference')} className="w-full sm:w-[50%] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Choose the shipment preference</option>
                  <option value="Air">Air</option>
                  <option value="Sea">Sea</option>
                </select>
              </div>

            </div>
          </div>

          <hr className="border-slate-200 border-dashed my-4" />

          {/* Item Table Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-6 border-b border-slate-200">
               <div className="pb-3 border-b-2 border-blue-600 flex items-center gap-2">
                 <label className="text-sm font-semibold text-slate-800">Warehouse Location</label>
                 <select {...register('warehouseLocation')} className="text-xs font-normal bg-transparent border-none focus:outline-none text-slate-600 cursor-pointer appearance-none">
                   {locationsList.map((loc) => (
                     <option key={loc._id} value={loc.name}>{loc.name} ▼</option>
                   ))}
                   {locationsList.length === 0 && <option>Head Office ▼</option>}
                 </select>
               </div>
               <button type="button" className="pb-3 text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-2">
                 % At Transaction Level ▼
               </button>
            </div>
            
            <div className="border border-slate-200 rounded-lg overflow-visible">
               <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 rounded-t-lg">
                  <h3 className="font-semibold text-slate-800">Item Table</h3>
                  <button type="button" className="text-[#3b82f6] text-[13px] font-medium flex items-center gap-1 hover:underline">
                    <Settings className="w-3.5 h-3.5" /> Bulk Actions
                  </button>
               </div>
               <table className="w-full text-sm text-left table-fixed">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 w-8"></th>
                      <th className="px-4 py-2 w-[30%]">ITEM DETAILS</th>
                      <th className="px-4 py-2 w-[20%]">ACCOUNT</th>
                      <th className="px-4 py-2 w-[15%]">TEMP CODE</th>
                      <th className="px-4 py-2 text-right">QUANTITY</th>
                      <th className="px-4 py-2 text-right">RATE</th>
                      <th className="px-4 py-2 text-right">AMOUNT</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((field, index) => (
                      <tr key={field.id} className="bg-white hover:bg-slate-50 transition-colors last:[&>td:first-child]:rounded-bl-lg last:[&>td:last-child]:rounded-br-lg">
                        <td className="px-4 py-3 cursor-grab text-slate-300">⣿</td>
                        <td className="px-4 py-3 relative">
                           <div 
                             className="w-full border-b border-dashed border-slate-300 pb-1 cursor-pointer flex justify-between items-center"
                             onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === field.id ? null : field.id); }}
                           >
                             <span className="text-slate-700 truncate w-[90%]">
                               {lineItems[index]?.itemName || 'Select an item...'}
                             </span>
                             <ChevronDown className="w-4 h-4 text-slate-400" />
                           </div>
                           
                           {openDropdownId === field.id && (
                             <div 
                               className="absolute left-0 top-full mt-1 w-[300px] bg-white border border-slate-200 shadow-xl rounded-md z-50 overflow-hidden"
                               onClick={(e) => e.stopPropagation()}
                             >
                               <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                 <div className="relative">
                                   <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                   <input 
                                     type="text" 
                                     placeholder="Search item..."
                                     className="w-full border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                                     value={dropdownSearchQueries[field.id] || ''}
                                     onChange={(e) => setDropdownSearchQueries(prev => ({...prev, [field.id]: e.target.value}))}
                                     autoFocus
                                   />
                                 </div>
                               </div>
                               <div className="max-h-60 overflow-y-auto py-1">
                                 {itemsList
                                   .filter(item => {
                                     const sq = (dropdownSearchQueries[field.id] || '').toLowerCase();
                                     const name = (item.dynamicData?.name || item.dynamicData?.itemDescription || '').toLowerCase();
                                     const sku = (item.dynamicData?.sku || item.dynamicData?.tempCode || '').toLowerCase();
                                     return name.includes(sq) || sku.includes(sq);
                                   })
                                   .map(item => (
                                   <div 
                                     key={item._id} 
                                     className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors"
                                     onClick={() => {
                                       setValue(`lineItems.${index}.itemId`, item._id);
                                       setValue(`lineItems.${index}.itemName`, item.dynamicData?.name || item.dynamicData?.itemDescription || 'Item');
                                       setValue(`lineItems.${index}.tempCode`, item.dynamicData?.tempCode || item.dynamicData?.sku || item.dynamicData?.itemCode || '');
                                       setValue(`lineItems.${index}.rate`, item.dynamicData?.price || item.dynamicData?.costPrice || 0);
                                       setOpenDropdownId(null);
                                       setDropdownSearchQueries(prev => ({...prev, [field.id]: ''}));
                                     }}
                                   >
                                     <span className="text-sm text-slate-800 font-medium">{item.dynamicData?.name || item.dynamicData?.itemDescription || 'Unnamed Item'}</span>
                                     <span className="text-[10px] text-slate-500">Code: {item.dynamicData?.tempCode || item.dynamicData?.sku || '--'} | Price: {(item.dynamicData?.price || item.dynamicData?.costPrice || 0).toFixed(2)}</span>
                                   </div>
                                 ))}
                                 {itemsList.filter(item => {
                                     const sq = (dropdownSearchQueries[field.id] || '').toLowerCase();
                                     const name = (item.dynamicData?.name || item.dynamicData?.itemDescription || '').toLowerCase();
                                     return name.includes(sq);
                                 }).length === 0 && (
                                   <div className="px-3 py-3 text-xs text-slate-500 text-center">No items found</div>
                                 )}
                               </div>
                             </div>
                           )}
                        </td>
                        <td className="px-4 py-3">
                           <select {...register(`lineItems.${index}.account`)} className="w-full border-none bg-transparent text-slate-500 focus:outline-none appearance-none">
                              <option value="">Select an account ▼</option>
                              <option value="Inventory Asset">Inventory Asset</option>
                              <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                           </select>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs font-medium">
                          <input type="text" {...register(`lineItems.${index}.tempCode`)} className="w-full bg-transparent border-none focus:outline-none text-slate-600" readOnly placeholder="--" />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="any"
                            {...register(`lineItems.${index}.quantity`)} 
                            className="w-full text-right border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="number" 
                            step="any"
                            {...register(`lineItems.${index}.rate`)} 
                            className="w-full text-right border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {((Number(lineItems[index]?.quantity) || 0) * (Number(lineItems[index]?.rate) || 0)).toFixed(2)}
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => append({ itemId: '', itemName: '', tempCode: '', account: '', quantity: 1, rate: 0 })} className="flex items-center gap-1.5 text-sm font-medium text-[#3b82f6] bg-white border border-[#bfdbfe] px-3.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Add New Row <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              <button type="button" onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-[#3b82f6] bg-white border border-[#bfdbfe] px-3.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Add Items in Bulk
              </button>
            </div>
          </div>

          {/* Bottom Section (Calculations & Notes) */}
          <div className="flex flex-col lg:flex-row gap-12 pt-6">
             
             {/* Left side: Notes & Terms */}
             <div className="flex-1 space-y-6">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-800">Notes</label>
                 <textarea 
                   {...register('notes')}
                   rows={3} 
                   placeholder="Will be displayed on purchase order"
                   className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 resize-none"
                 />
               </div>
               
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-slate-800">Terms & Conditions</label>
                 <textarea 
                   {...register('termsConditions')}
                   rows={4} 
                   placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
                   className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 resize-none"
                 />
               </div>
             </div>

             {/* Right side: Totals & File Upload */}
             <div className="w-full lg:w-[400px] space-y-8 bg-[#f8fafc] p-6 rounded-[12px] border border-slate-100">
                <div className="space-y-5">
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-semibold text-slate-800">Sub Total</span>
                     <span className="text-sm font-bold text-slate-800">{subTotal.toFixed(2)}</span>
                   </div>
                   
                   <div className="flex justify-between items-center gap-4">
                     <span className="text-sm text-slate-600">Discount</span>
                     <div className="flex items-center w-24 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                        <input type="number" {...register('discountPercentage')} className="w-full text-right px-2 py-1.5 text-sm focus:outline-none" />
                        <span className="bg-slate-50 px-2 py-1.5 text-sm border-l border-slate-200 text-slate-500">%</span>
                     </div>
                     <span className="text-sm font-semibold text-slate-800">{discountAmount.toFixed(2)}</span>
                   </div>

                   <div className="flex justify-between items-center gap-4">
                     <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 cursor-pointer">
                          <input type="radio" value="TDS" {...register('taxType')} className="text-blue-500" /> TDS
                        </label>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 cursor-pointer">
                          <input type="radio" value="TCS" {...register('taxType')} className="text-blue-500" /> TCS
                        </label>
                     </div>
                     <select {...register('taxPercentage')} className="border border-slate-200 rounded-md px-2 py-1.5 text-sm text-slate-700 focus:outline-none w-28 bg-white">
                       <option value={0}>Select a Tax</option>
                       <option value={5}>5%</option>
                       <option value={10}>10%</option>
                       <option value={18}>18%</option>
                     </select>
                     <span className="text-sm font-semibold text-slate-800">- {taxAmount.toFixed(2)}</span>
                   </div>
                   
                   <div className="flex justify-between items-center gap-4">
                     <span className="text-sm text-slate-600 border border-slate-200 border-dashed rounded-md px-2 py-1.5 bg-slate-50">Adjustment</span>
                     <input type="number" {...register('adjustment')} className="w-24 border border-slate-200 rounded-md px-2 py-1.5 text-sm text-right focus:outline-none bg-white" />
                     <span className="text-sm font-semibold text-slate-800">{Number(adjustment).toFixed(2)}</span>
                   </div>

                   <hr className="border-slate-200" />
                   
                   <div className="flex justify-between items-center">
                     <span className="text-base font-bold text-slate-800">Total</span>
                     <span className="text-lg font-bold text-slate-800">{total.toFixed(2)}</span>
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                   <p className="text-sm font-semibold text-slate-800 mb-2">Attach File(s) to Purchase Order</p>
                   
                   {files.length > 0 && (
                     <div className="mb-3 space-y-2">
                       {files.map((file, i) => (
                         <div key={i} className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-md shadow-sm">
                           <div className="flex items-center gap-2 overflow-hidden">
                             <Paperclip className="w-4 h-4 text-blue-500 shrink-0" />
                             <span className="text-xs text-slate-700 truncate">{file.name}</span>
                           </div>
                           <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 transition-colors ml-2 shrink-0">
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                   
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     onChange={handleFileChange} 
                     className="hidden" 
                     multiple 
                   />
                   
                   <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 border border-slate-200 border-dashed bg-white rounded-md py-3 hover:bg-slate-50 transition-colors">
                      <FileUp className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">Upload File(s) ▼</span>
                   </button>
                   <p className="text-xs text-slate-400 mt-2 text-center">You can upload a maximum of 10 files, 10MB each</p>
                </div>
             </div>
          </div>
          
          <p className="text-sm text-slate-500 mb-10 pb-10">
            <span className="font-semibold text-slate-700">Additional Fields:</span> Start adding custom fields for your purchase orders by going to 
            <span className="italic ml-1 text-slate-600">Settings ➔ Purchases ➔ Purchase Orders.</span>
          </p>

        </div>
      </div>

      {/* Sticky Footer Area */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
         <div className="flex gap-4">
           <button 
             type="button" 
             onClick={() => handleSubmit((d) => onSubmit(d, 'Draft'))()}
             disabled={isSubmitting}
             className="px-4 py-2 text-[13px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors border border-slate-200 disabled:opacity-50"
           >
             Save as Draft
           </button>
           <button 
             type="button"
             onClick={() => handleSubmit((d) => onSubmit(d, 'Sent'))()}
             disabled={isSubmitting}
             className="px-4 py-2 text-[13px] font-semibold text-white bg-[#3b82f6] hover:bg-blue-600 rounded-md shadow-sm transition-colors disabled:opacity-50"
           >
             Save and Send
           </button>
           <Link href="/purchases/orders" className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 rounded-md transition-colors border border-transparent flex items-center">
             Cancel
           </Link>
         </div>
         <div className="text-sm text-slate-600 font-medium">
           PDF Template: <span className="text-slate-500">'Standard Template'</span> <button type="button" className="text-blue-500 hover:underline ml-1">Change</button>
         </div>
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
                      const query = bulkSearchQuery.toLowerCase();
                      const name = (item.dynamicData?.name || item.dynamicData?.itemDescription || '').toLowerCase();
                      const code = (item.dynamicData?.tempCode || item.dynamicData?.sku || '').toLowerCase();
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
    </form>
  );
}
