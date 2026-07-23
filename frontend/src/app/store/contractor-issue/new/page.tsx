"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, PlusCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { getContractors, createAssignment } from "@/features/contractors/api/contractors.api";
import { getStockSummary } from "@/features/store/api/store.api";
import Select, { StylesConfig } from 'react-select';

const customSelectStyles: StylesConfig<any, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: '36px',
    height: '36px',
    borderRadius: '0.375rem', // rounded-md
    borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1', // blue-500 or slate-300
    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#94a3b8' // slate-400
    },
    fontSize: '0.875rem', // text-sm
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 8px',
  }),
  input: (base) => ({
    ...base,
    margin: '0',
    padding: '0',
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: '34px',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.375rem',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    backgroundColor: state.isSelected 
      ? '#eff6ff' // blue-50
      : state.isFocused 
        ? '#f8fafc' // slate-50
        : 'white',
    color: state.isSelected ? '#1e40af' : '#334155', // blue-800 or slate-700
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#dbeafe' // blue-100
    }
  })
};

export default function StoreContractorIssueNewPage() {
  const router = useRouter();
  
  // Data State
  const [contractors, setContractors] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  
  // Form State
  const [contractorId, setContractorId] = useState("");
  const [contractorFarmName, setContractorFarmName] = useState("");
  const [supervisorEngineer, setSupervisorEngineer] = useState("");
  
  const [demandNo, setDemandNo] = useState("");
  const [demandBookNo, setDemandBookNo] = useState("");
  const [demandDate, setDemandDate] = useState("");
  
  const [division, setDivision] = useState("");
  const [subDivision, setSubDivision] = useState("");
  const [subStation, setSubStation] = useState("");
  const [feeder, setFeeder] = useState("");
  
  const [vehicleNo, setVehicleNo] = useState("");
  const [minNo, setMinNo] = useState(`MIN-${Math.floor(1000 + Math.random() * 9000)}`);
  const [minBookNo, setMinBookNo] = useState("");
  const [minDate, setMinDate] = useState("");
  const [issuedTfsSrNo, setIssuedTfsSrNo] = useState("");
  const [remarks, setRemarks] = useState("");
  
  const [lineItems, setLineItems] = useState<any[]>([{ 
    itemId: "", 
    itemName: "", 
    tempCode: "", 
    unit: "Nos",
    hsnCode: "",
    demandQty: 1,
    quantity: 1, // This is Issued Qty
    availableQty: 0
  }]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDemandDate(today);
    setMinDate(today);
    getContractors().then(res => setContractors(res.data || []));
    getStockSummary({}).then(res => setStockSummary(res.data || []));
  }, []);

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    
    if (field === "itemId") {
      const selectedStock = stockSummary.find(s => s.itemId === value);
      if (selectedStock) {
        newItems[index].itemId = selectedStock.itemId;
        newItems[index].itemName = selectedStock.description;
        newItems[index].tempCode = selectedStock.tempCode || selectedStock.itemCode || '';
        newItems[index].unit = selectedStock.unit || 'Nos';
        newItems[index].hsnCode = selectedStock.hsnCode || '';
        newItems[index].availableQty = selectedStock.totalBalanceQty || 0;
      } else {
        newItems[index].itemId = "";
        newItems[index].itemName = "";
        newItems[index].unit = "Nos";
        newItems[index].hsnCode = "";
        newItems[index].availableQty = 0;
      }
    } else {
      newItems[index][field] = value;
    }
    
    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { 
      itemId: "", itemName: "", tempCode: "", unit: "Nos", hsnCode: "", demandQty: 1, quantity: 1, availableQty: 0 
    }]);
  };

  const removeLineItem = (index: number) => {
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  const handleSave = async () => {
    if (!contractorId) {
      alert("Please select a Contractor");
      return;
    }

    // Validate quantities against available stock
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (!item.itemId) {
        alert(`Please select an item for row ${i + 1}`);
        return;
      }
      if (item.quantity <= 0) {
        alert(`Issued Qty must be greater than 0 for ${item.itemName}`);
        return;
      }
      if (item.quantity > item.availableQty) {
        alert(`Cannot issue ${item.quantity} of ${item.itemName}. Only ${item.availableQty} available in stock.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        contractorId,
        location: "Store",
        assignmentNumber: minNo, // Mapping MIN No to primary assignment number
        date: minDate,
        
        demandNo,
        demandBookNo,
        demandDate,
        contractorFarmName,
        supervisorEngineer,
        division,
        subDivision,
        subStation,
        feeder,
        vehicleNo,
        minNo,
        minBookNo,
        minDate,
        issuedTfsSrNo,
        remarks,

        subTotal: 0,
        total: 0,
        shippingCharges: 0,
        taxAmount: 0,
        adjustment: 0,
        status: "Sent",
        lineItems: lineItems.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          tempCode: item.tempCode,
          unit: item.unit,
          hsnCode: item.hsnCode,
          demandQty: Number(item.demandQty),
          quantity: Number(item.quantity),
          rate: 0,
          amount: 0
        }))
      };

      await createAssignment(payload);
      router.push('/store/contractor-issue');
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to create issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <Link href="/store/contractor-issue" className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-800">Material Issue Note (Contractor Issue)</h1>
        </div>
      </div>

      <div className="p-8 max-w-[1200px] mx-auto pb-32 space-y-6">
        
        {/* Demand & Contractor Info */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Demand & Contractor Details</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contractor Name <span className="text-red-500">*</span></label>
              <select
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>Select a contractor</option>
                {contractors.map(c => (
                  <option key={c._id} value={c._id}>{c.name || c.dynamicData?.displayName || 'Unknown'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contractor's Firm/Farm Name</label>
              <Input value={contractorFarmName} onChange={(e) => setContractorFarmName(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Supervisor / Engineer</label>
              <Input value={supervisorEngineer} onChange={(e) => setSupervisorEngineer(e.target.value)} className="h-9" />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Demand No.</label>
              <Input value={demandNo} onChange={(e) => setDemandNo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Demand Book No.</label>
              <Input value={demandBookNo} onChange={(e) => setDemandBookNo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Demand Date</label>
              <Input type="date" value={demandDate} onChange={(e) => setDemandDate(e.target.value)} className="h-9" />
            </div>
          </div>
        </div>

        {/* Location & Division Info */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Location Information</h2>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Name of Division</label>
              <Input value={division} onChange={(e) => setDivision(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Name of Sub-Division</label>
              <Input value={subDivision} onChange={(e) => setSubDivision(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Name of Sub-Station</label>
              <Input value={subStation} onChange={(e) => setSubStation(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Name of Feeder</label>
              <Input value={feeder} onChange={(e) => setFeeder(e.target.value)} className="h-9" />
            </div>
          </div>
        </div>

        {/* MIN Info */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">MIN Details</h2>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">MIN No. <span className="text-red-500">*</span></label>
              <Input value={minNo} onChange={(e) => setMinNo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">MIN Book No.</label>
              <Input value={minBookNo} onChange={(e) => setMinBookNo(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">MIN Date</label>
              <Input type="date" value={minDate} onChange={(e) => setMinDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Vehicle No.</label>
              <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} className="h-9" />
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Only Issued Tfs Sr No.</label>
              <Input value={issuedTfsSrNo} onChange={(e) => setIssuedTfsSrNo(e.target.value)} className="h-9" placeholder="Transformer Serial Numbers..." />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Remarks</label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-9" />
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-lg">
            <h2 className="text-sm font-semibold text-slate-800">Materials Issued</h2>
          </div>
          <div className="">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium w-[5%] text-center">Sr. No.</th>
                  <th className="px-4 py-3 font-medium w-[25%]">Description of Material</th>
                  <th className="px-4 py-3 font-medium w-[15%]">Temp Code</th>
                  <th className="px-4 py-3 font-medium w-[15%]">HSN Code</th>
                  <th className="px-4 py-3 font-medium w-[8%]">UNIT</th>
                  <th className="px-4 py-3 font-medium w-[8%] text-center">In Stock</th>
                  <th className="px-4 py-3 font-medium w-[8%]">Demand Qty</th>
                  <th className="px-4 py-3 font-medium w-[10%]">Issued Qty</th>
                  <th className="px-4 py-3 font-medium w-[6%] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="p-4 align-top text-center text-slate-500 pt-6">
                      {index + 1}
                    </td>
                    <td className="p-4 align-top">
                      <Select
                        options={stockSummary
                          .filter(s => s.totalBalanceQty > 0)
                          .map(s => ({
                            value: s.itemId,
                            label: s.description || 'N/A'
                          }))
                        }
                        value={
                          item.itemId 
                            ? { value: item.itemId, label: item.itemName || 'N/A' } 
                            : null
                        }
                        onChange={(selectedOption) => updateLineItem(index, 'itemId', selectedOption?.value || "")}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        styles={customSelectStyles}
                        placeholder="Search material..."
                        className="text-sm"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <Select
                        options={stockSummary
                          .filter(s => s.totalBalanceQty > 0)
                          .map(s => ({
                            value: s.itemId,
                            label: s.tempCode || 'N/A'
                          }))
                        }
                        value={
                          item.itemId 
                            ? { value: item.itemId, label: item.tempCode || 'N/A' } 
                            : null
                        }
                        onChange={(selectedOption) => updateLineItem(index, 'itemId', selectedOption?.value || "")}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        styles={customSelectStyles}
                        placeholder="Search code..."
                        className="text-sm font-mono"
                      />
                    </td>
                    <td className="p-4 align-top pt-6 text-slate-700 text-xs">
                      {item.hsnCode || '-'}
                    </td>
                    <td className="p-4 align-top pt-6 text-slate-700 text-xs font-medium">
                      {item.unit}
                    </td>
                    <td className="p-4 align-top pt-6 text-center text-slate-700 font-semibold">
                      {item.availableQty}
                    </td>
                    <td className="p-4 align-top">
                      <Input 
                        type="number"
                        min={0}
                        value={item.demandQty}
                        onChange={(e) => updateLineItem(index, 'demandQty', e.target.value)}
                        className="h-9 w-full text-center"
                      />
                    </td>
                    <td className="p-4 align-top">
                      <Input 
                        type="number"
                        min={1}
                        max={item.availableQty}
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
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Remove Item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button 
              onClick={addLineItem}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1"
            >
              <PlusCircle className="w-4 h-4" />
              Add another item
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end gap-3 pt-4">
          <Link href="/store/contractor-issue">
            <Button variant="outline" className="min-w-[100px]">Cancel</Button>
          </Link>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save MIN'}
          </Button>
        </div>
      </div>
    </div>
  );
}
