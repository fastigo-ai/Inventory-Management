"use client";

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  ArrowLeft, 
  Download, 
  Search, 
  RefreshCw, 
  MapPin, 
  Package, 
  TrendingDown,
  RotateCcw,
  Boxes,
  ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { getStoreContractorSummary } from '@/features/reports/api/reports.api';
import { useAuthStore } from '@/shared/store/auth.store';

export default function StoreContractorSummaryPage() {
  const { user } = useAuthStore();
  const isStoreManager = user?.role?.name === 'Store Manager';
  
  const [data, setData] = useState<any[]>([]);
  const [contractorsList, setContractorsList] = useState<string[]>([]);
  const [totals, setTotals] = useState<any>({
    totalIssuedQty: 0,
    totalReturnQty: 0,
    totalBalanceQty: 0
  });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [contractorName, setContractorName] = useState<string>('A K Contractor');
  const [circle, setCircle] = useState<string>(user?.assignedCircle || '');
  const [pkg, setPkg] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [hideZero, setHideZero] = useState<boolean>(true);

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getStoreContractorSummary({
        contractorName: contractorName || undefined,
        circle: circle || undefined,
        package: pkg || undefined,
        search: search || undefined,
        hideZero,
        page,
        limit
      });

      if (res.success && res.data) {
        setData(res.data.items || []);
        setTotals(res.data.totals || {});
        if (res.data.contractors && res.data.contractors.length > 0) {
          setContractorsList(res.data.contractors);
          if (!contractorName && res.data.contractors.length > 0) {
            setContractorName(res.data.contractors[0]);
          }
        }
        if (res.data.pagination) {
          setTotalItems(res.data.pagination.totalItems);
        }
      }
    } catch (err) {
      console.error('Failed to fetch store contractor summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [contractorName, circle, pkg, search, hideZero, limit]);

  useEffect(() => {
    fetchData();
  }, [contractorName, circle, pkg, search, hideZero, page, limit]);

  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      'Sr No', 'LOA Sr. No.', 'Temp Code', 'Item Name', 'Unit', 'Circle', 'Package',
      'Total Issued Qty', 'Total Return Qty', 'Total Balance Qty'
    ];

    const rows = data.map(r => [
      r.srNo, `"${r.loaSerialNo || ''}"`, `"${r.tempCode || ''}"`, `"${(r.itemName || '').replace(/"/g, '""')}"`,
      `"${r.unit || 'NOS'}"`, `"${r.circle || ''}"`, `"${r.package || ''}"`,
      r.totalIssuedQty || 0, r.totalReturnQty || 0, r.totalBalanceQty || 0
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Store_Contractor_Summary_${(contractorName || 'All').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const circles = ['Nahan', 'Solan', 'Rampur', 'Rohru'];
  const packages = ['Package 1(S/N)', 'Package 2(R/R)'];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/reports" 
              className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Reports
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleExportCSV}
                disabled={loading || data.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl shadow-xs">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold tracking-widest text-amber-800 bg-amber-100 px-2 py-0.5 rounded uppercase border border-amber-300">
                    FROM CIRCLE STORE
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">•</span>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                    Contractor Wise
                  </span>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  Store Contractor Summary
                </h1>
              </div>
            </div>

            {/* Quick Stat Pill Badges */}
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-right">
                <div className="text-[10px] uppercase font-bold text-amber-800">Total Issued</div>
                <div className="text-sm font-extrabold text-amber-950 font-mono">
                  {Number(totals.totalIssuedQty || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-right">
                <div className="text-[10px] uppercase font-bold text-blue-800">Total Returned</div>
                <div className="text-sm font-extrabold text-blue-950 font-mono">
                  {Number(totals.totalReturnQty || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-right shadow-xs">
                <div className="text-[10px] uppercase font-bold text-indigo-200">Balance in Custody</div>
                <div className="text-sm font-extrabold text-white font-mono">
                  {Number(totals.totalBalanceQty || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 flex flex-col gap-6">
        {/* Filter Controls Bar (Exact Match with Excel Header Controls) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Contractor Name Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                Contractor Name:
              </label>
              <select
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 bg-amber-50/60 border border-amber-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="all">All Contractors</option>
                {contractorsList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Circle Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Circle:
              </label>
              <select
                value={circle}
                onChange={(e) => setCircle(e.target.value)}
                disabled={isStoreManager && !!user?.assignedCircle}
                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              >
                <option value="">All Circles</option>
                {circles.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Package Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                Package:
              </label>
              <select
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">All Packages</option>
                {packages.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                Search Items:
              </label>
              <input
                type="text"
                placeholder="LOA Sr. No, Temp Code, Item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Row 2: Non-Zero Items Filter Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-semibold bg-amber-50/60 px-3 py-1 rounded-lg border border-amber-200/80 hover:bg-amber-100/80 transition-colors">
              <input
                type="checkbox"
                checked={hideZero}
                onChange={(e) => setHideZero(e.target.checked)}
                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
              />
              <span>Show Non-Zero Activity Items Only (Filter out zero-quantity rows)</span>
            </label>
            <span className="text-[11px] text-slate-400 italic">Showing {data.length} active items with non-zero stock/assignments</span>
          </div>
        </div>

        {/* Data Spreadsheet Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] divide-x divide-slate-200">
                  <th className="py-3 px-4 w-14 text-center bg-slate-200">Sr No</th>
                  <th className="py-3 px-4 w-28 text-center bg-blue-100/70 text-blue-950 font-extrabold">LOA Sr. No.</th>
                  <th className="py-3 px-4 w-24 text-center bg-slate-200">Temp Code</th>
                  <th className="py-3 px-5 min-w-[280px] bg-slate-200">Item Name</th>
                  <th className="py-3 px-4 w-20 text-center bg-slate-200">Unit</th>
                  <th className="py-3 px-4 text-right bg-amber-100 text-amber-950 font-extrabold">Total Issued Qty</th>
                  <th className="py-3 px-4 text-right bg-blue-100 text-blue-950 font-extrabold">Total Return Qty</th>
                  <th className="py-3 px-4 text-right bg-indigo-900 text-white font-extrabold tracking-wide">Total Balance Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                        <span className="text-xs font-semibold text-slate-600">Loading store contractor summary...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Boxes className="w-8 h-8 text-slate-300" />
                        <span className="text-sm font-semibold text-slate-600">No contractor item assignments found.</span>
                        <span className="text-xs text-slate-400">Try selecting a different contractor or clearing filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((r, i) => (
                    <tr key={r.loaSerialNo || r.tempCode || i} className="hover:bg-slate-100/80 transition-colors divide-x divide-slate-100">
                      <td className="py-2.5 px-4 text-center text-slate-500 font-sans">{r.srNo}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-blue-900 bg-blue-50/40">
                        {r.loaSerialNo && r.loaSerialNo !== '-' ? r.loaSerialNo : (r.sku || r.tempCode)}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-slate-700 bg-slate-50/50">
                        {r.tempCode && r.tempCode !== '0' ? r.tempCode : '-'}
                      </td>
                      <td className="py-2.5 px-5 font-sans font-medium text-slate-900 truncate max-w-[300px]" title={r.itemName}>
                        {r.itemName}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-600 font-sans">{r.unit || 'Nos'}</td>
                      
                      {/* Issued Qty */}
                      <td className="py-2.5 px-4 text-right font-bold text-amber-900 bg-amber-50/30">
                        {r.totalIssuedQty ? Number(r.totalIssuedQty).toLocaleString('en-IN') : '0'}
                      </td>

                      {/* Return Qty */}
                      <td className="py-2.5 px-4 text-right font-bold text-blue-900 bg-blue-50/30">
                        {r.totalReturnQty ? Number(r.totalReturnQty).toLocaleString('en-IN') : '0'}
                      </td>

                      {/* Balance Qty */}
                      <td className={`py-2.5 px-4 text-right font-extrabold ${
                        (r.totalBalanceQty || 0) > 0 ? 'text-indigo-900 bg-indigo-50/60' : 'text-slate-400 bg-slate-50/40'
                      }`}>
                        {r.totalBalanceQty ? Number(r.totalBalanceQty).toLocaleString('en-IN') : '0'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Grand Totals Footer */}
              {!loading && data.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold text-xs divide-x divide-slate-800">
                    <td colSpan={5} className="py-3 px-5 text-right font-sans tracking-wider uppercase">
                      Total ({totalItems.toLocaleString()} items):
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-300">
                      {Number(totals.totalIssuedQty || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-300">
                      {Number(totals.totalReturnQty || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-white bg-indigo-600 font-extrabold">
                      {Number(totals.totalBalanceQty || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{data.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(page * limit, totalItems)}</span> of{' '}
              <span className="font-bold text-slate-900">{totalItems}</span> items
            </div>

            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-700"
              >
                <option value={25}>25 items per page</option>
                <option value={50}>50 items per page</option>
                <option value={100}>100 items per page</option>
              </select>

              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 font-semibold"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-slate-800">Page {page} of {Math.ceil(totalItems / limit) || 1}</span>
              <button
                disabled={page * limit >= totalItems || loading}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
