'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/axios';
import { createContractorInvoice } from '@/features/contractor-billing/api/contractor-billing.api';
import { getItems } from '@/features/items/api/items.api';
import { useAuthStore } from '@/shared/store/auth.store';
import { uploadDocument } from '@/features/documents/api/documents.api';

const STAGES = ['90%', '10%'];

type MappingRow = {
  id: string;
  contractorId: string;
  drawingNo: string;
  selectedJmcs: string[];
};

export default function NewErectionBillForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [stage, setStage] = useState('');
  const [linkedSupplyBillId, setLinkedSupplyBillId] = useState('');
  const [jmcDocUrl, setJmcDocUrl] = useState('');
  const [signedBillDocUrl, setSignedBillDocUrl] = useState('');
  const [isUploadingJmc, setIsUploadingJmc] = useState(false);
  const [isUploadingSigned, setIsUploadingSigned] = useState(false);

  // 60% Supply Bills
  const [supplyBills, setSupplyBills] = useState<any[]>([]);

  // Location Hierarchy
  const targetCircle = user?.assignedCircle || '';
  const [divisions, setDivisions] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState('');

  // JMCs & Mapping Rows
  const [availableJmcs, setAvailableJmcs] = useState<any[]>([]);
  const [availableContractors, setAvailableContractors] = useState<any[]>([]);
  
  const [mappings, setMappings] = useState<MappingRow[]>([
    { id: Date.now().toString(), contractorId: '', drawingNo: '', selectedJmcs: [] }
  ]);

  // Final Aggregated Items
  const [lineItems, setLineItems] = useState<any[]>([]);

  // Fetch Supply Bills
  useEffect(() => {
    if (stage === '90%') {
      api.get('/client-billing?limit=5000').then(res => {
        const bills = res.data?.data?.data || res.data?.data || [];
        const supply60 = bills.filter((b: any) => b.stage === '60%' && b.status !== 'Rejected');
        setSupplyBills(supply60);
      }).catch(console.error);
    }
  }, [stage]);

  // Fetch Divisions dynamically from JMCs based on user assigned Circle
  useEffect(() => {
    if (targetCircle) {
      api.get(`/jmc?limit=5000`).then(res => {
        const jmcs = res.data?.data?.data || res.data?.data || [];
        const divs = new Set<string>();
        jmcs.forEach((j: any) => {
          const jmcCircle = j.circle?.toLowerCase() || '';
          if (jmcCircle === targetCircle.toLowerCase() && j.division) {
            divs.add(j.division);
          }
        });
        setDivisions(Array.from(divs));
      }).catch(console.error);
    } else {
      setDivisions([]);
    }
  }, [targetCircle]);

  // Fetch JMCs & Contractors for the selected Division
  useEffect(() => {
    if (selectedDivision && targetCircle) {
      api.get(`/jmc?limit=5000`).then(async res => {
        const jmcs = res.data?.data?.data || res.data?.data || [];
        
        const validJmcs = jmcs.filter((j: any) => {
          const jmcCircle = j.circle?.toLowerCase() || '';
          const jmcDiv = j.division?.toLowerCase() || '';
          return jmcCircle === targetCircle.toLowerCase() && jmcDiv === selectedDivision.toLowerCase() && j.status === 'Approved' && j.contractorId;
        });
        
        setAvailableJmcs(validJmcs);
        
        const cMap: Record<string, boolean> = {};
        validJmcs.forEach((j: any) => {
          const cId = typeof j.contractorId === 'object' ? j.contractorId._id : j.contractorId;
          cMap[cId] = true;
        });
        
        const cIds = Object.keys(cMap);
        if (cIds.length > 0) {
          const cRes = await api.get('/contractors?limit=5000');
          const allC = cRes.data?.data?.contractors || cRes.data?.data || [];
          
          const available = cIds.map(cId => {
            const cObj = allC.find((c:any) => c._id === cId);
            return {
              _id: cId,
              name: cObj?.dynamicData?.displayName || cObj?.name || cObj?.vendorName || 'Unknown Contractor',
            };
          });
          setAvailableContractors(available);
        } else {
          setAvailableContractors([]);
        }
      }).catch(console.error);
    } else {
      setAvailableJmcs([]);
      setAvailableContractors([]);
      setMappings([{ id: Date.now().toString(), contractorId: '', drawingNo: '', selectedJmcs: [] }]);
    }
  }, [selectedDivision, targetCircle]);

  // Aggregate items when mappings change
  useEffect(() => {
    fetchJmcData();
  }, [JSON.stringify(mappings)]);

  const fetchJmcData = async () => {
    const selectedJmcIds = mappings.flatMap(m => m.selectedJmcs);
    if (selectedJmcIds.length === 0) {
      setLineItems([]);
      return;
    }

    try {
      setLoading(true);
      let aggregated: any[] = [];
      
      availableJmcs.forEach((jmc: any) => {
        if (selectedJmcIds.includes(jmc._id)) {
          const cId = typeof jmc.contractorId === 'object' ? jmc.contractorId._id : jmc.contractorId;
          
          if (jmc.items) {
            jmc.items.forEach((item: any) => {
              if (item.itemId) {
                aggregated.push({
                  contractorId: cId,
                  itemId: typeof item.itemId === 'object' ? item.itemId._id : item.itemId,
                  activity: item.activity || '',
                  jmcQty: Number(item.approvedQty) || Number(item.claimedQty) || 0,
                  description: typeof item.itemId === 'object' ? (item.itemId.dynamicData?.itemName || item.itemId.dynamicData?.description) : '',
                });
              }
            });
          }
        }
      });

      // Group duplicates (Contractor + Item) across all selected JMCs
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

      // Apply Master DB Erection Rate
      if (finalItems.length > 0) {
        const itemRes = await getItems({ limit: 50000 });
        const masterItems = itemRes?.items || itemRes?.data?.items || (Array.isArray(itemRes) ? itemRes : itemRes.data) || [];
        
        finalItems.forEach(fi => {
          const master = masterItems.find((m: any) => m._id === fi.itemId);
          if (master) {
            fi.description = master.dynamicData?.itemName || master.dynamicData?.description || master.itemName;
            
            const dynamicData = master.dynamicData || {};
            const grossRate = (Number(dynamicData.erectionRateWithGst) || Number(dynamicData.erectionRate) || Number(dynamicData.erection_rate) || Number(dynamicData.contractorErectionRate) || Number(dynamicData.boqRate) || Number(master.boqRate) || 0);
            const baseRate = Number((grossRate > 0 && grossRate !== 1 ? grossRate / 1.18 : grossRate).toFixed(2));
            fi.rate = isNaN(baseRate) ? 0 : baseRate;
            
            fi.activity = master.dynamicData?.activity || master.activity || fi.activity;
            fi.tempCode = master.dynamicData?.tempCode || master.tempCode || 'N/A';
            fi.loaSlNo = master.dynamicData?.loaSrNo || master.dynamicData?.loaSerialNo || master.loaSrNo || master.loaSerialNo || master.sku || 'N/A';
            fi.loaQty = master.dynamicData?.loaQty || master.dynamicData?.loaQuantity || master.loaQty || master.loaQuantity || 0;
          }
        });
      }

      setLineItems(finalItems.map(fi => ({
        itemId: fi.itemId,
        contractorId: fi.contractorId,
        activity: fi.activity,
        description: fi.description,
        tempCode: fi.tempCode || 'N/A',
        loaSlNo: fi.loaSlNo || 'N/A',
        loaQty: fi.loaQty || 0,
        jmcDoneQty: fi.jmcQty,
        erectedQty: fi.jmcQty,
        rate: fi.rate || 0,
        gstRate: 18,
      })));

    } catch (err) {
      console.error(err);
      toast.error('Failed to aggregate JMC quantities');
    } finally {
      setLoading(false);
    }
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    lineItems.forEach((li) => {
      if (!groups[li.contractorId]) groups[li.contractorId] = [];
      groups[li.contractorId].push(li);
    });
    return groups;
  }, [lineItems]);

  const handleErectedQtyChange = (itemId: string, contractorId: string, val: number) => {
    setLineItems(prev => prev.map(item => {
      if (item.itemId === itemId && item.contractorId === contractorId) {
        return { ...item, erectedQty: Math.min(Math.max(0, val), item.jmcDoneQty) };
      }
      return item;
    }));
  };

  const addMappingRow = () => {
    setMappings([...mappings, { id: Date.now().toString(), contractorId: '', drawingNo: '', selectedJmcs: [] }]);
  };

  const removeMappingRow = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const updateMappingRow = (id: string, field: keyof MappingRow, value: any) => {
    setMappings(mappings.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        // Reset cascading selections
        if (field === 'contractorId') {
          updated.drawingNo = '';
          updated.selectedJmcs = [];
        }
        if (field === 'drawingNo') {
          updated.selectedJmcs = [];
        }
        return updated;
      }
      return m;
    }));
  };

  const getDrawingsForContractor = (contractorId: string) => {
    const jmcs = availableJmcs.filter(j => {
      const cId = typeof j.contractorId === 'object' ? j.contractorId._id : j.contractorId;
      return cId === contractorId;
    });
    const dNos = new Set<string>();
    jmcs.forEach(j => {
      if (j.drawingNo) dNos.add(j.drawingNo);
      else dNos.add('NO_DRAWING'); // Placeholder for missing drawings
    });
    return Array.from(dNos);
  };

  const getJmcsForSelection = (contractorId: string, drawingNo: string) => {
    return availableJmcs.filter(j => {
      const cId = typeof j.contractorId === 'object' ? j.contractorId._id : j.contractorId;
      if (cId !== contractorId) return false;
      if (drawingNo === 'NO_DRAWING' && !j.drawingNo) return true;
      if (drawingNo && j.drawingNo !== drawingNo) return false;
      return true;
    });
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, loadingSetter: (val: boolean) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      loadingSetter(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await uploadDocument(fd);
      if (res?.data?.url) {
        setter(res.data.url);
        toast.success('Document uploaded successfully');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to upload document');
    } finally {
      loadingSetter(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <Card className="border-indigo-200 shadow-sm">
        <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 pb-4">
          <CardTitle className="text-indigo-900 text-lg">Erection Bill Settings (Client Facing)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          
          {/* Billing Properties */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
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
                      <option key={b._id} value={b._id}>{b.invoiceNumber} - ₹{b.grandTotal}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Circle</Label>
                <Input 
                  value={targetCircle || 'No Circle Assigned'} 
                  disabled 
                  className="bg-slate-100 text-slate-500 font-medium cursor-not-allowed" 
                />
              </div>

              <div className="space-y-2">
                <Label>Division</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-slate-100"
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  disabled={!targetCircle || divisions.length === 0}
                >
                  <option value="">Select Division</option>
                  {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <Label>JMC Document URL <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    onChange={e => handleFileUpload(e, setJmcDocUrl, setIsUploadingJmc)} 
                    disabled={isUploadingJmc}
                    className="flex-1"
                  />
                  {isUploadingJmc && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                </div>
                {jmcDocUrl && <a href={jmcDocUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">View Uploaded JMC</a>}
              </div>
              <div className="space-y-2">
                <Label>Signed Bill Document URL <span className="text-red-500">*</span></Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="file" 
                    onChange={e => handleFileUpload(e, setSignedBillDocUrl, setIsUploadingSigned)} 
                    disabled={isUploadingSigned}
                    className="flex-1"
                  />
                  {isUploadingSigned && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
                </div>
                {signedBillDocUrl && <a href={signedBillDocUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">View Uploaded Signed Bill</a>}
              </div>
            </div>
          </div>

          {/* Dynamic JMC Mapping Rows */}
          {selectedDivision && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold text-slate-800">Map JMCs to Bill</Label>
                  <p className="text-sm text-slate-500">Link Specific JMCs sequentially for each contractor and drawing.</p>
                </div>
                <Button variant="outline" size="sm" onClick={addMappingRow} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                  <Plus className="w-4 h-4 mr-2" /> Add Mapping
                </Button>
              </div>

              <div className="space-y-3">
                {mappings.map((row, index) => {
                  const availableDrawings = row.contractorId ? getDrawingsForContractor(row.contractorId) : [];
                  const selectableJmcs = row.contractorId ? getJmcsForSelection(row.contractorId, row.drawingNo) : [];
                  
                  return (
                    <div key={row.id} className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg relative group">
                      
                      {mappings.length > 1 && (
                        <button 
                          onClick={() => removeMappingRow(row.id)}
                          className="absolute -right-2 -top-2 bg-white text-red-500 border border-red-200 p-1.5 rounded-full shadow-sm hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="flex-1 grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Contractor</Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                            value={row.contractorId}
                            onChange={(e) => updateMappingRow(row.id, 'contractorId', e.target.value)}
                          >
                            <option value="">Select Contractor</option>
                            {availableContractors.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                          </select>
                        </div>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Drawing No.</Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm disabled:bg-slate-100"
                            value={row.drawingNo}
                            onChange={(e) => updateMappingRow(row.id, 'drawingNo', e.target.value)}
                            disabled={!row.contractorId}
                          >
                            <option value="">Select Drawing</option>
                            {availableDrawings.map(d => (
                              <option key={d} value={d}>{d === 'NO_DRAWING' ? 'No Drawing Number' : d}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500">Select JMCs (Multi)</Label>
                          <div className={`min-h-[80px] max-h-32 w-full rounded-md border border-input px-3 py-1 text-sm overflow-y-auto flex items-start ${!row.contractorId ? 'bg-slate-100 cursor-not-allowed' : 'bg-background'}`}>
                            {row.contractorId ? (
                              <select 
                                multiple
                                className="w-full h-full min-h-[70px] bg-transparent focus:outline-none"
                                value={row.selectedJmcs}
                                onChange={(e) => {
                                  const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
                                  updateMappingRow(row.id, 'selectedJmcs', selectedOptions);
                                }}
                                style={{ height: 'auto', padding: 0 }}
                              >
                                {selectableJmcs.map(jmc => (
                                  <option key={jmc._id} value={jmc._id} className="p-1 mb-1 border-b">
                                    JMC No: {jmc.jmcNumber || jmc._id.slice(-6)} 
                                    {jmc.jmcDate ? ` (${new Date(jmc.jmcDate).toLocaleDateString()})` : ''}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-400">Select Contractor First</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">Hold Cmd/Ctrl to select multiple.</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Final Table (Standard Format) */}
      <Card className="border-slate-200 shadow-sm mt-6">
        <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
          <CardTitle className="text-slate-800 text-base font-medium flex items-center justify-between">
            <span>Bill Line Items</span>
            <span className="text-xs font-normal text-slate-500">Add line items, fill JMC or Erected qty</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lineItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No items added yet. Map JMCs above to start.
            </div>
          ) : (
            <div className="w-full">
              {Object.entries(groupedItems).map(([cId, items]) => {
                const cName = availableContractors.find(c => c._id === cId)?.name || 'Unknown Contractor';
                return (
                  <div key={cId} className="mb-0 border-b border-slate-200 last:border-b-0">
                    <div className="bg-indigo-50/70 px-4 py-2 border-y border-indigo-100 font-semibold text-indigo-900 text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {cName}
                      </div>
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                        {items.length} Items
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-slate-600 bg-slate-50 uppercase font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 min-w-[120px]">Activity</th>
                            <th className="px-4 py-3 min-w-[200px]">Item</th>
                            <th className="px-4 py-3 text-center">Temp Code</th>
                            <th className="px-4 py-3 text-center">LOA Sl No</th>
                            <th className="px-4 py-3 text-right">LOA Qty</th>
                            <th className="px-4 py-3 text-right">Rate</th>
                            <th className="px-4 py-3 text-right bg-blue-50/50 min-w-[120px]">
                              JMC Done Qty
                              {stage && <div className="text-[9px] text-slate-400 mt-0.5">{stage} Release</div>}
                            </th>
                            <th className="px-4 py-3 text-right bg-indigo-50/50 min-w-[120px]">Erected Qty</th>
                            <th className="px-4 py-3 text-center">GST %</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((item, idx) => {
                            const amount = item.erectedQty * item.rate;
                            return (
                              <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-slate-600 font-medium">{item.activity}</td>
                                <td className="px-4 py-3 text-slate-900 text-xs">{item.description}</td>
                                <td className="px-4 py-3 text-center text-slate-500">{item.tempCode}</td>
                                <td className="px-4 py-3 text-center text-slate-500">{item.loaSlNo}</td>
                                <td className="px-4 py-3 text-right text-slate-600">{item.loaQty}</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-700">₹{item.rate}</td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600 bg-blue-50/30">{item.jmcDoneQty}</td>
                                <td className="px-4 py-3 text-right">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={item.jmcDoneQty}
                                    value={item.erectedQty}
                                    onChange={(e) => handleErectedQtyChange(item.itemId, item.contractorId, Number(e.target.value))}
                                    className="w-20 text-right ml-auto h-8 text-xs font-bold text-indigo-700 bg-white"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center text-slate-600">{item.gstRate}%</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800">₹{amount.toLocaleString('en-IN')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 pl-64">
        <div className="max-w-7xl mx-auto flex justify-end gap-4">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Submit Erection Bill
          </Button>
        </div>
      </div>
    </div>
  );
}
