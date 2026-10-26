"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Search, FileText, CheckCircle, Clock, XCircle, FileClock, Layers, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getClientBills, getClientBillingAnalytics } from '@/features/billing/api/client-billing.api';
import { ClientBillBulkUploadModal } from '@/features/billing/components/ClientBillBulkUploadModal';

export default function ClientBillingPage() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);

  // Tab Filtering State
  const [primaryTab, setPrimaryTab] = useState<'All' | 'Supply' | 'Erection'>('Supply');
  const [supplyStageTab, setSupplyStageTab] = useState<'All' | '60%' | '30%' | '10%'>('All');
  const [erectionStageTab, setErectionStageTab] = useState<'All' | '90%' | '10%'>('All');

  useEffect(() => {
    fetchBills();
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await getClientBillingAnalytics();
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch client billing analytics', error);
    }
  };

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

  // Filter bills by Search + Primary Tab (Supply vs Erection) + Sub Stage Tab
  const filteredBills = bills.filter(b => {
    // 1. Text Search
    const matchesSearch = 
      b.raBillNo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.billType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.stage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.circle?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Primary Tab
    if (primaryTab !== 'All' && b.billType !== primaryTab) {
      return false;
    }

    // 3. Sub-Stage Tab
    if (primaryTab === 'Supply') {
      if (supplyStageTab !== 'All' && b.stage !== supplyStageTab) return false;
    } else if (primaryTab === 'Erection') {
      if (erectionStageTab !== 'All' && b.stage !== erectionStageTab) return false;
    }

    return true;
  });

  // Calculate live counts for tabs
  const supplyCount = bills.filter(b => b.billType === 'Supply').length;
  const erectionCount = bills.filter(b => b.billType === 'Erection').length;

  const countSupply60 = bills.filter(b => b.billType === 'Supply' && b.stage === '60%').length;
  const countSupply30 = bills.filter(b => b.billType === 'Supply' && b.stage === '30%').length;
  const countSupply10 = bills.filter(b => b.billType === 'Supply' && b.stage === '10%').length;

  const countErection90 = bills.filter(b => b.billType === 'Erection' && b.stage === '90%').length;
  const countErection10 = bills.filter(b => b.billType === 'Erection' && b.stage === '10%').length;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Client Billing (RA Bills)</h1>
          <p className="text-slate-500 mt-1">Manage Supply (60%, 30%, 10%) and Erection (90%, 10%) Running Account Bills.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => setIsUploadModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Bulk Import
          </Button>
          <Link href="/billing/client-billing/new">
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4" />
              Create RA Bill
            </Button>
          </Link>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Supply Billed (60%, 30%, 10%)</h3>
            <p className="text-2xl font-extrabold text-blue-900 mt-1">
              ₹ {analytics.supplyTotal?.toLocaleString('en-IN') || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {analytics.supplyCount || 0} Invoices Cleared
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Erection Billed (90%, 10%)</h3>
            <p className="text-2xl font-extrabold text-indigo-900 mt-1">
              ₹ {analytics.erectionTotal?.toLocaleString('en-IN') || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {analytics.erectionCount || 0} Invoices Cleared
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Unpaid Pipeline</h3>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">
              ₹ {analytics.unpaidTotal?.toLocaleString('en-IN') || 0}
            </p>
            <p className="text-xs text-rose-500 mt-1 font-medium">
              {analytics.unpaidCount || 0} invoices pending certification
            </p>
          </div>
        </div>
      )}

      {/* Main Billing Table with Structured 2-Tier Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Tier 1 Primary Tabs: Supply vs Erection */}
        <div className="border-b border-slate-200 px-6 pt-3 bg-slate-50/70 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setPrimaryTab('Supply')}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                primaryTab === 'Supply'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Supply Bills</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                primaryTab === 'Supply' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {supplyCount}
              </span>
            </button>

            <button
              onClick={() => setPrimaryTab('Erection')}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                primaryTab === 'Erection'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Erection Bills</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                primaryTab === 'Erection' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {erectionCount}
              </span>
            </button>

            <button
              onClick={() => setPrimaryTab('All')}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                primaryTab === 'All'
                  ? 'border-slate-800 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>All Bills</span>
              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                primaryTab === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {bills.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            {filteredBills.length} records shown
          </div>
        </div>

        {/* Tier 2 Sub-Tabs: Specific Stages */}
        <div className="p-3 px-6 bg-slate-50/40 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Sub Stage Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Stage:
            </span>

            {primaryTab === 'Supply' && (
              <>
                {[
                  { id: 'All', label: 'All Supply Stages', count: supplyCount },
                  { id: '60%', label: '60% (Inward/MHROV)', count: countSupply60 },
                  { id: '30%', label: '30% (Erection Release)', count: countSupply30 },
                  { id: '10%', label: '10% (Handover)', count: countSupply10 },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSupplyStageTab(tab.id as any)}
                    className={`text-xs px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      supplyStageTab === tab.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1 rounded ${
                      supplyStageTab === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </>
            )}

            {primaryTab === 'Erection' && (
              <>
                {[
                  { id: 'All', label: 'All Erection Stages', count: erectionCount },
                  { id: '90%', label: '90% Interim', count: countErection90 },
                  { id: '10%', label: '10% Handover', count: countErection10 },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setErectionStageTab(tab.id as any)}
                    className={`text-xs px-3 py-1 rounded-lg font-bold border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      erectionStageTab === tab.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1 rounded ${
                      erectionStageTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </>
            )}

            {primaryTab === 'All' && (
              <span className="text-xs text-slate-500 font-medium">
                Viewing all stages across Supply & Erection
              </span>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input 
              placeholder="Search RA bill, stage, circle..." 
              className="pl-8 h-8 text-xs bg-white border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Bills Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-[11px] font-bold uppercase tracking-wider bg-slate-50/80 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-bold">RA Bill No</th>
                <th className="px-6 py-3.5 font-bold">Date</th>
                <th className="px-6 py-3.5 font-bold">Type</th>
                <th className="px-6 py-3.5 font-bold">Stage</th>
                <th className="px-6 py-3.5 font-bold">Circle</th>
                <th className="px-6 py-3.5 font-bold text-right">Total Amount</th>
                <th className="px-6 py-3.5 font-bold text-center">Status</th>
                <th className="px-6 py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
                      Loading RA Bills...
                    </div>
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-700">No RA Bills Found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        No bills match the selected tab ({primaryTab} {primaryTab === 'Supply' ? supplyStageTab : primaryTab === 'Erection' ? erectionStageTab : ''}).
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const totalBase = bill.items?.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0) || 0;
                  const totalGst = bill.items?.reduce((sum: number, item: any) => sum + (item.gstAmount || 0), 0) || 0;
                  const total = totalBase + totalGst;

                  return (
                    <tr key={bill._id} className="hover:bg-slate-50/80 transition-colors group text-xs">
                      <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <span>{bill.raBillNo}</span>
                        {bill.autoCreated && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold border border-purple-200">
                            Auto 30%
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {bill.raBillDate ? new Date(bill.raBillDate).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          bill.billType === 'Supply' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {bill.billType}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {bill.stage}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-700 font-medium">
                        {bill.circle || '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-extrabold text-slate-900">
                        ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {getStatusBadge(bill.status)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link href={`/billing/client-billing/${bill._id}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <ClientBillBulkUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchBills();
          fetchAnalytics();
        }}
      />
    </div>
  );
}
