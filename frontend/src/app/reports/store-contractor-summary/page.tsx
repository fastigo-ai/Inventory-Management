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
import * as XLSX from 'xlsx';
import { useUrlFilters } from '@/shared/hooks/useUrlFilters';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [exporting, setExporting] = useState(false);

  const { filters, setFilter, debouncedFilters } = useUrlFilters({
    contractorName: 'A K Contractor',
    circle: user?.assignedCircle || '',
    pkg: '',
    search: '',
    hideZero: 'true',
    page: '1',
    limit: '50'
  }, 500);

  const { contractorName, circle, pkg, search } = filters;
  const hideZero = filters.hideZero === 'true';
  const page = Number(filters.page);
  const limit = Number(filters.limit);

  const setContractorName = (val: string) => setFilter('contractorName', val);
  const setCircle = (val: string) => setFilter('circle', val);
  const setPkg = (val: string) => setFilter('pkg', val);
  const setSearch = (val: string) => setFilter('search', val);
  const setHideZero = (val: boolean | ((prev: boolean) => boolean)) => setFilter('hideZero', (typeof val === 'function' ? val(hideZero) : val).toString());
  const setPage = (val: any) => setFilter('page', (typeof val === 'function' ? val(page) : val).toString());
  const setLimit = (val: any) => setFilter('limit', val.toString());

  // Pagination States
  const [totalItems, setTotalItems] = useState(0);

  // Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Reset selection when data changes
  useEffect(() => {
    setSelectedItems(new Set());
  }, [data]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getStoreContractorSummary({
        contractorName: debouncedFilters.contractorName || undefined,
        circle: debouncedFilters.circle || undefined,
        package: debouncedFilters.pkg || undefined,
        search: debouncedFilters.search || undefined,
        hideZero: debouncedFilters.hideZero === 'true',
        page: Number(debouncedFilters.page),
        limit: Number(debouncedFilters.limit)
      });

      if (res.success && res.data) {
        setData(res.data.items || []);
        setTotals(res.data.totals || {});
        if (res.data.contractors && res.data.contractors.length > 0) {
          setContractorsList(res.data.contractors);
          if (!debouncedFilters.contractorName && res.data.contractors.length > 0) {
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
    fetchData();
  }, [debouncedFilters]);

  // Reset page to 1 when filters change (ignoring page/limit)
  useEffect(() => {
    setPage(1);
  }, [contractorName, circle, pkg, search, hideZero, limit]);

  const fetchAllForExport = async () => {
    if (selectedItems.size > 0) {
      return data.filter((r, i) => selectedItems.has(r.loaSerialNo || r.tempCode || String(i)));
    }
    
    setExporting(true);
    try {
      const res = await getStoreContractorSummary({
        contractorName: contractorName || undefined,
        circle: circle || undefined,
        package: pkg || undefined,
        search: search || undefined,
        hideZero,
        page: 1,
        limit: 100000
      });
      return res.data?.items || [];
    } catch (err) {
      console.error('Export fetch failed:', err);
      return [];
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    const exportData = await fetchAllForExport();
    if (!exportData.length) return alert('No data to export');

    const wsData = exportData.map((r: any, index: number) => ({
      'Sr No': r.srNo || index + 1,
      'LOA Sr. No.': r.loaSerialNo || '-',
      'Temp Code': r.tempCode || '-',
      'Item Name': r.itemName || '-',
      'Circle': r.circle || circle || 'All Circles',
      'Package': r.package || pkg || 'All Packages',
      'Unit': r.unit || 'Nos',
      'Total Issued Qty': r.totalIssuedQty || 0,
      'Total Return Qty': r.totalReturnQty || 0,
      'Total Balance Qty': r.totalBalanceQty || 0
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contractor_Summary');
    XLSX.writeFile(wb, `Store_Contractor_Summary_${(contractorName || 'All').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPDF = async () => {
    const exportData = await fetchAllForExport();
    if (!exportData.length) return alert('No data to export');

    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text(`Store Contractor Summary: ${contractorName || 'All Contractors'}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Circle: ${circle || 'All'} | Package: ${pkg || 'All'} | Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 28,
      head: [['SR', 'LOA NO.', 'TEMP CODE', 'ITEM NAME', 'ISSUED', 'RETURNED', 'BALANCE']],
      body: exportData.map((row: any, i: number) => [
        row.srNo || i + 1,
        row.loaSerialNo || '-',
        row.tempCode || '-',
        row.itemName || '-',
        row.totalIssuedQty?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00',
        row.totalReturnQty?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00',
        row.totalBalanceQty?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'
      ]),
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      didParseCell: function(data) {
        if (data.section === 'head') {
          if (data.column.index === 4) { // Issued
            data.cell.styles.fillColor = [254, 243, 199];
            data.cell.styles.textColor = [120, 53, 15];
          }
          if (data.column.index === 5) { // Returned
            data.cell.styles.fillColor = [219, 234, 254];
            data.cell.styles.textColor = [30, 58, 138];
          }
          if (data.column.index === 6) { // Balance
            data.cell.styles.fillColor = [49, 46, 129];
            data.cell.styles.textColor = [255, 255, 255];
          }
        } else if (data.section === 'body') {
          if (data.column.index === 4) {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 5) {
            data.cell.styles.textColor = [29, 78, 216];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 6) {
            data.cell.styles.textColor = [49, 46, 129];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save(`Store_Contractor_Summary_${(contractorName || 'All').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
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
                onClick={handleExportExcel}
                disabled={exporting || loading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? '...' : 'Export Excel'}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exporting || loading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {exporting ? '...' : 'Export PDF'}
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
              {(() => {
                const selectedRows = data.filter((r, i) => selectedItems.has(r.loaSerialNo || r.tempCode || String(i)));
                const activeTotals = selectedRows.length > 0 ? selectedRows.reduce((acc, r) => ({
                  totalIssuedQty: acc.totalIssuedQty + (r.totalIssuedQty || 0),
                  totalReturnQty: acc.totalReturnQty + (r.totalReturnQty || 0),
                  totalBalanceQty: acc.totalBalanceQty + (r.totalBalanceQty || 0),
                }), { totalIssuedQty: 0, totalReturnQty: 0, totalBalanceQty: 0 }) : totals;
                
                return (
                  <>
                    <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-right relative">
                      {selectedRows.length > 0 && <span className="absolute -top-2 -left-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">Selected</span>}
                      <div className="text-[10px] uppercase font-bold text-amber-800">Total Issued</div>
                      <div className="text-sm font-extrabold text-amber-950 font-mono">
                        {Number(activeTotals.totalIssuedQty || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-right">
                      <div className="text-[10px] uppercase font-bold text-blue-800">Total Returned</div>
                      <div className="text-sm font-extrabold text-blue-950 font-mono">
                        {Number(activeTotals.totalReturnQty || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-right shadow-xs">
                      <div className="text-[10px] uppercase font-bold text-indigo-200">Balance in Custody</div>
                      <div className="text-sm font-extrabold text-white font-mono">
                        {Number(activeTotals.totalBalanceQty || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </>
                );
              })()}
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
                  <th className="py-3 px-3 w-10 text-center bg-slate-200">
                    <input 
                      type="checkbox"
                      checked={data.length > 0 && selectedItems.size === data.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(new Set(data.map((r, i) => r.loaSerialNo || r.tempCode || String(i))));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 w-14 text-center bg-slate-200">Sr No</th>
                  <th className="py-3 px-4 w-28 text-center bg-blue-100/70 text-blue-950 font-extrabold">LOA Sr. No.</th>
                  <th className="py-3 px-4 w-24 text-center bg-slate-200">Temp Code</th>
                  <th className="py-3 px-5 min-w-[260px] bg-slate-200">Item Name</th>
                  <th className="py-3 px-4 w-28 text-center bg-slate-200">Circle</th>
                  <th className="py-3 px-4 w-32 text-center bg-slate-200">Package</th>
                  <th className="py-3 px-4 w-20 text-center bg-slate-200">Unit</th>
                  <th className="py-3 px-4 text-right bg-amber-100 text-amber-950 font-extrabold">Total Issued Qty</th>
                  <th className="py-3 px-4 text-right bg-blue-100 text-blue-950 font-extrabold">Total Return Qty</th>
                  <th className="py-3 px-4 text-right bg-indigo-900 text-white font-extrabold tracking-wide">Total Balance Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                        <span className="text-xs font-semibold text-slate-600">Loading store contractor summary...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Boxes className="w-8 h-8 text-slate-300" />
                        <span className="text-sm font-semibold text-slate-600">No contractor item assignments found.</span>
                        <span className="text-xs text-slate-400">Try selecting a different contractor or clearing filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((r, i) => {
                    const rowCircle = r.circle || circle || 'All Circles';
                    const rowPkg = r.package || pkg || 'All Packages';

                    const rowKey = r.loaSerialNo || r.tempCode || String(i);
                    const isSelected = selectedItems.has(rowKey);

                    return (
                      <tr key={rowKey} className={`${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-100/80'} transition-colors divide-x divide-slate-100`}>
                        <td className="py-2.5 px-3 text-center">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedItems);
                              if (e.target.checked) newSet.add(rowKey);
                              else newSet.delete(rowKey);
                              setSelectedItems(newSet);
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-500 font-sans">{r.srNo}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-blue-900 bg-blue-50/40">
                          {r.loaSerialNo && r.loaSerialNo !== '-' ? r.loaSerialNo : (r.sku || r.tempCode)}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-slate-700 bg-slate-50/50">
                          {r.tempCode && r.tempCode !== '0' ? r.tempCode : '-'}
                        </td>
                        <td className="py-2.5 px-5 font-sans font-medium text-slate-900 truncate max-w-[280px]" title={r.itemName}>
                          {r.itemName}
                        </td>
                        <td className="py-2.5 px-4 text-center font-sans">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            rowCircle.toLowerCase().includes('solan') ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            rowCircle.toLowerCase().includes('nahan') ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                            rowCircle.toLowerCase().includes('rampur') ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                            rowCircle.toLowerCase().includes('rohru') ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                            'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}>
                            {rowCircle}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center font-sans text-[11px] font-medium text-slate-700">
                          {rowPkg}
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
                    );
                  })
                )}
              </tbody>

              {/* Grand Totals Footer */}
              {!loading && data.length > 0 && (
                <tfoot className="bg-slate-900 text-white font-extrabold text-xs divide-x divide-slate-800">
                  {(() => {
                    const selectedRows = data.filter((r, i) => selectedItems.has(r.loaSerialNo || r.tempCode || String(i)));
                    const activeTotals = selectedRows.length > 0 ? selectedRows.reduce((acc, r) => ({
                      totalIssuedQty: acc.totalIssuedQty + (r.totalIssuedQty || 0),
                      totalReturnQty: acc.totalReturnQty + (r.totalReturnQty || 0),
                      totalBalanceQty: acc.totalBalanceQty + (r.totalBalanceQty || 0),
                    }), { totalIssuedQty: 0, totalReturnQty: 0, totalBalanceQty: 0 }) : totals;
                    
                    return (
                      <tr>
                        <td colSpan={8} className="py-3 px-5 text-right font-sans tracking-wider uppercase">
                          {selectedRows.length > 0 ? `Selected (${selectedRows.length} items):` : `Total (${totalItems.toLocaleString()} items):`}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-amber-300">
                          {Number(activeTotals.totalIssuedQty || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-blue-300">
                          {Number(activeTotals.totalReturnQty || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-white bg-indigo-600 font-extrabold">
                          {Number(activeTotals.totalBalanceQty || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })()}
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
                <option value={500}>500 items per page</option>
                <option value={1000}>1000 items per page</option>
              </select>

              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 font-semibold"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-slate-800">Page {page} of {Math.ceil(totalItems / limit) || 1}</span>
              <button
                disabled={page * limit >= totalItems || loading}
                onClick={() => setPage(page + 1)}
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
