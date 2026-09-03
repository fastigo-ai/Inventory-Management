'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/axios';
import { createContractorInvoice } from '@/features/contractor-billing/api/contractor-billing.api';
import { getItems } from '@/features/items/api/items.api';

import { useAuthStore } from '@/shared/store/auth.store';

const STAGES = ['10%', '20%', '25%', '30%', '50%', '70%', '75%', '90%', '100%'];

export default function NewContractorBill() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Form State
  const [contractorId, setContractorId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [stage, setStage] = useState('');
  const [jmcDocUrl, setJmcDocUrl] = useState('');
  const [signedBillDocUrl, setSignedBillDocUrl] = useState('');

  // Items
  const [lineItems, setLineItems] = useState<any[]>([]);

  // Metadata Options
  const [contractors, setContractors] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  useEffect(() => {
    api.get('/contractors').then(res => {
      const data = res.data?.data;
      let arr: any[] = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray(data.contractors)) {
        arr = data.contractors;
      }
      setContractors(arr);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (contractorId) {
      api.get(`/ho-billing/contractor-work-orders?contractorId=${contractorId}`).then(res => {
        const arr = res.data?.data?.data || res.data?.data || res.data || [];
        setWorkOrders(Array.isArray(arr) ? arr : []);
      }).catch(console.error);
    } else {
      setWorkOrders([]);
      setWorkOrderId('');
    }
  }, [contractorId]);

  useEffect(() => {
    let pkg = user?.assignedPackage;
    let cir = user?.assignedCircle;

    if (workOrderId) {
      const selectedWO = workOrders.find(w => w._id === workOrderId);
      if (selectedWO) {
        pkg = selectedWO.package || pkg;
        cir = selectedWO.circle || cir;
      }
    }

    if (pkg && cir) {
      getItems({ 
        filters: { 
          package: pkg, 
          circle: cir 
        }, 
        limit: 1000 
      }).then(res => {
        const fetchedItems = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
        setAvailableItems(fetchedItems);
      });
    } else {
      setAvailableItems([]);
    }
  }, [workOrderId, workOrders, user]);

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        itemId: '',
        activity: '',
        description: '',
        billingCategory: 'Supply',
        rate: 0,
        jmcDoneQty: 0,
        erectedQty: 0,
        gstRate: 18
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;

    if (field === 'itemId' && value) {
      const selectedItem = availableItems.find(i => i._id === value);
      if (selectedItem) {
        newItems[index].description = selectedItem.dynamicData?.itemName || selectedItem.dynamicData?.description || selectedItem.itemName || '';
        newItems[index].rate = selectedItem.dynamicData?.boqRate || selectedItem.boqRate || 0;
        newItems[index].activity = selectedItem.dynamicData?.activity || selectedItem.activity || '';
      }
    }
    setLineItems(newItems);
  };

  const handleSubmit = async () => {
    if (!contractorId || !stage) {
      toast.error('Please fill in Contractor and Stage');
      return;
    }
    
    if (!jmcDocUrl || !signedBillDocUrl) {
      toast.error('Please upload JMC Signed Copy and Signed Bill Copy');
      return;
    }

    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        contractorId,
        workOrderId: workOrderId || undefined,
        stage,
        jmcDocUrl,
        signedBillDocUrl,
        lineItems
      };

      await createContractorInvoice(payload);
      toast.success('Contractor Bill submitted successfully!');
      router.push('/site-portal/contractor-billing');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to submit bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <button onClick={() => router.back()} className="mr-4 hover:bg-slate-100 p-2 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            Create Contractor Bill
          </h1>
          <p className="text-slate-500 ml-12 text-sm mt-1">Generate a staggered bill with dynamic items.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Contractor <span className="text-red-500">*</span></Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
              >
                <option value="">Select Contractor</option>
                {contractors.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.dynamicData?.displayName || c.name || c.vendorName || 'Unknown Contractor'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Work Order</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
                disabled={!contractorId}
              >
                <option value="">Select Work Order</option>
                {workOrders.map(w => (
                  <option key={w._id} value={w._id}>{w.workOrderNumber}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Billing Stage <span className="text-red-500">*</span></Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="">Select Billing Stage</option>
                {STAGES.map(s => (
                  <option key={s} value={s}>{s} Payment Stage</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Uploads</CardTitle>
          <CardDescription>Mandatory documents required to process this bill.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>JMC Certified Signed Copy & Drawing <span className="text-red-500">*</span></Label>
              <Input
                type="file"
                className="cursor-pointer"
                onChange={(e) => {
                  // Mock upload
                  toast.info('Uploading JMC copy...');
                  setTimeout(() => setJmcDocUrl('https://example.com/jmc-signed.pdf'), 1000);
                }}
              />
              {jmcDocUrl && <p className="text-xs text-green-600 font-medium">Uploaded Successfully</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Signed Bill Copy (Contractor / Site Officials) <span className="text-red-500">*</span></Label>
              <Input
                type="file"
                className="cursor-pointer"
                onChange={(e) => {
                  // Mock upload
                  toast.info('Uploading Signed Bill copy...');
                  setTimeout(() => setSignedBillDocUrl('https://example.com/signed-bill.pdf'), 1000);
                }}
              />
              {signedBillDocUrl && <p className="text-xs text-green-600 font-medium">Uploaded Successfully</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Bill Line Items</CardTitle>
            <CardDescription>Add line items, fill JMC or Erected qty</CardDescription>
          </div>
          <Button onClick={handleAddItem} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3 min-w-[200px]">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3 border-x bg-blue-50">JMC Done Qty<br/><span className="text-[10px] text-slate-500 font-normal">100% Release</span></th>
                  <th className="px-4 py-3 border-x bg-orange-50">Erected Qty<br/><span className="text-[10px] text-slate-500 font-normal">Adhoc Release</span></th>
                  <th className="px-4 py-3">GST %</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="p-2">
                      <Input
                        value={item.activity}
                        onChange={e => handleItemChange(idx, 'activity', e.target.value)}
                        placeholder="Activity"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={item.itemId}
                        onChange={(e) => handleItemChange(idx, 'itemId', e.target.value)}
                      >
                        <option value="">Select Item</option>
                        {availableItems.map(ai => {
                          const itemName = ai.dynamicData?.itemName || ai.dynamicData?.description || ai.itemName || 'Unknown Item';
                          const activity = ai.dynamicData?.activity || ai.activity || '';
                          return (
                            <option key={ai._id} value={ai._id}>
                              {activity ? `[${activity}] ${itemName}` : itemName}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className="p-2">
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={item.billingCategory}
                        onChange={(e) => handleItemChange(idx, 'billingCategory', e.target.value)}
                      >
                        <option value="Supply">Supply</option>
                        <option value="Erection">Erection</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={e => handleItemChange(idx, 'rate', Number(e.target.value))}
                      />
                    </td>
                    <td className="p-2 bg-blue-50/30">
                      <Input
                        type="number"
                        value={item.jmcDoneQty}
                        onChange={e => handleItemChange(idx, 'jmcDoneQty', Number(e.target.value))}
                        disabled={stage !== '100%'}
                        className={stage !== '100%' ? 'bg-slate-100' : ''}
                      />
                    </td>
                    <td className="p-2 bg-orange-50/30">
                      <Input
                        type="number"
                        value={item.erectedQty}
                        onChange={e => handleItemChange(idx, 'erectedQty', Number(e.target.value))}
                        disabled={stage === '100%'}
                        className={stage === '100%' ? 'bg-slate-100' : ''}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.gstRate}
                        onChange={e => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(idx)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {lineItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No items added yet. Click 'Add Item' to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 pl-64">
        <div className="max-w-7xl mx-auto flex justify-end gap-4">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Submit Bill
          </Button>
        </div>
      </div>
    </div>
  );
}
