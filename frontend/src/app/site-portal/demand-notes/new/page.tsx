"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { createDemandNote, getContextData } from '@/features/site-portal/api/demand-notes.api';
import { getItems } from '@/features/items/api/items.api';
import { getContractorWorkOrderById } from '@/features/contractors/api/contractorWorkOrder.api';

function DemandNoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workOrderId = searchParams.get('workOrderId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingWO, setIsFetchingWO] = useState(false);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    contractorName: '',
    division: '',
    subDivision: '',
    location: '',
    remarks: '',
    package: '',
    circle: '',
    status: 'Pending Approval'
  });

  const [items, setItems] = useState<any[]>([
    {
      itemId: '',
      itemName: '',
      itemDescription: '',
      loaSrNo: '',
      loaQty: 0,
      woQty: 0,
      bomQty: 0,
      alreadyIssuedQty: 0,
      transferFromOther: 0,
      transferToOther: 0,
      stockBal: 0,
      jmcQty: 0,
      wipQty: 0,
      wipRequiredQty: 0,
      miscellaneousQty: 0,
      demandQty: 0,
      balBomQty: 0,
      isLoadingContext: false
    }
  ]);

  useEffect(() => {
    fetchItemsList();
  }, []);

  useEffect(() => {
    if (workOrderId) {
      fetchWorkOrderData(workOrderId);
    }
  }, [workOrderId]);

  const fetchItemsList = async () => {
    try {
      const res = await getItems();
      if (res.success) {
        setItemsList(res.data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch items', error);
    }
  };

  const fetchWorkOrderData = async (id: string) => {
    try {
      setIsFetchingWO(true);
      const res = await getContractorWorkOrderById(id);
      if (res.success) {
        const wo = res.data;
        setFormData(prev => ({
          ...prev,
          contractorName: wo.contractorId?.dynamicData?.companyName || wo.contractorId?.dynamicData?.displayName || wo.contractorName || '',
          division: wo.division || '',
          subDivision: wo.subDivision || '',
          location: wo.location || '',
          package: wo.package || '',
          circle: wo.circle || ''
        }));

        if (wo.items && wo.items.length > 0) {
          const mappedItems = wo.items.map((i: any) => ({
            itemId: i.itemId,
            itemName: i.itemName,
            itemDescription: i.itemDescription || '',
            loaSrNo: i.loaSrNo || '',
            loaQty: i.loaQty || i.circleLoaQty || 0,
            woQty: i.woQty || i.issuedQty || 0,
            bomQty: i.bomQty || i.circleBomQty || 0,
            alreadyIssuedQty: i.alreadyIssuedQty || i.issuedQty || 0, // Fallback to issuedQty from WO if alreadyIssuedQty is missing
            transferFromOther: i.transferFromOther || 0,
            transferToOther: i.transferToOther || 0,
            stockBal: i.stockBal || 0,
            jmcQty: 0,
            wipQty: 0,
            wipRequiredQty: 0,
            miscellaneousQty: 0,
            demandQty: 0,
            balBomQty: (i.bomQty || i.circleBomQty || 0) - (i.alreadyIssuedQty || i.issuedQty || 0),
            isLoadingContext: false
          }));
          setItems(mappedItems);
        }
      }
    } catch (error) {
      toast.error('Failed to fetch Work Order details');
    } finally {
      setIsFetchingWO(false);
    }
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        itemId: '', itemName: '', itemDescription: '', loaSrNo: '',
        loaQty: 0, woQty: 0, bomQty: 0, alreadyIssuedQty: 0,
        transferFromOther: 0, transferToOther: 0, stockBal: 0,
        jmcQty: 0, wipQty: 0, wipRequiredQty: 0, miscellaneousQty: 0, demandQty: 0, balBomQty: 0, isLoadingContext: false
      }
    ]);
  };

  const removeItemRow = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemSelect = async (index: number, itemId: string) => {
    const selectedItem = itemsList.find(i => i._id === itemId);
    const newItems = [...items];
    newItems[index].itemId = itemId;
    newItems[index].itemName = selectedItem?.name || '';
    
    if (!itemId) return setItems(newItems);

    newItems[index].isLoadingContext = true;
    setItems(newItems);

    try {
      const res = await getContextData(itemId);
      if (res.success) {
        const ctx = res.data;
        newItems[index].itemDescription = ctx.itemDescription || '';
        newItems[index].bomQty = ctx.bomQty || 0;
        newItems[index].stockBal = ctx.stockBal || 0;
        newItems[index].alreadyIssuedQty = ctx.alreadyIssuedQty || 0;
        newItems[index].transferFromOther = ctx.transferFromOther || 0;
        newItems[index].transferToOther = ctx.transferToOther || 0;
        newItems[index].balBomQty = newItems[index].bomQty - newItems[index].alreadyIssuedQty - newItems[index].demandQty;
      }
    } catch (error) {
      toast.error('Failed to load item context constraints.');
    } finally {
      newItems[index].isLoadingContext = false;
      setItems([...newItems]);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'demandQty') {
      const dQty = Number(value) || 0;
      newItems[index].balBomQty = newItems[index].bomQty - newItems[index].alreadyIssuedQty - dQty;
    }
    
    setItems(newItems);
  };

  const calculateContractorBalance = (item: any) => {
    const issued = Number(item.alreadyIssuedQty) || 0;
    const jmc = Number(item.jmcQty) || 0;
    const wipC = Number(item.wipQty) || 0;
    const wipR = Number(item.wipRequiredQty) || 0;
    const misc = Number(item.miscellaneousQty) || 0;
    return issued - jmc - wipC - wipR - misc;
  };

  const handleSubmit = async () => {
    if (items.some(i => !i.itemId || i.demandQty <= 0)) {
      toast.error('Please ensure all item rows have a selected item and a valid Demand Qty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsToSave = items.map(i => {
        const { isLoadingContext, ...rest } = i;
        return {
          ...rest,
          jmcQty: Number(rest.jmcQty) || 0,
          wipQty: Number(rest.wipQty) || 0,
          wipRequiredQty: Number(rest.wipRequiredQty) || 0,
          miscellaneousQty: Number(rest.miscellaneousQty) || 0,
          demandQty: Number(rest.demandQty) || 0
        };
      });

      const data = new FormData();
      data.append('contractorName', formData.contractorName);
      data.append('division', formData.division);
      data.append('subDivision', formData.subDivision);
      data.append('location', formData.location);
      data.append('remarks', formData.remarks);
      data.append('package', formData.package);
      data.append('circle', formData.circle);
      data.append('status', formData.status);
      data.append('items', JSON.stringify(itemsToSave));
      if (file) {
        data.append('file', file);
      }

      await createDemandNote(data);
      toast.success('Demand Note submitted for approval!');
      router.push('/site-portal/demand-notes');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit Demand Note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetchingWO) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-slate-500 font-medium">Fetching Work Order details...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/site-portal/demand-notes" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Create Demand Note</h1>
            <p className="text-slate-500 text-sm mt-1">
              {workOrderId ? 'Pre-filled from selected Work Order.' : 'Package & Circle will be automatically captured from your profile.'}
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Submit for Approval
        </Button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-lg font-semibold text-slate-800">General Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Contractor Name</label>
            <Input value={formData.contractorName} onChange={e => setFormData({...formData, contractorName: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Package</label>
            <Input value={formData.package} onChange={e => setFormData({...formData, package: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Circle</label>
            <Input value={formData.circle} onChange={e => setFormData({...formData, circle: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Division</label>
            <Input value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Sub Division</label>
            <Input value={formData.subDivision} onChange={e => setFormData({...formData, subDivision: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Location</label>
            <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Remarks</label>
            <Input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Location Drawing / Document</label>
            <Input 
              type="file" 
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  setFile(e.target.files[0]);
                }
              }} 
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-800">Requested Items</h3>
          <Button onClick={addItemRow} variant="outline" size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Item Name</th>
                <th className="px-4 py-3">BOM Qty</th>
                <th className="px-4 py-3">Stock Bal</th>
                <th className="px-4 py-3 text-amber-700 bg-amber-50">Already Issued</th>
                <th className="px-4 py-3 text-indigo-700 bg-indigo-50">JMC Done Qty</th>
                <th className="px-4 py-3 text-blue-700 bg-blue-50">WIP Consumed</th>
                <th className="px-4 py-3 text-blue-700 bg-blue-50">WIP Req. Material</th>
                <th className="px-4 py-3 text-orange-700 bg-orange-50">Misc Qty</th>
                <th className="px-4 py-3 text-red-700 bg-red-50 font-bold">Bal Qty at Contractor</th>
                <th className="px-4 py-3">Demand Qty <span className="text-red-500">*</span></th>
                <th className="px-4 py-3">Bal BOM Qty</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <select
                      className="w-full h-9 rounded-md border border-slate-300 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                      value={item.itemId}
                      onChange={(e) => handleItemSelect(idx, e.target.value)}
                    >
                      <option value="">Select Item</option>
                      {itemsList.map(i => (
                        <option key={i._id} value={i._id}>{i.name}</option>
                      ))}
                    </select>
                    {item.isLoadingContext && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 mt-2" />}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.bomQty}</td>
                  <td className="px-4 py-3 font-medium text-blue-600">{item.stockBal}</td>
                  <td className="px-4 py-3 font-medium text-amber-600 bg-amber-50">{item.alreadyIssuedQty}</td>
                  
                  {/* New JMC and WIP inputs */}
                  <td className="px-4 py-3 bg-indigo-50">
                    <Input type="number" className="w-20 h-9" value={item.jmcQty || ''} onChange={(e) => handleItemChange(idx, 'jmcQty', e.target.value)} />
                  </td>
                  <td className="px-4 py-3 bg-blue-50">
                    <Input type="number" className="w-20 h-9" value={item.wipQty || ''} onChange={(e) => handleItemChange(idx, 'wipQty', e.target.value)} />
                  </td>
                  <td className="px-4 py-3 bg-blue-50">
                    <Input type="number" className="w-20 h-9" value={item.wipRequiredQty || ''} onChange={(e) => handleItemChange(idx, 'wipRequiredQty', e.target.value)} />
                  </td>
                  <td className="px-4 py-3 bg-orange-50">
                    <Input type="number" className="w-20 h-9" value={item.miscellaneousQty || ''} onChange={(e) => handleItemChange(idx, 'miscellaneousQty', e.target.value)} />
                  </td>
                  
                  {/* Balance Calculation */}
                  <td className="px-4 py-3 font-bold text-red-600 bg-red-50">
                    {calculateContractorBalance(item)}
                  </td>

                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      className="w-20 h-9"
                      value={item.demandQty || ''}
                      onChange={(e) => handleItemChange(idx, 'demandQty', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-indigo-600">{item.balBomQty}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => removeItemRow(idx)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors" disabled={items.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500"/></div>}>
      <DemandNoteForm />
    </Suspense>
  );
}
