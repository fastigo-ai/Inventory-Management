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
import { getContractorAggregatedQuantities } from '@/features/contractors/api/contractors.api';
import { ItemSelectionModal } from '@/features/site-portal/components/ItemSelectionModal';

function DemandNoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workOrderId = searchParams.get('workOrderId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingWO, setIsFetchingWO] = useState(false);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [workOrderItems, setWorkOrderItems] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<{
    contractorId?: string;
    contractorName: string;
    division: string;
    subDivision: string;
    location: string;
    remarks: string;
    authorizedByEngineer: string;
    package: string;
    circle: string;
    status: string;
  }>({
    contractorName: '',
    division: '',
    subDivision: '',
    location: '',
    remarks: '',
    authorizedByEngineer: '',
    package: '',
    circle: '',
    status: 'Pending PM Approval'
  });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

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
      const res = await getItems({ limit: 5000 });
      if (res && res.items) {
        setItemsList(res.items);
      } else if (Array.isArray(res)) {
        setItemsList(res);
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
          contractorName: wo.contractorId?.dynamicData?.name || wo.contractorId?.dynamicData?.contractorName || wo.contractorId?.dynamicData?.firmName || wo.contractorId?.dynamicData?.companyName || wo.contractorId?.dynamicData?.displayName || wo.contractorName || '',
          division: wo.division || '',
          subDivision: wo.subDivision || '',
          location: wo.location || '',
          package: wo.package || '',
          circle: wo.circle || ''
        }));

        if (wo.items && wo.items.length > 0) {
          let aggData: any = {};
          const cId = wo.contractorId?._id || wo.contractorId;
          if (cId) {
            try {
              const aggRes = await getContractorAggregatedQuantities(cId);
              if (aggRes && aggRes.success && aggRes.data) {
                aggData = aggRes.data;
              }
            } catch (err) {
              console.error("Failed to fetch aggregated quantities", err);
            }
          }

          const mappedItems = wo.items.map((i: any) => {
            const act = String(i.activity || '').trim().toLowerCase();
            const loaSr = String(i.loaSrNo || '').trim().toLowerCase();
            const key = `${act}_${loaSr}`;
            const agg = aggData[key] || { jmcQty: 0, wipQty: 0, wipRequiredQty: 0 };

            return {
              itemId: i.itemId,
              itemName: i.itemName || i.description || '',
              itemDescription: i.itemDescription || '',
              activity: i.activity || '',
              tempCode: i.tempCode || '',
              loaSrNo: i.loaSrNo || '',
              unit: i.unit || '',
              totalPackageLoaQty: i.totalPackageLoaQty || 0,
              circleLoaQty: i.circleLoaQty || 0,
              circleBomQty: i.circleBomQty || 0,
              loaQty: i.loaQty || i.circleLoaQty || 0,
              woQty: i.woQty || i.issuedQty || 0,
              bomQty: i.bomQty || i.circleBomQty || 0,
              alreadyIssuedQty: i.alreadyIssuedQty || i.issuedQty || 0,
              contractorErectionRate: i.contractorErectionRate || 0,
              amount: i.amount || 0,
              gstType: i.gstType || '',
              gstAmount: i.gstAmount || 0,
              totalAmount: i.totalAmount || 0,
              transferFromOther: i.transferFromOther || 0,
              transferToOther: i.transferToOther || 0,
              stockBal: i.stockBal || 0,
              jmcQty: agg.jmcQty || 0,
              wipQty: agg.wipQty || 0,
              wipRequiredQty: agg.wipRequiredQty || 0,
              miscellaneousQty: 0,
              demandQty: 0,
              balBomQty: (i.bomQty || i.circleBomQty || 0) - (i.alreadyIssuedQty || i.issuedQty || 0),
              isLoadingContext: false
            };
          });
          setWorkOrderItems(mappedItems);
          setItems(mappedItems);
        } else {
          toast.warning('This Work Order does not contain any items.');
        }
      }
    } catch (error) {
      toast.error('Failed to fetch Work Order details');
    } finally {
      setIsFetchingWO(false);
    }
  };

  const removeItemRow = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleAddNewItem = async (selectedItems: any[]) => {
    if (!selectedItems || selectedItems.length === 0) return;

    let newRows: any[] = [];
    
    selectedItems.forEach(selectedItem => {
      const itemId = workOrderId ? selectedItem.itemId : selectedItem._id;
      let newItem = {
        itemId: '', itemName: '', itemDescription: '', activity: '', tempCode: '', loaSrNo: '',
        unit: '', totalPackageLoaQty: 0, circleLoaQty: 0, circleBomQty: 0,
        loaQty: 0, woQty: 0, bomQty: 0, alreadyIssuedQty: 0, contractorErectionRate: 0, amount: 0, gstType: '', gstAmount: 0, totalAmount: 0,
        transferFromOther: 0, transferToOther: 0, stockBal: 0,
        jmcQty: 0, wipQty: 0, wipRequiredQty: 0, miscellaneousQty: 0, demandQty: 0, balBomQty: 0, isLoadingContext: false
      };

      if (workOrderId) {
        newItem = {
          ...newItem,
          ...selectedItem,
          demandQty: 0,
          jmcQty: 0,
          wipQty: 0,
          wipRequiredQty: 0,
          miscellaneousQty: 0,
          balBomQty: selectedItem.bomQty - selectedItem.alreadyIssuedQty,
        };
      } else {
        newItem.itemId = itemId;
        newItem.itemName = selectedItem.dynamicData?.itemName || selectedItem.dynamicData?.name || selectedItem.name || selectedItem.dynamicData?.description || '';
        newItem.activity = selectedItem.dynamicData?.activity || '';
        newItem.tempCode = selectedItem.dynamicData?.tempCode || '';
        newItem.loaSrNo = selectedItem.dynamicData?.loaSrNo || selectedItem.dynamicData?.loaSerialNo || selectedItem.dynamicData?.loaSerialNumber || selectedItem.dynamicData?.sku || selectedItem.sku || '';
      }
      
      newItem.isLoadingContext = true;
      newRows.push(newItem);
    });
    
    setItems(prev => [...prev, ...newRows]);
    
    const startIdx = items.length;

    selectedItems.forEach(async (selectedItem, idx) => {
      const itemId = workOrderId ? selectedItem.itemId : selectedItem._id;
      const actualIndex = startIdx + idx;

      try {
        // Fetch context including BOM and aggregated JMC/WIP qty
        const contractorId = formData.contractorId;
        const contractorName = formData.contractorName;
        const activity = selectedItem.dynamicData?.activity || '';
        const description = selectedItem.dynamicData?.itemName || selectedItem.dynamicData?.name || selectedItem.name || selectedItem.dynamicData?.description || '';
        const tempCode = selectedItem.dynamicData?.tempCode || '';
        const loaSrNo = selectedItem.dynamicData?.loaSrNo || selectedItem.dynamicData?.loaSerialNo || selectedItem.dynamicData?.loaSerialNumber || selectedItem.dynamicData?.sku || selectedItem.sku || '';

        const res = await getContextData(itemId, contractorId, contractorName, activity, description, tempCode, loaSrNo);
        if (res.success) {
          const ctx = res.data;
          setItems(prev => {
            const updated = [...prev];
            const curr = updated[actualIndex];
            if (!curr) return prev;
            
            curr.itemDescription = ctx.itemDescription || '';
            if (!workOrderId) {
              curr.bomQty = ctx.bomQty || 0;
              curr.alreadyIssuedQty = ctx.alreadyIssuedQty || 0;
            }
            curr.stockBal = ctx.stockBal || 0;
            curr.transferFromOther = ctx.transferFromOther || 0;
            curr.transferToOther = ctx.transferToOther || 0;
            curr.jmcQty = ctx.jmcQty || 0;
            curr.wipQty = ctx.wipQty || 0;
            curr.wipRequiredQty = ctx.wipRequiredQty || 0;
            curr.balBomQty = curr.bomQty - curr.alreadyIssuedQty - (curr.demandQty || 0);
            curr.isLoadingContext = false;
            return updated;
          });
        }
      } catch (error) {
        toast.error('Failed to load item context constraints.');
        setItems(prev => {
          const updated = [...prev];
          if (updated[actualIndex]) updated[actualIndex].isLoadingContext = false;
          return updated;
        });
      }
    });
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
          activity: rest.activity || '',
          tempCode: rest.tempCode || '',
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
      if (formData.authorizedByEngineer) {
        data.append('authorizedByEngineer', formData.authorizedByEngineer);
      }
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
            <label className="text-sm font-medium text-slate-700 block mb-1">Authorized By Engineer</label>
            <Input value={formData.authorizedByEngineer} onChange={e => setFormData({...formData, authorizedByEngineer: e.target.value})} />
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
          <Button onClick={() => setIsItemModalOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Item Name</th>
                <th className="px-4 py-3 min-w-[120px]">Activity</th>
                <th className="px-4 py-3 min-w-[120px]">Temp Code</th>
                <th className="px-4 py-3 min-w-[120px]">LOA Sr No</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Total Pkg LOA</th>
                <th className="px-4 py-3">Circle LOA</th>
                <th className="px-4 py-3">WO Qty</th>
                <th className="px-4 py-3">BOM Qty</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">GST Type</th>
                <th className="px-4 py-3">GST Amt</th>
                <th className="px-4 py-3">Total Amt</th>
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
              {Object.entries(items.reduce((acc, item, idx) => {
                const act = item.activity || 'Unassigned Activity';
                if (!acc[act]) acc[act] = [];
                acc[act].push({ item, idx });
                return acc;
              }, {} as Record<string, {item: any, idx: number}[]>)).map(([activity, group]: any) => (
                <React.Fragment key={activity}>
                  <tr className="bg-slate-100/80 border-y border-slate-200">
                    <td colSpan={24} className="px-4 py-2 text-[13px] font-bold text-slate-700">
                      Activity: <span className="text-indigo-700 ml-1">{activity === 'Unassigned Activity' ? 'Pending Item Selection' : activity}</span>
                    </td>
                  </tr>
                  {group.map(({ item, idx }: {item: any, idx: number}) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 max-w-[200px] truncate" title={item.itemName || 'Unknown Item'}>
                          {item.itemName || 'Unknown Item'}
                        </div>
                        {item.isLoadingContext && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 mt-2" />}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[150px]" title={item.activity}>{item.activity || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.tempCode || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.loaSrNo || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.unit || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.totalPackageLoaQty}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.circleLoaQty}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{item.woQty}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{item.bomQty}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">₹{item.contractorErectionRate}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">₹{item.amount}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.gstType || 'N/A'}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">₹{item.gstAmount}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">₹{item.totalAmount}</td>
                      <td className="px-4 py-3 font-medium text-blue-600">{item.stockBal}</td>
                      <td className="px-4 py-3 font-medium text-amber-600 bg-amber-50">{item.alreadyIssuedQty}</td>
                      
                      {/* New JMC and WIP inputs */}
                      <td className="px-4 py-3 bg-indigo-50">
                        <Input type="number" className="w-20 h-9" value={item.jmcQty !== undefined ? item.jmcQty : ''} onChange={(e) => handleItemChange(idx, 'jmcQty', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 bg-blue-50">
                        <Input type="number" className="w-20 h-9" value={item.wipQty !== undefined ? item.wipQty : ''} onChange={(e) => handleItemChange(idx, 'wipQty', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 bg-blue-50">
                        <Input type="number" className="w-20 h-9" value={item.wipRequiredQty !== undefined ? item.wipRequiredQty : ''} onChange={(e) => handleItemChange(idx, 'wipRequiredQty', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 bg-orange-50">
                        <Input type="number" className="w-20 h-9" value={item.miscellaneousQty !== undefined ? item.miscellaneousQty : ''} onChange={(e) => handleItemChange(idx, 'miscellaneousQty', e.target.value)} />
                      </td>
                      
                      {/* Balance Calculation */}
                      <td className="px-4 py-3 font-bold text-red-600 bg-red-50">
                        {calculateContractorBalance(item)}
                      </td>
    
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          className="w-20 h-9"
                          step="1" value={item.demandQty !== undefined ? item.demandQty : ''}
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <ItemSelectionModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        items={workOrderId ? workOrderItems : itemsList}
        onSelect={handleAddNewItem}
        isWorkOrderContext={!!workOrderId}
      />
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
