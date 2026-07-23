"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { createStoreTransfer, getStockSummary } from "@/features/store/api/store.api";
import Select, { StylesConfig } from 'react-select';

const customSelectStyles: StylesConfig<any, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: '36px',
    height: '36px',
    borderRadius: '0.375rem',
    borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1',
    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#3b82f6' : '#94a3b8' },
    fontSize: '0.875rem'
  }),
  valueContainer: (base) => ({ ...base, padding: '0 8px' }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  dropdownIndicator: (base) => ({ ...base, padding: '4px' }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({
    ...base,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    borderRadius: '0.5rem',
    overflow: 'hidden'
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    backgroundColor: state.isSelected ? '#eff6ff' : state.isFocused ? '#f8fafc' : 'white',
    color: state.isSelected ? '#1d4ed8' : '#334155',
    cursor: 'pointer',
    '&:active': { backgroundColor: '#e2e8f0' }
  })
};

export default function NewOutwardTransferPage() {
  const router = useRouter();
  
  const [requestDate, setRequestDate] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [fromStore, setFromStore] = useState("");
  const [toStore, setToStore] = useState("");
  
  const [minBookNo, setMinBookNo] = useState("");
  const [minNo, setMinNo] = useState(`MIN-${Math.floor(1000 + Math.random() * 9000)}`);
  const [minDate, setMinDate] = useState("");
  const [challanNo, setChallanNo] = useState(`CH-${Math.floor(100 + Math.random() * 900)}`);
  const [challanDate, setChallanDate] = useState("");

  const [transportName, setTransportName] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [grNumber, setGrNumber] = useState("");
  const [grDate, setGrDate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  
  const [remarks, setRemarks] = useState("");

  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([{
    itemId: "",
    itemName: "",
    tempCode: "",
    unit: "Nos",
    quantity: 1, // Transfer Qty
    availableQty: 0
  }]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setRequestDate(today);
    setMinDate(today);
    setChallanDate(today);
    setGrDate(today);
    
    // Fetch real-time stock summary for material dropdowns
    getStockSummary({}).then(res => setStockSummary(res.data || []));
  }, []);

  const addLineItem = () => {
    setLineItems([...lineItems, { 
      itemId: "", 
      itemName: "", 
      tempCode: "", 
      unit: "Nos", 
      quantity: 1, 
      availableQty: 0 
    }]);
  };

  const removeLineItem = (index: number) => {
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  const handleMaterialSelect = (index: number, selectedOption: any) => {
    const newItems = [...lineItems];
    if (selectedOption) {
      newItems[index] = {
        ...newItems[index],
        itemId: selectedOption.data.item._id,
        itemName: selectedOption.data.itemName,
        tempCode: selectedOption.data.tempCode,
        unit: selectedOption.data.unit || 'Nos',
        availableQty: selectedOption.data.totalBalanceQty || 0
      };
    }
    setLineItems(newItems);
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    setLineItems(newItems);
  };

  const handleSave = async () => {
    if (!fromStore || !toStore) {
      alert("Please specify From Store and To Store");
      return;
    }

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.itemId) {
        alert(`Please select an item for row ${i + 1}`);
        return;
      }
      if (item.quantity <= 0) {
        alert(`Transfer Qty must be greater than 0 for ${item.itemName}`);
        return;
      }
      if (item.quantity > item.availableQty) {
        alert(`Cannot transfer ${item.quantity} of ${item.itemName}. Only ${item.availableQty} available in stock.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        requestDate,
        status: 'IN_TRANSIT', // Bypassing PENDING, sending directly to transit
        fromStore,
        toStore,
        vendorName,
        
        minBookNo,
        minNo,
        minDate,
        challanNo,
        challanDate,
        
        transportName,
        truckNumber,
        grNumber,
        grDate,
        driverName,
        driverMobile,
        
        remarks,

        items: lineItems.map(item => ({
          itemId: item.itemId,
          tempCode: item.tempCode,
          description: item.itemName, // Maps to schema's description field
          unit: item.unit,
          requestedQty: Number(item.quantity),
          dispatchedQty: Number(item.quantity), // Dispatched right away
          receivedQty: 0
        }))
      };

      await createStoreTransfer(payload);
      router.push('/store/outward-register');
    } catch (error) {
      console.error(error);
      alert("Failed to save outward transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Convert stock summary to react-select options
  const descriptionOptions = stockSummary
    .filter(s => s.totalBalanceQty > 0)
    .map(s => ({
      value: s.item._id,
      label: `${s.itemName} (In Stock: ${s.totalBalanceQty})`,
      data: s
    }));

  const tempCodeOptions = stockSummary
    .filter(s => s.totalBalanceQty > 0 && s.tempCode)
    .map(s => ({
      value: s.item._id,
      label: `${s.tempCode} - ${s.itemName}`,
      data: s
    }));

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-6">
      <div className="max-w-[1200px] mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/store/outward-register" className="text-slate-500 hover:text-slate-700">
              <X className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold text-slate-800">New Outward Transfer</h1>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Basic Information</h2>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date <span className="text-red-500">*</span></label>
              <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Vendor (Original Supplier)</label>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">From Store <span className="text-red-500">*</span></label>
              <Input value={fromStore} onChange={(e) => setFromStore(e.target.value)} className="h-9" placeholder="e.g. Circle A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">To Store <span className="text-red-500">*</span></label>
              <Input value={toStore} onChange={(e) => setToStore(e.target.value)} className="h-9" placeholder="e.g. Circle B" />
            </div>
          </div>
        </div>

        {/* Document Info */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Document Details</h2>
          <div className="grid grid-cols-5 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">MIN BOOK No.</label>
              <Input value={minBookNo} onChange={(e) => setMinBookNo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">MIN No.</label>
              <Input value={minNo} onChange={(e) => setMinNo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">MIN Date</label>
              <Input type="date" value={minDate} onChange={(e) => setMinDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Challan No.</label>
              <Input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Challan Date</label>
              <Input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)} className="h-9" />
            </div>
          </div>
        </div>

        {/* Transport Info */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Transport Details</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Transport Name</label>
              <Input value={transportName} onChange={(e) => setTransportName(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Truck No.</label>
              <Input value={truckNumber} onChange={(e) => setTruckNumber(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GR No.</label>
              <Input value={grNumber} onChange={(e) => setGrNumber(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GR Date</label>
              <Input type="date" value={grDate} onChange={(e) => setGrDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Driver Name</label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mobile No.</label>
              <Input value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} className="h-9" />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-visible">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-lg">
            <h2 className="text-sm font-semibold text-slate-800">Transfer Materials</h2>
          </div>
          
          <div className="p-0 overflow-visible">
            <table className="w-full text-sm text-left overflow-visible">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-[8%] text-center">Sr. No.</th>
                  <th className="px-4 py-3 w-[15%]">Temp Code</th>
                  <th className="px-4 py-3 w-[35%]">Description of Material</th>
                  <th className="px-4 py-3 w-[8%]">Unit</th>
                  <th className="px-4 py-3 w-[10%] text-center">In Stock</th>
                  <th className="px-4 py-3 w-[12%] text-center">Transfer QTY.</th>
                  <th className="px-4 py-3 w-[6%] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-4 py-4 text-center font-medium text-slate-500">{index + 1}</td>
                    <td className="p-4 align-top">
                      <Select
                        options={tempCodeOptions}
                        value={tempCodeOptions.find(opt => opt.value === item.itemId) || null}
                        onChange={(opt) => handleMaterialSelect(index, opt)}
                        placeholder="Search code..."
                        styles={customSelectStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        isClearable
                      />
                    </td>
                    <td className="p-4 align-top">
                      <Select
                        options={descriptionOptions}
                        value={descriptionOptions.find(opt => opt.value === item.itemId) || null}
                        onChange={(opt) => handleMaterialSelect(index, opt)}
                        placeholder="Search material..."
                        styles={customSelectStyles}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        isClearable
                      />
                    </td>
                    <td className="p-4 align-top pt-5 text-slate-600">
                      {item.unit}
                    </td>
                    <td className="p-4 align-top pt-5 text-center font-medium text-slate-600">
                      {item.availableQty}
                    </td>
                    <td className="p-4 align-top">
                      <Input 
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                        className={`h-9 w-full text-center font-bold text-blue-700 ${item.quantity > item.availableQty ? 'border-red-500 bg-red-50 text-red-700' : ''}`}
                      />
                      {item.quantity > item.availableQty && (
                        <p className="text-[10px] text-red-500 mt-1 absolute">Exceeds stock</p>
                      )}
                    </td>
                    <td className="p-4 align-top text-center pt-5">
                      <button 
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 rounded-b-lg border-t border-slate-100">
            <Button 
              variant="outline" 
              size="sm"
              onClick={addLineItem}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Add Material
            </Button>
          </div>
        </div>

        {/* Remarks */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-9" placeholder="Any additional details..." />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pb-12">
          <Button variant="outline" className="px-6" onClick={() => router.back()}>Cancel</Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 px-8" 
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Dispatching...' : 'Dispatch Transfer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
