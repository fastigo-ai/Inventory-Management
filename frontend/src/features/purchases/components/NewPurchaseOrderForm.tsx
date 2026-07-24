"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ShoppingBag, X, Search, Settings, FileUp, Plus, ChevronDown, Trash2, Paperclip, Edit } from 'lucide-react';
import Link from 'next/link';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { createPurchaseOrder, getNextPurchaseOrderNumber, updatePurchaseOrder, getPurchaseOrderById } from '../api/purchases.api';
import { getItems, getEntityMetadata } from '@/features/items/api/items.api';
import { getLocations, createLocation } from '@/features/settings/api/locations.api';
import { getVendors } from '@/features/vendors/api/vendors.api';
import { getBillingCompanies } from '@/features/settings/api/billingCompanies.api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { numberToWords } from '@/shared/utils/numberToWords';
import { PaymentTermsWidget } from '@/shared/components/dynamic/PaymentTermsWidget';

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

interface PurchaseOrderForm {
  vendorName: string;
  location: string;
  billingCompanyId: string;
  deliveryAddressType: string;
  deliveryAddressId: string;
  deliveryAddresses: string[];
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
    hsnCode: string;
    package: string;
    loaSerialNo: string;
    circle: string;
    unit: string;
    quantity: number;
    rate: number;
  }[];
  notes: string;
  termsConditions: string;
  package?: string;
  circle?: string;
  paymentTerms: {
    stage: string;
    type: string;
    value: string;
    unit: string;
  }[];
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
  gstTreatment: string;
  attachments?: any[];
}

interface NewPurchaseOrderFormProps {
  initialData?: any;
  orderId?: string;
}

