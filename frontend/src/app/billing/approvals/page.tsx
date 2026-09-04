"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getClientBills, updateClientBillStatus } from '@/features/billing/api/client-billing.api';
import { getContractorInvoices, updateInvoiceStatus as updateContractorBillStatus } from '@/features/contractor-billing/api/contractor-billing.api';
import { Clock, CheckCircle, XCircle, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useAuthStore } from '@/shared/store/auth.store';

export default function ApprovalsDashboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'client' | 'contractor'>('client');
  
  const [clientBills, setClientBills] = useState<any[]>([]);
  const [contractorBills, setContractorBills] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [remarks, setRemarks] = useState<{ [key: string]: string }>({});

  const pendingClientBills = clientBills.filter(b => ['Pending PM Approval', 'Pending PD Approval'].includes(b.status));
  const pendingContractorBills = contractorBills.filter(b => ['Pending PM Approval', 'Pending PD Approval'].includes(b.status));

  // Fetch both bills
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cRes, contRes] = await Promise.all([
        getClientBills(), // Backend will auto-filter based on PM/PD assigned circle/package
        getContractorInvoices() // Backend now auto-filters Contractor Bills based on user assigned circle/package
      ]);
      if (cRes.success && cRes.data) {
        setClientBills(cRes.data);
      }
      if (contRes.success && contRes.data) {
        setContractorBills(contRes.data);
      }
    } catch (error) {
      toast.error('Failed to fetch approvals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClientAction = async (id: string, action: 'ApprovePM' | 'ApprovePD' | 'Reject') => {
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
        toast.success(`Client Bill updated to ${newStatus}`);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleContractorAction = async (id: string, action: 'ApprovePM' | 'ApprovePD' | 'Reject') => {
    const statusMap = {
      'ApprovePM': 'Pending PD Approval',
      'ApprovePD': 'Payment Processed', // Skips HO approval
      'Reject': 'Rejected'
    };
    const newStatus = statusMap[action];
    
    if (action === 'Reject' && !remarks[id]) {
      return toast.error('Please provide rejection remarks');
    }

    try {
      const res = await updateContractorBillStatus(id, { 
        status: newStatus,
        remarks: action === 'Reject' ? remarks[id] : undefined
      });
      if (res.success) {
        toast.success(`Contractor Bill updated to ${newStatus}`);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  // Determine what role the user is to show appropriate buttons
  const roleName = user?.role?.name || '';
  const isPM = roleName === 'Project Manager';
  const isPD = roleName === 'Project Director';
  const isHO = roleName === 'System Admin' || roleName === 'Super Admin' || roleName === 'Billing Engineer' || roleName === 'Quantity Surveyor'; // Adapt as needed for HO

  return (
    <div className="p-6 md:p-8 max-w-[95%] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Billing Approvals</h1>
        <p className="text-slate-500 mt-1">Review and approve Bills submitted by Site Engineers.</p>
      </div>

      {/* Custom Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('client')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'client' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
          }`}
        >
          Client Bills ({clientBills.length})
        </button>
        <button
          onClick={() => setActiveTab('contractor')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'contractor' 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
          }`}
        >
          Contractor Bills ({contractorBills.length})
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">
            {activeTab === 'client' ? 'Client Bills Overview' : 'Contractor Bills Overview'}
          </h2>
          <div className="text-sm text-slate-500 flex gap-4">
             {user?.assignedPackage && <span>Package: <strong className="text-slate-800">{user.assignedPackage}</strong></span>}
             {user?.assignedCircle && <span>Circle: <strong className="text-slate-800">{user.assignedCircle}</strong></span>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 font-semibold">Bill No</th>
                {activeTab === 'client' ? (
                  <th className="px-4 py-4 font-semibold">Type & Stage</th>
                ) : (
                  <th className="px-4 py-4 font-semibold">Contractor & Stage</th>
                )}
                <th className="px-4 py-4 font-semibold">Location</th>
                <th className="px-4 py-4 font-semibold">Created By</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold text-right">Amount</th>
                <th className="px-4 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                </tr>
              ) : (activeTab === 'client' ? clientBills : contractorBills).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No {activeTab} bills found.</td>
                </tr>
              ) : (activeTab === 'client' ? clientBills : contractorBills).map((bill) => {
                
                // Common calculations/extraction
                const isClient = activeTab === 'client';
                const billNo = isClient ? bill.raBillNo : bill.invoiceNumber;
                
                // Amount calculation varies
                let totalAmount = 0;
                if (isClient) {
                  const totalBaseAmount = bill.items?.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0) || 0;
                  totalAmount = totalBaseAmount * 1.18; // Includes 18% GST typical for Client Bills
                } else {
                  totalAmount = bill.grandTotal || bill.totalAmount || 0;
                }

                // Location Extraction
                const packageStr = isClient ? bill.package : bill.workOrderId?.package;
                const circleStr = isClient ? bill.circle : bill.workOrderId?.circle;

                return (
                  <tr key={bill._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {billNo || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {isClient ? (
                        <>
                          <span className="font-semibold">{bill.billType}</span>
                          <div className="text-xs text-slate-500">{bill.stage}</div>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{bill.contractorId?.name || 'Unknown'}</span>
                          <div className="text-xs text-slate-500">{bill.stage}</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <div className="text-slate-700">Pkg: {packageStr || 'N/A'}</div>
                      <div className="text-slate-500">Cir: {circleStr || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4">
                       {bill.createdBy ? (
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                                <User className="w-3 h-3" />
                             </div>
                             <div>
                                <div className="font-medium text-slate-700">{bill.createdBy?.name || bill.createdBy?.firstName || 'Unknown'}</div>
                                <div className="text-[10px] text-slate-400">{bill.createdBy?.email}</div>
                             </div>
                          </div>
                       ) : <span className="text-slate-400 text-xs">N/A</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 whitespace-nowrap">
                        <Clock className="w-3 h-3" /> {bill.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold whitespace-nowrap">
                      ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 min-w-[200px]">
                      <div className="flex flex-col gap-2 items-center">
                        <div className="flex gap-2 w-full">
                          <Link href={isClient ? `/billing/client-billing/${bill._id}` : `/site-portal/contractor-billing/${bill._id}`} className="w-full">
                            <Button size="sm" variant="outline" className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-8">
                              View Bill
                            </Button>
                          </Link>
                        </div>
                        
                        {/* Status Action Buttons depending on Role and Bill Status */}
                        {bill.status === 'Pending PM Approval' && isPM && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full h-8" onClick={() => isClient ? handleClientAction(bill._id, 'ApprovePM') : handleContractorAction(bill._id, 'ApprovePM')}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve (PM)
                          </Button>
                        )}
                        {bill.status === 'Pending PD Approval' && isPD && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 w-full h-8" onClick={() => isClient ? handleClientAction(bill._id, 'ApprovePD') : handleContractorAction(bill._id, 'ApprovePD')}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve (PD)
                          </Button>
                        )}
                        
                        {/* Only show reject if they have permission to approve */}
                        {((bill.status === 'Pending PM Approval' && isPM) || 
                          (bill.status === 'Pending PD Approval' && isPD)) && (
                          <div className="flex gap-2 w-full mt-1">
                            <Input 
                              placeholder="Rejection remarks..." 
                              className="h-8 text-xs flex-1" 
                              value={remarks[bill._id] || ''} 
                              onChange={(e) => setRemarks({...remarks, [bill._id]: e.target.value})}
                            />
                            <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => isClient ? handleClientAction(bill._id, 'Reject') : handleContractorAction(bill._id, 'Reject')}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
