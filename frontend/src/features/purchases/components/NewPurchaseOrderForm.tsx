"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ShoppingBag, X, Search, Settings, FileUp, Plus, ChevronDown, Trash2, Paperclip, Edit } from 'lucide-react';
import Link from 'next/link';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createPurchaseOrder, getNextPurchaseOrderNumber, updatePurchaseOrder } from '../api/purchases.api';
import { getItems, getEntityMetadata } from '@/features/items/api/items.api';
import { getLocations, createLocation } from '@/features/settings/api/locations.api';
import { getVendors } from '@/features/vendors/api/vendors.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { numberToWords } from '@/shared/utils/numberToWords';

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

interface PurchaseOrderForm {
  vendorName: string;
  location: string;
  deliveryAddressType: string;
  deliveryAddressId: string;
  purchaseOrderNumber: string;
  reference: string;
  date: string;
  deliveryDate: string;
  poQuantity: string;
  shipmentPreference: string;
  warehouseLocation: string;
  lineItems: {
    itemId: string;
    itemName: string;
    tempCode: string;
    account: string;
    description: string;
    package: string;
    loaSerialNo: string;
    circle: string;
    unit: string;
    quantity: number;
    rate: number;
  }[];
  notes: string;
  termsConditions: string;
  paymentTermStage: string;
  paymentTermType: string;
  paymentTermAmount: string;
  discountPercentage: number;
  taxType: string;
  taxPercentage: number;
  adjustment: number;
  freightInsuranceType: string;
  freightInsuranceValueType: string;
  freightInsuranceAmount: number;
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
}

interface NewPurchaseOrderFormProps {
  initialData?: any;
  orderId?: string;
}