export function NewPurchaseOrderForm({ initialData, orderId }: NewPurchaseOrderFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cloneId = searchParams.get('cloneId');

  const [itemsList, setItemsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [billingCompaniesList, setBillingCompaniesList] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBillingPopoverOpen, setIsBillingPopoverOpen] = useState(false);
  const [isShippingPopoverOpen, setIsShippingPopoverOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [selectedBulkItems, setSelectedBulkItems] = useState<string[]>([]);
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');

  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');

  const [showShippingAddress, setShowShippingAddress] = useState(false);

  // File attachments state
  const [files, setFiles] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState<'notes'|'terms'|'attachments'>('notes');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const billingPopoverRef = useRef<HTMLDivElement>(null);
  const shippingPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (billingPopoverRef.current && !billingPopoverRef.current.contains(event.target as Node)) {
        setIsBillingPopoverOpen(false);
      }
      if (shippingPopoverRef.current && !shippingPopoverRef.current.contains(event.target as Node)) {
        setIsShippingPopoverOpen(false);
      }
      // Click outside item dropdowns will close them
      const target = event.target as Element;
      if (!target.closest('.item-dropdown-container')) {
        setOpenDropdownId(null);
        setOpenTempCodeDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // States for custom searchable dropdowns in the item table
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownSearchQueries, setDropdownSearchQueries] = useState<Record<string, string>>({});
  const [openTempCodeDropdownId, setOpenTempCodeDropdownId] = useState<string | null>(null);
  const [tempCodeSearchQueries, setTempCodeSearchQueries] = useState<Record<string, string>>({});
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
  
  const csvInputRef = useRef<HTMLInputElement>(null);

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
      deliveryAddresses: ['Head Office'],
      purchaseOrderNumber: '', // Will be fetched from backend
      reference: '',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      poQuantity: '',
      shipmentPreference: '',
      warehouseLocation: 'Head Office',
      lineItems: [{ itemId: '', itemName: '', tempCode: '', description: '', hsnCode: '', package: '', loaSerialNo: '', circle: '', unit: '', account: '', quantity: 1, rate: 0 }],
      notes: '',
      termsConditions: '',
      package: '',
      circle: '',
      paymentTerms: [{ stage: '', type: '', value: '', unit: '%', remark: '' }, { stage: '', type: '', value: '', unit: '%', remark: '' }, { stage: '', type: '', value: '', unit: '%', remark: '' }],
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
      gstTreatment: 'intra_state',
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
    } else if (cloneId) {
        getPurchaseOrderById(cloneId).then(data => {
            if (data) {
                const cloneData = { ...data };
                delete cloneData._id;
                delete cloneData.createdAt;
                delete cloneData.updatedAt;
                cloneData.status = 'Draft';
                cloneData.date = new Date().toISOString().split('T')[0];
                cloneData.deliveryDate = cloneData.deliveryDate ? new Date(cloneData.deliveryDate).toISOString().split('T')[0] : '';
                
                getNextPurchaseOrderNumber().then(res => {
                    if (res.success && res.data) {
                        cloneData.purchaseOrderNumber = `${res.data.prefix}${res.data.nextNumber}`;
                    }
                    reset(cloneData);
                });
            }
        });
    }
  }, [initialData, cloneId, reset]);

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'lineItems'
  });

  // Watch form values for calculations
  const lineItems = useWatch({ control, name: 'lineItems' });
  const discountPercentage = useWatch({ control, name: 'discountPercentage' }) || 0;
  const taxPercentage = useWatch({ control, name: 'taxPercentage' }) || 0;
  const taxType = useWatch({ control, name: 'taxType' }) || 'TDS';
  const adjustment = useWatch({ control, name: 'adjustment' }) || 0;
  const selectedPackage = useWatch({ control, name: 'package' });

  useEffect(() => {
    setValue('circle', '');
  }, [selectedPackage, setValue]);

  const freightInsuranceType = useWatch({ control, name: 'freightInsuranceType' });
  const freightInsuranceValueType = useWatch({ control, name: 'freightInsuranceValueType' });
  const freightInsuranceAmount = useWatch({ control, name: 'freightInsuranceAmount' }) || 0;
  const cgstPercentage = useWatch({ control, name: 'cgstPercentage' }) || 9;
  const sgstPercentage = useWatch({ control, name: 'sgstPercentage' }) || 9;
  const igstPercentage = useWatch({ control, name: 'igstPercentage' }) || 0;
  const gstTreatment = useWatch({ control, name: 'gstTreatment' }) || 'intra_state';

  const currentLocation = useWatch({ control, name: 'location' });
  const deliveryAddressId = useWatch({ control, name: 'deliveryAddressId' });
  const deliveryAddresses = useWatch({ control, name: 'deliveryAddresses' }) || [];
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
      setValue('deliveryAddresses', [currentLocation]);
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

    getBillingCompanies().then(res => {
      if (res.success) {
        setBillingCompaniesList(res.data);
      }
    }).catch(err => console.error('Failed to fetch billing companies:', err));

    // Fetch next sequential PO Number if not in edit mode
    if (!initialData && !cloneId) {
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

  // Ensure vendorName and billingCompanyId are synced after lists load
  useEffect(() => {
    if (vendorsList.length > 0 && initialData?.vendorName) {
      setValue('vendorName', initialData.vendorName);
    }
  }, [vendorsList, initialData, setValue]);

  useEffect(() => {
    if (billingCompaniesList.length > 0 && initialData?.billingCompany?.name) {
      const match = billingCompaniesList.find(c => c.name === initialData.billingCompany.name);
      if (match) {
        setValue('billingCompanyId', match._id);
      } else {
        setValue('billingCompanyId', 'legacy');
      }
    }
  }, [billingCompaniesList, initialData, setValue]);

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
  const isIntraState = gstTreatment === 'intra_state';
  const cgstAmountVal = isIntraState ? (taxableAmountForGst * Number(cgstPercentage)) / 100 : 0;
  const sgstAmountVal = isIntraState ? (taxableAmountForGst * Number(sgstPercentage)) / 100 : 0;
  const igstAmountVal = !isIntraState ? (taxableAmountForGst * Number(igstPercentage)) / 100 : 0;

  const taxAmount = ((subTotal - discountAmount) * taxPercentage) / 100; // TDS/TCS
  const taxAmountValue = taxType === 'TCS' ? taxAmount : -taxAmount;
  const total = subTotal - discountAmount + freightAmount + cgstAmountVal + sgstAmountVal + igstAmountVal + taxAmountValue + Number(adjustment);

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
        
        // Add to the multiple delivery addresses
        const currentAddresses = deliveryAddresses;
        if (!currentAddresses.includes(response.data.name)) {
          setValue('deliveryAddresses', [...currentAddresses, response.data.name]);
        }
        
        setIsNewAddressModalOpen(false);
        setIsDeliveryDropdownOpen(false);
        setNewAddress({ attention: '', street1: '', street2: '', city: '', state: '', zip: '', country: '', phone: '' });
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

      const selectedBillingCompany = billingCompaniesList.find(c => c._id === data.billingCompanyId);
      const billingCompanySnapshot = selectedBillingCompany ? {
        name: selectedBillingCompany.name,
        address: selectedBillingCompany.address,
        phone: selectedBillingCompany.phone,
        email: selectedBillingCompany.email,
        logoUrl: selectedBillingCompany.logoUrl
      } : undefined;

      const isIntraState = data.gstTreatment === 'intra_state';
      const submitCgst = isIntraState ? (Number(data.cgstPercentage) || 9) : 0;
      const submitSgst = isIntraState ? (Number(data.sgstPercentage) || 9) : 0;
      const submitIgst = !isIntraState ? (Number(data.igstPercentage) || 0) : 0;

      if (files.length > 0) {
        const formData = new FormData();
        // Append all text fields
        Object.keys(data).forEach(key => {
          if (key === 'lineItems') {
            formData.append('lineItems', JSON.stringify(processedLineItems));
          } else if (key === 'deliveryAddresses') {
            formData.append('deliveryAddresses', JSON.stringify(data.deliveryAddresses || []));
          } else if (key === 'paymentTerms') {
            formData.append('paymentTerms', JSON.stringify(data.paymentTerms || []));
          } else if (key === 'cgstPercentage') {
            formData.append('cgstPercentage', String(submitCgst));
          } else if (key === 'sgstPercentage') {
            formData.append('sgstPercentage', String(submitSgst));
          } else if (key === 'igstPercentage') {
            formData.append('igstPercentage', String(submitIgst));
          } else if (key === 'billingCompany' || key === 'attachments' || key === 'status' || key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt') {
            // Skip these, they are handled separately or should not be sent
          } else {
            const value = (data as any)[key];
            if (value !== undefined && value !== null) {
              formData.append(key, value);
            }
          }
        });
        if (billingCompanySnapshot) {
          formData.append('billingCompany', JSON.stringify(billingCompanySnapshot));
        }
        formData.append('status', status);

        // Append files
        files.forEach(file => {
          formData.append('files', file);
        });

        if (data.attachments && data.attachments.length > 0) {
          formData.append('attachments', JSON.stringify(data.attachments));
        }

        payloadToSubmit = formData;
      } else {
        const payload: any = {
          ...data,
          cgstPercentage: submitCgst,
          sgstPercentage: submitSgst,
          igstPercentage: submitIgst,
          lineItems: processedLineItems,
          billingCompany: billingCompanySnapshot,
          status
        };
        if (!payload.deliveryDate) {
          delete payload.deliveryDate;
        }
        payloadToSubmit = payload;
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
          hsnCode: getVal('hsnCode') || getVal('hsn') || '',
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

  const exportSelectedToCsv = () => {
    const headers = ['Item ID', 'Temp Code', 'Item Name', 'Description', 'HSN Code', 'Package', 'Circle', 'LOA Serial No', 'Quantity', 'Rate', 'Amount'];
    
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
        const loaSerialNo = getVal('loaSerialNo') || getVal('loaSerialNumber') || getVal('LOA Serial No.') || getVal('loa') || '';

        rows.push([
          escapeCsv(selectedItem._id),
          escapeCsv(getVal('tempCode') || getVal('sku') || getVal('itemCode')),
          escapeCsv(getVal('name') || getVal('itemDescription') || 'Item'),
          escapeCsv(getVal('description') || getVal('itemDescription')),
          escapeCsv(getVal('hsnCode') || getVal('hsn')),
          escapeCsv(getVal('package')),
          escapeCsv(getVal('circle')),
          escapeCsv(loaSerialNo),
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
      
      const headers = rows[0].map(h => h.trim().toLowerCase());
      const idxId = headers.findIndex(h => h === 'item id');
      const idxTempCode = headers.findIndex(h => h === 'temp code');
      const idxName = headers.findIndex(h => h === 'item name');
      const idxDesc = headers.findIndex(h => h === 'description');
      const idxHsn = headers.findIndex(h => h === 'hsn code');
      const idxPackage = headers.findIndex(h => h === 'package');
      const idxCircle = headers.findIndex(h => h === 'circle');
      const idxLoa = headers.findIndex(h => h.includes('loa') && h.includes('serial'));
      const idxQty = headers.findIndex(h => h === 'quantity');
      const idxRate = headers.findIndex(h => h === 'rate');

      const dataRows = rows.slice(1);
      let added = 0;
      let updated = 0;
      const currentItems = getValues('items') || [];
      
      dataRows.forEach(row => {
        if (row.length >= 2) {
          const itemId = idxId >= 0 ? row[idxId] : row[0];
          const loaSerialNo = idxLoa >= 0 ? row[idxLoa] : (row.length > 9 ? row[7] : '');
          
          if (itemId) {
             const existingIndex = currentItems.findIndex((item: any) => item.loaSerialNo === loaSerialNo && loaSerialNo !== '');
             
             const newItemData = {
                itemId: itemId,
                tempCode: (idxTempCode >= 0 ? row[idxTempCode] : row[1]) || '',
                itemName: (idxName >= 0 ? row[idxName] : row[2]) || 'Item',
                description: (idxDesc >= 0 ? row[idxDesc] : row[3]) || '',
                hsnCode: (idxHsn >= 0 ? row[idxHsn] : row[4]) || '',
                package: (idxPackage >= 0 ? row[idxPackage] : row[5]) || '',
                circle: (idxCircle >= 0 ? row[idxCircle] : row[6]) || '',
                unit: '',
                loaSerialNo: loaSerialNo || '',
                account: '',
                quantity: Number(idxQty >= 0 ? row[idxQty] : (row.length > 9 ? row[8] : row[7])) || 1,
                rate: Number(idxRate >= 0 ? row[idxRate] : (row.length > 9 ? row[9] : row[8])) || 0,
             };

             if (existingIndex >= 0) {
                 update(existingIndex, { ...currentItems[existingIndex], ...newItemData });
                 currentItems[existingIndex] = { ...currentItems[existingIndex], ...newItemData };
                 updated++;
             } else {
                 append(newItemData);
                 currentItems.push(newItemData);
                 added++;
             }
          }
        }
      });
      
      if (added > 0 || updated > 0) {
         toast.success(`Import successful: ${added} added, ${updated} updated.`);
         setIsBulkModalOpen(false);
         setSelectedBulkItems([]);
      } else {
         toast.error('No valid items found in the CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
    <form className="flex flex-col h-full bg-[#f4f7fb] relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{orderId ? 'Edit Purchase Order' : 'New Purchase Order'}</h1>
            <p className="text-sm text-slate-500">Create a new purchase order for your vendor</p>
          </div>
        </div>
        <Link href="/purchases/orders" className="p-2 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors">
          <X className="w-5 h-5 text-slate-500" />
        </Link>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 flex flex-col gap-6">

          {/* Top Form Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Vendor & Delivery Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <h2 className="text-blue-600 font-semibold mb-6 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Vendor & Delivery
              </h2>
              {/* Vendor Name */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-[13px] font-semibold text-slate-800">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
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
                      {/* Billing Address Section */}
                      <div className="text-xs text-slate-600 space-y-1 relative">
                        <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1 mb-2">
                          Billing Address <Edit className="w-3 h-3 cursor-pointer hover:text-blue-500" onClick={() => { setIsBillingPopoverOpen(!isBillingPopoverOpen); setIsShippingPopoverOpen(false); }} />
                        </p>
                        {vendorBillingAddress ? (
                          <div className="whitespace-pre-wrap">{vendorBillingAddress}</div>
                        ) : (
                          <p className="text-blue-500 cursor-pointer hover:underline">New Address</p>
                        )}

                        {isBillingPopoverOpen && (
                          <div ref={billingPopoverRef} className="absolute top-6 left-0 w-[320px] bg-white rounded-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-slate-200 z-50 py-2">
                            <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Billing Address</div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              <div
                                className="px-4 py-3 cursor-pointer border-l-2 border-blue-500 bg-blue-50/40 hover:bg-blue-50 transition-colors flex items-start justify-between group"
                                onClick={() => setIsBillingPopoverOpen(false)}
                              >
                                <div className="pr-4">
                                  <div className="font-semibold text-slate-800 mb-1.5 text-[13px]">{selectedVendor?.dynamicData?.companyName || selectedVendor?.dynamicData?.displayName || 'Supplier'}</div>
                                  <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600">
                                    {vendorBillingAddress}
                                  </div>
                                </div>
                                <button type="button" className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-blue-500 hover:bg-blue-100 transition-all shrink-0">
                                  <Edit className="w-3.5 h-3.5" onClick={(e) => { e.stopPropagation(); setIsAddressModalOpen(true); }} />
                                </button>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-100 px-2">
                              <button type="button" onClick={() => setIsAddressModalOpen(true)} className="text-[#0076f2] flex items-center gap-2 text-[13px] font-medium hover:bg-blue-50 w-full px-2 py-2 rounded-md transition-colors">
                                <div className="w-[18px] h-[18px] bg-[#0076f2] rounded-full flex items-center justify-center text-white font-medium text-lg leading-none pb-[2px]">
                                  +
                                </div>
                                Add New Address
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Shipping Address Section */}
                      <div className="text-xs text-slate-600 space-y-1 relative">
                        <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] flex items-center gap-1 mb-2">
                          Shipping Address <Edit className="w-3 h-3 cursor-pointer hover:text-blue-500" onClick={() => { setIsShippingPopoverOpen(!isShippingPopoverOpen); setIsBillingPopoverOpen(false); }} />
                        </p>
                        {showShippingAddress && vendorShippingAddress ? (
                          <div className="whitespace-pre-wrap">{vendorShippingAddress}</div>
                        ) : (
                          <p className="text-blue-500 cursor-pointer hover:underline" onClick={() => setIsShippingPopoverOpen(true)}>New Address</p>
                        )}

                        {isShippingPopoverOpen && (
                          <div ref={shippingPopoverRef} className="absolute top-6 left-0 w-[320px] bg-white rounded-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-slate-200 z-50 py-2">
                            <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Shipping Address</div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              <div
                                className="px-4 py-3 cursor-pointer border-l-2 border-blue-500 bg-blue-50/40 hover:bg-blue-50 transition-colors flex items-start justify-between group"
                                onClick={() => { setShowShippingAddress(true); setIsShippingPopoverOpen(false); }}
                              >
                                <div className="pr-4">
                                  <div className="font-semibold text-slate-800 mb-1.5 text-[13px]">{selectedVendor?.dynamicData?.companyName || selectedVendor?.dynamicData?.displayName || 'Supplier'}</div>
                                  <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-600">
                                    {vendorShippingAddress}
                                  </div>
                                </div>
                                <button type="button" className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-blue-500 hover:bg-blue-100 transition-all shrink-0">
                                  <Edit className="w-3.5 h-3.5" onClick={(e) => { e.stopPropagation(); setIsAddressModalOpen(true); }} />
                                </button>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-100 px-2">
                              <button type="button" onClick={() => setIsAddressModalOpen(true)} className="text-[#0076f2] flex items-center gap-2 text-[13px] font-medium hover:bg-blue-50 w-full px-2 py-2 rounded-md transition-colors">
                                <div className="w-[18px] h-[18px] bg-[#0076f2] rounded-full flex items-center justify-center text-white font-medium text-lg leading-none pb-[2px]">
                                  +
                                </div>
                                Add New Address
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-800">Billing From</label>
                <select {...register('billingCompanyId')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Select Billing Company</option>
                  {billingCompaniesList.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                  {initialData?.billingCompany && !billingCompaniesList.find(c => c.name === initialData.billingCompany.name) && (
                    <option value="legacy" disabled>{initialData.billingCompany.name}</option>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-800">Location</label>
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
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[13px] font-semibold text-slate-800">
                  Delivery Address <span className="text-red-500">*</span>
                </label>
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

                  {deliveryAddresses.map((addressName, index) => {
                    const selectedLoc = locationsList.find(loc => loc.name === addressName);
                    return (
                      <div key={index} className="mb-4 relative group">
                        <div className="flex items-center gap-2 mb-2">
                          <select
                            value={addressName}
                            onChange={(e) => {
                              const newAddresses = [...deliveryAddresses];
                              newAddresses[index] = e.target.value;
                              setValue('deliveryAddresses', newAddresses);
                              // Sync first one for legacy support
                              if (index === 0) setValue('deliveryAddressId', e.target.value);
                            }}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                          >
                            <option value="">Select Delivery Location</option>
                            {locationsList.filter(loc => loc.type !== 'Other').map((loc) => (
                              <option key={loc._id} value={loc.name}>{loc.name}</option>
                            ))}
                          </select>
                          
                          {deliveryAddresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newAddresses = [...deliveryAddresses];
                                newAddresses.splice(index, 1);
                                setValue('deliveryAddresses', newAddresses);
                                if (index === 0 && newAddresses.length > 0) {
                                  setValue('deliveryAddressId', newAddresses[0]);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="Remove this address"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {deliveryAddressType === 'Locations' && selectedLoc ? (
                          <div className="border border-blue-200 rounded-md p-3 bg-blue-50/30 shadow-sm ml-1 border-l-4 border-l-blue-400">
                            <p className="font-semibold text-slate-800 text-sm mb-1">{addressName || 'Select Location'}</p>
                            <div className="text-[13px] text-slate-600 leading-relaxed">
                              {selectedLoc.address ? (
                                <p className="whitespace-pre-wrap">{selectedLoc.address}</p>
                              ) : (
                                <p className="italic text-slate-400">No address provided</p>
                              )}
                              {selectedLoc.phone && <p className="mt-1">{selectedLoc.phone}</p>}
                            </div>
                          </div>
                        ) : deliveryAddressType === 'Locations' && !selectedLoc ? (
                          <div className="bg-slate-50 border border-slate-100 rounded-md p-3 text-[13px] text-slate-500 flex items-center justify-center">
                            <p className="italic">Please select a delivery location</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  
                  <div className="flex items-center gap-3 mt-4 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setValue('deliveryAddresses', [...deliveryAddresses, '']);
                      }}
                      className="flex items-center text-[#0076f2] text-sm font-medium hover:underline py-1"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Another Location
                    </button>
                    
                    <span className="text-slate-300">|</span>
                    
                    <button
                      type="button"
                      onClick={() => setIsNewAddressModalOpen(true)}
                      className="flex items-center text-slate-500 text-sm font-medium hover:text-[#0076f2] hover:underline py-1"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Create Custom Address
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Purchase Information Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <h2 className="text-blue-600 font-semibold mb-6 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Purchase Information
              </h2>
              {/* Purchase Order Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-800">
                  Purchase Order# <span className="text-red-500">*</span>
                </label>
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
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-800">Reference#</label>
                <input type="text" {...register('reference')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500" />
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-800">Date</label>
                <input type="date" {...register('date')} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
              </div>

              {/* Delivery Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-800">Delivery Date</label>
                <input type="date" {...register('deliveryDate')} className="w-full sm:w-[50%] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
              </div>

             

              {/* Shipment Preference */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-800">Shipment Preference</label>
                <select {...register('shipmentPreference')} className="w-full sm:w-[50%] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Choose the shipment preference</option>
                  <option value="Air">Air</option>
                  <option value="Sea">Sea</option>
                  <option value="Road">Road</option>
                </select>
              </div>

              {/* Package */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-800">Package</label>
                <select {...register('package')} className="w-full sm:w-[50%] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:border-blue-500 bg-white">
                  <option value="">Select Package</option>
                  <option value="Package 1 (S/N)">Package 1 (S/N)</option>
                  <option value="Package 2 (R/R)">Package 2 (R/R)</option>
                </select>
              </div>

              {/* Circle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-800">Circle</label>
                <select {...register('circle')} className="w-full sm:w-[50%] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 focus:outline-none focus:border-blue-500 bg-white" disabled={!selectedPackage}>
                  <option value="">Select Circle</option>
                  {selectedPackage === 'Package 1 (S/N)' && (
                    <>
                      <option value="Solan">Solan</option>
                      <option value="Nahan">Nahan</option>
                    </>
                  )}
                  {selectedPackage === 'Package 2 (R/R)' && (
                    <>
                      <option value="Rampur">Rampur</option>
                      <option value="Rohru">Rohru</option>
                    </>
                  )}
                </select>
              </div>

            </div>
          </div>

          {/* Item Table Section */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Item Details</h3>
              <div className="flex items-center gap-4">
                <button type="button" className="text-[#3b82f6] text-sm font-medium flex items-center gap-1 hover:underline">
                  <Settings className="w-4 h-4" /> Bulk Actions
                </button>
                <input type="file" accept=".csv" ref={csvInputRef} onChange={handleImportCsv} className="hidden" />
                <button type="button" onClick={() => csvInputRef.current?.click()} className="text-[#3b82f6] text-sm font-medium flex items-center gap-1 hover:underline">
                  <FileUp className="w-4 h-4" /> Import Items
                </button>
              </div>
            </div>

            <div className="overflow-visible px-6 pb-6">
              <table className="w-full text-sm text-left table-fixed min-w-[1000px]">
                <thead className="bg-[#fcfdff] border-y border-slate-200/80 text-[11px] font-bold text-[#5e7790] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 w-12 text-center">SR.NO</th>
                    {isFieldActive('tempCode') && <th className="px-4 py-2 w-[10%] min-w-[100px]">TEMP CODE</th>}
                    {isFieldActive('description') && <th className="px-4 py-2 w-[12%] min-w-[120px]">DESCRIPTION</th>}
                    <th className="px-4 py-2 w-[10%] min-w-[100px]">HSN CODE</th>
                    <th className="px-4 py-2 w-[14%] min-w-[140px]">NAME</th>
                    <th className="px-4 py-2 w-[8%] min-w-[80px]">PACKAGE</th>
                    <th className="px-4 py-2 w-[8%] min-w-[80px]">CIRCLE</th>
                    <th className="px-4 py-2 text-right w-[8%] min-w-[80px]">QUANTITY</th>
                    <th className="px-4 py-2 text-right w-[10%] min-w-[100px]">RATE</th>
                    <th className="px-4 py-2 text-right w-[10%] min-w-[100px]">AMOUNT</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="bg-white hover:bg-slate-50 transition-colors last:[&>td:first-child]:rounded-bl-lg last:[&>td:last-child]:rounded-br-lg">
                      <td className="px-4 py-4 text-center text-[#5e7790] text-[13px]">
                        <input type="hidden" {...register(`lineItems.${index}.loaSerialNo`)} />
                        <input type="hidden" {...register(`lineItems.${index}.description`)} />
                        {index + 1}
                      </td>
                      {isFieldActive('tempCode') && (
                        <td className="px-4 py-4 relative item-dropdown-container">
                          <div className="relative w-full flex items-center border-b border-dashed border-slate-400 pb-1">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-0" />
                            <input
                              type="text"
                              placeholder="Search code..."
                              className="w-full bg-transparent pl-5 text-[13px] text-[#334155] focus:outline-none cursor-text"
                              value={tempCodeSearchQueries[field.id] !== undefined ? tempCodeSearchQueries[field.id] : (lineItems[index]?.tempCode || '')}
                              onChange={(e) => {
                                setTempCodeSearchQueries(prev => ({ ...prev, [field.id]: e.target.value }));
                                if (openTempCodeDropdownId !== field.id) setOpenTempCodeDropdownId(field.id);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openTempCodeDropdownId !== field.id) setOpenTempCodeDropdownId(field.id);
                              }}
                            />
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none" />
                          </div>

                          {openTempCodeDropdownId === field.id && (
                            <div
                              className="absolute left-0 top-full mt-1 w-[300px] bg-white border border-slate-200 shadow-xl rounded-md z-50 overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="max-h-60 overflow-y-auto py-1">
                                {itemsList
                                  .filter(item => {
                                  const inputValue = tempCodeSearchQueries[field.id] !== undefined ? tempCodeSearchQueries[field.id] : (lineItems[index]?.tempCode || '');
                                  const sq = String(inputValue).toLowerCase();
                                  const tempCodeStr = String(item.dynamicData?.tempCode || '').toLowerCase();
                                  return tempCodeStr.includes(sq);
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
                                          hsnCode: getVal('hsnCode') || getVal('hsn') || '',
                                          package: getVal('package') || '',
                                          loaSerialNo: getVal('loaSerialNo') || getVal('loaSerialNumber') || getVal('LOA Serial No.') || getVal('loa') || getVal('sku') || '',
                                          circle: getVal('circle') || '',
                                          unit: getVal('unit') || '',
                                          rate: getVal('price') || getVal('costPrice') || getVal('sellingPrice') || 0
                                        });
                                        setOpenTempCodeDropdownId(null);
                                        setTempCodeSearchQueries(prev => {
                                          const newQueries = { ...prev };
                                          delete newQueries[field.id];
                                          return newQueries;
                                        });
                                      }}
                                    >
                                      <span className="text-sm text-slate-800 font-medium">{item.dynamicData?.name || item.dynamicData?.itemDescription || 'Unnamed Item'}</span>
                                      <span className="text-[10px] text-slate-500">Code: {item.dynamicData?.tempCode || item.dynamicData?.sku || '--'} | Price: {(item.dynamicData?.price || item.dynamicData?.costPrice || 0).toFixed(2)}</span>
                                    </div>
                                  ))}
                                {itemsList.filter(item => {
                                  const inputValue = tempCodeSearchQueries[field.id] !== undefined ? tempCodeSearchQueries[field.id] : (lineItems[index]?.tempCode || '');
                                  const sq = String(inputValue).toLowerCase();
                                  const tempCodeStr = String(item.dynamicData?.tempCode || '').toLowerCase();
                                  return tempCodeStr.includes(sq);
                                }).length === 0 && (
                                    <div className="px-3 py-3 text-xs text-slate-500 text-center">No items found</div>
                                  )}
                              </div>
                            </div>
                          )}
                        </td>
                      )}
                      {isFieldActive('description') && (
                        <td className="px-4 py-4 align-top">
                          <div className="w-full text-[#5e7790] text-[13px] break-words whitespace-pre-wrap min-h-[20px]">
                            {lineItems[index]?.description || '--'}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <input type="text" defaultValue={field.hsnCode} {...register(`lineItems.${index}.hsnCode`)} className="w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-none text-[#334155] text-[13px]" placeholder="HSN Code" />
                      </td>
                      <td className="px-4 py-4 relative item-dropdown-container">
                        <div className="relative w-full flex items-center border-b border-dashed border-slate-400 pb-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-0" />
                          <input
                            type="text"
                            placeholder="Search by name or code..."
                            className="w-full bg-transparent pl-5 text-[13px] text-[#334155] focus:outline-none cursor-text"
                            value={dropdownSearchQueries[field.id] !== undefined ? dropdownSearchQueries[field.id] : (lineItems[index]?.itemName || '')}
                            onChange={(e) => {
                              setDropdownSearchQueries(prev => ({ ...prev, [field.id]: e.target.value }));
                              if (openDropdownId !== field.id) setOpenDropdownId(field.id);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openDropdownId !== field.id) setOpenDropdownId(field.id);
                            }}
                          />
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none" />
                        </div>

                        {openDropdownId === field.id && (
                          <div
                            className="absolute left-0 top-full mt-1 w-[300px] bg-white border border-slate-200 shadow-xl rounded-md z-50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="max-h-60 overflow-y-auto py-1">
                              {itemsList
                                .filter(item => {
                                  const inputValue = dropdownSearchQueries[field.id] !== undefined ? dropdownSearchQueries[field.id] : (lineItems[index]?.itemName || '');
                                  const sq = String(inputValue).toLowerCase();
                                  const name = String(item.dynamicData?.name || item.dynamicData?.itemDescription || '').toLowerCase();
                                  return name.includes(sq);
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
                                        hsnCode: getVal('hsnCode') || getVal('hsn') || '',
                                        package: getVal('package') || '',
                                        loaSerialNo: getVal('loaSerialNo') || getVal('loaSerialNumber') || getVal('LOA Serial No.') || getVal('loa') || getVal('sku') || '',
                                        circle: getVal('circle') || '',
                                        unit: getVal('unit') || '',
                                        rate: getVal('price') || getVal('costPrice') || getVal('sellingPrice') || 0
                                      });
                                      setOpenDropdownId(null);
                                      setDropdownSearchQueries(prev => {
                                        const newQueries = { ...prev };
                                        delete newQueries[field.id];
                                        return newQueries;
                                      });
                                    }}
                                  >
                                    <span className="text-sm text-slate-800 font-medium">{item.dynamicData?.name || item.dynamicData?.itemDescription || 'Unnamed Item'}</span>
                                    <span className="text-[10px] text-slate-500">Code: {item.dynamicData?.tempCode || item.dynamicData?.sku || '--'} | Price: {(item.dynamicData?.price || item.dynamicData?.costPrice || 0).toFixed(2)}</span>
                                  </div>
                                ))}
                              {itemsList.filter(item => {
                                const inputValue = dropdownSearchQueries[field.id] !== undefined ? dropdownSearchQueries[field.id] : (lineItems[index]?.itemName || '');
                                const sq = String(inputValue).toLowerCase();
                                const name = String(item.dynamicData?.name || item.dynamicData?.itemDescription || '').toLowerCase();
                                return name.includes(sq);
                              }).length === 0 && (
                                  <div className="px-3 py-3 text-xs text-slate-500 text-center">No items found</div>
                                )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-[#5e7790] text-[13px]">
                        <select 
                          {...register(`lineItems.${index}.package`)}
                          className="w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-none text-[#334155]" 
                          onChange={(e) => {
                             register(`lineItems.${index}.package`).onChange(e);
                             setValue(`lineItems.${index}.circle`, '');
                          }}
                        >
                           <option value="">--</option>
                           <option value="Package 1 (S/N)">Package 1 (S/N)</option>
                           <option value="Package 2 (R/R)">Package 2 (R/R)</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 text-[#5e7790] text-[13px]">
                        <select 
                          {...register(`lineItems.${index}.circle`)}
                          className="w-full bg-transparent border-b border-dashed border-slate-300 focus:outline-none text-[#334155]" 
                        >
                           <option value="">--</option>
                           {lineItems[index]?.package === 'Package 1 (S/N)' && (
                             <>
                               <option value="Solan">Solan</option>
                               <option value="Nahan">Nahan</option>
                             </>
                           )}
                           {lineItems[index]?.package === 'Package 2 (R/R)' && (
                             <>
                               <option value="Rampur">Rampur</option>
                               <option value="Rohru">Rohru</option>
                             </>
                           )}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          step="any"
                          {...register(`lineItems.${index}.quantity`)}
                          className="w-full text-right border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 text-[13px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-sm"
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <textarea
                          {...register(`lineItems.${index}.rate`)}
                          className="w-full text-right border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 text-[13px] resize-none overflow-hidden min-h-[34px] break-all leading-tight shadow-sm"
                          rows={1}
                          onInput={(e) => {
                            e.currentTarget.style.height = '34px';
                            e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault();
                          }}
                        />
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-slate-800 text-[13px] overflow-hidden text-ellipsis whitespace-nowrap" title={((Number(lineItems[index]?.quantity) || 0) * (Number(lineItems[index]?.rate) || 0)).toFixed(2)}>
                        {((Number(lineItems[index]?.quantity) || 0) * (Number(lineItems[index]?.rate) || 0)).toFixed(2)}
                      </td>
                      <td className="px-2 py-4 text-center">
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
              <button type="button" onClick={() => append({ itemId: '', itemName: '', tempCode: '', description: '', hsnCode: '', package: '', loaSerialNo: '', circle: '', unit: '', account: '', quantity: 1, rate: 0 })} className="flex items-center gap-1.5 text-sm font-medium text-[#3b82f6] bg-white border border-[#bfdbfe] px-3.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Add New Row <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              <button type="button" onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-1.5 text-sm font-medium text-[#3b82f6] bg-white border border-[#bfdbfe] px-3.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Add Items in Bulk
              </button>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            
            {/* Left Card: Tabs */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-[350px]">
              <div className="flex items-center gap-6 px-6 pt-4 border-b border-slate-200">
                <button type="button" onClick={() => setActiveTab('notes')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  Notes
                </button>
                <button type="button" onClick={() => setActiveTab('terms')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'terms' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  Terms & Conditions
                </button>
                <button type="button" onClick={() => setActiveTab('attachments')} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attachments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  Attachments
                </button>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                {activeTab === 'notes' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                    <div className="flex flex-col h-full">
                      <label className="text-sm font-semibold text-slate-800 mb-2">Notes</label>
                      <textarea
                        {...register('notes')}
                        placeholder="Write additional notes or instructions..."
                        className="w-full flex-1 min-h-[150px] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 resize-none bg-slate-50"
                      />
                    </div>
                    <div className="flex flex-col space-y-6 h-full">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-800">Payment Terms</label>
                        <PaymentTermsWidget control={control} register={register} name="paymentTerms" />
                      </div>
                      
                      <div className="flex flex-col flex-1 space-y-2">
                        <label className="text-sm font-semibold text-slate-800">Internal Notes</label>
                        <textarea
                          placeholder="Add private notes for internal reference..."
                          className="w-full flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 resize-none bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'terms' && (
                  <div className="flex flex-col h-full">
                    <textarea
                      {...register('termsConditions')}
                      placeholder="Enter the terms and conditions..."
                      className="w-full flex-1 min-h-[150px] border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 resize-none bg-slate-50"
                    />
                  </div>
                )}

                {activeTab === 'attachments' && (
                  <div className="flex flex-col h-full">
                    {files.length > 0 && (
                      <div className="mb-4 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
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
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[150px]"
                    >
                       <FileUp className="w-8 h-8 text-slate-400 mb-2" />
                       <span className="text-sm font-medium text-slate-700">Click or drag files here to upload</span>
                       <p className="text-xs text-slate-400 mt-1">Maximum 10 files, 10MB each</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Card: Order Summary */}
            <div className="bg-[#f8fafc] border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-6">Order Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-800 w-40 shrink-0">Sub Total</span>
                    <span className="text-sm font-bold text-slate-800 text-right truncate pl-4" title={`₹ ${subTotal.toFixed(2)}`}>₹ {subTotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-600 w-40 shrink-0">Discount</span>
                    <div className="flex-1 flex justify-end">
                      <div className="flex items-center w-24 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                        <input type="number" {...register('discountPercentage')} className="w-full text-right px-2 py-1 text-sm focus:outline-none" />
                        <span className="bg-slate-50 px-2 py-1 text-sm border-l border-slate-200 text-slate-500">%</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-800 text-right w-28 shrink-0 truncate" title={`₹ ${discountAmount.toFixed(2)}`}>₹ {discountAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-600 w-40 shrink-0">Freight & Insurance</span>
                    <div className="flex-1 flex flex-col items-end gap-2">
                      <select {...register('freightInsuranceType')} className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none w-24 bg-white shadow-sm">
                        <option value="Inclusive">Inclusive</option>
                        <option value="Exclusive">Exclusive</option>
                      </select>
                      {freightInsuranceType === 'Exclusive' && (
                        <div className="flex items-center w-24 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                          <input type="number" {...register('freightInsuranceAmount')} className="w-full text-right px-2 py-1 text-sm focus:outline-none" />
                          <select {...register('freightInsuranceValueType')} className="bg-slate-50 border-l border-slate-200 text-slate-500 text-sm focus:outline-none px-1 h-full py-1">
                            <option value="Amount">₹</option>
                            <option value="Percentage">%</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-slate-800 text-right w-28 shrink-0 truncate" title={`₹ ${freightInsuranceType === 'Exclusive' ? freightAmount.toFixed(2) : '0.00'}`}>₹ {freightInsuranceType === 'Exclusive' ? freightAmount.toFixed(2) : '0.00'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-600 w-40 shrink-0">GST Treatment</span>
                    <div className="flex-1 flex justify-end">
                      <select {...register('gstTreatment')} className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none w-32 bg-white shadow-sm">
                        <option value="intra_state">Intra-State</option>
                        <option value="inter_state">Inter-State</option>
                      </select>
                    </div>
                  </div>

                  {gstTreatment === 'intra_state' && (
                    <>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-600 w-40 shrink-0">CGST</span>
                        <div className="flex-1 flex justify-end">
                          <div className="flex items-center w-24 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                            <input type="number" min="0" {...register('cgstPercentage')} className="w-full text-right px-2 py-1 text-sm focus:outline-none" />
                            <span className="bg-slate-50 px-2 py-1 text-sm border-l border-slate-200 text-slate-500">%</span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-800 text-right w-28 shrink-0 truncate" title={`₹ ${cgstAmountVal.toFixed(2)}`}>₹ {cgstAmountVal.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-600 w-40 shrink-0">SGST</span>
                        <div className="flex-1 flex justify-end">
                          <div className="flex items-center w-24 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                            <input type="number" min="0" {...register('sgstPercentage')} className="w-full text-right px-2 py-1 text-sm focus:outline-none" />
                            <span className="bg-slate-50 px-2 py-1 text-sm border-l border-slate-200 text-slate-500">%</span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-800 text-right w-28 shrink-0 truncate" title={`₹ ${sgstAmountVal.toFixed(2)}`}>₹ {sgstAmountVal.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  
                  {gstTreatment === 'inter_state' && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-600 w-40 shrink-0">IGST</span>
                      <div className="flex-1 flex justify-end">
                        <div className="flex items-center w-24 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                          <input type="number" min="0" {...register('igstPercentage')} className="w-full text-right px-2 py-1 text-sm focus:outline-none" />
                          <span className="bg-slate-50 px-2 py-1 text-sm border-l border-slate-200 text-slate-500">%</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 text-right w-28 shrink-0 truncate" title={`₹ ${igstAmountVal.toFixed(2)}`}>₹ {igstAmountVal.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-40 shrink-0">
                      <label className="text-sm text-slate-600">TDS / TCS</label>
                      <select {...register('taxType')} className="border border-slate-200 rounded-md px-1 py-1 text-xs text-slate-700 focus:outline-none w-16 bg-white shadow-sm">
                        <option value="TDS">TDS</option>
                        <option value="TCS">TCS</option>
                      </select>
                    </div>
                    <div className="flex-1 flex justify-end">
                      <div className="flex items-center w-24 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                        <input type="number" step="0.01" min="0" {...register('taxPercentage')} className="w-full text-right px-2 py-1 text-sm focus:outline-none" />
                        <span className="bg-slate-50 px-2 py-1 text-sm border-l border-slate-200 text-slate-500">%</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-800 text-right w-28 shrink-0 truncate" title={`${taxType === 'TCS' ? '+' : '-'} ₹ ${taxAmount.toFixed(2)}`}>
                      {taxType === 'TCS' ? '+' : '-'} ₹ {taxAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-600 w-40 shrink-0">Adjustment</span>
                    <div className="flex-1 flex justify-end">
                      <input type="number" {...register('adjustment')} className="w-24 border border-slate-200 rounded-md px-2 py-1 text-sm text-right focus:outline-none bg-white shadow-sm" />
                    </div>
                    <span className="text-sm font-semibold text-slate-800 text-right w-28 shrink-0 truncate" title={`₹ ${Number(adjustment).toFixed(2)}`}>₹ {Number(adjustment).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-[#f0f7ff] rounded-xl p-4 flex flex-col border border-[#bfdbfe] gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-slate-800 shrink-0">Grand Total</span>
                  <span className="text-2xl font-bold text-[#0076f2] truncate pl-4" title={`₹ ${total.toFixed(2)}`}>₹ {total.toFixed(2)}</span>
                </div>
                <div className="text-[13px] font-medium text-slate-500 text-right">
                  {numberToWords(total)}
                </div>
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
                <Input className="h-10 text-[15px] border-slate-200" value={newAddress.attention} onChange={e => setNewAddress({ ...newAddress, attention: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-4">
                <label className="text-[15px] text-slate-700 pt-2">Street 1</label>
                <textarea className="w-full border border-slate-200 rounded-md p-2.5 text-[15px] focus:outline-none focus:border-blue-500 h-[80px]" value={newAddress.street1} onChange={e => setNewAddress({ ...newAddress, street1: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-start gap-4">
                <label className="text-[15px] text-slate-700 pt-2">Street 2</label>
                <textarea className="w-full border border-slate-200 rounded-md p-2.5 text-[15px] focus:outline-none focus:border-blue-500 h-[80px]" value={newAddress.street2} onChange={e => setNewAddress({ ...newAddress, street2: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-[15px] text-slate-700">City</label>
                <Input className="h-10 text-[15px] border-slate-200" value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-[15px] text-slate-700">State/Province</label>
                <Input className="h-10 text-[15px] border-slate-200" value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-[15px] text-slate-700">ZIP/Postal Code</label>
                <Input className="h-10 text-[15px] border-slate-200" value={newAddress.zip} onChange={e => setNewAddress({ ...newAddress, zip: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-[15px] text-slate-700">Country/Region</label>
                <select className="h-10 w-full border border-slate-200 rounded-md px-3 text-[15px] text-slate-600 focus:outline-none focus:border-blue-500 bg-white" value={newAddress.country} onChange={e => setNewAddress({ ...newAddress, country: e.target.value })}>
                  <option value="">Select or type to add</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] items-center gap-4">
                <label className="text-[15px] text-slate-700">Phone</label>
                <div className="relative w-full">
                  <Input className="h-10 text-[15px] border-slate-200 pr-8" value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><path d="M6 9l6 6 6-6" /></svg>
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
      {/* Address Modal */}
      {isAddressModalOpen && (
        <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
          <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white">
            <DialogHeader className="px-6 py-4 border-b border-slate-200">
              <DialogTitle className="text-lg font-normal text-slate-800">Additional Address</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[13px] text-slate-700">Attention</label>
                <input type="text" className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-slate-700">Country/Region</label>
                <select className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500 bg-white">
                  <option>Select</option>
                  <option>India</option>
                  <option>United States</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-slate-700">Address</label>
                <textarea rows={2} placeholder="Street 1" className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500 mb-2"></textarea>
                <textarea rows={2} placeholder="Street 2" className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500"></textarea>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-slate-700">City</label>
                <input type="text" className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] text-slate-700">State</label>
                  <select className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500 bg-white">
                    <option>Select or type to add</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] text-slate-700">Pin Code</label>
                  <input type="text" className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] text-slate-700">Phone</label>
                  <div className="flex">
                    <select className="w-[70px] border border-slate-300 rounded-l px-2 py-2 text-[13px] focus:outline-none focus:border-blue-500 bg-white border-r-0">
                      <option>+91</option>
                    </select>
                    <input type="text" className="flex-1 border border-slate-300 rounded-r px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] text-slate-700">Fax Number</label>
                  <input type="text" className="w-full border border-slate-300 rounded px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <p className="text-[13px] text-slate-500 pt-2"><span className="font-semibold text-slate-600">Note:</span> Changes made here will be updated for this vendor.</p>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-slate-200 sm:justify-start">
              <Button type="button" onClick={() => setIsAddressModalOpen(false)} className="bg-[#78a5fd] hover:bg-[#5b8df5] text-white font-normal px-5">Save</Button>
              <Button type="button" variant="outline" onClick={() => setIsAddressModalOpen(false)} className="bg-slate-50 font-normal px-5 text-slate-700 border-slate-300 hover:bg-slate-100">Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </form>
  );
}
