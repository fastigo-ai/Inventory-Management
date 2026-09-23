'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/axios';
import { createContractorInvoice } from '@/features/contractor-billing/api/contractor-billing.api';
import { getItems } from '@/features/items/api/items.api';

const STAGES = ['90%', '10%'];
const PACKAGES = ['Package 1(S/N)', 'Package 2(R/R)'];

export default function NewErectionBillForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [stage, setStage] = useState('');
  const [linkedSupplyBillId, setLinkedSupplyBillId] = useState('');
  const [jmcDocUrl, setJmcDocUrl] = useState('');
  const [signedBillDocUrl, setSignedBillDocUrl] = useState('');

  // 60% Supply Bills
  const [supplyBills, setSupplyBills] = useState<any[]>([]);

  // Location Hierarchy
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [selectedSubCircle, setSelectedSubCircle] = useState('');
  
  const [divisions, setDivisions] = useState<string[]>([]);
  const [selectedDivision, setSelectedDivision] = useState('');

  // Contractors & Drawings
  const [availableContractors, setAvailableContractors] = useState<any[]>([]);
  // Map of contractorId -> array of selected drawing numbers
  const [selectedContractorDrawings, setSelectedContractorDrawings] = useState<Record<string, string[]>>({});

  // Final Aggregated Items
  const [jmcItems, setJmcItems] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);

  // Package -> Circle logic
  const circles = useMemo(() => {
    if (selectedPackage === 'Package 1(S/N)') return ['Nahan', 'Solan'];
    if (selectedPackage === 'Package 2(R/R)') return ['Rohru', 'Rampur'];
    return [];
  }, [selectedPackage]);

  // Circle -> Subcircle logic
  const subCircles = useMemo(() => {
    if (selectedCircle === 'Solan') return ['Kumarhatti', 'Nalagarh'];
    return [];
  }, [selectedCircle]);

  // Reset downstream fields when parents change
  useEffect(() => { setSelectedCircle(''); }, [selectedPackage]);
  useEffect(() => { setSelectedSubCircle(''); }, [selectedCircle]);
  useEffect(() => { setSelectedDivision(''); }, [selectedCircle, selectedSubCircle]);

  // Fetch Supply Bills
  useEffect(() => {
    if (stage === '90%') {
      api.get('/client-billing').then(res => {
        const bills = res.data?.data?.data || res.data?.data || [];
        const supply60 = bills.filter((b: any) => b.stage === '60%' && b.status !== 'Rejected');
        setSupplyBills(supply60);
      }).catch(console.error);
    }
  }, [stage]);

  // Fetch Divisions dynamically from JMCs based on Circle/Subcircle
  useEffect(() => {
    const targetCircle = selectedSubCircle || selectedCircle;
    if (targetCircle) {
      api.get(`/jmc`).then(res => {
        const jmcs = res.data?.data?.data || res.data?.data || [];
        const divs = new Set<string>();
        jmcs.forEach((j: any) => {
          // Flexible match for circle in case of slight string differences
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
  }, [selectedCircle, selectedSubCircle]);

  // Fetch Available Contractors for the selected Division
  useEffect(() => {
    if (selectedDivision) {
      const targetCircle = selectedSubCircle || selectedCircle;
      api.get(`/jmc`).then(async res => {
        const jmcs = res.data?.data?.data || res.data?.data || [];
        
        // Find approved JMCs matching Circle + Division
        const cMap: Record<string, Set<string>> = {};
        
        jmcs.forEach((j: any) => {
          const jmcCircle = j.circle?.toLowerCase() || '';
          const jmcDiv = j.division?.toLowerCase() || '';
          
          if (jmcCircle === targetCircle.toLowerCase() && jmcDiv === selectedDivision.toLowerCase()) {
            if (j.status === 'Approved' && j.contractorId) {
              const cId = typeof j.contractorId === 'object' ? j.contractorId._id : j.contractorId;
              if (!cMap[cId]) cMap[cId] = new Set<string>();
              if (j.drawingNo) cMap[cId].add(j.drawingNo);
            }
          }
        });
        
        const cIds = Object.keys(cMap);
        if (cIds.length > 0) {
          const cRes = await api.get('/contractors');
          const allC = cRes.data?.data?.contractors || cRes.data?.data || [];
          
          const available = cIds.map(cId => {
            const cObj = allC.find((c:any) => c._id === cId);
            return {
              _id: cId,
              name: cObj?.dynamicData?.displayName || cObj?.name || cObj?.vendorName || 'Unknown Contractor',
              availableDrawings: Array.from(cMap[cId])
            };
          });
          setAvailableContractors(available);
        } else {
          setAvailableContractors([]);
        }
      }).catch(console.error);
    } else {
      setAvailableContractors([]);
      setSelectedContractorDrawings({});
    }
  }, [selectedDivision, selectedCircle, selectedSubCircle]);

  // When selection changes, aggregate JMC data
  useEffect(() => {
    fetchJmcData();
  }, [selectedContractorDrawings]);

  const fetchJmcData = async () => {
    const activeContractorIds = Object.keys(selectedContractorDrawings).filter(cId => selectedContractorDrawings[cId].length > 0);
    
    if (activeContractorIds.length === 0) {
      setLineItems([]);
      return;
    }

    try {
      setLoading(true);
      // Fetch all JMCs, then filter locally (more efficient than multiple API calls if API doesn't support complex OR filters)
      const res = await api.get('/jmc');
      const allJmcs = res.data?.data?.data || res.data?.data || [];
      
      let aggregated: any[] = [];
      
      allJmcs.forEach((jmc: any) => {
        if (jmc.status === 'Approved' && jmc.contractorId && jmc.drawingNo) {
          const cId = typeof jmc.contractorId === 'object' ? jmc.contractorId._id : jmc.contractorId;
          
          // Check if this JMC's contractor and drawing are selected
          if (selectedContractorDrawings[cId] && selectedContractorDrawings[cId].includes(jmc.drawingNo)) {
             if (jmc.items) {
               jmc.items.forEach((item: any) => {
                 if (item.itemId) {
                   aggregated.push({
                     contractorId: cId,
                     drawingNo: jmc.drawingNo,
                     itemId: typeof item.itemId === 'object' ? item.itemId._id : item.itemId,
                     activity: item.activity || '',
                     jmcQty: Number(item.approvedQty) || Number(item.claimedQty) || 0,
                     description: typeof item.itemId === 'object' ? (item.itemId.dynamicData?.itemName || item.itemId.dynamicData?.description) : '',
                   });
                 }
               });
             }
          }
        }
      });

      // Aggregate duplicates (Contractor + Item) across all their selected drawings
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

      // Fetch Master Items to apply standard Erection Rates
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
        // Since it's multi-drawing, we leave drawingNumber blank or aggregate it in a future update if needed
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
    <Card className="border-indigo-200 shadow-sm">
      <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 pb-4">
        <CardTitle className="text-indigo-900 text-lg">Erection Bill Settings (Client Facing)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        
        {/* Billing Properties */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
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

        {/* Hierarchy Selection */}
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Package</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
            >
              <option value="">Select Package</option>
              {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Circle</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-slate-100"
              value={selectedCircle}
              onChange={(e) => setSelectedCircle(e.target.value)}
              disabled={!selectedPackage}
            >
              <option value="">Select Circle</option>
              {circles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {subCircles.length > 0 && (
            <div className="space-y-2">
              <Label>Subcircle</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedSubCircle}
                onChange={(e) => setSelectedSubCircle(e.target.value)}
              >
                <option value="">Select Subcircle</option>
                {subCircles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Division</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:bg-slate-100"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              disabled={!selectedCircle || divisions.length === 0}
            >
              <option value="">Select Division</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Contractor & Drawing Mapping */}
        {selectedDivision && (
          <div className="space-y-3">
            <Label className="text-base font-semibold text-slate-800">Available Contractors & Drawings</Label>
            <p className="text-sm text-slate-500">Select the contractors and the specific drawings they worked on for this bill.</p>
            
            {availableContractors.length === 0 ? (
              <div className="p-4 border rounded bg-slate-50 text-slate-500 text-center text-sm">
                No approved JMCs found for this division.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                {availableContractors.map(c => (
                  <div key={c._id} className={`p-4 border rounded-lg transition-colors ${selectedContractorDrawings[c._id] !== undefined ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white hover:bg-slate-50'}`}>
                    <label className="flex items-center gap-3 cursor-pointer mb-1">
                      <input 
                        type="checkbox" 
                        checked={selectedContractorDrawings[c._id] !== undefined}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedContractorDrawings({...selectedContractorDrawings, [c._id]: []});
                          else {
                            const newMap = {...selectedContractorDrawings};
                            delete newMap[c._id];
                            setSelectedContractorDrawings(newMap);
                          }
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="font-semibold text-slate-700">{c.name}</span>
                    </label>
                    
                    {selectedContractorDrawings[c._id] !== undefined && (
                      <div className="ml-7 mt-3 pt-3 border-t border-indigo-100 space-y-2">
                        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Select Drawings:</Label>
                        <div className="flex flex-wrap gap-3">
                          {c.availableDrawings.map((dNo: string) => (
                            <label key={dNo} className="flex items-center gap-1.5 text-sm cursor-pointer bg-white px-2 py-1 border rounded shadow-sm hover:border-indigo-300 transition-colors">
                              <input 
                                type="checkbox" 
                                className="text-indigo-600 rounded-sm"
                                checked={selectedContractorDrawings[c._id].includes(dNo)} 
                                onChange={e => {
                                  const arr = selectedContractorDrawings[c._id];
                                  const newArr = e.target.checked ? [...arr, dNo] : arr.filter(x => x !== dNo);
                                  setSelectedContractorDrawings({...selectedContractorDrawings, [c._id]: newArr});
                                }} 
                              />
                              <span className="text-slate-600">{dNo}</span>
                            </label>
                          ))}
                        </div>
                        {selectedContractorDrawings[c._id].length === 0 && (
                           <p className="text-xs text-red-500">Please select at least one drawing.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documents */}
        <div className="space-y-2 pt-4 border-t">
           <Label>Document Uploads <span className="text-red-500">*</span></Label>
           <div className="grid grid-cols-2 gap-6">
              <div>
                <Input placeholder="JMC Document URL" value={jmcDocUrl} onChange={e => setJmcDocUrl(e.target.value)} />
              </div>
              <div>
                <Input placeholder="Signed Bill Document URL" value={signedBillDocUrl} onChange={e => setSignedBillDocUrl(e.target.value)} />
              </div>
           </div>
        </div>

        {/* Final Table */}
        {lineItems.length > 0 && (
          <div className="mt-8 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Aggregated Master Items</h3>
              <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                {lineItems.length} Items
              </span>
            </div>
            
            {Object.entries(groupedItems).map(([cId, items]) => {
              const cName = availableContractors.find(c => c._id === cId)?.name || 'Unknown Contractor';
              return (
                <div key={cId} className="mb-4">
                  <div className="bg-indigo-50/50 px-4 py-2 border-y border-indigo-100 font-bold text-indigo-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    {cName}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 bg-white uppercase border-b">
                        <tr>
                          <th className="px-4 py-3">Activity</th>
                          <th className="px-4 py-3">Description</th>
                          <th className="px-4 py-3 text-right">JMC Qty</th>
                          <th className="px-4 py-3 text-right">Master Rate</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="bg-white border-b hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-600">{item.activity}</td>
                            <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate" title={item.description}>{item.description}</td>
                            <td className="px-4 py-3 text-right font-medium">{item.jmcDoneQty}</td>
                            <td className="px-4 py-3 text-right text-slate-600">₹{item.rate}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">₹{(item.jmcDoneQty * item.rate).toLocaleString()}</td>
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
