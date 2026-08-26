"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getWipRequireds, createWipRequired, getWipRequiredById, updateWipRequired } from "@/features/site-portal/api/wipRequired.api";
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
  const [previousData, setPreviousData] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    contractorId: "",
    package: user?.assignedPackage || "",
    circle: user?.assignedCircle || "",
    division: "",
    subDivision: "",
    status: "Approved",
    remarks: "",
    items: [
      {
        activity: "",
        tempCode: "",
          loaSrNo: "",
          description: "",
        unit: "",
        prevQty: 0,
        claimedQty: 0,
        approvedQty: 0,
        rate: 0,
        amount: 0,
        totalLoaQty: 0,
        remarks: ""
      }
    ] as any[]
  });


  useEffect(() => {
    if (user && isNew) {
      setFormData(prev => ({
        ...prev,
        package: prev.package || user.assignedPackage || "",
        circle: prev.circle || user.assignedCircle || ""
      }));
    }
  }, [user, isNew]);

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
    if (formData.contractorId && formData.package && formData.circle) {
      import('@/features/site-portal/api/wipRequired.api').then(api => {
        (api as any).getWipRequireds({ contractorId: formData.contractorId }).then((res: any) => {
          const fetched = res?.data?.data || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
          const filtered = fetched.filter((j: any) => j.package === formData.package && j.circle === formData.circle && j.status === 'Approved');
          setPreviousData(filtered);
        }).catch(console.error);
      });
    }
  }, [formData.contractorId, formData.package, formData.circle]);

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
      const res = await getWipRequiredById(wipId);
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
          loaSrNo: "",
          description: "",
          unit: "",
          prevQty: 0,
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

      const payload = new FormData();
      payload.append('date', formData.date);
      payload.append('contractorId', formData.contractorId);
      payload.append('package', formData.package);
      payload.append('circle', formData.circle);
      payload.append('division', formData.division);
      payload.append('subDivision', formData.subDivision);
      payload.append('remarks', formData.remarks);
      payload.append('status', statusToSave);
      payload.append('claimedAmount', claimedTotal.toString());
      payload.append('approvedAmount', approvedTotal.toString());
      payload.append('items', JSON.stringify(formData.items));
      if (file) {
        payload.append('file', file);
      }

      if (isNew) {
        await createWipRequired(payload);
        alert(`WIP saved as ${statusToSave}`);
        router.push('/site-portal/wip-required');
      } else {
        await updateWipRequired(wipId, payload);
        alert(`WIP updated and saved as ${statusToSave}`);
        router.push('/site-portal/wip-required');
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
              {isNew ? 'New WIP Entry' : `Edit WIP ${(formData as any).wipRequiredNumber || ''}`}
            </h1>
          </div>
          <div className="flex space-x-3">
            
            <Button 
              onClick={() => handleSubmit('Approved')}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Approve WIP
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
                  {contractors
                    .filter(c => {
                      if (!formData.circle) return true;
                      const locs = c.location || c.assignedLocations || c.dynamicData?.assignedCircle || c.dynamicData?.circle || c.dynamicData?.assignedCircles || '';
                      return locs.includes(formData.circle);
                    })
                    .map((c: any) => {
                      const displayName = c.dynamicData?.displayName || c.dynamicData?.companyName || c.dynamicData?.name || c.dynamicData?.vendorName || c._id;
                      return (
                        <option key={c._id} value={c._id}>{displayName}</option>
                      );
                    })
                  }
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Remarks</label>
                <Input
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Enter remarks..."
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Drawing Sheet / Document</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
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
                    
                    // Calculate previous from historical
                    const calcPrev = (tempCode: string, loaSrNo: string) => {
                      let total = 0;
                      previousData.forEach(jmc => {
                        (jmc.items || []).forEach((item: any) => {
                          if ((tempCode && item.tempCode === tempCode) || (loaSrNo && item.loaSrNo === loaSrNo)) {
                            total += Number(item.approvedQty || item.approvedWipQty || item.approvedRequiredQty || item.newWipQty || 0);
                          }
                        });
                      });
                      return total;
                    };

                    const newRows = activityItems.map(ai => {
                      const temp = ai.rawItem?.tempCode || ai.dynamicData?.tempCode || '';
                      const loa = ai.rawItem?.sku || ai.rawItem?.loaSrNo || ai.dynamicData?.loaSrNo || ai.dynamicData?.loaSerialNo || ai.dynamicData?.sku || '';
                      return {
                        activity: ai.dynamicData?.activity || '',
                        tempCode: temp,
                        loaSrNo: loa,
                        description: ai.dynamicData?.description || ai.dynamicData?.itemDescription || ai.dynamicData?.name || '',
                        unit: ai.dynamicData?.unit || ai.dynamicData?.uom || '',
                        totalLoaQty: Number(ai.dynamicData?.loaQty || ai.dynamicData?.loaQuantity || ai.dynamicData?.totalLoaQuantity || ai.dynamicData?.qty || ai.dynamicData?.quantity || 0),
                        prevQty: calcPrev(temp, loa),
                        claimedQty: 0,
                        approvedQty: 0,
                        newWipQty: 0,
                        newRequiredQty: 0,
                        rate: 0,
                        amount: 0,
                        remarks: ''
                      };
                    });
                    setFormData(prev => ({
                      ...prev,
                      items: [...prev.items, ...newRows]
                    }));
                  }}
                  styles={{
                    control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '13px', backgroundColor: 'white', border: '1px solid #cbd5e1', boxShadow: 'none' }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                  menuPosition="fixed"
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
                  
                  <th className="px-4 py-3 border-r min-w-[200px]">Activity</th>
                  <th className="px-4 py-3 border-r min-w-[120px]">LOA Sr No</th>
                  <th className="px-4 py-3 border-r min-w-[120px]">Temp Code</th>
                  <th className="px-4 py-3 border-r min-w-[300px]">Description</th>
                  <th className="px-4 py-3 border-r min-w-[100px]">Unit</th>
                  <th className="px-4 py-3 border-r min-w-[100px]">LOA Qty</th>
                  <th className="px-4 py-3 border-r min-w-[120px] bg-blue-50">Prev WIP Qty</th>
                  <th className="px-4 py-3 border-r min-w-[120px] bg-green-50 text-green-800">New WIP Qty</th>
                  <th className="px-4 py-3 border-r min-w-[120px] bg-purple-50 text-purple-800">Total WIP Qty</th>
                  <th className="px-4 py-3 border-r min-w-[150px]">Remarks</th>
                  <th className="px-4 py-3 w-12 text-center">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">

                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input title={item.activity} value={item.activity || ''} 
                        onChange={e => handleItemChange(index, 'activity', e.target.value)} 
                        className="h-8 text-sm bg-slate-50"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input title={item.loaSrNo} value={item.loaSrNo || ''} 
                        onChange={e => handleItemChange(index, 'loaSrNo', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="LOA Sr No"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100">
                      <Input title={item.tempCode} value={item.tempCode || ''} 
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
                      <Input title={item.unit} value={item.unit || ''} 
                        onChange={e => handleItemChange(index, 'unit', e.target.value)} 
                        className="h-8 text-sm"
                        placeholder="e.g. Mtr"
                      />
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-slate-50 text-center font-medium text-slate-700">
                      {item.totalLoaQty || 0}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-100 bg-blue-50/30 text-center font-medium text-slate-700">
                      {item.prevQty || 0}
                    </td>
                    <td className="p-2 border-r bg-green-50/30">
                      <Input 
                        type="number"
                        className="w-full h-9 bg-white"
                        value={item.claimedQty || ''} 
                        onChange={e => handleItemChange(index, 'claimedQty', e.target.value)} 
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2 border-r text-center font-bold bg-purple-50/30 text-purple-900">
                      {((Number(item.prevQty) || 0) + (Number(item.claimedQty) || 0)).toFixed(2)}
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
