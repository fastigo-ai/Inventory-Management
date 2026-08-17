"use client";

import React, { useEffect, useState } from 'react';
import { 
  Store, 
  ArrowLeft, 
  Download, 
  Search, 
  RefreshCw, 
  MapPin, 
  Package, 
  TrendingDown,
  TrendingUp,
  RotateCcw,
  ArrowRightLeft,
  Boxes,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { getStoreItemisedSummary, exportStoreItemisedSummary } from '@/features/reports/api/reports.api';
import { useAuthStore } from '@/shared/store/auth.store';

export default function StoreSummaryPage() {
  const { user } = useAuthStore();
  const isStoreManager = user?.role?.name === 'Store Manager';
  
  const [data, setData] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({
    receiptQty: 0,
    issuedQty: 0,
    returnedQty: 0,
    transferOutQty: 0,
    transferInQty: 0,
    balAtStore: 0
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter States
  const [circle, setCircle] = useState<string>(user?.assignedCircle || ''); // Default to assigned circle
  const [store, setStore] = useState<string>('');
  const [pkg, setPkg] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [hideZeroBalance, setHideZeroBalance] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'item' | 'loa'>('item');

  // Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getStoreItemisedSummary({
        circle: circle || undefined,
        store: store || undefined,
        package: pkg || undefined,
        search: search || undefined,
        hideZeroBalance,
        viewMode,
        page,
        limit
      });

      if (res.success && res.data) {
        setData(res.data.items || []);
        setTotals(res.data.totals || {});
        if (res.data.pagination) {
          setTotalItems(res.data.pagination.totalItems);
          setTotalPages(res.data.pagination.totalPages);
        }
      }
    } catch (err) {
      console.error('Failed to fetch store summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [circle, store, pkg, search, hideZeroBalance, viewMode, limit]);

  useEffect(() => {
    fetchData();
  }, [circle, store, pkg, search, hideZeroBalance, viewMode, page, limit]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportStoreItemisedSummary({
        circle: circle || undefined,
        store: store || undefined,
        package: pkg || undefined,
        search: search || undefined,
        hideZeroBalance,
        viewMode
      });

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Store_Itemised_Summary_${(circle || store || 'all').toUpperCase()}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export summary. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const circles = ['Nahan', 'Solan', 'Rampur', 'Rohru'];
  const stores = ['Nahan', 'Solan', 'Kumarhatti', 'Rampur', 'Nalagarh', 'Noida', 'Head Office'];
  const packages = ['Package 1(S/N)', 'Package 2(R/R)'];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      {/* Top Sticky Header */}
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={handleExport}
                disabled={exporting || loading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl shadow-xs">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase border border-blue-100">
                    FROM CIRCLE STORE
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">•</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Item Wise
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                  Store Itemised Summary
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewMode('item')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    viewMode === 'item' 
                      ? 'bg-white text-blue-600 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Item Wise (Summary)
                </button>
                <button
                  onClick={() => setViewMode('loa')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    viewMode === 'loa' 
                      ? 'bg-white text-blue-600 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Detailed (LOA BOM)
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/70 px-3 py-1.5 rounded-lg border border-slate-200/60">
                <Boxes className="w-4 h-4 text-slate-400" />
                <span>Total: <strong className="text-slate-800">{totalItems.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-6 flex flex-col gap-6">
        
        {/* KPI Metrics Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Receipts</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">
              {Number(totals.receiptQty || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1">Inward Receipts</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Issued to Contractor</span>
              <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">
              {Number(totals.issuedQty || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-600 font-medium mt-1">MIN Assignments</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Returned by Cont.</span>
              <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">
              {Number(totals.returnedQty || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-600 font-medium mt-1">Store Returns</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Transfer Out</span>
              <ArrowRightLeft className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">
              {Number(totals.transferOutQty || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-orange-600 font-medium mt-1">To Other Stores</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Transfer In</span>
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-2">
              {Number(totals.transferInQty || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium mt-1">From Other Stores</div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-xl border border-blue-700 shadow-sm flex flex-col">
            <div className="flex items-center justify-between text-blue-100 text-xs font-semibold">
              <span>Bal at Store</span>
              <Store className="w-3.5 h-3.5 text-blue-200" />
            </div>
            <div className="text-xl font-bold text-white mt-2">
              {Number(totals.balAtStore || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-200 font-medium mt-1">Current Physical Stock</div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative min-w-[220px] max-w-[320px] flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Item Name or Temp Code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Circle Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Circle:</span>
              <select
                value={circle}
                onChange={(e) => setCircle(e.target.value)}
                disabled={isStoreManager && !!user?.assignedCircle}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Circles</option>
                {circles.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Store Location Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Store:</span>
              <select
                value={store}
                onChange={(e) => setStore(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                <option value="">All Stores</option>
                {stores.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Package Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Package:</span>
              <select
                value={pkg}
                onChange={(e) => setPkg(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                <option value="">All Packages</option>
                {packages.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Hide Zero Balance Toggle */}
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center cursor-pointer gap-2 select-none text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={hideZeroBalance}
                onChange={(e) => setHideZeroBalance(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              Active Stock Only
            </label>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-14 text-center border-r border-slate-200/60">Sr No</th>
                  <th className="py-3.5 px-4 w-24 text-center border-r border-slate-200/60">Temp Code</th>
                  <th className="py-3.5 px-5 min-w-[260px] border-r border-slate-200/60">Item Name</th>
                  <th className="py-3.5 px-4 w-28 text-center border-r border-slate-200/60">Circle</th>
                  <th className="py-3.5 px-4 w-20 text-center border-r border-slate-200/60">Unit</th>
                  <th className="py-3.5 px-4 text-right bg-emerald-50/50 text-emerald-900 border-r border-slate-200/60 font-extrabold">Total Receipt Qty</th>
                  <th className="py-3.5 px-4 text-right bg-amber-50/50 text-amber-900 border-r border-slate-200/60 font-extrabold">Total Issued to Contractor</th>
                  <th className="py-3.5 px-4 text-right bg-blue-50/50 text-blue-900 border-r border-slate-200/60 font-extrabold">Total Returned by Contractor</th>
                  <th className="py-3.5 px-4 text-right bg-orange-50/50 text-orange-900 border-r border-slate-200/60 font-extrabold">Total Transfer to Other Store</th>
                  <th className="py-3.5 px-4 text-right bg-indigo-50/50 text-indigo-900 border-r border-slate-200/60 font-extrabold">Total Received From Other Store</th>
                  <th className="py-3.5 px-4 text-right bg-slate-900 text-white font-extrabold tracking-wide">Bal at Store</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="text-xs font-semibold text-slate-600">Calculating store summary in real-time...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Boxes className="w-8 h-8 text-slate-300" />
                        <span className="text-sm font-semibold text-slate-600">No items found matching the selected filters.</span>
                        <span className="text-xs text-slate-400">Try changing the Circle, Store, Package, or clearing the search filter.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((item, idx) => {
                    const isPositive = (item.balAtStore || 0) > 0;
                    const isNegative = (item.balAtStore || 0) < 0;
                    const itemCircle = item.circle || circle || 'All Circles';

                    return (
                      <tr 
                        key={item.itemId || item.tempCode || idx}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        <td className="py-3 px-4 text-center text-slate-500 font-semibold border-r border-slate-100">
                          {item.srNo}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 bg-slate-50/50 border-r border-slate-100">
                          {item.tempCode && item.tempCode !== '0' ? item.tempCode : '-'}
                        </td>
                        <td className="py-3 px-5 border-r border-slate-100">
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {item.name || 'Unnamed Item'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {item.sku ? `LOA Sr No: ${item.sku}` : ''} {item.package ? `| ${item.package}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center border-r border-slate-100">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            itemCircle.toLowerCase().includes('solan') ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            itemCircle.toLowerCase().includes('nahan') ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                            itemCircle.toLowerCase().includes('rampur') ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                            itemCircle.toLowerCase().includes('rohru') ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                            'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}>
                            {itemCircle}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 font-semibold border-r border-slate-100">
                          {item.unit || 'Nos'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 bg-emerald-50/20 border-r border-slate-100">
                          {item.receiptQty ? Number(item.receiptQty).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 bg-amber-50/20 border-r border-slate-100">
                          {item.issuedQty ? Number(item.issuedQty).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 bg-blue-50/20 border-r border-slate-100">
                          {item.returnedQty ? Number(item.returnedQty).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 bg-orange-50/20 border-r border-slate-100">
                          {item.transferOutQty ? Number(item.transferOutQty).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 bg-indigo-50/20 border-r border-slate-100">
                          {item.transferInQty ? Number(item.transferInQty).toLocaleString() : '-'}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-700 bg-emerald-50/60 font-extrabold' : 
                          isNegative ? 'text-rose-700 bg-rose-50/60 font-extrabold' : 
                          'text-slate-400 bg-slate-50/40'
                        }`}>
                          {Number(item.balAtStore || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Grand Totals Footer */}
              {!loading && data.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold text-xs">
                    <td colSpan={5} className="py-3.5 px-5 text-right tracking-wider uppercase">
                      Grand Totals ({totalItems.toLocaleString()} items):
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-300">
                      {Number(totals.receiptQty || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-300">
                      {Number(totals.issuedQty || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-blue-300">
                      {Number(totals.returnedQty || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-orange-300">
                      {Number(totals.transferOutQty || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-300">
                      {Number(totals.transferInQty || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-white bg-blue-600 font-extrabold">
                      {Number(totals.balAtStore || 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="bg-white px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span>Showing <strong>{data.length > 0 ? (page - 1) * limit + 1 : 0}</strong> to <strong>{Math.min(page * limit, totalItems)}</strong> of <strong>{totalItems.toLocaleString()}</strong> items</span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded px-2 py-1 text-xs focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                Previous
              </button>
              <span className="px-2 font-semibold text-slate-700">
                Page {page} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
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
