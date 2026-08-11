'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/axios';
import { 
  createStage1Invoice,
  createStage2Invoice,
  createStage3Invoice
} from '@/features/contractor-billing/api/contractor-billing.api';
import { getItems } from '@/features/items/api/items.api';

export default function NewContractorBill() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  const [contractorId, setContractorId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [stage, setStage] = useState('');
  
  // Document Refs
  const [mhrovId, setMhrovId] = useState('');
  const [jmcId, setJmcId] = useState('');
  const [handoverId, setHandoverId] = useState('');

  // Toggles
  const [supplyBasis, setSupplyBasis] = useState('JMC Erected');

  // Preview Items
  const [lineItems, setLineItems] = useState<any[]>([]);

  // Metadata Options
  const [contractors, setContractors] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [mhrovs, setMhrovs] = useState<any[]>([]);
  const [jmcs, setJmcs] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  useEffect(() => {
    // Fetch initial contractors
    api.get('/contractors').then(res => {
      const arr = res.data?.data?.data || res.data?.data || res.data || [];
      setContractors(Array.isArray(arr) ? arr : []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (contractorId) {
      api.get(`/ho-billing/contractor-work-orders?contractorId=${contractorId}`).then(res => {
        const arr = res.data?.data?.data || res.data?.data || res.data || [];
        setWorkOrders(Array.isArray(arr) ? arr : []);
      }).catch(console.error);
    }
  }, [contractorId]);

  useEffect(() => {
    if (stage && workOrderId) {
      setFetchingDocs(true);
      if (stage === 'Stage 1 (Supply Initial)') {
        api.get('/store/mhrov').then(res => {
          const arr = res.data?.data?.data || res.data?.data || res.data || [];
          setMhrovs(Array.isArray(arr) ? arr : []);
        }).finally(() => setFetchingDocs(false));
      } else if (stage === 'Stage 2 (Erection & Supply Balance)') {
        api.get('/jmc').then(res => {
          const arr = res.data?.data?.data || res.data?.data || res.data || [];
          setJmcs(Array.isArray(arr) ? arr : []);
        }).finally(() => setFetchingDocs(false));
      } else if (stage === 'Stage 3 (Final/Retention)') {
        api.get('/contractor-billing/handover-certificates').then(res => {
          const arr = res.data?.data?.data || res.data?.data || res.data || [];
          setHandovers(Array.isArray(arr) ? arr : []);
        }).finally(() => setFetchingDocs(false));
      }
    }
  }, [stage, workOrderId]);

  useEffect(() => {
    const selectedWO = workOrders.find(w => w._id === workOrderId);
    if (selectedWO && selectedWO.package && selectedWO.circle) {
      getItems({ 
        filters: { 
          package: selectedWO.package, 
          circle: selectedWO.circle 
        }, 
        limit: 1000 
      }).then(res => {
        const fetchedItems = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
        setAvailableItems(fetchedItems);
      }).catch(console.error);
    } else if (selectedWO) {
      // Fallback if no package/circle
      getItems({ limit: 1000 }).then(res => {
        const fetchedItems = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
        setAvailableItems(fetchedItems);
      }).catch(console.error);
    } else {
      setAvailableItems([]);
    }
  }, [workOrderId, workOrders]);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, {
      itemId: '',
      activity: '',
      description: '',
      billingCategory: stage === 'Stage 1 (Supply Initial)' ? 'Supply' : 'Erection',
      quantity: 1,
      rate: 0,
      gstRate: 18,
      baseAmount: 0,
      gstAmount: 0
    }]);
  };

  const handleUpdateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    
    if (field === 'itemId') {
      const item = availableItems.find(i => i._id === value);
      if (item) {
        newItems[index].description = item.dynamicData?.description || item.dynamicData?.itemDescription || '';
      }
    }

    if (field === 'quantity' || field === 'rate' || field === 'gstRate') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const rate = parseFloat(newItems[index].rate) || 0;
      const gst = parseFloat(newItems[index].gstRate) || 0;
      newItems[index].baseAmount = qty * rate;
      newItems[index].gstAmount = (qty * rate * gst) / 100;
    }

    setLineItems(newItems);
  };

  const handleRemoveLineItem = (index: number) => {
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Strict Validation
    const newErrors: Record<string, string> = {};
    if (!contractorId) newErrors.contractorId = 'Contractor is required';
    if (!workOrderId) newErrors.workOrderId = 'Work Order is required';
    if (!stage) newErrors.stage = 'Billing Stage is required';
    
    if (stage === 'Stage 1 (Supply Initial)' && !mhrovId) newErrors.mhrovId = 'MHROV is required';
    if (stage === 'Stage 2 (Erection & Supply Balance)' && !jmcId) newErrors.jmcId = 'JMC is required';
    if (stage === 'Stage 3 (Final/Retention)' && !handoverId) newErrors.handoverId = 'Handover Certificate is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the highlighted errors');
      return;
    }

    if (lineItems.length === 0) {
      toast.error('Source document has no items to bill. Add at least one line item.');
      return;
    }

    // Validate line items
    for (const item of lineItems) {
      if (item.billingCategory === 'Supply' && !item.itemId) {
        toast.error('Supply items must have a registered Item selected');
        return;
      }
      if (!item.quantity || !item.rate) {
        toast.error('Quantity and Rate are required for all line items');
        return;
      }
    }

    setErrors({});
    setLoading(true);
    try {
      const payload = {
        contractorId,
        workOrderId,
        lineItems
      };

      if (stage === 'Stage 1 (Supply Initial)') {
        await createStage1Invoice({ ...payload, mhrovId });
      } else if (stage === 'Stage 2 (Erection & Supply Balance)') {
        await createStage2Invoice({ ...payload, jmcId, supplyBasis });
      } else if (stage === 'Stage 3 (Final/Retention)') {
        await createStage3Invoice({ ...payload, handoverCertificateId: handoverId });
      }

      toast.success('Bill generated successfully!');
      router.push('/site-portal/contractor-billing');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-28">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Contractor Bill</h1>
          <p className="text-gray-500">Generate a staggered bill with dynamic items.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg">Billing Context</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className={errors.contractorId ? "text-red-500" : ""}>Contractor <span className="text-red-500">*</span></Label>
              <select 
                className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${errors.contractorId ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                value={contractorId} 
                onChange={(e) => {
                  setContractorId(e.target.value);
                  if (errors.contractorId) setErrors({ ...errors, contractorId: '' });
                }}
              >
                <option value="">Select Contractor</option>
                {contractors.map(c => (
                  <option key={c._id} value={c._id}>{c.dynamicData?.displayName || c.name || 'Unnamed Contractor'}</option>
                ))}
              </select>
              {errors.contractorId && <p className="text-xs text-red-500">{errors.contractorId}</p>}
            </div>
            
            <div className="space-y-2">
              <Label className={errors.workOrderId ? "text-red-500" : ""}>Work Order <span className="text-red-500">*</span></Label>
              <select 
                className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${errors.workOrderId ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                value={workOrderId} 
                onChange={(e) => {
                  setWorkOrderId(e.target.value);
                  if (errors.workOrderId) setErrors({ ...errors, workOrderId: '' });
                }} 
                disabled={!contractorId}
              >
                <option value="">Select Work Order</option>
                {workOrders.map(wo => (
                  <option key={wo._id} value={wo._id}>{wo.workOrderNumber} (Pkg: {wo.package || 'N/A'})</option>
                ))}
              </select>
              {errors.workOrderId && <p className="text-xs text-red-500">{errors.workOrderId}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className={errors.stage ? "text-red-500" : ""}>Billing Stage <span className="text-red-500">*</span></Label>
              <select 
                className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${errors.stage ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                value={stage} 
                onChange={(e) => {
                  setStage(e.target.value);
                  if (errors.stage) setErrors({ ...errors, stage: '' });
                  setLineItems([]); // reset items when stage changes
                }} 
                disabled={!workOrderId}
              >
                <option value="">Select Billing Stage</option>
                <option value="Stage 1 (Supply Initial)">Stage 1: Supply Initial (60%)</option>
                <option value="Stage 2 (Erection & Supply Balance)">Stage 2: Erection (90%) + Supply Balance (30%)</option>
                <option value="Stage 3 (Final/Retention)">Stage 3: Final / Retention (10%)</option>
              </select>
              {errors.stage && <p className="text-xs text-red-500">{errors.stage}</p>}
            </div>
          </CardContent>
        </Card>

        {stage && (
          <Card className="border-gray-100 shadow-sm transition-all">
            <CardHeader className="bg-blue-50/30 border-b border-blue-50">
              <CardTitle className="text-lg text-blue-900">Source Document Selection</CardTitle>
              <CardDescription>Select the document that triggers this billing stage.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {stage === 'Stage 1 (Supply Initial)' && (
                <div className="space-y-2">
                  <Label className={errors.mhrovId ? "text-red-500" : ""}>Select MHROV <span className="text-red-500">*</span></Label>
                  <select 
                    className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${errors.mhrovId ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                    value={mhrovId} 
                    onChange={(e) => {
                      setMhrovId(e.target.value);
                      if (errors.mhrovId) setErrors({ ...errors, mhrovId: '' });
                    }}
                  >
                    <option value="">{fetchingDocs ? "Loading..." : "Select MHROV"}</option>
                    {mhrovs.map(m => (
                      <option key={m._id} value={m._id}>{m.mhrovNumber}</option>
                    ))}
                  </select>
                  {errors.mhrovId && <p className="text-xs text-red-500">{errors.mhrovId}</p>}
                </div>
              )}

              {stage === 'Stage 2 (Erection & Supply Balance)' && (
                <>
                  <div className="space-y-2">
                    <Label className={errors.jmcId ? "text-red-500" : ""}>Select JMC Register Entry <span className="text-red-500">*</span></Label>
                    <select 
                      className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${errors.jmcId ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                      value={jmcId} 
                      onChange={(e) => {
                        setJmcId(e.target.value);
                        if (errors.jmcId) setErrors({ ...errors, jmcId: '' });
                      }}
                    >
                      <option value="">{fetchingDocs ? "Loading..." : "Select JMC"}</option>
                      {jmcs.map(j => (
                        <option key={j._id} value={j._id}>{j.jmcNumber}</option>
                      ))}
                    </select>
                    {errors.jmcId && <p className="text-xs text-red-500">{errors.jmcId}</p>}
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 mt-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Stage 2 Supply Calculation Basis</Label>
                      <p className="text-xs text-gray-500">Calculate 30% supply based on MHROV total vs JMC erected quantity</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${supplyBasis === 'MHROV Total' ? 'text-blue-600' : 'text-gray-400'}`}>MHROV</span>
                      <Switch 
                        checked={supplyBasis === 'JMC Erected'} 
                        onCheckedChange={(checked) => setSupplyBasis(checked ? 'JMC Erected' : 'MHROV Total')}
                      />
                      <span className={`text-xs font-medium ${supplyBasis === 'JMC Erected' ? 'text-blue-600' : 'text-gray-400'}`}>JMC</span>
                    </div>
                  </div>
                </>
              )}

              {stage === 'Stage 3 (Final/Retention)' && (
                <div className="space-y-2">
                  <Label className={errors.handoverId ? "text-red-500" : ""}>Select Handover Certificate <span className="text-red-500">*</span></Label>
                  <select 
                    className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${errors.handoverId ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                    value={handoverId} 
                    onChange={(e) => {
                      setHandoverId(e.target.value);
                      if (errors.handoverId) setErrors({ ...errors, handoverId: '' });
                    }}
                  >
                    <option value="">{fetchingDocs ? "Loading..." : "Select Handover Certificate"}</option>
                    {handovers.map(h => (
                      <option key={h._id} value={h._id}>{h.certificateNumber}</option>
                    ))}
                  </select>
                  {errors.handoverId && <p className="text-xs text-red-500">{errors.handoverId}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {stage && (
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-lg">Line Items</CardTitle>
                <CardDescription>Add the items for this billing stage. The backend will calculate exact staggered percentages upon submission.</CardDescription>
              </div>
              <Button type="button" onClick={handleAddLineItem} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700 w-1/4">Item / Activity</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Category</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 w-24">Qty</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 w-32">Rate (₹)</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 w-24">GST %</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-right">Base Total</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No items added yet. Click "Add Item" to start building your bill.
                      </td>
                    </tr>
                  ) : lineItems.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 space-y-2">
                        <select
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={item.itemId || ''}
                          onChange={(e) => handleUpdateLineItem(index, 'itemId', e.target.value)}
                        >
                          <option value="">Free Text Activity / Item</option>
                          {availableItems.map(ai => (
                            <option key={ai._id} value={ai._id}>{ai.dynamicData?.description || ai.dynamicData?.itemDescription || ai.dynamicData?.itemCode || 'Unnamed Item'}</option>
                          ))}
                        </select>
                        <Input
                          placeholder="Or type custom description/activity..."
                          value={item.description}
                          onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm"
                          value={item.billingCategory}
                          onChange={(e) => handleUpdateLineItem(index, 'billingCategory', e.target.value)}
                        >
                          <option value="Supply">Supply</option>
                          <option value="Erection">Erection</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateLineItem(index, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleUpdateLineItem(index, 'rate', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.gstRate}
                          onChange={(e) => handleUpdateLineItem(index, 'gstRate', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 align-middle">
                        ₹{item.baseAmount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 text-center align-middle">
                        <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveLineItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t p-4 z-50 flex justify-end gap-3 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading || lineItems.length === 0} className="min-w-[120px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Submit Bill</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
