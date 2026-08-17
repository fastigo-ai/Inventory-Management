'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSiteContractorSummary } from '@/features/site-portal/api/siteReports.api';
import { getContractors } from '@/features/contractors/api/contractors.api';
import { 
  Users, 
  ArrowLeft, 
  Download, 
  Loader2, 
  Search, 
  RefreshCw, 
  MapPin, 
  Package as PackageIcon, 
  CheckCircle2, 
  RotateCcw, 
  Boxes, 
  Filter, 
  X, 
  Building2, 
  TrendingUp, 
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/shared/store/auth.store';

export default function SiteContractorSummaryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [contractors, setContractors] = useState<any[]>([]);
  const [filters, setFilters] = useState({ 
    contractorId: '', 
    package: user?.assignedPackage || '', 
    circle: user?.assignedCircle || '' 
  });
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contractorName, setContractorName] = useState('');

  // Table & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [hideZero, setHideZero] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const cRes = await getContractors(undefined, undefined, 1, 1000);
        const list = cRes?.data?.contractors || cRes?.contractors || [];
        setContractors(list);
        if (list.length > 0 && !filters.contractorId) {
          setFilters(f => ({ ...f, contractorId: list[0]._id }));
        }
      } catch (err) {
        console.error('Error fetching contractors', err);
      }
    };
    fetchInitial();
  }, []);

  const fetchReport = async () => {
    if (!filters.contractorId) {
      toast.error('Please select a contractor');
      return;
    }
    try {
      setIsLoading(true);
      const res = await getSiteContractorSummary(filters);
      setRawItems(res.data || []);
      const c = contractors.find(c => c._id === filters.contractorId);
      if (c) {
        setContractorName(c.dynamicData?.companyName || c.dynamicData?.displayName || c.name || '');
      }
    } catch (err) {
      toast.error('Failed to fetch summary report');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter items based on live search and hideZero flag
  const filteredData = useMemo(() => {
    return rawItems.filter(row => {
      // Live search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTemp = (row.tempCode || '').toLowerCase().includes(q);
        const matchesName = (row.itemName || '').toLowerCase().includes(q);
        const matchesActivity = (row.activity || '').toLowerCase().includes(q);
        if (!matchesTemp && !matchesName && !matchesActivity) return false;
      }
      // Hide zero balance filter
      if (hideZero) {
        const totalActivity = (row.jmcDone || 0) + (row.wipConsumed || 0) + (row.wipRequired || 0) + (row.totalIssued || 0) + (row.totalReturned || 0) + (row.todayTotalBalance || 0);
        if (totalActivity === 0) return false;
      }
      return true;
    });
  }, [rawItems, searchQuery, hideZero]);

  // Calculate totals for KPI cards
  const totals = useMemo(() => {
    return rawItems.reduce((acc, r) => {
      acc.jmcDone += r.jmcDone || 0;
      acc.wipConsumed += r.wipConsumed || 0;
      acc.wipRequired += r.wipRequired || 0;
      acc.totalWip += r.totalWip || 0;
      acc.totalIwipJmc += r.totalIwipJmc || 0;
      acc.totalIssued += r.totalIssued || 0;
      acc.totalReturned += r.totalReturned || 0;
      acc.todayTotalBalance += r.todayTotalBalance || 0;
      acc.finalBalQty += r.finalBalQty || 0;
      return acc;
    }, {
      jmcDone: 0,
      wipConsumed: 0,
      wipRequired: 0,
      totalWip: 0,
      totalIwipJmc: 0,
      totalIssued: 0,
      totalReturned: 0,
      todayTotalBalance: 0,
      finalBalQty: 0
    });
  }, [rawItems]);

  const handleActionChange = (action: string, row: any) => {
    if (action === 'demand-issue') {
      router.push(`/site-portal/demand-notes/new?tempCode=${row.tempCode}`);
    } else if (action === 'demand-return') {
      router.push(`/store/contractor-return/new?tempCode=${row.tempCode}`);
    }
  };

  const exportCsv = () => {
    if (!filteredData.length) return;
    const headers = [
      'Temp Code', 'Item Name', 'JMC Done', 'WIP Consumed', 'WIP To Be Required',
      'Total WIP', 'Total IWIP+JMC Qty', 'Total Issued from Store', 'Return',
      'Today Total Balance', 'Final Bal Qty as per BOM'
    ];
    const rows = filteredData.map(r => [
      `"${r.tempCode || ''}"`, `"${(r.itemName || '').replace(/"/g, '""')}"`, r.jmcDone || 0, r.wipConsumed || 0, r.wipRequired || 0,
      r.totalWip || 0, r.totalIwipJmc || 0, r.totalIssued || 0, r.totalReturned || 0,
      r.todayTotalBalance || 0, r.finalBalQty || 0
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Site_Contractor_Summary_${(contractorName || 'All').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Sticky Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/site-portal" 
              className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Site Portal
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchReport}
                disabled={isLoading || !filters.contractorId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={exportCsv}
                disabled={isLoading || !filteredData.length}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl shadow-2xs">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Site Contractor Summary</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track site progress, store issues, returns, WIP & JMC reconciliation for site contractors
                </p>
              </div>
            </div>

            {contractorName && (
              <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-100 px-3.5 py-2 rounded-lg text-xs font-medium text-indigo-900">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Selected: <strong className="font-semibold text-indigo-950">{contractorName}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
        
        {/* Filters Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Select Contractor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select 
                  value={filters.contractorId} 
                  onChange={(e) => setFilters(f => ({ ...f, contractorId: e.target.value }))}
                  className="w-full h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                >
                  <option value="">-- Choose Contractor --</option>
                  {contractors.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.dynamicData?.companyName || c.dynamicData?.displayName || c.name || c._id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Package
              </label>
              <div className="relative">
                <PackageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input 
                  value={filters.package || 'All Packages'} 
                  readOnly
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 font-medium cursor-not-allowed shadow-2xs"
                  placeholder="No package assigned"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Circle
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input 
                  value={filters.circle || 'All Circles'} 
                  readOnly
                  className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 font-medium cursor-not-allowed shadow-2xs"
                  placeholder="No circle assigned"
                />
              </div>
            </div>

            <button
              onClick={fetchReport}
              disabled={isLoading || !filters.contractorId}
              className="h-10 px-6 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:from-indigo-800 active:to-violet-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Generate Summary
                </>
              )}
            </button>
          </div>
        </div>

        {/* KPI Stat Cards (Only display when data exists) */}
        {rawItems.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider">JMC Done</span>
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">{totals.jmcDone.toLocaleString()}</div>
                <p className="text-[11px] text-slate-400 mt-1">Verified work completed</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider">Total WIP</span>
                  <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold text-purple-900 font-mono">{totals.totalWip.toLocaleString()}</div>
                <p className="text-[11px] text-purple-600/70 mt-1">Consumed + Required</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider">Issued from Store</span>
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">{totals.totalIssued.toLocaleString()}</div>
                <p className="text-[11px] text-slate-400 mt-1">Total material issued</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider">Returned</span>
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 font-mono">{totals.totalReturned.toLocaleString()}</div>
                <p className="text-[11px] text-slate-400 mt-1">Returned to store</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white shadow-2xs col-span-2 md:col-span-1">
                <div className="flex items-center justify-between text-slate-500 mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-indigo-800">Store Balance</span>
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold text-indigo-950 font-mono">{totals.todayTotalBalance.toLocaleString()}</div>
                <p className="text-[11px] text-indigo-600 mt-1">Net store balance</p>
              </div>
            </div>

            {/* Table Search & Live Filters Bar */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by Temp Code or Item Name..."
                  className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  <input 
                    type="checkbox"
                    checked={hideZero}
                    onChange={(e) => setHideZero(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  Hide zero balance items
                </label>

                <div className="text-xs text-slate-500 border-l border-slate-200 pl-4 font-medium">
                  Showing <span className="font-semibold text-slate-800">{filteredData.length}</span> of <span className="font-semibold text-slate-800">{rawItems.length}</span> items
                </div>
              </div>
            </div>
          </>
        )}

        {/* Data Table */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Fetching Site Contractor Summary...</p>
            <p className="text-xs text-slate-400 mt-1">Aggregating store issues, returns, JMC and WIP entries</p>
          </div>
        ) : filteredData.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            
            {/* Context Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-slate-200">Contractor: <strong className="text-white font-bold">{contractorName}</strong></span>
                <span className="text-slate-400">|</span>
                <span>Package: <strong className="text-amber-300">{filters.package || 'All'}</strong></span>
                <span className="text-slate-400">|</span>
                <span>Circle: <strong className="text-amber-300">{filters.circle || 'All'}</strong></span>
              </div>
              <div className="text-slate-400 text-[11px]">
                Sub Div: - | Feeder: -
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[1280px]">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
                    <th className="p-3 border-r border-slate-200/60 w-24">Temp Code</th>
                    <th className="p-3 border-r border-slate-200/60 min-w-[220px]">Item Description</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-24 bg-emerald-50/50 text-emerald-900">JMC Done</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-28 bg-purple-50/40 text-purple-900">WIP Consumed</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-28 bg-purple-50/40 text-purple-900">WIP Required</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-24 bg-purple-100/60 text-purple-950 font-bold">Total WIP</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-32 bg-indigo-50/60 text-indigo-950 font-bold">IWIP + JMC</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-28 bg-blue-50/50 text-blue-900">Store Issued</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-24 bg-amber-50/50 text-amber-900">Returned</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-32 bg-indigo-100/70 text-indigo-950 font-bold">Store Balance</th>
                    <th className="p-3 border-r border-slate-200/60 text-right w-28 font-bold">Final Bal (BOM)</th>
                    <th className="p-3 text-center min-w-[160px]">Action Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 text-slate-700">
                  {filteredData.map((row, i) => {
                    const isNeg = (row.finalBalQty || 0) < 0;
                    return (
                      <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="p-3 font-mono font-semibold text-slate-900 border-r border-slate-200/50">
                          {row.tempCode || '-'}
                        </td>
                        <td className="p-3 border-r border-slate-200/50 font-medium text-slate-800">
                          {row.itemName}
                        </td>
                        <td className="p-3 text-right font-mono border-r border-slate-200/50 bg-emerald-50/20 text-emerald-900">
                          {(row.jmcDone || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono border-r border-slate-200/50 bg-purple-50/10">
                          {(row.wipConsumed || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono border-r border-slate-200/50 bg-purple-50/10">
                          {(row.wipRequired || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold border-r border-slate-200/50 bg-purple-50/30 text-purple-900">
                          {(row.totalWip || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold border-r border-slate-200/50 bg-indigo-50/30 text-indigo-950">
                          {(row.totalIwipJmc || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono border-r border-slate-200/50 bg-blue-50/20 text-blue-900">
                          {(row.totalIssued || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono border-r border-slate-200/50 bg-amber-50/20 text-amber-900">
                          {(row.totalReturned || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold border-r border-slate-200/50 bg-indigo-50/50 text-indigo-950">
                          {(row.todayTotalBalance || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-mono font-bold border-r border-slate-200/50">
                          <span className={`inline-block px-2 py-0.5 rounded-md ${isNeg ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-800'}`}>
                            {(row.finalBalQty || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <select
                            className="w-full text-xs py-1 px-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs cursor-pointer"
                            onChange={(e) => handleActionChange(e.target.value, row)}
                            defaultValue=""
                          >
                            <option value="" disabled>Select Action</option>
                            <option value="demand-issue">1. Demand for Issue Qty</option>
                            <option value="demand-return">2. Demand to Return Qty</option>
                            <option value="nil">3. NO Balance - NIL</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
                    <td colSpan={2} className="p-3.5 uppercase tracking-wider text-slate-200">
                      Total Summary
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-300">
                      {totals.jmcDone.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-purple-300">
                      {totals.wipConsumed.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-purple-300">
                      {totals.wipRequired.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-purple-200">
                      {totals.totalWip.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-indigo-300">
                      {totals.totalIwipJmc.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-blue-300">
                      {totals.totalIssued.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-amber-300">
                      {totals.totalReturned.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-indigo-200">
                      {totals.todayTotalBalance.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-amber-200">
                      {totals.finalBalQty.toLocaleString()}
                    </td>
                    <td className="p-3.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : rawItems.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No items match filter</h3>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search query or unchecking "Hide zero balance items"</p>
            <button
              onClick={() => { setSearchQuery(''); setHideZero(false); }}
              className="mt-4 px-4 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Select Contractor to Generate Report</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
              Choose a contractor from the dropdown above and click <strong className="text-indigo-600 font-semibold">"Generate Summary"</strong> to load their site reconciliation, store issue, and return details.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

