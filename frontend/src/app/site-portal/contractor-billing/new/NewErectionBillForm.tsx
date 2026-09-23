'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/axios';
import { createContractorInvoice } from '@/features/contractor-billing/api/contractor-billing.api';
import { getItems } from '@/features/items/api/items.api';
import { useAuthStore } from '@/shared/store/auth.store';

const STAGES = ['90%', '10%'];

export default function NewErectionBillForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [stage, setStage] = useState('');
  const [linkedSupplyBillId, setLinkedSupplyBillId] = useState('');
  const [jmcDocUrl, setJmcDocUrl] = useState('');
  const [signedBillDocUrl, setSignedBillDocUrl] = useState('');

  // 60% Supply Bills
  const [supplyBills, setSupplyBills] = useState<any[]>([]);

  // Division & Drawing No
  const [divisions, setDivisions] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [drawingNumbers, setDrawingNumbers] = useState<string[]>([]);
  const [selectedDrawingNo, setSelectedDrawingNo] = useState('');

  // Contractors
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedContractorIds, setSelectedContractorIds] = useState<string[]>([]);

  // JMCs & Items
  const [jmcItems, setJmcItems] = useState<any[]>([]); // aggregated items
  const [lineItems, setLineItems] = useState<any[]>([]); // final items for submission

  useEffect(() => {
    if (stage === '90%') {
      api.get('/client-bills').then(res => {
        const bills = res.data?.data?.data || res.data?.data || [];
        const supply60 = bills.filter((b: any) => b.stage === '60%' && b.status !== 'Rejected');
        setSupplyBills(supply60);
      }).catch(console.error);
    }
  }, [stage]);

  useEffect(() => {
    api.get('/divisions').then(res => {
      const arr = res.data?.data || ['Rohru', 'Jubbal', 'Paonta'];
      setDivisions(arr);
    }).catch(() => {
      setDivisions(['Rohru', 'Jubbal', 'Paonta']);
    });

    api.get('/contractors').then(res => {
      const data = res.data?.data;
      const arr = Array.isArray(data) ? data : (data?.contractors || []);
      setContractors(arr);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedDivision) {
      api.get(`/jmc?division=${selectedDivision}`).then(res => {
        const jmcs = res.data?.data?.data || res.data?.data || [];
        const dNos = new Set<string>();
        jmcs.forEach((j: any) => { if (j.drawingNo) dNos.add(j.drawingNo); });
        setDrawingNumbers(Array.from(dNos));
      }).catch(console.error);
    } else {
      setDrawingNumbers([]);
    }
  }, [selectedDivision]);

  useEffect(() => {
    if (selectedDrawingNo && selectedContractorIds.length > 0) {
      fetchJmcData();
    } else {
      setJmcItems([]);
    }
  }, [selectedDrawingNo, selectedContractorIds]);

  const fetchJmcData = async () => {
    try {
      setLoading(true);
      const promises = selectedContractorIds.map(cId => 
        api.get(`/jmc?contractorId=${cId}&drawingNo=${selectedDrawingNo}`)
      );
      const responses = await Promise.all(promises);
      
      let aggregated: any[] = [];
      responses.forEach((res, idx) => {
        const cId = selectedContractorIds[idx];
        const jmcs = res.data?.data?.data || res.data?.data || [];
        
        jmcs.forEach((jmc: any) => {
          if (jmc.status === 'Approved' && jmc.items) {
            jmc.items.forEach((item: any) => {
              if (item.itemId) {
                aggregated.push({
                  contractorId: cId,
                  itemId: typeof item.itemId === 'object' ? item.itemId._id : item.itemId,
                  activity: item.activity || '',
                  jmcQty: Number(item.approvedQty) || Number(item.claimedQty) || 0,
                  tempCode: typeof item.itemId === 'object' ? item.itemId.dynamicData?.tempCode : '',
                  loaSerialNo: typeof item.itemId === 'object' ? item.itemId.dynamicData?.sku : '',
                  description: typeof item.itemId === 'object' ? (item.itemId.dynamicData?.itemName || item.itemId.dynamicData?.description) : '',
                });
              }
            });
          }
        });
      });

      const groupedByContractorAndItem: Record<string, any> = {};
      aggregated.forEach(ag => {
        const key = `${ag.contractorId}_${ag.itemId}`;
        if (!groupedByContractorAndItem[key]) {
          groupedByContractorAndItem[key] = { ...ag };
        } else {
          groupedByContractorAndItem[key].jmcQty += ag.jmcQty;
        }
      });

      const finalItems = Object.values(groupedByContractorAndItem);

      if (finalItems.length > 0) {
        const itemRes = await getItems({ limit: 50000 });
        const masterItems = itemRes?.items || itemRes?.data?.items || (Array.isArray(itemRes) ? itemRes : itemRes.data) || [];
        
        finalItems.forEach(fi => {
          const master = masterItems.find((m: any) => m._id === fi.itemId);
          if (master) {
            fi.description = master.dynamicData?.itemName || master.dynamicData?.description || master.itemName;
            fi.rate = master.dynamicData?.boqRate || master.boqRate || 0;
            fi.activity = master.dynamicData?.activity || master.activity || fi.activity;
          }
        });
      }

      setJmcItems(finalItems);
      setLineItems(finalItems.map(fi => ({
        itemId: fi.itemId,
        contractorId: fi.contractorId,
        activity: fi.activity,
        description: fi.description,
        jmcDoneQty: fi.jmcQty,
        erectedQty: fi.jmcQty,
        rate: fi.rate || 0,
        gstRate: 18,
      })));

    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch JMCs');
    } finally {
      setLoading(false);
    }
  };

  const handleContractorToggle = (cId: string) => {
    setSelectedContractorIds(prev => 
      prev.includes(cId) ? prev.filter(id => id !== cId) : [...prev, cId]
    );
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    lineItems.forEach((li, idx) => {
      if (!groups[li.contractorId]) groups[li.contractorId] = [];
      groups[li.contractorId].push({ ...li, originalIndex: idx });
    });
    return groups;
  }, [lineItems]);

  const handleSubmit = async () => {
    if (!stage) return toast.error('Please select a Billing Stage');
    if (stage === '90%' && !linkedSupplyBillId) return toast.error('Please select the linked 60% Supply Bill');
    if (lineItems.length === 0) return toast.error('No items to bill');
    if (!jmcDocUrl || !signedBillDocUrl) return toast.error('Upload required documents');

    try {
      setLoading(true);
      const payload = {
        billingCategory: 'Erection Bill',
        stage,
        linkedSupplyBillId: stage === '90%' ? linkedSupplyBillId : undefined,
        jmcDocUrl,
        signedBillDocUrl,
        drawingNumber: selectedDrawingNo,
        lineItems: lineItems.map(item => ({ ...item, billingCategory: 'Erection' }))
      };

      await createContractorInvoice(payload);
      toast.success('Erection Bill submitted successfully!');
      router.push('/site-portal/contractor-billing');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-indigo-200">
      <CardHeader className="bg-indigo-50/50">
        <CardTitle className="text-indigo-900">Erection Bill Settings (Client Facing)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Billing Stage <span className="text-red-500">*</span></Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              <option value="">Select Billing Stage</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {stage === '90%' && (
            <div className="space-y-2">
              <Label>Link Supply 60% RA Bill <span className="text-red-500">*</span></Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={linkedSupplyBillId}
                onChange={(e) => setLinkedSupplyBillId(e.target.value)}
              >
                <option value="">Select Supply Bill</option>
                {supplyBills.map(b => (
                  <option key={b._id} value={b._id}>{b.invoiceNumber} - {b.grandTotal}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Division</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
            >
              <option value="">Select Division</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Drawing Number</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedDrawingNo}
              onChange={(e) => setSelectedDrawingNo(e.target.value)}
              disabled={!selectedDivision}
            >
              <option value="">Select Drawing No</option>
              {drawingNumbers.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Select Contractors who worked on this Drawing</Label>
          <div className="grid grid-cols-3 gap-2 border p-4 rounded-md bg-slate-50 max-h-48 overflow-y-auto">
            {contractors.map(c => (
              <label key={c._id} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedContractorIds.includes(c._id)}
                  onChange={() => handleContractorToggle(c._id)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">{c.dynamicData?.displayName || c.name || c.vendorName}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
           <Label>Document Uploads <span className="text-red-500">*</span></Label>
           <div className="grid grid-cols-2 gap-6">
              <div>
                <Input placeholder="JMC Document URL" value={jmcDocUrl} onChange={e => setJmcDocUrl(e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">Paste the URL of the combined JMC signed copy</p>
              </div>
              <div>
                <Input placeholder="Signed Bill Document URL" value={signedBillDocUrl} onChange={e => setSignedBillDocUrl(e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">Paste the URL of the signed bill</p>
              </div>
           </div>
        </div>

        {lineItems.length > 0 && (
          <div className="mt-8 border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Aggregated Items</h3>
            </div>
            
            {Object.entries(groupedItems).map(([cId, items]) => {
              const cName = contractors.find(c => c._id === cId)?.dynamicData?.displayName || 'Unknown Contractor';
              return (
                <div key={cId} className="mb-4">
                  <div className="bg-slate-50 px-4 py-2 border-y border-slate-200 font-bold text-slate-700">
                    Contractor: {cName}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 bg-white uppercase">
                        <tr>
                          <th className="px-4 py-2">Activity</th>
                          <th className="px-4 py-2">Description</th>
                          <th className="px-4 py-2">JMC Qty</th>
                          <th className="px-4 py-2">Master Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                            <td className="px-4 py-2">{item.activity}</td>
                            <td className="px-4 py-2 font-medium text-slate-900">{item.description}</td>
                            <td className="px-4 py-2">{item.jmcDoneQty}</td>
                            <td className="px-4 py-2 font-medium text-slate-900">₹{item.rate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 pl-64">
        <div className="max-w-7xl mx-auto flex justify-end gap-4">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Submit Erection Bill
          </Button>
        </div>
      </div>
    </Card>
  );
}
