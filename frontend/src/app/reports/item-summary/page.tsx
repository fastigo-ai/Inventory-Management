"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getItemMatrixSummary } from '@/features/reports/api/reports.api';

export default function ItemSummaryMatrixPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [packageFilter, setPackageFilter] = useState('');
  const [circleFilter, setCircleFilter] = useState('');
  const [targetCircle, setTargetCircle] = useState('SOLAN');
  const [search, setSearch] = useState('');

  // Column Visibility Toggles (Choose by Tick options)
  const [showDi, setShowDi] = useState(true);
  const [showMrn, setShowMrn] = useState(true);
  const [showImc, setShowImc] = useState(true);
  const [showSupplyBill, setShowSupplyBill] = useState(true);
  const [showErectionBill, setShowErectionBill] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  // Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Reset selection when data changes
  useEffect(() => {
    setSelectedItems(new Set());
  }, [data]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await getItemMatrixSummary({
        package: packageFilter || undefined,
        circle: circleFilter || undefined,
        targetCircle,
        search: search || undefined,
        page,
        limit
      });
      if (res.success && res.data) {
        setData(res.data.items);
        setTotalItems(res.data.pagination.totalItems);
      }
    } catch (err) {
      console.error('Failed to fetch item matrix report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [packageFilter, circleFilter, targetCircle, search, page, limit]);

  // Totals for current page
  const totals = useMemo(() => {
    const selectedRows = selectedItems.size > 0 
      ? data.filter((r, i) => selectedItems.has(r.tempCode || String(i)))
      : data;

    return selectedRows.reduce((acc, r) => {
      acc.solanLoa += (r.solanLoaQty || 0);
      acc.solanBom += (r.solanBomQty || 0);
      acc.nahanLoa += (r.nahanLoaQty || 0);
      acc.nahanBom += (r.nahanBomQty || 0);
      acc.rampurLoa += (r.rampurLoaQty || 0);
      acc.rampurBom += (r.rampurBomQty || 0);
      acc.rohruLoa += (r.rohruLoaQty || 0);
      acc.rohruBom += (r.rohruBomQty || 0);

      acc.dispatchedSolan += (r.dispatchedSolan || 0);
      acc.dispatchedNahan += (r.dispatchedNahan || 0);
      acc.dispatchedRampur += (r.dispatchedRampur || 0);
      acc.dispatchedRohru += (r.dispatchedRohru || 0);

      acc.inwardSolan += (r.inwardSolan || 0);
      acc.inwardNahan += (r.inwardNahan || 0);
      acc.inwardRampur += (r.inwardRampur || 0);
      acc.inwardRohru += (r.inwardRohru || 0);

      acc.minSolan += (r.minSolan || 0);
      acc.minNahan += (r.minNahan || 0);
      acc.minRampur += (r.minRampur || 0);
      acc.minRohru += (r.minRohru || 0);

      acc.imcSolan += (r.imcSolan || 0);
      acc.imcNahan += (r.imcNahan || 0);
      acc.imcRampur += (r.imcRampur || 0);
      acc.imcRohru += (r.imcRohru || 0);

      acc.supSolan += (r.supplyBilledSolan || 0);
      acc.supNahan += (r.supplyBilledNahan || 0);
      acc.supRampur += (r.supplyBilledRampur || 0);
      acc.supRohru += (r.supplyBilledRohru || 0);

      acc.erecSolan += (r.erectionBilledSolan || 0);
      acc.erecNahan += (r.erectionBilledNahan || 0);
      acc.erecRampur += (r.erectionBilledRampur || 0);
      acc.erecRohru += (r.erectionBilledRohru || 0);

      acc.balDiLoa += (r.balDiLoa || 0);
      acc.balDiBom += (r.balDiBom || 0);
      acc.balMrn += (r.balMrn || 0);
      acc.balImc += (r.balImc || 0);
      acc.balSupplyBill += (r.balSupplyBill || 0);
      acc.balErectionBill += (r.balErectionBill || 0);

      ['solan', 'nahan', 'rampur', 'rohru'].forEach(c => {
        const b = r.allBalances ? r.allBalances[c] : (r.balances || {});
        acc.balTotals[c].diVsLoa += (b.diVsLoa || 0);
        acc.balTotals[c].diVsBom += (b.diVsBom || 0);
        acc.balTotals[c].mrn += (b.mrn || 0);
        acc.balTotals[c].imc += (b.imc || 0);
        acc.balTotals[c].supplyBill += (b.supplyBill || 0);
        acc.balTotals[c].erectionBill += (b.erectionBill || 0);
      });

      return acc;
    }, {
      solanLoa: 0, solanBom: 0, nahanLoa: 0, nahanBom: 0, rampurLoa: 0, rampurBom: 0, rohruLoa: 0, rohruBom: 0,
      dispatchedSolan: 0, dispatchedNahan: 0, dispatchedRampur: 0, dispatchedRohru: 0,
      inwardSolan: 0, inwardNahan: 0, inwardRampur: 0, inwardRohru: 0,
      minSolan: 0, minNahan: 0, minRampur: 0, minRohru: 0,
      imcSolan: 0, imcNahan: 0, imcRampur: 0, imcRohru: 0,
      supSolan: 0, supNahan: 0, supRampur: 0, supRohru: 0,
      erecSolan: 0, erecNahan: 0, erecRampur: 0, erecRohru: 0,
      balDiLoa: 0, balDiBom: 0, balMrn: 0, balImc: 0, balSupplyBill: 0, balErectionBill: 0,
      balTotals: {
        solan: { diVsLoa: 0, diVsBom: 0, mrn: 0, imc: 0, supplyBill: 0, erectionBill: 0 },
        nahan: { diVsLoa: 0, diVsBom: 0, mrn: 0, imc: 0, supplyBill: 0, erectionBill: 0 },
        rampur: { diVsLoa: 0, diVsBom: 0, mrn: 0, imc: 0, supplyBill: 0, erectionBill: 0 },
        rohru: { diVsLoa: 0, diVsBom: 0, mrn: 0, imc: 0, supplyBill: 0, erectionBill: 0 }
      }
    });
  }, [data, selectedItems]);

  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      'Sr. No.', 'LOA Sr. No.', 'Temp Code', 'Item Name', 'Package', 'Circle',
      'Solan LOA Qty', 'Solan BOM Qty', 'Nahan LOA Qty', 'Nahan BOM Qty', 'Rampur LOA Qty', 'Rampur BOM Qty', 'Rohru LOA Qty', 'Rohru BOM Qty',
      'Total Dispatched Solan', 'Total Dispatched Nahan', 'Total Dispatched Rampur', 'Total Dispatched Rohru',
      'Total MRHOV Solan', 'Total MRHOV Nahan', 'Total MRHOV Rampur', 'Total MRHOV Rohru',
      'Total MIN/Issue Solan', 'Total MIN/Issue Nahan', 'Total MIN/Issue Rampur', 'Total MIN/Issue Rohru',
      'Total JMC Solan', 'Total JMC Nahan', 'Total JMC Rampur', 'Total JMC Rohru',
      'Total Supply Billed Solan', 'Total Supply Billed Nahan', 'Total Supply Billed Rampur', 'Total Supply Billed Rohru',
      'Total Erection Billed Solan', 'Total Erection Billed Nahan', 'Total Erection Billed Rampur', 'Total Erection Billed Rohru',
      ...['SOLAN', 'NAHAN', 'RAMPUR', 'ROHRU'].flatMap(c => [
        `Bal for DI against ${c} LOA`, `Bal for Dispatch against ${c} LOA`,
        `Bal for MRHOv-${c}`, `Bal for JMC-${c}`,
        `Bal for Supply Bill-${c}`, `Bal for Erection Bill-${c}`
      ])
    ];

    const rows = data.map(r => {
      const itemCirc = String(r.circle || '').toLowerCase();
      const cv = (circ: string, val: any) => !itemCirc.includes(circ) ? '' : (val || 0);

      return [
        r.srNo, `"${r.loaSerialNo || r.tempCode || ''}"`, `"${r.tempCode || ''}"`, `"${(r.itemName || '').replace(/"/g, '""')}"`, `"${r.package || ''}"`, `"${r.circle || ''}"`,
        cv('solan', r.solanLoaQty), cv('solan', r.solanBomQty), cv('nahan', r.nahanLoaQty), cv('nahan', r.nahanBomQty), cv('rampur', r.rampurLoaQty), cv('rampur', r.rampurBomQty), cv('rohru', r.rohruLoaQty), cv('rohru', r.rohruBomQty),
        cv('solan', r.dispatchedSolan), cv('nahan', r.dispatchedNahan), cv('rampur', r.dispatchedRampur), cv('rohru', r.dispatchedRohru),
        cv('solan', r.inwardSolan), cv('nahan', r.inwardNahan), cv('rampur', r.inwardRampur), cv('rohru', r.inwardRohru),
        cv('solan', r.minSolan), cv('nahan', r.minNahan), cv('rampur', r.minRampur), cv('rohru', r.minRohru),
        cv('solan', r.imcSolan), cv('nahan', r.imcNahan), cv('rampur', r.imcRampur), cv('rohru', r.imcRohru),
        cv('solan', r.supplyBilledSolan), cv('nahan', r.supplyBilledNahan), cv('rampur', r.supplyBilledRampur), cv('rohru', r.supplyBilledRohru),
        cv('solan', r.erectionBilledSolan), cv('nahan', r.erectionBilledNahan), cv('rampur', r.erectionBilledRampur), cv('rohru', r.erectionBilledRohru),
        ...['solan', 'nahan', 'rampur', 'rohru'].flatMap(c => {
          if (!itemCirc.includes(c)) return ['', '', '', '', '', ''];
          const b = r.allBalances ? r.allBalances[c] : (r.balances || {});
          return [b.diVsLoa ?? 0, b.diVsBom ?? 0, b.mrn ?? 0, b.imc ?? 0, b.supplyBill ?? 0, b.erectionBill ?? 0];
        })
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Item_Summary_Matrix_${targetCircle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[100vw] overflow-x-hidden bg-slate-50 min-h-screen">
      {/* Header Title & Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-lg">📊</span>
            Item Summary Report (Multi-Circle LOA / BOM Matrix)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete multi-circle breakdown of LOA, BOM, DI, MRHOV, MIN, JMC, Billed & Balances across Solan, Nahan, Rampur & Rohru
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
        >
          <span>📥</span> Export to CSV
        </button>
      </div>

      {/* Enterprise ERP KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Items</div>
          <div className="text-lg font-extrabold text-slate-900 mt-0.5">{totalItems}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Consolidated Master Temp Codes</div>
        </div>

        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Total LOA Qty</div>
          <div className="text-lg font-extrabold text-amber-950 mt-0.5 font-mono">
            {(totals.solanLoa + totals.nahanLoa + totals.rampurLoa + totals.rohruLoa).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">All 4 Circles LOA Sum</div>
        </div>

        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Total Dispatched (DI)</div>
          <div className="text-lg font-extrabold text-blue-950 mt-0.5 font-mono">
            {(totals.dispatchedSolan + totals.dispatchedNahan + totals.dispatchedRampur + totals.dispatchedRohru).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5">Dispatched across all DIs</div>
        </div>

        <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total MRHOV (Inward)</div>
          <div className="text-lg font-extrabold text-emerald-950 mt-0.5 font-mono">
            {(totals.inwardSolan + totals.inwardNahan + totals.inwardRampur + totals.inwardRohru).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Received Store Stock</div>
        </div>

        <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-sky-800 uppercase tracking-wider">Total Supply Billed</div>
          <div className="text-lg font-extrabold text-sky-950 mt-0.5 font-mono">
            {(totals.supSolan + totals.supNahan + totals.supRampur + totals.supRohru).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-sky-700 mt-0.5">Purchase Invoices Billed</div>
        </div>

        <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-orange-900 uppercase tracking-wider">Bal DI vs LOA ({targetCircle})</div>
          <div className={`text-lg font-extrabold mt-0.5 font-mono ${totals.balDiLoa < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {totals.balDiLoa.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-orange-700 mt-0.5">Target Balance Outstanding</div>
        </div>
      </div>

      {/* Control Filters Bar (Matching Excel Header Controls) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
        {/* Row 1: Choose by Package & Choose by Circle & Target Balance Circle */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-3 border-b border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Choose by Package</label>
            <select
              value={packageFilter}
              onChange={e => { setPackageFilter(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">All Packages</option>
              <option value="Package 1(S/N)">Package 1(S/N) / OPE</option>
              <option value="Package 2(R/R)">Package 2(R/R) / E/W</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Choose Circle Filter</label>
            <select
              value={circleFilter}
              onChange={e => { setCircleFilter(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">All Circles</option>
              <option value="Solan">Solan</option>
              <option value="Nahan">Nahan</option>
              <option value="Rampur">Rampur</option>
              <option value="Rohru">Rohru</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Target Balance Circle</label>
            <select
              value={targetCircle}
              onChange={e => { setTargetCircle(e.target.value); setPage(1); }}
              className="w-full text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 font-bold"
            >
              <option value="SOLAN">Solan Balances</option>
              <option value="NAHAN">Nahan Balances</option>
              <option value="RAMPUR">Rampur Balances</option>
              <option value="ROHRU">Rohru Balances</option>
              <option value="ALL">All Circles Combined</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search Items</label>
            <input
              type="text"
              placeholder="Temp Code, Name, SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* Row 2: Choose by Tick options (Module Columns Visibility) */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-700">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Choose by Tick options:</span>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600">
            <input type="checkbox" checked={showDi} onChange={e => setShowDi(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            DI (Dispatch)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600">
            <input type="checkbox" checked={showMrn} onChange={e => setShowMrn(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            MRHOV (Inward)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600">
            <input type="checkbox" checked={showImc} onChange={e => setShowImc(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            MIN & JMC Work
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600">
            <input type="checkbox" checked={showSupplyBill} onChange={e => setShowSupplyBill(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            Supply Bill / RA
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600">
            <input type="checkbox" checked={showErectionBill} onChange={e => setShowErectionBill(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            Erection Bill / RA
          </label>
        </div>
      </div>

      {/* Main Multi-Header Spreadsheet Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium animate-pulse">
            Loading item matrix summary report...
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 divide-x divide-slate-200">
                  <th colSpan={4} className="p-2 text-center bg-slate-200 sticky top-0 z-20">Item Master Info</th>
                  <th colSpan={8} className="p-2 text-center bg-amber-100 text-amber-900 sticky top-0 z-20">LOA & BOM Quantities</th>
                  <th colSpan={6} className="p-2 text-center bg-orange-100 text-orange-900 sticky top-0 z-20">Balances — SOLAN</th>
                  <th colSpan={6} className="p-2 text-center bg-orange-100/90 text-orange-900 sticky top-0 z-20">Balances — NAHAN</th>
                  <th colSpan={6} className="p-2 text-center bg-orange-100/80 text-orange-900 sticky top-0 z-20">Balances — RAMPUR</th>
                  <th colSpan={6} className="p-2 text-center bg-orange-100/70 text-orange-900 sticky top-0 z-20">Balances — ROHRU</th>
                  {showDi && <th colSpan={4} className="p-2 text-center bg-blue-100 text-blue-900 sticky top-0 z-20">Total Dispatched (DI)</th>}
                  {showMrn && <th colSpan={4} className="p-2 text-center bg-emerald-100 text-emerald-900 sticky top-0 z-20">Total MRHOV</th>}
                  {showImc && <th colSpan={4} className="p-2 text-center bg-purple-100 text-purple-900 sticky top-0 z-20">Total MIN / Issue</th>}
                  {showImc && <th colSpan={4} className="p-2 text-center bg-indigo-100 text-indigo-900 sticky top-0 z-20">Total JMC Work</th>}
                  {showSupplyBill && <th colSpan={4} className="p-2 text-center bg-sky-100 text-sky-900 sticky top-0 z-20">Supply Billed</th>}
                  {showErectionBill && <th colSpan={4} className="p-2 text-center bg-teal-100 text-teal-900 sticky top-0 z-20">Erection Billed</th>}
                </tr>

                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 divide-x divide-slate-200 sticky top-[33px] z-20">
                  <th className="p-2 min-w-[40px] text-center bg-slate-100">
                    <input 
                      type="checkbox"
                      checked={data.length > 0 && selectedItems.size === data.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(new Set(data.map((r, i) => r.tempCode || String(i))));
                        } else {
                          setSelectedItems(new Set());
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="p-2 min-w-[40px] text-center bg-slate-100">Sr. No.</th>
                  <th className="p-2 min-w-[80px] bg-slate-100">LOA Sr. No.</th>
                  <th className="p-2 min-w-[220px] bg-slate-100">Item Name</th>

                  <th className="p-2 min-w-[75px] bg-amber-50 text-right font-bold text-amber-900">Solan LOA</th>
                  <th className="p-2 min-w-[75px] bg-amber-50 text-right font-bold text-amber-900">Solan BOM</th>
                  <th className="p-2 min-w-[75px] bg-amber-50/70 text-right">Nahan LOA</th>
                  <th className="p-2 min-w-[75px] bg-amber-50/70 text-right">Nahan BOM</th>
                  <th className="p-2 min-w-[75px] bg-amber-50/70 text-right">Rampur LOA</th>
                  <th className="p-2 min-w-[75px] bg-amber-50/70 text-right">Rampur BOM</th>
                  <th className="p-2 min-w-[75px] bg-amber-50/70 text-right">Rohru LOA</th>
                  <th className="p-2 min-w-[75px] bg-amber-50/70 text-right">Rohru BOM</th>

                  {['SOLAN', 'NAHAN', 'RAMPUR', 'ROHRU'].map((c, idx) => (
                    <React.Fragment key={c}>
                      <th className={`p-2 min-w-[100px] ${idx % 2 === 0 ? 'bg-orange-50' : 'bg-orange-50/70'} text-right font-bold text-orange-950`} title={`${c} LOA Qty minus DI Dispatched to ${c}`}>Bal for DI against {c} LOA</th>
                      <th className={`p-2 min-w-[100px] ${idx % 2 === 0 ? 'bg-orange-50' : 'bg-orange-50/70'} text-right font-bold text-orange-950`} title={`${c} BOM Qty minus DI Dispatched to ${c}`}>Bal for Dispatch against {c} LOA</th>
                      <th className={`p-2 min-w-[100px] ${idx % 2 === 0 ? 'bg-orange-50' : 'bg-orange-50/70'} text-right font-bold text-orange-950`} title={`DI Dispatched to ${c} minus MRHOV Received`}>Bal for MRHOv-{c}</th>
                      <th className={`p-2 min-w-[100px] ${idx % 2 === 0 ? 'bg-orange-50' : 'bg-orange-50/70'} text-right font-bold text-orange-950`} title={`MRHOV Received in ${c} minus MIN Issued`}>Bal for JMC-{c}</th>
                      <th className={`p-2 min-w-[100px] ${idx % 2 === 0 ? 'bg-orange-50' : 'bg-orange-50/70'} text-right font-bold text-orange-950`} title={`MRHOV Received in ${c} minus Supply Billed`}>Bal for Supply Bill-{c}</th>
                      <th className={`p-2 min-w-[100px] ${idx % 2 === 0 ? 'bg-orange-50' : 'bg-orange-50/70'} text-right font-bold text-orange-950`} title={`JMC Work in ${c} minus Erection Billed`}>Bal for Erection Bill-{c}</th>
                    </React.Fragment>
                  ))}

                  {/* DI */}
                  {showDi && <>
                    <th className="p-2 min-w-[75px] bg-blue-50 text-right font-bold text-blue-900">Solan</th>
                    <th className="p-2 min-w-[75px] bg-blue-50/70 text-right">Nahan</th>
                    <th className="p-2 min-w-[75px] bg-blue-50/70 text-right">Rampur</th>
                    <th className="p-2 min-w-[75px] bg-blue-50/70 text-right">Rohru</th>
                  </>}

                  {/* MRN */}
                  {showMrn && <>
                    <th className="p-2 min-w-[75px] bg-emerald-50 text-right font-bold text-emerald-900">Solan</th>
                    <th className="p-2 min-w-[75px] bg-emerald-50/70 text-right">Nahan</th>
                    <th className="p-2 min-w-[75px] bg-emerald-50/70 text-right">Rampur</th>
                    <th className="p-2 min-w-[75px] bg-emerald-50/70 text-right">Rohru</th>
                  </>}

                  {/* MIN / Issue */}
                  {showImc && <>
                    <th className="p-2 min-w-[75px] bg-purple-50 text-right font-bold text-purple-900">Solan</th>
                    <th className="p-2 min-w-[75px] bg-purple-50/70 text-right">Nahan</th>
                    <th className="p-2 min-w-[75px] bg-purple-50/70 text-right">Rampur</th>
                    <th className="p-2 min-w-[75px] bg-purple-50/70 text-right">Rohru</th>
                  </>}

                  {/* IMC Work */}
                  {showImc && <>
                    <th className="p-2 min-w-[75px] bg-indigo-50 text-right font-bold text-indigo-900">Solan</th>
                    <th className="p-2 min-w-[75px] bg-indigo-50/70 text-right">Nahan</th>
                    <th className="p-2 min-w-[75px] bg-indigo-50/70 text-right">Rampur</th>
                    <th className="p-2 min-w-[75px] bg-indigo-50/70 text-right">Rohru</th>
                  </>}

                  {/* Supply Billed */}
                  {showSupplyBill && <>
                    <th className="p-2 min-w-[75px] bg-sky-50 text-right font-bold text-sky-900">Solan</th>
                    <th className="p-2 min-w-[75px] bg-sky-50/70 text-right">Nahan</th>
                    <th className="p-2 min-w-[75px] bg-sky-50/70 text-right">Rampur</th>
                    <th className="p-2 min-w-[75px] bg-sky-50/70 text-right">Rohru</th>
                  </>}

                  {/* Erection Billed */}
                  {showErectionBill && <>
                    <th className="p-2 min-w-[75px] bg-teal-50 text-right font-bold text-teal-900">Solan</th>
                    <th className="p-2 min-w-[75px] bg-teal-50/70 text-right">Nahan</th>
                    <th className="p-2 min-w-[75px] bg-teal-50/70 text-right">Rampur</th>
                    <th className="p-2 min-w-[75px] bg-teal-50/70 text-right">Rohru</th>
                  </>}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={45} className="p-8 text-center text-slate-400 font-sans">
                      No summary items found matching selected filters.
                    </td>
                  </tr>
                ) : (
                  data.map((r, i) => {
                    const rowKey = r.tempCode || String(i);
                    const isSelected = selectedItems.has(rowKey);

                    return (
                      <tr key={`${r._id}-${r.tempCode || ''}-${r.circle || ''}-${i}`} className={`${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-100/80'} transition-colors divide-x divide-slate-100`}>
                        <td className="p-2 text-center">
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
                        <td className="p-2 text-center text-slate-500 font-sans">{r.srNo}</td>
                        <td className="p-2 font-bold text-slate-800" title={r.tempCode ? `Temp Code: ${r.tempCode}` : undefined}>
                          {r.loaSerialNo || r.tempCode}
                        </td>
                        <td className="p-2 font-sans font-medium text-slate-900 truncate max-w-[250px]" title={r.itemName}>
                          {r.itemName}
                        </td>

                      {/* LOA & BOM */}
                      {(() => {
                        const itemCirc = String(r.circle || '').toLowerCase();
                        const cv = (circ: string, val: any) => !itemCirc.includes(circ) ? <span className="text-slate-300">-</span> : (val || 0);
                        
                        return (
                          <>
                            <td className="p-2 text-right font-semibold text-amber-900 bg-amber-50/30">{cv('solan', r.solanLoaQty || r.loaQuantities?.solan)}</td>
                            <td className="p-2 text-right font-semibold text-amber-900 bg-amber-50/30">{cv('solan', r.solanBomQty || r.bomQuantities?.solan)}</td>
                            <td className="p-2 text-right text-slate-600">{cv('nahan', r.nahanLoaQty || r.loaQuantities?.nahan)}</td>
                            <td className="p-2 text-right text-slate-600">{cv('nahan', r.nahanBomQty || r.bomQuantities?.nahan)}</td>
                            <td className="p-2 text-right text-slate-600">{cv('rampur', r.rampurLoaQty || r.loaQuantities?.rampur)}</td>
                            <td className="p-2 text-right text-slate-600">{cv('rampur', r.rampurBomQty || r.bomQuantities?.rampur)}</td>
                            <td className="p-2 text-right text-slate-600">{cv('rohru', r.rohruLoaQty || r.loaQuantities?.rohru)}</td>
                            <td className="p-2 text-right text-slate-600">{cv('rohru', r.rohruBomQty || r.bomQuantities?.rohru)}</td>

                            {/* Balances */}
                            {['solan', 'nahan', 'rampur', 'rohru'].map((c, idx) => {
                              if (!itemCirc.includes(c)) {
                                return (
                                  <React.Fragment key={c}>
                                    <td className={`p-2 text-center text-slate-300 font-bold ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>-</td>
                                    <td className={`p-2 text-center text-slate-300 font-bold ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>-</td>
                                    <td className={`p-2 text-center text-slate-300 font-bold ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>-</td>
                                    <td className={`p-2 text-center text-slate-300 font-bold ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>-</td>
                                    <td className={`p-2 text-center text-slate-300 font-bold ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>-</td>
                                    <td className={`p-2 text-center text-slate-300 font-bold ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>-</td>
                                  </React.Fragment>
                                );
                              }

                              const b = r.allBalances ? r.allBalances[c] : (r.balances || {});
                              return (
                                <React.Fragment key={c}>
                                  <td className={`p-2 text-right font-bold ${b.diVsLoa < 0 ? 'text-rose-600' : 'text-slate-800'} ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>{b.diVsLoa ?? 0}</td>
                                  <td className={`p-2 text-right font-bold ${b.diVsBom < 0 ? 'text-rose-600' : 'text-slate-800'} ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>{b.diVsBom ?? 0}</td>
                                  <td className={`p-2 text-right font-bold text-slate-800 ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>{b.mrn ?? 0}</td>
                                  <td className={`p-2 text-right font-bold text-slate-800 ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>{b.imc ?? 0}</td>
                                  <td className={`p-2 text-right font-bold text-slate-800 ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>{b.supplyBill ?? 0}</td>
                                  <td className={`p-2 text-right font-bold text-slate-800 ${idx % 2 === 0 ? 'bg-orange-50/40' : 'bg-orange-50/20'}`}>{b.erectionBill ?? 0}</td>
                                </React.Fragment>
                              );
                            })}

                            {/* DI */}
                            {showDi && <>
                              <td className="p-2 text-right font-semibold text-blue-900 bg-blue-50/30">{cv('solan', r.dispatchedSolan || r.dispatched?.solan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('nahan', r.dispatchedNahan || r.dispatched?.nahan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rampur', r.dispatchedRampur || r.dispatched?.rampur)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rohru', r.dispatchedRohru || r.dispatched?.rohru)}</td>
                            </>}

                            {/* MRN */}
                            {showMrn && <>
                              <td className="p-2 text-right font-semibold text-emerald-900 bg-emerald-50/30">{cv('solan', r.inwardSolan || r.inward?.solan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('nahan', r.inwardNahan || r.inward?.nahan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rampur', r.inwardRampur || r.inward?.rampur)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rohru', r.inwardRohru || r.inward?.rohru)}</td>
                            </>}

                            {/* MIN / Issue */}
                            {showImc && <>
                              <td className="p-2 text-right font-semibold text-purple-900 bg-purple-50/30">{cv('solan', r.minSolan || r.min?.solan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('nahan', r.minNahan || r.min?.nahan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rampur', r.minRampur || r.min?.rampur)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rohru', r.minRohru || r.min?.rohru)}</td>
                            </>}

                            {/* IMC Work */}
                            {showImc && <>
                              <td className="p-2 text-right font-semibold text-indigo-900 bg-indigo-50/30">{cv('solan', r.imcSolan || r.imc?.solan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('nahan', r.imcNahan || r.imc?.nahan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rampur', r.imcRampur || r.imc?.rampur)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rohru', r.imcRohru || r.imc?.rohru)}</td>
                            </>}

                            {/* Supply Billed */}
                            {showSupplyBill && <>
                              <td className="p-2 text-right font-semibold text-sky-900 bg-sky-50/30">{cv('solan', r.supplyBilledSolan || r.supplyBilled?.solan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('nahan', r.supplyBilledNahan || r.supplyBilled?.nahan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rampur', r.supplyBilledRampur || r.supplyBilled?.rampur)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rohru', r.supplyBilledRohru || r.supplyBilled?.rohru)}</td>
                            </>}

                            {/* Erection Billed */}
                            {showErectionBill && <>
                              <td className="p-2 text-right font-semibold text-teal-900 bg-teal-50/30">{cv('solan', r.erectionBilledSolan || r.erectionBilled?.solan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('nahan', r.erectionBilledNahan || r.erectionBilled?.nahan)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rampur', r.erectionBilledRampur || r.erectionBilled?.rampur)}</td>
                              <td className="p-2 text-right text-slate-600">{cv('rohru', r.erectionBilledRohru || r.erectionBilled?.rohru)}</td>
                            </>}
                          </>
                        );
                      })()}
                    </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                {!loading && data.length > 0 && (
                  <tr className="bg-slate-800 text-white font-bold divide-x divide-slate-700 text-[11px]">
                    <td colSpan={4} className="p-2 text-right font-sans">
                      {selectedItems.size > 0 ? `TOTAL (Selected ${selectedItems.size} items)` : 'TOTAL (Current Page)'}
                    </td>
                    
                    <td className="p-2 text-right text-amber-300">{totals.solanLoa}</td>
                    <td className="p-2 text-right text-amber-300">{totals.solanBom}</td>
                    <td className="p-2 text-right">{totals.nahanLoa}</td>
                    <td className="p-2 text-right">{totals.nahanBom}</td>
                    <td className="p-2 text-right">{totals.rampurLoa}</td>
                    <td className="p-2 text-right">{totals.rampurBom}</td>
                    <td className="p-2 text-right">{totals.rohruLoa}</td>
                    <td className="p-2 text-right">{totals.rohruBom}</td>

                    {['solan', 'nahan', 'rampur', 'rohru'].map((c, idx) => {
                      const bt = totals.balTotals[c];
                      return (
                        <React.Fragment key={c}>
                          <td className={`p-2 text-right ${idx % 2 === 0 ? 'text-orange-300' : 'text-orange-200'}`}>{bt.diVsLoa}</td>
                          <td className={`p-2 text-right ${idx % 2 === 0 ? 'text-orange-300' : 'text-orange-200'}`}>{bt.diVsBom}</td>
                          <td className={`p-2 text-right ${idx % 2 === 0 ? 'text-orange-300' : 'text-orange-200'}`}>{bt.mrn}</td>
                          <td className={`p-2 text-right ${idx % 2 === 0 ? 'text-orange-300' : 'text-orange-200'}`}>{bt.imc}</td>
                          <td className={`p-2 text-right ${idx % 2 === 0 ? 'text-orange-300' : 'text-orange-200'}`}>{bt.supplyBill}</td>
                          <td className={`p-2 text-right ${idx % 2 === 0 ? 'text-orange-300' : 'text-orange-200'}`}>{bt.erectionBill}</td>
                        </React.Fragment>
                      );
                    })}

                    {showDi && <>
                      <td className="p-2 text-right text-blue-300">{totals.dispatchedSolan}</td>
                      <td className="p-2 text-right">{totals.dispatchedNahan}</td>
                      <td className="p-2 text-right">{totals.dispatchedRampur}</td>
                      <td className="p-2 text-right">{totals.dispatchedRohru}</td>
                    </>}

                    {showMrn && <>
                      <td className="p-2 text-right text-emerald-300">{totals.inwardSolan}</td>
                      <td className="p-2 text-right">{totals.inwardNahan}</td>
                      <td className="p-2 text-right">{totals.inwardRampur}</td>
                      <td className="p-2 text-right">{totals.inwardRohru}</td>
                    </>}

                    {showImc && <>
                      <td className="p-2 text-right text-purple-300">{totals.minSolan}</td>
                      <td className="p-2 text-right">{totals.minNahan}</td>
                      <td className="p-2 text-right">{totals.minRampur}</td>
                      <td className="p-2 text-right">{totals.minRohru}</td>
                    </>}

                    {showImc && <>
                      <td className="p-2 text-right text-indigo-300">{totals.imcSolan}</td>
                      <td className="p-2 text-right">{totals.imcNahan}</td>
                      <td className="p-2 text-right">{totals.imcRampur}</td>
                      <td className="p-2 text-right">{totals.imcRohru}</td>
                    </>}

                    {showSupplyBill && <>
                      <td className="p-2 text-right text-sky-300">{totals.supSolan}</td>
                      <td className="p-2 text-right">{totals.supNahan}</td>
                      <td className="p-2 text-right">{totals.supRampur}</td>
                      <td className="p-2 text-right">{totals.supRohru}</td>
                    </>}

                    {showErectionBill && <>
                      <td className="p-2 text-right text-teal-300">{totals.erecSolan}</td>
                      <td className="p-2 text-right">{totals.erecNahan}</td>
                      <td className="p-2 text-right">{totals.erecRampur}</td>
                      <td className="p-2 text-right">{totals.erecRohru}</td>
                    </>}
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-600 gap-3">
          <div>
            Showing <span className="font-bold text-slate-900">{data.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">{Math.min(page * limit, totalItems)}</span> of{' '}
            <span className="font-bold text-slate-900">{totalItems}</span> master items
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
            >
              <option value={25}>25 items per page</option>
              <option value={50}>50 items per page</option>
              <option value={100}>100 items per page</option>
              <option value={250}>250 items per page</option>
              <option value={500}>500 items per page</option>
              <option value={1000}>1000 items per page</option>
            </select>

            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 font-medium"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-800">Page {page} of {Math.ceil(totalItems / limit) || 1}</span>
            <button
              disabled={page * limit >= totalItems}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
