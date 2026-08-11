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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    
    // Strict Validation
    const newErrors: Record<string, string> = {};
    if (!contractorId) newErrors.contractorId = 'Contractor is required';
    if (!workOrderId) newErrors.workOrderId = 'Work Order is required';
    if (!date) newErrors.date = 'Date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the highlighted errors');
      return;
    }

    setErrors({});
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
    <div className="p-6 max-w-4xl mx-auto space-y-6 pb-28">
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
                  <option key={c._id} value={c._id}>{c.name}</option>
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
                  <option key={wo._id} value={wo._id}>{wo.workOrderNumber}</option>
                ))}
              </select>
              {errors.workOrderId && <p className="text-xs text-red-500">{errors.workOrderId}</p>}
            </div>

            <div className="space-y-2">
              <Label className={errors.date ? "text-red-500" : ""}>Handover Date <span className="text-red-500">*</span></Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date) setErrors({ ...errors, date: '' });
                }} 
                className={errors.date ? 'border-red-500 bg-red-50' : ''}
              />
              {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
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

        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t p-4 z-50 flex justify-end gap-3 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading} className="min-w-[120px] bg-green-600 hover:bg-green-700 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Issue Certificate</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