export function NewPurchaseOrderForm({ initialData, orderId }: NewPurchaseOrderFormProps = {}) {
  const router = useRouter();
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedBulkItems, setSelectedBulkItems] = useState<string[]>([]);
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  
  // File attachments state
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States for custom searchable dropdowns in the item table
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownSearchQueries, setDropdownSearchQueries] = useState<Record<string, string>>({});
  const [itemMetadataFields, setItemMetadataFields] = useState<any[]>([]);

  const isFieldActive = (fieldName: string) => {
    if (itemMetadataFields.length === 0) return true; // Default to true while loading
    return itemMetadataFields.some(f => f.name === fieldName && f.active !== false);
  };


  const [isDeliveryDropdownOpen, setIsDeliveryDropdownOpen] = useState(false);
  const [isNewAddressModalOpen, setIsNewAddressModalOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    attention: '', street1: '', street2: '', city: '', state: '', zip: '', country: '', phone: ''
  });
  const deliveryDropdownRef = useRef<HTMLDivElement>(null);
  const [deliverySearchQuery, setDeliverySearchQuery] = useState('');
  
  const [isPoSettingsModalOpen, setIsPoSettingsModalOpen] = useState(false);
  const [isAutoGeneratePO, setIsAutoGeneratePO] = useState(true);
  const [poPrefix, setPoPrefix] = useState('PO-');
  const [poNextNumber, setPoNextNumber] = useState('00003');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (deliveryDropdownRef.current && !deliveryDropdownRef.current.contains(event.target as Node)) {
        setIsDeliveryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { register, control, handleSubmit, setValue, reset, formState: { errors } } = useForm<PurchaseOrderForm>({
    defaultValues: initialData || {
      vendorName: '',
      location: 'Head Office',
      deliveryAddressType: 'Locations',
      deliveryAddressId: 'Head Office',
      purchaseOrderNumber: '', // Will be fetched from backend
      reference: '',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      poQuantity: '',
      shipmentPreference: '',
      warehouseLocation: 'Head Office',
      lineItems: [{ itemId: '', itemName: '', tempCode: '', description: '', package: '', loaSerialNo: '', circle: '', unit: '', account: '', quantity: 1, rate: 0 }],
      notes: '',
      termsConditions: '',
      paymentTermStage: '',
      paymentTermType: '',
      paymentTermAmount: '',
      discountPercentage: 0,
      taxType: 'TDS',
      taxPercentage: 0,
      adjustment: 0,
      freightInsuranceType: 'Inclusive',
      freightInsuranceValueType: 'Amount',
      freightInsuranceAmount: 0,
      cgstPercentage: 9,
      sgstPercentage: 9,
      igstPercentage: 0,
    }
  });

  useEffect(() => {
    if (initialData) {
      const formattedData = {
        ...initialData,
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        deliveryDate: initialData.deliveryDate ? new Date(initialData.deliveryDate).toISOString().split('T')[0] : '',
      };
      reset(formattedData);
      setIsAutoGeneratePO(false);
    }
  }, [initialData, reset]);

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'lineItems'
  });

  // Watch form values for calculations
  const lineItems = useWatch({ control, name: 'lineItems' });
  const discountPercentage = useWatch({ control, name: 'discountPercentage' }) || 0;
  const taxPercentage = useWatch({ control, name: 'taxPercentage' }) || 0;
  const adjustment = useWatch({ control, name: 'adjustment' }) || 0;
  
  const freightInsuranceType = useWatch({ control, name: 'freightInsuranceType' });
  const freightInsuranceValueType = useWatch({ control, name: 'freightInsuranceValueType' });
  const freightInsuranceAmount = useWatch({ control, name: 'freightInsuranceAmount' }) || 0;
  const cgstPercentage = useWatch({ control, name: 'cgstPercentage' }) || 9;
  const sgstPercentage = useWatch({ control, name: 'sgstPercentage' }) || 9;
  const igstPercentage = useWatch({ control, name: 'igstPercentage' }) || 0;
  
  const paymentTermStage = useWatch({ control, name: 'paymentTermStage' });
  const paymentTermType = useWatch({ control, name: 'paymentTermType' });

  const currentLocation = useWatch({ control, name: 'location' });
  const deliveryAddressId = useWatch({ control, name: 'deliveryAddressId' });
  const deliveryAddressType = useWatch({ control, name: 'deliveryAddressType' });
  
  const currentVendorName = useWatch({ control, name: 'vendorName' });
  const selectedVendor = vendorsList.find(v => (v.dynamicData?.displayName || v.dynamicData?.companyName || v._id) === currentVendorName);
  
  const formatAddress = (addr: any) => {
    if (!addr) return null;
    if (typeof addr === 'string') return addr;
    const parts = [
      addr.attention,
      addr.street1,
      addr.street2,
      addr.city,
      addr.state ? `${addr.state} ${addr.zip || ''}`.trim() : addr.zip,
      addr.country
    ].filter(Boolean);
    return parts.length > 0 ? parts.join('\n') : null;
  };

  const vendorBillingAddress = formatAddress(selectedVendor?.dynamicData?.vendorAddresses?.billing) || selectedVendor?.dynamicData?.billingAddress || selectedVendor?.dynamicData?.address || null;
  const vendorShippingAddress = formatAddress(selectedVendor?.dynamicData?.vendorAddresses?.shipping) || selectedVendor?.dynamicData?.shippingAddress || null;
  
  useEffect(() => {
    if (deliveryAddressType === 'Locations') {
      setValue('deliveryAddressId', currentLocation);
    }
  }, [currentLocation, deliveryAddressType, setValue]);
  
  const selectedDeliveryLocation = locationsList.find(loc => loc.name === deliveryAddressId);

  // Fetch items, metadata, and locations
  useEffect(() => {
    getItems({ limit: 5000 }).then(data => {
      setItemsList(data.items || data);
    }).catch(err => console.error('Failed to fetch items:', err));

    getEntityMetadata('Item').then(data => {
       if (data && data.fields) {
         setItemMetadataFields(data.fields);
       }
    }).catch(err => console.error('Failed to fetch item metadata:', err));

    getLocations().then(res => {
      if (res.success) {
        setLocationsList(res.data);
      }
    }).catch(err => console.error('Failed to fetch locations:', err));

    getVendors({ limit: 5000 }).then(data => {
      setVendorsList(data.vendors || data.items || []);
    }).catch(err => console.error('Failed to fetch vendors:', err));
    
    // Fetch next sequential PO Number if not in edit mode
    if (!initialData) {
      getNextPurchaseOrderNumber().then(res => {
        if (res.success && res.data) {
          setPoPrefix(res.data.prefix);
          setPoNextNumber(res.data.nextNumber);
          if (isAutoGeneratePO) {
            setValue('purchaseOrderNumber', `${res.data.prefix}${res.data.nextNumber}`);
          }
        }
      }).catch(err => console.error('Failed to fetch next PO number:', err));
    }
  }, []);

  // Calculations
  const subTotal = lineItems.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.rate || 0)), 0);
  const discountAmount = (subTotal * discountPercentage) / 100;
  
  let freightAmount = 0;
  if (freightInsuranceType === 'Exclusive') {
    if (freightInsuranceValueType === 'Percentage') {
      freightAmount = ((subTotal - discountAmount) * Number(freightInsuranceAmount)) / 100;
    } else {
      freightAmount = Number(freightInsuranceAmount);
    }
  }

  const taxableAmountForGst = subTotal - discountAmount + freightAmount;
  const cgstAmountVal = (taxableAmountForGst * Number(cgstPercentage)) / 100;
  const sgstAmountVal = (taxableAmountForGst * Number(sgstPercentage)) / 100;
  const igstAmountVal = (taxableAmountForGst * Number(igstPercentage)) / 100;

  const taxAmount = ((subTotal - discountAmount) * taxPercentage) / 100; // TDS/TCS
  const total = subTotal - discountAmount + freightAmount + cgstAmountVal + sgstAmountVal + igstAmountVal - taxAmount + Number(adjustment);

  const handleSaveNewAddress = async () => {
    try {
      const addressParts = [
        newAddress.street1,
        newAddress.street2,
        [newAddress.city, newAddress.state, newAddress.zip].filter(Boolean).join(' '),
        newAddress.country
      ].filter(Boolean);
      
      const addressString = addressParts.join('\n');
      const name = newAddress.attention || newAddress.city || `Address ${locationsList.length + 1}`;
      
      const payload = {
        name,
        type: 'Other',
        address: addressString,
        contactPerson: newAddress.attention,
        phone: newAddress.phone,
        status: 'Active'
      };
      
      const response = await createLocation(payload as any);
      if (response.success) {
        setLocationsList([response.data, ...locationsList]);
        setValue('deliveryAddressId', response.data.name);
        setIsNewAddressModalOpen(false);
        setIsDeliveryDropdownOpen(false);
        setNewAddress({attention: '', street1: '', street2: '', city: '', state: '', zip: '', country: '', phone: ''});
        toast.success('Address saved successfully');
      } else {
        toast.error(response.message || 'Failed to save address');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to save address');
    }
  };

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
          cgstPercentage: Number(data.cgstPercentage) || 9,
          sgstPercentage: Number(data.sgstPercentage) || 9,
          igstPercentage: Number(data.igstPercentage) || 0,
          lineItems: processedLineItems,
          status
        };
        if (!payload.deliveryDate) {
          delete payload.deliveryDate;
        }
        payloadToSubmit = payload;
      }
      
      // If we are using FormData, we must also ensure they are set
      if (payloadToSubmit instanceof FormData) {
          if (!payloadToSubmit.has('cgstPercentage')) payloadToSubmit.append('cgstPercentage', '9');
          if (!payloadToSubmit.has('sgstPercentage')) payloadToSubmit.append('sgstPercentage', '9');
          if (!payloadToSubmit.has('igstPercentage')) payloadToSubmit.append('igstPercentage', '0');
      }
      
      if (orderId) {
        await updatePurchaseOrder(orderId, payloadToSubmit);
        toast.success(`Purchase Order updated as ${status}!`);
        router.push(`/purchases/orders/${orderId}`);
      } else {
        await createPurchaseOrder(payloadToSubmit);
        toast.success(`Purchase Order saved as ${status}!`);
        router.push('/purchases/orders');
      }
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
        const d = selectedItem.dynamicData || {};
        const getVal = (key: string) => {
          if (d[key] !== undefined) return d[key];
          const lowerKey = key.toLowerCase();
          const foundKey = Object.keys(d).find(k => k.toLowerCase() === lowerKey);
          return foundKey ? d[foundKey] : '';
        };

        append({
          itemId: selectedItem._id,
          itemName: getVal('name') || getVal('itemDescription') || 'Item',
          tempCode: getVal('tempCode') || getVal('sku') || getVal('itemCode') || '',
          description: getVal('description') || getVal('itemDescription') || '',
          package: getVal('package') || '',
          loaSerialNo: getVal('loaSerialNo') || getVal('loaSerialNumber') || getVal('LOA Serial No.') || getVal('loa') || '',
          circle: getVal('circle') || '',
          unit: getVal('unit') || '',
          account: '',
          quantity: 1,
          rate: getVal('price') || getVal('costPrice') || getVal('sellingPrice') || 0,
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
          <h1 className="text-xl font-bold text-slate-800">{orderId ? 'Edit Purchase Order' : 'New Purchase Order'}</h1>
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
              <div className="grid grid-cols-[160px_24px_1fr] items-start gap-4 pt-1">
                <label className="text-sm font-semibold text-red-500 mt-2">
                  Vendor Name*
                </label>
                <div className="flex items-center justify-center mt-2">
                  <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-blue-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex">
                    <select {...register('vendorName', { required: true })} className="flex-1 border border-blue-400 rounded-l-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white appearance-none">
                      <option value="">Select a Vendor</option>
                      {initialData?.vendorName && !vendorsList.find(v => (v.dynamicData?.displayName || v.dynamicData?.companyName || v._id) === initialData.vendorName) && (
                        <option value={initialData.vendorName}>{initialData.vendorName}</option>
                      )}
                      {vendorsList.map(v => (
                        <option key={v._id} value={v.dynamicData?.displayName || v.dynamicData?.companyName || v._id}>
                          {v.dynamicData?.displayName || v.dynamicData?.companyName || v._id}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setIsVendorModalOpen(true)} className="bg-[#3b82f6] text-white px-3 py-2 rounded-r-md hover:bg-blue-600 transition-colors border border-[#3b82f6]">
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {currentVendorName && selectedVendor && (
                    <div className="grid grid-cols-2 gap-6 mt-1">
                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1 mb-2">
                          Billing Address <Edit className="w-3 h-3 cursor-pointer hover:text-blue-500" />
                        </p>
                        {vendorBillingAddress ? (
                          <div className="whitespace-pre-wrap">{vendorBillingAddress}</div>
                        ) : (
                          <p className="text-blue-500 cursor-pointer hover:underline">New Address</p>
                        )}
                      </div>
                      
                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1 mb-2">
                          Shipping Address <Edit className="w-3 h-3 cursor-pointer hover:text-blue-500" />
                        </p>
                        {vendorShippingAddress ? (
                          <div className="whitespace-pre-wrap">{vendorShippingAddress}</div>
                        ) : (
                          <p className="text-blue-500 cursor-pointer hover:underline">New Address</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[160px_24px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Location</label>
                <div className="col-span-1"></div>
                <select {...register('location')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Select Location</option>
                  {initialData?.location && !locationsList.find(loc => loc.name === initialData.location && loc.type === 'Head Office') && (
                    <option value={initialData.location}>{initialData.location}</option>
                  )}
                  {locationsList.filter(loc => loc.type === 'Head Office').map((loc) => (
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
                  
                  <select 
                    value={deliveryAddressId}
                    onChange={(e) => setValue('deliveryAddressId', e.target.value)}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white mb-4"
                  >
                    <option value="">Select Delivery Location</option>
                    {locationsList.filter(loc => loc.type !== 'Other').map((loc) => (
                      <option key={loc._id} value={loc.name}>{loc.name}</option>
                    ))}
                  </select>
                  
                  {deliveryAddressType === 'Locations' && selectedDeliveryLocation ? (
                    <div className="mb-4">
                      <div className="border border-blue-400 rounded-md p-3 mb-3 bg-white shadow-sm">
                        <p className="font-bold text-slate-800">{deliveryAddressId || 'Select Location'}</p>
                      </div>
                      <div className="text-sm text-slate-600 leading-relaxed px-1">
                        {selectedDeliveryLocation.address ? (
                          <p className="whitespace-pre-wrap">{selectedDeliveryLocation.address}</p>
                        ) : (
                          <p className="italic text-slate-400">No address provided</p>
                        )}
                        {selectedDeliveryLocation.phone && <p className="mt-1">{selectedDeliveryLocation.phone}</p>}
                      </div>
                    </div>
                  ) : deliveryAddressType === 'Locations' && !selectedDeliveryLocation ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-md p-4 text-sm text-slate-600 flex items-center justify-center mb-4">
                      <p className="text-slate-500 italic">Please select a delivery location</p>
                    </div>
                  ) : null}
                  
                  <div className="relative" ref={deliveryDropdownRef}>
                    <button 
                      type="button" 
                      onClick={() => setIsDeliveryDropdownOpen(!isDeliveryDropdownOpen)}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      Change destination to deliver
                    </button>
                    
                    {isDeliveryDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-md z-50 flex flex-col max-h-[400px]">
                        <div className="p-2 border-b border-slate-100">
                          <input 
                            type="text" 
                            placeholder="Search" 
                            value={deliverySearchQuery}
                            onChange={(e) => setDeliverySearchQuery(e.target.value)}
                            className="w-full border border-blue-400 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[250px]">
                          {locationsList
                            .filter(loc => (loc.address || '').toLowerCase().includes(deliverySearchQuery.toLowerCase()))
                            .map((loc) => (
                            <div 
                              key={loc._id} 
                              className={`p-3 rounded-md cursor-pointer border ${deliveryAddressId === loc.name ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                              onClick={() => {
                                setValue('deliveryAddressId', loc.name);
                                setIsDeliveryDropdownOpen(false);
                              }}
                            >
                              {loc.address ? (
                                <div className={`text-sm whitespace-pre-wrap ${deliveryAddressId === loc.name ? 'text-white' : 'text-slate-700'}`}>
                                  {loc.address}
                                </div>
                              ) : (
                                <div className={`text-sm italic ${deliveryAddressId === loc.name ? 'text-blue-100' : 'text-slate-400'}`}>
                                  No address provided
                                </div>
                              )}
                              {loc.phone && (
                                <div className={`text-xs mt-1 ${deliveryAddressId === loc.name ? 'text-blue-100' : 'text-slate-500'}`}>
                                  {loc.phone}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="p-2 border-t border-slate-100">
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsNewAddressModalOpen(true);
                              setIsDeliveryDropdownOpen(false);
                            }}
                            className="flex items-center text-blue-600 text-sm font-medium hover:underline w-full p-2"
                          >
                            <Plus className="w-4 h-4 mr-1" /> New Address
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Purchase Order Number */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-red-500">Purchase Order#*</label>
                <div className="relative">
                  <input 
                    type="text" 
                    {...register('purchaseOrderNumber', { required: true })} 
                    className={`w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 pr-10 ${isAutoGeneratePO ? 'bg-slate-50 cursor-not-allowed text-slate-500' : 'bg-white'}`}
                    readOnly={isAutoGeneratePO}
                  />
                  <button type="button" onClick={() => setIsPoSettingsModalOpen(true)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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

              {/* Delivery Date */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">Delivery Date</label>
                <input type="date" {...register('deliveryDate')} className="w-full sm:w-[50%] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
              </div>

              {/* PO Quantity */}
              <div className="grid grid-cols-[150px_1fr] items-center gap-4">
                <label className="text-sm font-semibold text-slate-800">PO Quantity</label>
                <input type="text" {...register('poQuantity')} className="w-full sm:w-[50%] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
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
                      <th className="px-4 py-2 w-12 text-center">SR.NO</th>
                      {isFieldActive('tempCode') && <th className="px-4 py-2 w-[12%]">TEMP CODE</th>}
                      {isFieldActive('description') && <th className="px-4 py-2 w-[15%]">DESCRIPTION</th>}
                      <th className="px-4 py-2 w-[15%]">NAME</th>
                      {isFieldActive('package') && <th className="px-4 py-2 w-[8%]">PACKAGE</th>}
                      {isFieldActive('loaSerialNo') && <th className="px-4 py-2 w-[8%]">LOA SERIAL NO.</th>}
                      {isFieldActive('circle') && <th className="px-4 py-2 w-[8%]">CIRCLE</th>}
                      {isFieldActive('unit') && <th className="px-4 py-2 w-[8%]">UNIT</th>}
                      <th className="px-4 py-2 text-right w-[8%]">QUANTITY</th>
                      <th className="px-4 py-2 text-right w-[8%]">RATE</th>
                      <th className="px-4 py-2 text-right w-[8%]">AMOUNT</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((field, index) => (
                      <tr key={field.id} className="bg-white hover:bg-slate-50 transition-colors last:[&>td:first-child]:rounded-bl-lg last:[&>td:last-child]:rounded-br-lg">
                        <td className="px-4 py-3 text-center text-slate-500 font-medium">{index + 1}</td>
                        {isFieldActive('tempCode') && (
                          <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                            <input type="text" defaultValue={field.tempCode} {...register(`lineItems.${index}.tempCode`)} className="w-full bg-transparent border-none focus:outline-none text-slate-600" readOnly placeholder="--" />
                          </td>
                        )}
                        {isFieldActive('description') && (
                          <td className="px-4 py-3">
                            <input type="text" defaultValue={field.description} {...register(`lineItems.${index}.description`)} className="w-full bg-transparent border-none focus:outline-none text-slate-600 text-xs" placeholder="Description" />
                          </td>
                        )}
                        <td className="px-4 py-3 relative">
                           <div 
                             className="w-full border-b border-dashed border-slate-300 pb-1 cursor-pointer flex justify-between items-center"
                             onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === field.id ? null : field.id); }}
                           >
                             <span className="text-slate-700 truncate w-[90%] text-xs font-medium">
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
                                     const name = String(item.dynamicData?.name || item.dynamicData?.itemDescription || '').toLowerCase();
                                     const sku = String(item.dynamicData?.sku || item.dynamicData?.tempCode || '').toLowerCase();
                                     return name.includes(sq) || sku.includes(sq);
                                   })
                                   .map(item => (
                                   <div 
                                     key={item._id} 
                                     className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex flex-col transition-colors"
                                     onClick={() => {
                                       const d = item.dynamicData || {};
                                       const getVal = (key: string) => {
                                         if (d[key] !== undefined) return d[key];
                                         const lowerKey = key.toLowerCase();
                                         const foundKey = Object.keys(d).find(k => k.toLowerCase() === lowerKey);
                                         return foundKey ? d[foundKey] : '';
                                       };
                                       
                                       update(index, {
                                         ...lineItems[index],
                                         itemId: item._id,
                                         itemName: getVal('name') || getVal('itemDescription') || 'Item',
                                         tempCode: getVal('tempCode') || getVal('sku') || getVal('itemCode') || '',
                                         description: getVal('description') || getVal('itemDescription') || '',
                                         package: getVal('package') || '',
                                         loaSerialNo: getVal('loaSerialNo') || getVal('loaSerialNumber') || getVal('LOA Serial No.') || getVal('loa') || '',
                                         circle: getVal('circle') || '',
                                         unit: getVal('unit') || '',
                                         rate: getVal('price') || getVal('costPrice') || getVal('sellingPrice') || 0
                                       });
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
                                     const name = String(item.dynamicData?.name || item.dynamicData?.itemDescription || '').toLowerCase();
                                     return name.includes(sq);
                                 }).length === 0 && (
                                   <div className="px-3 py-3 text-xs text-slate-500 text-center">No items found</div>
                                 )}
                               </div>
                             </div>
                           )}
                        </td>
                        {isFieldActive('package') && (
                          <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                            <input type="text" defaultValue={field.package} {...register(`lineItems.${index}.package`)} className="w-full bg-transparent border-none focus:outline-none text-slate-600" placeholder="--" />
                          </td>
                        )}
                        {isFieldActive('loaSerialNo') && (
                          <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                            <input type="text" defaultValue={field.loaSerialNo} {...register(`lineItems.${index}.loaSerialNo`)} className="w-full bg-transparent border-none focus:outline-none text-slate-600" placeholder="--" />
                          </td>
                        )}
                        {isFieldActive('circle') && (
                          <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                            <input type="text" defaultValue={field.circle} {...register(`lineItems.${index}.circle`)} className="w-full bg-transparent border-none focus:outline-none text-slate-600" placeholder="--" />
                          </td>
                        )}
                        {isFieldActive('unit') && (
                          <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                            <input type="text" defaultValue={field.unit} {...register(`lineItems.${index}.unit`)} className="w-full bg-transparent border-none focus:outline-none text-slate-600" placeholder="--" />
                          </td>
                        )}
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
              <button type="button" onClick={() => append({ itemId: '', itemName: '', tempCode: '', description: '', package: '', loaSerialNo: '', circle: '', unit: '', account: '', quantity: 1, rate: 0 })} className="flex items-center gap-1.5 text-sm font-medium text-[#3b82f6] bg-white border border-[#bfdbfe] px-3.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors shadow-sm">
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

               <div className="space-y-3 pt-4 border-t border-slate-100">
                 <label className="text-sm font-semibold text-slate-800">Payment Terms</label>
                 
                 <div className="relative">
                   <select
                     {...register('paymentTermStage')}
                     className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 appearance-none bg-white cursor-pointer"
                   >
                     <option value="">Select Payment Stage</option>
                     <option value="1st stage">1st stage</option>
                     <option value="2nd stage">2nd stage</option>
                     <option value="3rd stage">3rd stage</option>
                   </select>
                   <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                 </div>

                 {paymentTermStage && (
                   <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
                     <select
                       {...register('paymentTermType')}
                       className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 appearance-none bg-white cursor-pointer"
                     >
                       <option value="">Select Payment Type</option>
                       <option value="Advance">Advance</option>
                       <option value="Adhoc">Adhoc</option>
                       <option value="Before Advance">Before Advance</option>
                       <option value="After Advance">After Advance</option>
                     </select>
                     <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                   </div>
                 )}

                 {paymentTermStage && paymentTermType && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                     <input
                       type="text"
                       {...register('paymentTermAmount')}
                       placeholder="Amount or Percentage (e.g., 50% or ₹1000)"
                       className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                     />
                   </div>
                 )}
               </div>
             </div>

             {/* Right side: Totals & File Upload */}
             <div className="w-full lg:w-[400px] space-y-8 bg-[#f8fafc] p-6 rounded-[12px] border border-slate-100">
                <div className="space-y-4">
                   <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                     <span className="text-sm font-semibold text-slate-800 w-40">Sub Total</span>
                     <span className="text-sm font-bold text-slate-800 w-24 text-right">{subTotal.toFixed(2)}</span>
                   </div>
                   
                   <div className="flex items-center justify-between gap-4">
                     <span className="text-sm text-slate-600 w-40 shrink-0">Discount</span>
                     <div className="flex-1 flex justify-end">
                       <div className="flex items-center w-24 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                          <input type="number" {...register('discountPercentage')} className="w-full text-right px-2 py-1 text-sm focus:outline-none" />
                          <span className="bg-slate-50 px-2 py-1 text-sm border-l border-slate-200 text-slate-500">%</span>
                       </div>
                     </div>
                     <span className="text-sm font-semibold text-slate-800 w-24 text-right">{discountAmount.toFixed(2)}</span>
                   </div>

                   <div className="flex items-start justify-between gap-4">
                     <span className="text-sm text-slate-600 w-40 shrink-0 pt-1">Freight & Insurance</span>
                     <div className="flex-1 flex flex-col items-end gap-2">
                       <select {...register('freightInsuranceType')} className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none w-28 bg-white shadow-sm">
                         <option value="Inclusive">Inclusive</option>
                         <option value="Exclusive">Exclusive</option>
                       </select>
                       {freightInsuranceType === 'Exclusive' && (
                         <div className="flex items-center w-28 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                            <input type="number" {...register('freightInsuranceAmount')} className="w-full text-right px-2 py-1 text-sm focus:outline-none" />
                            <select {...register('freightInsuranceValueType')} className="bg-slate-50 border-l border-slate-200 text-slate-500 text-sm focus:outline-none px-1 h-full py-1">
                              <option value="Amount">₹</option>
                              <option value="Percentage">%</option>
                            </select>
                         </div>
                       )}
                     </div>
                     <span className="text-sm font-semibold text-slate-800 w-24 text-right pt-1">{freightInsuranceType === 'Exclusive' ? freightAmount.toFixed(2) : '0.00'}</span>
                   </div>

                   <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-white shadow-sm">
                     <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1">GST Group</span>
                     
                     <div className="flex items-center justify-between gap-4">
                       <span className="text-sm text-slate-600 w-20 shrink-0">CGST</span>
                       <div className="flex-1 flex justify-end">
                         <div className="flex items-center w-20 border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                            <input type="number" readOnly {...register('cgstPercentage')} className="w-full text-right px-2 py-1 text-sm focus:outline-none bg-transparent" />
                            <span className="bg-slate-100 px-2 py-1 text-sm border-l border-slate-200 text-slate-500">%</span>
                         </div>
                       </div>
                       <span className="text-sm font-semibold text-slate-800 w-24 text-right">{cgstAmountVal.toFixed(2)}</span>
                     </div>
                     
                     <div className="flex items-center justify-between gap-4">
                       <span className="text-sm text-slate-600 w-20 shrink-0">SGST</span>
                       <div className="flex-1 flex justify-end">
                         <div className="flex items-center w-20 border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                            <input type="number" readOnly {...register('sgstPercentage')} className="w-full text-right px-2 py-1 text-sm focus:outline-none bg-transparent" />
                            <span className="bg-slate-100 px-2 py-1 text-sm border-l border-slate-200 text-slate-500">%</span>
                         </div>
                       </div>
                       <span className="text-sm font-semibold text-slate-800 w-24 text-right">{sgstAmountVal.toFixed(2)}</span>
                     </div>
                     
                     <div className="flex items-center justify-between gap-4">
                       <span className="text-sm text-slate-600 w-20 shrink-0">IGST</span>
                       <div className="flex-1 flex justify-end">
                         <div className="flex items-center w-20 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                            <input type="number" {...register('igstPercentage')} className="w-full text-right px-2 py-1 text-sm focus:outline-none" />
                            <span className="bg-slate-50 px-2 py-1 text-sm border-l border-slate-200 text-slate-500">%</span>
                         </div>
                       </div>
                       <span className="text-sm font-semibold text-slate-800 w-24 text-right">{igstAmountVal.toFixed(2)}</span>
                     </div>
                   </div>

                   <div className="flex items-center justify-between gap-4">
                     <div className="flex items-center gap-3 w-40 shrink-0">
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 cursor-pointer">
                          <input type="radio" value="TDS" {...register('taxType')} className="text-blue-500" /> TDS
                        </label>
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 cursor-pointer">
                          <input type="radio" value="TCS" {...register('taxType')} className="text-blue-500" /> TCS
                        </label>
                     </div>
                     <div className="flex-1 flex justify-end">
                       <select {...register('taxPercentage')} className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none w-28 bg-white shadow-sm">
                         <option value={0}>Select a Tax</option>
                         <option value={5}>5%</option>
                         <option value={10}>10%</option>
                         <option value={18}>18%</option>
          
                       </select>
                     </div>
                     <span className="text-sm font-semibold text-slate-800 w-24 text-right">- {taxAmount.toFixed(2)}</span>
                   </div>
                   
                   <div className="flex items-center justify-between gap-4">
                     <span className="text-sm text-slate-600 border border-slate-200 border-dashed rounded-md px-2 py-1 bg-slate-50 w-24 text-center shrink-0">Adjustment</span>
                     <div className="flex-1 flex justify-end">
                       <input type="number" {...register('adjustment')} className="w-24 border border-slate-200 rounded-md px-2 py-1 text-sm text-right focus:outline-none bg-white shadow-sm" />
                     </div>
                     <span className="text-sm font-semibold text-slate-800 w-24 text-right">{Number(adjustment).toFixed(2)}</span>
                   </div>

                   <hr className="border-slate-200 border-dashed my-2" />
                   
                   <div className="flex justify-between items-center bg-[#f1f5f9] rounded-md p-3">
                     <span className="text-base font-bold text-slate-800">Total</span>
                     <span className="text-lg font-bold text-slate-800 w-32 text-right">₹ {total.toFixed(2)}</span>
                   </div>
                   <div className="text-[11px] text-slate-500 text-right font-medium italic mt-1 px-1">
                     {numberToWords(total)}
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
          
        </div>

      <Dialog open={isPoSettingsModalOpen} onOpenChange={setIsPoSettingsModalOpen}>
        <DialogContent className="w-[95vw] max-w-[700px] sm:max-w-[700px] md:max-w-[700px] bg-white p-0 overflow-hidden border-0 [&>button]:text-red-500 [&>button]:hover:text-red-600 [&>button]:right-6 [&>button]:top-6">
          <DialogHeader className="px-8 py-6 pb-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-medium text-slate-800">Configure Purchase Order# Preferences</DialogTitle>
          </DialogHeader>
          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-[13px]">
              <div>
                <p className="font-semibold text-slate-800 mb-1">Location</p>
                <p className="text-slate-600">{currentLocation || 'Head Office'}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">Associated Series</p>
                <p className="text-slate-600">Default Transaction Series</p>
              </div>
            </div>
            
            <p className="text-[13px] text-slate-600 mt-6">
              Your purchase order numbers are set on auto-generate mode to save your time. Are you sure about changing this setting?
            </p>
            
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  checked={isAutoGeneratePO}
                  onChange={() => setIsAutoGeneratePO(true)}
                  className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-[13px] font-medium text-slate-800 flex items-center gap-1">
                    Continue auto-generating purchase order numbers
                    <span className="text-slate-400 border border-slate-200 rounded-full w-3.5 h-3.5 inline-flex items-center justify-center text-[9px] ml-1">i</span>
                  </span>
                  {isAutoGeneratePO && (
                    <div className="grid grid-cols-[200px_300px] gap-6 mt-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Prefix</p>
                        <input 
                          type="text" 
                          value={poPrefix}
                          onChange={(e) => setPoPrefix(e.target.value)}
                          className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-[13px] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1.5">Next Number</p>
                        <input 
                          type="text" 
                          value={poNextNumber}
                          onChange={(e) => setPoNextNumber(e.target.value)}
                          className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-[13px] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer pt-3">
                <input 
                  type="radio" 
                  checked={!isAutoGeneratePO}
                  onChange={() => setIsAutoGeneratePO(false)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[13px] font-medium text-slate-800">Enter purchase order numbers manually</span>
              </label>
            </div>
          </div>
          
          <div className="border-t border-slate-100 px-8 py-5 bg-white flex gap-3">
            <Button 
              onClick={() => {
                if (isAutoGeneratePO) {
                  setValue('purchaseOrderNumber', `${poPrefix}${poNextNumber}`);
                } else {
                  setValue('purchaseOrderNumber', '');
                }
                setIsPoSettingsModalOpen(false);
              }} 
              className="bg-[#4285f4] hover:bg-blue-600 text-white px-5 h-8 font-medium text-[13px]"
            >
              Save
            </Button>
            <Button 
              onClick={() => setIsPoSettingsModalOpen(false)} 
              variant="outline" 
              className="bg-[#f8f9fa] hover:bg-[#f1f3f4] border-slate-200 text-slate-700 h-8 font-medium text-[13px]"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isNewAddressModalOpen} onOpenChange={setIsNewAddressModalOpen}>
        <DialogContent className="w-[95vw] max-w-[700px] sm:max-w-[700px] md:max-w-[700px] bg-white p-0 overflow-hidden border-0 [&>button]:text-red-500 [&>button]:hover:text-red-600 [&>button]:right-6 [&>button]:top-6">
          <DialogHeader className="px-8 py-6">
            <DialogTitle className="text-[22px] font-normal text-slate-800">New address</DialogTitle>
          </DialogHeader>
          
          <div className="px-8 pb-4 space-y-[18px] max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
              <label className="text-[15px] text-slate-700">Attention</label>
              <Input className="h-10 text-[15px] border-slate-200" value={newAddress.attention} onChange={e => setNewAddress({...newAddress, attention: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-4">
              <label className="text-[15px] text-slate-700 pt-2">Street 1</label>
              <textarea className="w-full border border-slate-200 rounded-md p-2.5 text-[15px] focus:outline-none focus:border-blue-500 h-[80px]" value={newAddress.street1} onChange={e => setNewAddress({...newAddress, street1: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-4">
              <label className="text-[15px] text-slate-700 pt-2">Street 2</label>
              <textarea className="w-full border border-slate-200 rounded-md p-2.5 text-[15px] focus:outline-none focus:border-blue-500 h-[80px]" value={newAddress.street2} onChange={e => setNewAddress({...newAddress, street2: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
              <label className="text-[15px] text-slate-700">City</label>
              <Input className="h-10 text-[15px] border-slate-200" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
              <label className="text-[15px] text-slate-700">State/Province</label>
              <Input className="h-10 text-[15px] border-slate-200" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
              <label className="text-[15px] text-slate-700">ZIP/Postal Code</label>
              <Input className="h-10 text-[15px] border-slate-200" value={newAddress.zip} onChange={e => setNewAddress({...newAddress, zip: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
              <label className="text-[15px] text-slate-700">Country/Region</label>
              <select className="h-10 w-full border border-slate-200 rounded-md px-3 text-[15px] text-slate-600 focus:outline-none focus:border-blue-500 bg-white" value={newAddress.country} onChange={e => setNewAddress({...newAddress, country: e.target.value})}>
                <option value="">Select or type to add</option>
                {COUNTRIES.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
              <label className="text-[15px] text-slate-700">Phone</label>
              <div className="relative w-full">
                <Input className="h-10 text-[15px] border-slate-200 pr-8" value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-100 px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4">
              <div></div>
              <div className="flex gap-3">
                <Button onClick={handleSaveNewAddress} className="bg-[#4285f4] hover:bg-blue-600 text-white px-6 h-9 font-medium text-[15px]">Save</Button>
                <Button onClick={() => setIsNewAddressModalOpen(false)} variant="outline" className="bg-[#f8f9fa] hover:bg-[#f1f3f4] border-slate-200 text-slate-700 h-9 font-medium text-[15px]">Cancel</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

      {/* Advanced Vendor Search Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Advanced Vendor Search</h2>
              <button type="button" onClick={() => setIsVendorModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-4">
               <div className="flex bg-white border border-slate-300 rounded-md overflow-hidden shadow-sm flex-1">
                 <select className="border-none bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:outline-none border-r border-slate-300">
                   <option>Display Name</option>
                   <option>Email</option>
                   <option>Company Name</option>
                 </select>
                 <input 
                   type="text" 
                   className="flex-1 px-3 py-2 text-sm focus:outline-none"
                   value={vendorSearchQuery}
                   onChange={(e) => setVendorSearchQuery(e.target.value)}
                 />
               </div>
               <button type="button" className="bg-[#3b82f6] text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm font-medium shadow-sm">
                 Search
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                  <tr className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="px-6 py-3 w-[30%]">VENDOR NAME</th>
                    <th className="px-6 py-3 w-[25%]">EMAIL</th>
                    <th className="px-6 py-3 w-[25%]">COMPANY NAME</th>
                    <th className="px-6 py-3 w-[20%]">PHONE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorsList
                    .filter(vendor => {
                      const query = (vendorSearchQuery || '').toLowerCase();
                      const name = String(vendor.dynamicData?.displayName || vendor.dynamicData?.companyName || '').toLowerCase();
                      const email = String(vendor.dynamicData?.emailAddress || vendor.dynamicData?.email || '').toLowerCase();
                      return name.includes(query) || email.includes(query);
                    })
                    .map(vendor => (
                    <tr 
                      key={vendor._id} 
                      className="hover:bg-blue-50 transition-colors cursor-pointer bg-white" 
                      onClick={() => {
                        setValue('vendorName', vendor.dynamicData?.displayName || vendor.dynamicData?.companyName || vendor._id);
                        setIsVendorModalOpen(false);
                      }}
                    >
                      <td className="px-6 py-4 text-blue-600 font-medium">
                        {vendor.dynamicData?.displayName || vendor.dynamicData?.companyName || '--'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{vendor.dynamicData?.email || '--'}</td>
                      <td className="px-6 py-4 text-slate-600">{vendor.dynamicData?.companyName || '--'}</td>
                      <td className="px-6 py-4 text-slate-600">{vendor.dynamicData?.phone || '--'}</td>
                    </tr>
                  ))}
                  {vendorsList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-500 text-sm">No vendors found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-end">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
                  <button type="button" className="p-1 hover:text-slate-800 disabled:opacity-50">&lt;</button>
                  <span className="px-2 font-medium">1 - {vendorsList.length}</span>
                  <button type="button" className="p-1 hover:text-slate-800 disabled:opacity-50">&gt;</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
