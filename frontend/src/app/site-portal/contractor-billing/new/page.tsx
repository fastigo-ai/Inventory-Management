'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/axios';
import { 
  createStage1Invoice,
  createStage2Invoice,
  createStage3Invoice
} from '@/features/contractor-billing/api/contractor-billing.api';

export default function NewContractorBill() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(false);

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

  useEffect(() => {
    // Fetch initial contractors
    api.get('/contractors').then(res => {
      setContractors(res.data?.data || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (contractorId) {
      api.get(`/ho-billing/contractor-work-orders?contractorId=${contractorId}`).then(res => {
        setWorkOrders(res.data?.data || []);
      }).catch(console.error);
    }
  }, [contractorId]);

  useEffect(() => {
    if (stage && workOrderId) {
      setFetchingDocs(true);
      if (stage === 'Stage 1 (Supply Initial)') {
        api.get('/store/mhrov').then(res => setMhrovs(res.data?.data || [])).finally(() => setFetchingDocs(false));
      } else if (stage === 'Stage 2 (Erection & Supply Balance)') {
        api.get('/jmc').then(res => setJmcs(res.data?.data || [])).finally(() => setFetchingDocs(false));
      } else if (stage === 'Stage 3 (Final/Retention)') {
        api.get('/contractor-billing/handover-certificates').then(res => setHandovers(res.data?.data || [])).finally(() => setFetchingDocs(false));
      }
    }
  }, [stage, workOrderId]);

  // Mocking the parse of document to LineItems for preview
  const handleDocumentSelect = (docId: string, docType: string) => {
    if (docType === 'mhrov') setMhrovId(docId);
    if (docType === 'jmc') setJmcId(docId);
    if (docType === 'handover') setHandoverId(docId);

    if (docId === "") {
        setLineItems([]);
        return;
    }

    // In a real flow, this would fetch the specific document's items
    // and map them into the lineItems array for preview
    setLineItems([
      {
        itemId: '64f1b2c3e4d5a6b7c8d9e0f1', // Mock ID
        activity: 'Installation',
        description: 'Mock Item from ' + docType,
        billingCategory: docType === 'mhrov' ? 'Supply' : 'Erection',
        quantity: 100,
        rate: 50,
        gstRate: 18
      }
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorId || !workOrderId || !stage || lineItems.length === 0) {
      toast.error('Please fill all required fields and select a source document');
      return;
    }

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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create Contractor Bill</h1>
          <p className="text-gray-500">Generate a staggered bill.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg">Billing Context</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Contractor</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                value={contractorId} 
                onChange={(e) => setContractorId(e.target.value)}
              >
                <option value="">Select Contractor</option>
                {contractors.map(c => (
                  <option key={c._id} value={c._id}>{c.dynamicData?.displayName || c.name || 'Unnamed Contractor'}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Work Order</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                value={workOrderId} 
                onChange={(e) => setWorkOrderId(e.target.value)} 
                disabled={!contractorId}
              >
                <option value="">Select Work Order</option>
                {workOrders.map(wo => (
                  <option key={wo._id} value={wo._id}>{wo.workOrderNumber}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Billing Stage</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                value={stage} 
                onChange={(e) => setStage(e.target.value)} 
                disabled={!workOrderId}
              >
                <option value="">Select Billing Stage</option>
                <option value="Stage 1 (Supply Initial)">Stage 1: Supply Initial (60%)</option>
                <option value="Stage 2 (Erection & Supply Balance)">Stage 2: Erection (90%) + Supply Balance (30%)</option>
                <option value="Stage 3 (Final/Retention)">Stage 3: Final / Retention (10%)</option>
              </select>
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
                  <Label>Select MHROV</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    value={mhrovId} 
                    onChange={(e) => handleDocumentSelect(e.target.value, 'mhrov')}
                  >
                    <option value="">{fetchingDocs ? "Loading..." : "Select MHROV"}</option>
                    {mhrovs.map(m => (
                      <option key={m._id} value={m._id}>{m.mhrovNumber}</option>
                    ))}
                  </select>
                </div>
              )}

              {stage === 'Stage 2 (Erection & Supply Balance)' && (
                <>
                  <div className="space-y-2">
                    <Label>Select JMC Register Entry</Label>
                    <select 
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                      value={jmcId} 
                      onChange={(e) => handleDocumentSelect(e.target.value, 'jmc')}
                    >
                      <option value="">{fetchingDocs ? "Loading..." : "Select JMC"}</option>
                      {jmcs.map(j => (
                        <option key={j._id} value={j._id}>{j.jmcNumber}</option>
                      ))}
                    </select>
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
                  <Label>Select Handover Certificate</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    value={handoverId} 
                    onChange={(e) => handleDocumentSelect(e.target.value, 'handover')}
                  >
                    <option value="">{fetchingDocs ? "Loading..." : "Select Handover Certificate"}</option>
                    {handovers.map(h => (
                      <option key={h._id} value={h._id}>{h.certificateNumber}</option>
                    ))}
                  </select>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {lineItems.length > 0 && (
          <Card className="border-green-100 shadow-sm bg-green-50/10">
            <CardHeader className="border-b border-green-50">
              <CardTitle className="text-lg text-green-900">Line Items Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="rounded-md border bg-white">
                 <div className="p-4 flex items-center justify-between bg-gray-50 border-b">
                   <span className="font-semibold text-sm">Base Items found in document: {lineItems.length}</span>
                 </div>
                 <div className="p-4 text-sm text-gray-600">
                   (The backend will automatically apply the {stage.includes('Stage 1') ? '60%' : stage.includes('Stage 2') ? '90%/30%' : '10%'} staggered percentages and GST logic upon submission)
                 </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading || lineItems.length === 0} className="min-w-[120px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Generate Bill</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
