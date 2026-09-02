"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Save, ArrowLeft, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { updateClientBill, getClientBillById } from '@/features/billing/api/client-billing.api';
import { api } from '@/shared/api/axios';

export default function EditClientBillPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [billType, setBillType] = useState<'Supply' | 'Erection'>('Supply');
  const [referenceList, setReferenceList] = useState<any[]>([]);
  
  const [invoiceDoc, setInvoiceDoc] = useState<File | null>(null);
  const [diDoc, setDiDoc] = useState<File | null>(null);
  const [mhrovDoc, setMhrovDoc] = useState<File | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<File[]>([]);
  const [items, setItems] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    raBillNo: '',
    raBillDate: new Date().toISOString().split('T')[0],
    stage: '60%',
    referenceIds: [] as string[]
  });

  useEffect(() => {
    const fetchBillAndReferences = async () => {
      try {
        const [mhrovRes, jmcRes, billRes] = await Promise.all([
          api.get('/store/mhrov?status=Approved'),
          api.get('/jmc?status=Approved'),
          getClientBillById(id)
        ]);
        
        const bill = billRes.data;
        let availableRefs: any[] = [];
        if (bill.billType === 'Supply') {
          if (mhrovRes.data?.success) availableRefs = mhrovRes.data.data;
        } else {
          if (jmcRes.data?.success) availableRefs = jmcRes.data.data;
        }
        setReferenceList(availableRefs);
        
        setBillType(bill.billType);
        setFormData({
          raBillNo: bill.raBillNo,
          raBillDate: new Date(bill.raBillDate).toISOString().split('T')[0],
          stage: bill.stage,
          referenceIds: bill.referenceIds
        });
        setItems(bill.items || []);
        
      } catch (error) {
        toast.error('Failed to load bill data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) fetchBillAndReferences();
  }, [id]);

  const handleAddReference = (refId: string) => {
    if (!refId) return;
    
    const selectedRef = referenceList.find((r: any) => String(r._id) === refId);
    let newRaBillNo = formData.raBillNo;
    if (!newRaBillNo && selectedRef) {
      const refNo = selectedRef.mhrovNumber || selectedRef.jmcNumber || selectedRef.diNo || '001';
      newRaBillNo = `RA-${refNo}`;
    }

    if (!formData.referenceIds.includes(refId)) {
      const updatedIds = [...formData.referenceIds, refId];
      setFormData(prev => ({ 
        ...prev, 
        raBillNo: newRaBillNo,
        referenceIds: updatedIds 
      }));
      updateItemsForReferences(updatedIds);
    }
  };

  const handleRemoveReference = (refId: string) => {
    const updatedIds = formData.referenceIds.filter(id => id !== refId);
    setFormData(prev => ({ ...prev, referenceIds: updatedIds }));
    
    updateItemsForReferences(updatedIds);
  };

  const updateItemsForReferences = (selectedOptions: string[]) => {
    let allMappedItems: any[] = [];
    
    selectedOptions.forEach(refId => {
      const selectedRef = referenceList.find(r => String(r._id) === refId);
      
      if (selectedRef && selectedRef.items) {
        const mappedItems = selectedRef.items.map((i: any) => {
          const doneQty = i.mhrovDoneQty || i.approvedQty || 0;
          const itemObj = typeof i.itemId === 'object' && i.itemId !== null ? i.itemId : null;
          const dynamicData = itemObj?.dynamicData || {};
          
          const loaSrNo = i.loaSrNo || i.loaSerialNo || dynamicData.loaSrNo || dynamicData.loaSerialNumber || dynamicData.sku || '';
          const itemName = i.description || i.itemName || dynamicData.name || dynamicData.description || 'Unknown Item';
          const tempCode = i.tempCode || dynamicData.tempCode || dynamicData.temp_code || dynamicData.sku || i.sku || '';
          
          const grossRate = billType === 'Supply' 
            ? (Number(dynamicData.supplyRateWithGst) || Number(dynamicData.supplyRate) || Number(dynamicData.supply_rate) || Number(dynamicData.boqRate) || Number(dynamicData.rate) || 0)
            : (Number(dynamicData.erectionRateWithGst) || Number(dynamicData.erectionRate) || Number(dynamicData.erection_rate) || Number(dynamicData.boqRate) || Number(dynamicData.rate) || 0);
          const baseRate = Number((grossRate > 0 && grossRate !== 1 ? grossRate / 1.18 : grossRate).toFixed(2));
          const finalBaseRate = isNaN(baseRate) ? 0 : baseRate;
          
          return {
            refNumber: selectedRef.mhrovNumber || selectedRef.jmcNumber || selectedRef.diNo || selectedRef._id,
            loaSrNo: loaSrNo,
            itemId: itemObj ? itemObj._id : i.itemId,
            tempCode: tempCode,
            itemName: itemName,
            diNo: i.diId?.diNumber || '',
            diDate: i.diId?.date ? new Date(i.diId.date).toISOString().split('T')[0] : '',
            diQty: i.diId?.lineItems?.find((diItem: any) => String(diItem.itemId) === String(itemObj?._id))?.quantity 
                || i.diId?.items?.find((diItem: any) => String(diItem.itemId) === String(itemObj?._id))?.quantity 
                || 0,
            sourceDoneQty: doneQty,
            raBillQty: doneQty,
            boqRate: finalBaseRate,
            totalAmount: Number((doneQty * finalBaseRate).toFixed(2))
          };
        });
        allMappedItems = [...allMappedItems, ...mappedItems];
      }
    });
    
    const groupedItems = allMappedItems.reduce((acc: any[], current: any) => {
      const existing = acc.find(item => 
        item.refNumber === current.refNumber && 
        item.itemId === current.itemId && 
        item.diNo === current.diNo
      );
      
      if (existing) {
        existing.diQty += current.diQty;
        existing.sourceDoneQty += current.sourceDoneQty;
        existing.raBillQty += current.raBillQty;
        existing.totalAmount = Number((existing.raBillQty * existing.boqRate).toFixed(2));
      } else {
        acc.push({ ...current });
      }
      return acc;
    }, []);
    
    setItems(groupedItems);
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const updatedItems = [...items];
    const val = Number(value);
    
    if (field === 'raBillQty') {
      if (val > updatedItems[index].sourceDoneQty) {
        toast.error('Bill quantity cannot exceed Done quantity');
        return;
      }
      updatedItems[index].raBillQty = val;
    }
    if (field === 'boqRate') {
      updatedItems[index].boqRate = val;
    }
    
    updatedItems[index].totalAmount = updatedItems[index].raBillQty * updatedItems[index].boqRate;
    setItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('raBillNo', formData.raBillNo);
      payload.append('raBillDate', formData.raBillDate);
      payload.append('stage', formData.stage);
      payload.append('billType', billType);
      payload.append('referenceType', billType === 'Supply' ? 'MHROV' : 'JMCRegister');
      payload.append('referenceIds', JSON.stringify(formData.referenceIds));
      payload.append('items', JSON.stringify(items));

      if (invoiceDoc) payload.append('invoiceDoc', invoiceDoc);
      if (diDoc) payload.append('diDoc', diDoc);
      if (mhrovDoc) payload.append('mhrovDoc', mhrovDoc);
      additionalDocs.forEach((doc) => {
        payload.append('additionalDocs', doc);
      });
      
      const res = await updateClientBill(id, payload);
      if (res.success) {
        toast.success('Client Bill updated successfully');
        router.push('/billing/client-billing');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalBaseAmount = items.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const totalGstAmount = totalBaseAmount * 0.18;
  const grandTotalAmount = totalBaseAmount + totalGstAmount;

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading bill data...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b pb-5">
        <Link href="/billing/client-billing" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit RA Bill</h1>
          <p className="text-slate-500 mt-1">Modify an existing Client Running Account Bill.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3">Bill Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Bill Type <span className="text-rose-500">*</span></label>
              <select 
                className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                value={billType}
                onChange={(e) => setBillType(e.target.value as 'Supply' | 'Erection')}
              >
                <option value="Supply">Supply Bill</option>
                <option value="Erection">Erection Bill</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Stage <span className="text-rose-500">*</span></label>
              <select 
                className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                value={formData.stage}
                onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
              >
                {billType === 'Supply' ? (
                  <>
                    <option value="60%">60%</option>
                    <option value="30%">30%</option>
                    <option value="10%">10%</option>
                  </>
                ) : (
                  <>
                    <option value="90%">90%</option>
                    <option value="10%">10%</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Source Documents <span className="text-rose-500">*</span></label>
              <select 
                className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                value=""
                onChange={(e) => handleAddReference(e.target.value)}
              >
                <option value="" disabled>+ Add {billType === 'Supply' ? 'MHROV' : 'JMC'}...</option>
                {referenceList.filter(ref => !formData.referenceIds.includes(String(ref._id))).map(ref => (
                  <option key={ref._id} value={ref._id}>
                    {ref.mhrovNumber || ref.jmcNumber || ref.diNo || ref._id}
                  </option>
                ))}
              </select>
              
              {formData.referenceIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-2 bg-slate-50 border border-slate-100 rounded-md min-h-[48px]">
                  {formData.referenceIds.map(id => {
                    const ref = referenceList.find(r => String(r._id) === id);
                    const label = ref ? (ref.mhrovNumber || ref.jmcNumber || ref.diNo || ref._id) : id;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 text-sm font-medium bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                        {label}
                        <button
                          type="button"
                          onClick={() => handleRemoveReference(id)}
                          className="p-0.5 hover:bg-indigo-200 rounded-full transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">RA Bill No <span className="text-rose-500">*</span></label>
              <Input 
                required
                placeholder="Enter Bill No"
                value={formData.raBillNo}
                onChange={e => setFormData(prev => ({ ...prev, raBillNo: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-3">Documents Upload</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Invoice Copy</label>
              <Input type="file" onChange={e => setInvoiceDoc(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">DI Copy</label>
              <Input type="file" onChange={e => setDiDoc(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">MHROV Copy</label>
              <Input type="file" onChange={e => setMhrovDoc(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Additional Documents</label>
              <Input type="file" multiple onChange={e => setAdditionalDocs(Array.from(e.target.files || []))} />
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Bill Items</h2>
              <p className="text-xs text-slate-500">Adjust the bill quantities and BOQ rates.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">RA Bill No</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">RA Bill Date</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">{billType === 'Supply' ? 'MHROV No' : 'JMC No'}</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">LOA Sr No</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Temp Code</th>
                    <th className="px-4 py-3 font-semibold text-slate-800 w-1/5 min-w-[200px]">Item Name</th>
                    {billType === 'Supply' && (
                      <>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">DI No</th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">DI Date</th>
                        <th className="px-4 py-3 font-semibold whitespace-nowrap">DI Qty</th>
                      </>
                    )}
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">{billType === 'Supply' ? 'MHROV Qty' : 'JMC Qty'}</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">RA Bill Qty</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">BOQ Rate</th>
                    <th className="px-4 py-3 font-semibold whitespace-nowrap">GST %</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const isNewGroup = idx === 0 || item.refNumber !== items[idx - 1].refNumber;
                    
                    return (
                      <React.Fragment key={idx}>
                        {isNewGroup && (
                          <tr className="bg-slate-100/80 border-y border-slate-200 shadow-sm">
                            <td colSpan={billType === 'Supply' ? 14 : 11} className="px-4 py-2 font-semibold text-indigo-700">
                              Source: {item.refNumber}
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formData.raBillNo || '-'}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date().toISOString().split('T')[0]}</td>
                          <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{item.refNumber}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{item.loaSrNo || '-'}</td>
                          <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{item.tempCode || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 line-clamp-2" title={item.itemName}>{item.itemName}</td>
                          {billType === 'Supply' && (
                            <>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.diNo || '-'}</td>
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.diDate || '-'}</td>
                              <td className="px-4 py-3 text-slate-500 text-center">{item.diQty || 0}</td>
                            </>
                          )}
                          <td className="px-4 py-3 text-slate-500 text-center">{item.sourceDoneQty}</td>
                          <td className="px-4 py-2">
                            <Input 
                              type="number" 
                              className="w-24 h-8"
                              value={item.raBillQty}
                              onChange={(e) => handleItemChange(idx, 'raBillQty', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                              type="number" 
                              className="w-28 h-8"
                              placeholder="BOQ Rate"
                              value={item.boqRate || ''}
                              onChange={(e) => handleItemChange(idx, 'boqRate', e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-center">18%</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan={billType === 'Supply' ? 13 : 10} className="px-4 py-3 text-right font-semibold text-slate-700">Subtotal (Base Amount)</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">₹{totalBaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <td colSpan={billType === 'Supply' ? 13 : 10} className="px-4 py-2 text-right font-medium text-slate-500">GST (18%)</td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-600">₹{totalGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr className="bg-indigo-50/50">
                    <td colSpan={billType === 'Supply' ? 13 : 10} className="px-4 py-3 text-right font-bold text-indigo-900 text-base">Grand Total</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-700 text-lg">₹{grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Link href="/billing/client-billing">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting || items.length === 0}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
