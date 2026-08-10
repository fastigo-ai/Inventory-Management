'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/shared/api/axios';
import { createHandoverCertificate } from '@/features/contractor-billing/api/contractor-billing.api';

export default function NewHandoverCertificate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State
  const [contractorId, setContractorId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [locationDetails, setLocationDetails] = useState({
    package: '',
    circle: '',
    division: '',
    subDivision: ''
  });
  const [remarks, setRemarks] = useState('');

  // Metadata Options
  const [contractors, setContractors] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorId || !workOrderId) {
      toast.error('Please select both Contractor and Work Order');
      return;
    }

    setLoading(true);
    try {
      await createHandoverCertificate({
        contractorId,
        workOrderId,
        date,
        locationDetails,
        remarks,
        status: 'Issued'
      });
      toast.success('Handover Certificate issued successfully!');
      router.push('/site-portal/contractor-billing');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to issue handover certificate');
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Issue Handover Certificate</h1>
          <p className="text-gray-500">Formally handover a work order to trigger Stage 3 Final Retention Billing.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg">Project Details</CardTitle>
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

            <div className="space-y-2">
              <Label>Handover Date</Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg">Location Details</CardTitle>
            <CardDescription>Specify the exact location mapping for this handover.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Package</Label>
              <Input 
                placeholder="e.g. PKG-01" 
                value={locationDetails.package} 
                onChange={(e) => setLocationDetails({...locationDetails, package: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Circle</Label>
              <Input 
                placeholder="e.g. North Circle" 
                value={locationDetails.circle} 
                onChange={(e) => setLocationDetails({...locationDetails, circle: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <Input 
                placeholder="e.g. City Division" 
                value={locationDetails.division} 
                onChange={(e) => setLocationDetails({...locationDetails, division: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Sub Division</Label>
              <Input 
                placeholder="e.g. Sub-01" 
                value={locationDetails.subDivision} 
                onChange={(e) => setLocationDetails({...locationDetails, subDivision: e.target.value})} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Remarks / Conditions</Label>
              <Textarea 
                placeholder="Any special conditions for this handover..." 
                className="min-h-[100px]"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading} className="min-w-[120px] bg-green-600 hover:bg-green-700 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Issue Certificate</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
