"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Search, FileText, CheckCircle, Clock, XCircle, FileClock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getClientBills } from '@/features/billing/api/client-billing.api';

export default function ClientBillingPage() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
      toast.error('Failed to fetch client bills');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'Pending PM Approval':
      case 'Pending PD Approval':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3.5 h-3.5" /> {status}</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"><FileClock className="w-3.5 h-3.5" /> {status}</span>;
    }
  };

  const filteredBills = bills.filter(b => 
    b.raBillNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.billType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Client Billing (RA Bills)</h1>
          <p className="text-slate-500 mt-1">Manage Supply and Erection Running Account Bills.</p>
        </div>
        <Link href="/billing/client-billing/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Create RA Bill
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search RA Bills..." 
              className="pl-9 bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">RA Bill No</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Stage</th>
                <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                      Loading RA Bills...
                    </div>
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 text-slate-200 mb-3" />
                      <p className="text-base font-medium text-slate-600">No RA Bills Found</p>
                      <p className="text-sm mt-1">Try creating a new RA Bill to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const totalBase = bill.items?.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0) || 0;
                  const totalGst = bill.items?.reduce((sum: number, item: any) => sum + (item.gstAmount || 0), 0) || 0;
                  const total = totalBase + totalGst;
                  return (
                    <tr key={bill._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900">{bill.raBillNo}</td>
                      <td className="px-6 py-4">{new Date(bill.raBillDate).toLocaleDateString('en-GB')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${bill.billType === 'Supply' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                          {bill.billType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium">{bill.stage}</td>
                      <td className="px-6 py-4 text-right font-semibold">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(bill.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/billing/client-billing/${bill._id}/edit`}>
                          <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                            View
                          </Button>
                        </Link>
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
