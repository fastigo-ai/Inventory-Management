"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus } from 'lucide-react';
import { getContractors } from '@/features/contractors/api/contractors.api';
import { getItems, getEntityMetadata } from '@/features/items/api/items.api';
import { createContractorWorkOrder } from '@/features/contractors/api/contractorWorkOrder.api';
import { toast } from 'sonner';

export default function NewContractorWorkOrderPage() {
  const router = useRouter();

  const [packageOptions] = useState([
    "Package 1(S/N)",
    "Package 2(R/R)"
  ]);
  
  const [formData, setFormData] = useState({
    package: '',
    circle: '',
    contractorId: '',
    division: '',
    subDivision: '',
    location: '',
    remarks: '',
    activities: [] as string[]
  });

  const [currentActivityInput, setCurrentActivityInput] = useState('');

  const [contractors, setContractors] = useState<any[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  
  const [items, setItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Derive circles based on package
  const availableCircles = formData.package === 'Package 1(S/N)' ? ['Solan', 'Nahan'] :
                           formData.package === 'Package 2(R/R)' ? ['Rampur', 'Rohru'] : [];

  // Fetch unique activities on mount
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const meta = await getEntityMetadata('Item');
        const actField = meta?.fields?.find((f: any) => f.name === 'activity');
        if (actField && actField.options) {
          setActivities(actField.options);
        }
      } catch (e) {
        console.error('Failed to load activities', e);
      }
    };
    fetchActivities();
  }, []);

  // Fetch contractors when circle changes
  useEffect(() => {
    if (formData.circle) {
      getContractors(formData.circle)
        .then(res => setContractors(res.data || []))
        .catch(() => toast.error('Failed to fetch contractors'));
    } else {
      setContractors([]);
      setFormData(prev => ({ ...prev, contractorId: '' }));
    }
  }, [formData.circle]);

  // Remove the auto-fetch useEffect that was based on single activity change
  // We will now fetch manually when "Add" is clicked.
  const handleAddActivity = () => {
    if (!currentActivityInput) {
      toast.error('Please select an activity to add');
      return;
    }
    
    if (formData.activities.includes(currentActivityInput)) {
      toast.error('Activity already added');
      return;
    }

    setIsLoadingItems(true);
    getItems({ filters: { activity: currentActivityInput }, limit: 1000 })
      .then(res => {
        const fetchedItems = res?.items || res?.data?.items || (Array.isArray(res) ? res : []);
        const mappedItems = Array.isArray(fetchedItems) ? fetchedItems.map(item => ({
          itemId: item._id,
          tempCode: item.dynamicData?.tempCode || '',
          activity: item.dynamicData?.activity || '',
          loaSrNo: item.dynamicData?.sku || '',
          description: item.dynamicData?.description || item.dynamicData?.name || '',
          unit: item.dynamicData?.unit || '',
          circleLoaQty: formData.circle.toLowerCase() === 'solan' ? Number(item.dynamicData?.solanLoaQuantity || 0) :
                        formData.circle.toLowerCase() === 'nahan' ? Number(item.dynamicData?.nahanLoaQuantity || 0) :
                        formData.circle.toLowerCase() === 'rampur' ? Number(item.dynamicData?.rampurLoaQuantity || 0) :
                        formData.circle.toLowerCase() === 'rohru' ? Number(item.dynamicData?.rohruLoaQuantity || 0) : 0,
          circleBomQty: formData.circle.toLowerCase() === 'solan' ? Number(item.dynamicData?.solanBomQuantity || 0) :
                        formData.circle.toLowerCase() === 'nahan' ? Number(item.dynamicData?.nahanBomQuantity || 0) :
                        formData.circle.toLowerCase() === 'rampur' ? Number(item.dynamicData?.rampurBomQuantity || 0) :
                        formData.circle.toLowerCase() === 'rohru' ? Number(item.dynamicData?.rohruBomQuantity || 0) : 0,
          alreadyIssuedQty: 0, // Placeholder
          woQty: 0,
          contractorErectionRate: 0,
          amount: 0,
          gstType: 'Intra', // default
          gstAmount: 0,
          totalAmount: 0
        })) : [];
        
        if (mappedItems.length === 0) {
          toast.info('No items found for this activity');
        } else {
          setItems(prev => [...prev, ...mappedItems]);
          setFormData(prev => ({ ...prev, activities: [...prev.activities, currentActivityInput] }));
          setCurrentActivityInput('');
        }
      })
      .catch(() => toast.error('Failed to fetch items for activity'))
      .finally(() => setIsLoadingItems(false));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Calculate Amount
    if (field === 'woQty' || field === 'contractorErectionRate') {
      item.amount = (Number(item.woQty) || 0) * (Number(item.contractorErectionRate) || 0);
    }
    
    // Calculate GST
    if (field === 'woQty' || field === 'contractorErectionRate' || field === 'gstType') {
      const amt = item.amount;
      // Fixed 18% overall for both Inter (9+9) and Intra (18)
      item.gstAmount = amt * 0.18;
      item.totalAmount = amt + item.gstAmount;
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleSave = async () => {
    if (!formData.package || !formData.circle || !formData.contractorId || formData.activities.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }
    if (items.length === 0) {
      toast.error('No items to save');
      return;
    }

    const payload = {
      ...formData,
      totalWoAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
      items
    };

    try {
      setIsSubmitting(true);
      await createContractorWorkOrder(payload);
      toast.success('Work Order created successfully');
      router.push('/ho-billing/contractor-work-orders');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">New Contractor Work Order</h1>
          <p className="text-sm text-slate-500 mt-1">Create a new work order for a registered contractor</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Package <span className="text-red-500">*</span></label>
            <select
              value={formData.package}
              onChange={(e) => {
                setFormData({ ...formData, package: e.target.value, circle: '', contractorId: '' });
              }}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Package</option>
              {packageOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Circle <span className="text-red-500">*</span></label>
            <select
              value={formData.circle}
              onChange={(e) => setFormData({ ...formData, circle: e.target.value, contractorId: '' })}
              disabled={!formData.package}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
            >
              <option value="">Select Circle</option>
              {availableCircles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Regd Contractor <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type="text"
                list="contractor-list"
                value={formData.contractorId ? contractors.find(c => c._id === formData.contractorId)?.dynamicData?.contractorName || formData.contractorId : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = contractors.find(c => c.dynamicData?.contractorName === val);
                  setFormData({ ...formData, contractorId: matched ? matched._id : val });
                }}
                disabled={!formData.circle}
                placeholder="Search contractor..."
                className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              />
              <datalist id="contractor-list">
                {contractors.map(c => (
                  <option key={c._id} value={c.dynamicData?.contractorName} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Division</label>
            <select
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Division (Pending Data)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sub Division</label>
            <select
              value={formData.subDivision}
              onChange={(e) => setFormData({ ...formData, subDivision: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Sub Div (Pending Data)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter location manually"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Enter remarks manually"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200">
          <div className="max-w-xl">
            <label className="block text-sm font-medium text-slate-700 mb-1">Add Activities <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  list="activity-list"
                  value={currentActivityInput}
                  onChange={(e) => setCurrentActivityInput(e.target.value)}
                  placeholder="Search activity keywords..."
                  disabled={!formData.circle || isLoadingItems}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
                <datalist id="activity-list">
                  {activities.map(a => <option key={a} value={a} />)}
                </datalist>
              </div>
              <button 
                onClick={handleAddActivity}
                disabled={!currentActivityInput || isLoadingItems}
                className="h-10 px-4 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                Add Activity
              </button>
            </div>
            
            {formData.activities.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {formData.activities.map((act, i) => (
                  <div key={i} className="flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm border border-slate-200">
                    <span className="max-w-[300px] truncate" title={act}>{act}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">Temp Code</th>
                <th className="px-4 py-3 text-left">Activity</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">LOA Sr No</th>
                <th className="px-4 py-3 text-left max-w-[200px]">Description</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Circle LOA Qty</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Circle BOM Qty</th>
                <th className="px-4 py-3 text-right text-orange-600 whitespace-nowrap">Issued Qty</th>
                <th className="px-4 py-3 text-right text-indigo-600 whitespace-nowrap">WO Qty</th>
                <th className="px-4 py-3 text-right text-indigo-600">Rate</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">GST Type</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {isLoadingItems ? (
                <tr>
                  <td colSpan={13} className="px-6 py-8 text-center text-slate-500">Loading items...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-8 text-center text-slate-500">Select an activity to view items</td>
                </tr>
              ) : items.map((item, index) => (
                <tr key={item.itemId} className="hover:bg-slate-50 group">
                  <td className="px-4 py-2.5 text-slate-700">{item.tempCode}</td>
                  <td className="px-4 py-2.5 text-slate-700 truncate max-w-[150px]" title={item.activity}>{item.activity}</td>
                  <td className="px-4 py-2.5 text-slate-700">{item.loaSrNo}</td>
                  <td className="px-4 py-2.5 text-slate-700 truncate max-w-[200px]" title={item.description}>{item.description}</td>
                  <td className="px-4 py-2.5 text-slate-700">{item.unit}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">{item.circleLoaQty}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">{item.circleBomQty}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-orange-600">{item.alreadyIssuedQty}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={item.woQty || ''}
                      onChange={(e) => updateItem(index, 'woQty', Number(e.target.value))}
                      className="w-20 text-right px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      value={item.contractorErectionRate || ''}
                      onChange={(e) => updateItem(index, 'contractorErectionRate', Number(e.target.value))}
                      className="w-24 text-right px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-shadow"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">₹{item.amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={item.gstType}
                      onChange={(e) => updateItem(index, 'gstType', e.target.value)}
                      className="w-28 px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 transition-shadow bg-white"
                    >
                      <option value="Intra">Intra (18%)</option>
                      <option value="Inter">Inter (9+9%)</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-indigo-700 bg-indigo-50/30 group-hover:bg-indigo-50/50 transition-colors">
                    ₹{item.totalAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex justify-between items-center z-10 px-6 lg:pl-72">
        <div className="text-lg font-bold text-slate-800">
          Grand Total: ₹{items.reduce((sum, item) => sum + (item.totalAmount || 0), 0).toLocaleString()}
        </div>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Save Work Order'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
