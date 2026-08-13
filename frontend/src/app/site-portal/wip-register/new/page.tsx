"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createWip, getWipById, updateWip } from "@/features/site-portal/api/wip.api";
import { getContractors } from "@/features/contractors/api/contractors.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";
import Select from "react-select";
import { getItems } from "@/features/items/api/items.api";
import { useAuthStore } from "@/shared/store/auth.store";

export default function WipRegisterFormPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const params = useParams();
  const isNew = !params.id || params.id === 'new';
  const wipId = params.id as string;

  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [submitting, setSubmitting] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    contractorId: "",
    package: user?.assignedPackage || "",
    circle: user?.assignedCircle || "",
    division: "",
    subDivision: "",
    status: "Draft",
    remarks: "",
    items: [
      {
        activity: "",
        tempCode: "",
        description: "",
        unit: "",
        claimedQty: 0,
        approvedQty: 0,
        rate: 0,
        amount: 0,
        totalLoaQty: 0,
        remarks: ""
      }
    ]
  });

  useEffect(() => {
    if (formData.package && formData.circle) {
      getItems({ filters: { package: formData.package, circle: formData.circle }, limit: 1000 }).then(res => {
        const fetched = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
        setAvailableItems(fetched);
      }).catch(console.error);
    } else {
      getItems({ limit: 1000 }).then(res => {
        const fetched = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
        setAvailableItems(fetched);
      }).catch(console.error);
    }
  }, [formData.package, formData.circle]);

  useEffect(() => {
    fetchContractors();
    if (!isNew) {
      fetchWip();
    }
  }, [isNew, wipId]);

  const fetchContractors = async () => {
    try {
      const res = await getContractors();
      setContractors(res?.data || (Array.isArray(res) ? res : []));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWip = async () => {
    try {
      setLoading(true);
      const res = await getWipById(wipId);
      const data = res.data?.data;
      if (data) {
        setFormData({
          ...data,
          date: data.date ? new Date(data.date).toISOString().split('T')[0] : "",
          contractorId: data.contractorId?._id || data.contractorId
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    (newItems[index] as any)[field] = value;
    
    // Auto calculate amount based on claimedQty (or approvedQty depending on status)
    if (field === 'claimedQty' || field === 'approvedQty' || field === 'rate') {
      const qty = Number(newItems[index].approvedQty) > 0 ? Number(newItems[index].approvedQty) : Number(newItems[index].claimedQty);
      newItems[index].amount = qty * Number(newItems[index].rate || 0);
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          activity: "",
        tempCode: "",
        description: "",
          unit: "",
          claimedQty: 0,
          approvedQty: 0,
          rate: 0,
          amount: 0,
        totalLoaQty: 0,
          remarks: ""
        }
      ]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (statusToSave: string) => {
    if (!formData.contractorId) {
      alert("Please select a contractor");
      return;
    }

    setSubmitting(true);
    try {
      // Calculate totals
      let claimedTotal = 0;
      let approvedTotal = 0;
      formData.items.forEach((item: any) => {
        claimedTotal += (Number(item.claimedQty) * Number(item.rate));
        approvedTotal += (Number(item.approvedQty) * Number(item.rate));
      });

      const payload = {
        ...formData,
        status: statusToSave,
        claimedAmount: claimedTotal,
        approvedAmount: approvedTotal
      };

      if (isNew) {
        await createWip(payload);
        alert(`WIP saved as ${statusToSave}`);
        router.push('/site-portal/wip-register');
      } else {
        await updateWip(wipId, payload);
        alert(`WIP updated and saved as ${statusToSave}`);
        router.push('/site-portal/wip-register');
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to save WIP");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  const totalClaimed = formData.items.reduce((sum, item) => sum + (Number(item.claimedQty) * Number(item.rate)), 0);
  const totalApproved = formData.items.reduce((sum, item) => sum + (Number(item.approvedQty) * Number(item.rate)), 0);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">
              {isNew ? 'New WIP Entry' : `Edit WIP ${(formData as any).wipNumber || ''}`}
            </h1>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => handleSubmit('Draft')}
              disabled={submitting || formData.status === 'Approved'}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSubmit(formData.status === 'Draft' ? 'Submitted' : 'Approved')}
              disabled={submitting}
              className={formData.status === 'Submitted' ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              <Send className="w-4 h-4 mr-2" />
              {formData.status === 'Submitted' ? 'Approve WIP' : 'Submit WIP'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-4">General Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Date</label>
                <Input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Contractor *</label>
                <select 
                  className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
                  value={formData.contractorId}
                  onChange={e => {
                    const selectedId = e.target.value;
                    const selectedContractor = contractors.find(c => c._id === selectedId);
                    setFormData(prev => ({
                      ...prev, 
                      contractorId: selectedId,
                      package: selectedContractor?.dynamicData?.package || selectedContractor?.dynamicData?.assignedPackage || selectedContractor?.package || prev.package,
                      circle: selectedContractor?.dynamicData?.circle || selectedContractor?.dynamicData?.assignedCircle || selectedContractor?.circle || selectedContractor?.location || prev.circle
                    }));
                  }}
                >
                  <option value="">Select Contractor</option>
                  {contractors.map((c: any) => (
                    <option key={c._id} value={c._id}>{c.name || c.vendorName || c.dynamicData?.displayName || c.dynamicData?.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                <div className="h-9 px-3 py-2 bg-slate-100 rounded-md text-sm font-medium text-slate-700 border border-slate-200">
                  {formData.status}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-4">Location Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Package</label>
                <Input value={formData.package} readOnly className="bg-slate-50 text-slate-500" placeholder="Auto-filled from your profile" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Circle</label>
                <Input value={formData.circle} readOnly className="bg-slate-50 text-slate-500" placeholder="Auto-filled from your profile" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Division</label>
                  <Input 
                    value={formData.division} 
                    onChange={e => setFormData({...formData, division: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Sub Division</label>
                  <Input 
                    value={formData.subDivision} 
                    onChange={e => setFormData({...formData, subDivision: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-4">Summary</h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-500">Total Claimed</span>
                  <span className="text-lg font-bold text-slate-800">₹ {totalClaimed.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Total Approved</span>
                  <span className="text-lg font-bold text-green-700">₹ {totalApproved.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Remarks</label>
                <Input 
                  value={formData.remarks} 
                  onChange={e => setFormData({...formData, remarks: e.target.value})} 
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-700 uppercase">WIP Items</h2>
            <div className="flex items-center gap-4">
              <div className="w-[300px]">
                <Select
                  options={Array.from(new Set(availableItems.map(ai => ai.dynamicData?.activity).filter(Boolean))).map(act => ({ value: act, label: act }))}
                  placeholder="Add by Activity..."
                  onChange={(selected: any) => {
                    if (!selected) return;
                    const activityItems = availableItems.filter(ai => ai.dynamicData?.activity === selected.value);
                    const newRows = activityItems.map(ai => ({
                      activity: ai.dynamicData?.activity || '',
                      tempCode: ai.dynamicData?.tempCode || '',
                      description: ai.dynamicData?.description || ai.dynamicData?.itemDescription || ai.dynamicData?.name || '',
                      unit: ai.dynamicData?.unit || ai.dynamicData?.uom || '',
                      totalLoaQty: Number(ai.dynamicData?.loaQty || ai.dynamicData?.totalLoaQuantity || ai.dynamicData?.qty || ai.dynamicData?.quantity || 0),
                      claimedQty: 0,
                      approvedQty: 0,
                      rate: 0,
                      amount: 0,
                      remarks: ''
                    }));
                    setFormData(prev => ({
                      ...prev,
                      items: [...prev.items, ...newRows]
                    }));
                  }}
                  styles={{
                    control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '13px', backgroundColor: 'white', border: '1px solid #cbd5e1', boxShadow: 'none' })
                  }}
                />
              </div>
              <Button onClick={addItem} variant="outline" size="sm" className="h-8">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3 border-r w-[200px]">Activity</th>
                  <th className="px-4 py-3 border-r w-[150px]">Temp Code</th>
                  <th className="px-4 py-3 border-r w-[250px]">Description</th>
                  <th className="px-4 py-3 border-r w-20">Unit</th>
                  <th className="px-4 py-3 border-r w-24">LOA Qty</th>
                  <th className="px-4 py-3 border-r w-28 bg-blue-50">Prev WIP Alloted Qty</th>
                  <th className="px-4 py-3 border-r w-28 bg-green-50 text-green-800">New WIP Qty</th>
                  <th className="px-4 py-3 border-r w-28 bg-purple-50 text-purple-800">Total WIP Qty</th>
                  <th className="px-4 py-3 border-r w-32">Rate (₹)</th>
                  <th className="px-4 py-3 border-r w-32">Amount (₹)</th>
                  <th className="px-4 py-3 border-r">Remarks</th>
                  <th className="px-4 py-3 w-12 text-center">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.activity || ''} 
                        onChange={e => handleItemChange(index, 'activity', e.target.value)} 
                        className="h-8 text-sm bg-slate-50"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.tempCode || ''} 
                        onChange={e => handleItemChange(index, 'tempCode', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="Code"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.description} 
                        onChange={e => handleItemChange(index, 'description', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="Description of work"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.unit || ''} 
                        onChange={e => handleItemChange(index, 'unit', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="e.g. Mtr"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-slate-50 text-center font-medium text-slate-700">
                      {item.totalLoaQty || 0}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-blue-50/30">
                      <Input 
                        type="number"
                        value={item.claimedQty || ''} 
                        onChange={e => handleItemChange(index, 'claimedQty', e.target.value)} 
                        placeholder="0"
                        className="h-8 text-sm font-medium text-blue-700 bg-white"
                      />
                    </td>
                    <td className="p-2 border-r bg-green-50/30">
                      <Input 
                        type="number"
                        className="w-full h-9 bg-white"
                        value={item.approvedQty || ''} 
                        onChange={e => handleItemChange(index, 'approvedQty', e.target.value)} 
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 border-r text-center font-medium bg-purple-50/30 text-purple-900">
                      {(Number(item.claimedQty || 0) + Number(item.approvedQty || 0)).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        type="number"
                        value={item.rate || ''} 
                        onChange={e => handleItemChange(index, 'rate', e.target.value)} 
                        className="h-8 text-sm text-right"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-slate-50 font-bold text-slate-700 text-right">
                      {((Number(item.approvedQty) > 0 ? Number(item.approvedQty) : Number(item.claimedQty)) * Number(item.rate)).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input 
                        value={item.remarks} 
                        onChange={e => handleItemChange(index, 'remarks', e.target.value)} 
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button 
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {formData.items.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-slate-500">
                      No items added yet. Click "Add Item" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
