"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getClientBills, updateClientBillStatus } from '@/features/billing/api/client-billing.api';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function ApprovalsDashboardPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await getClientBills();
      if (res.success && res.data) {
        setBills(res.data);
      }
    } catch (error) {
      toast.error('Failed to fetch approvals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'ApprovePM' | 'ApprovePD' | 'Reject') => {
    const statusMap = {
      'ApprovePM': 'Pending PD Approval',
      'ApprovePD': 'Approved',
      'Reject': 'Rejected'
    };
    const newStatus = statusMap[action];
    
    if (action === 'Reject' && !remarks[id]) {
      return toast.error('Please provide rejection remarks');
    }

    try {
      const res = await updateClientBillStatus(id, { 
        status: newStatus,
        rejectionRemarks: action === 'Reject' ? remarks[id] : undefined
      });
      if (res.success) {
        toast.success(`Bill updated to ${newStatus}`);
        fetchBills();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const pendingBills = bills.filter(b => ['Pending PM Approval', 'Pending PD Approval'].includes(b.status));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Billing Approvals</h1>
        <p className="text-slate-500 mt-1">Review and approve Client Bills submitted by Site Engineers.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-800">Pending Actions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">RA Bill No</th>
                <th className="px-6 py-4 font-semibold">Type & Stage</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : pendingBills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No bills pending approval.</td>
                </tr>
              ) : (
                pendingBills.map((bill) => {
                  const totalBaseAmount = bill.items?.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0) || 0;
                  const total = totalBaseAmount * 1.18;
                  
                  return (
                    <tr key={bill._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{bill.raBillNo}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold">{bill.billType}</span> ({bill.stage})
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5" /> {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 w-72">
                        <div className="flex flex-col gap-2 items-center">
                          <div className="flex gap-2 w-full">
                            <Link href={`/billing/client-billing/${bill._id}`} className="w-full">
                              <Button size="sm" variant="outline" className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                View Bill
                              </Button>
                            </Link>
                          </div>
                          {bill.status === 'Pending PM Approval' && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full" onClick={() => handleAction(bill._id, 'ApprovePM')}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve (PM)
                            </Button>
                          )}
                          {bill.status === 'Pending PD Approval' && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full" onClick={() => handleAction(bill._id, 'ApprovePD')}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve (PD)
                            </Button>
                          )}
                          <div className="flex gap-2 w-full mt-2">
                            <Input 
                              placeholder="Rejection remarks..." 
                              className="h-8 text-xs" 
                              value={remarks[bill._id] || ''} 
                              onChange={(e) => setRemarks({...remarks, [bill._id]: e.target.value})}
                            />
                            <Button size="sm" variant="destructive" className="h-8" onClick={() => handleAction(bill._id, 'Reject')}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
