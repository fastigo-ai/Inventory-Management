"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { getItemMatrixSummary } from '@/features/reports/api/reports.api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useUrlFilters } from '@/shared/hooks/useUrlFilters';

export default function ItemSummaryMatrixPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters from URL
  const { filters, setFilter, debouncedFilters } = useUrlFilters({
    packageFilter: '',
    circleFilter: '',
    targetCircle: 'ALL',
    search: '',
    page: '1',
    limit: '50'
  }, 500);

  // Column Visibility Toggles (Choose by Tick options)
  const [showDi, setShowDi] = useState(true);
  const [showMrn, setShowMrn] = useState(true);
  const [showMhrov, setShowMhrov] = useState(true);
  const [showImc, setShowImc] = useState(true);
  const [showSupplyBill, setShowSupplyBill] = useState(true);
  const [showErectionBill, setShowErectionBill] = useState(true);

  const [totalItems, setTotalItems] = useState(0);

  // Selection State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Reset selection when data changes
  useEffect(() => {
    setSelectedItems(new Set());
  }, [data]);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await getItemMatrixSummary({
          package: debouncedFilters.packageFilter || undefined,
          circle: debouncedFilters.circleFilter || undefined,
          targetCircle: debouncedFilters.targetCircle,
          search: debouncedFilters.search || undefined,
          page: Number(debouncedFilters.page),
          limit: Number(debouncedFilters.limit)
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
    fetchReport();
  }, [debouncedFilters]);


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

      acc.mhrovSolan += (r.mhrovSolan || 0);
      acc.mhrovNahan += (r.mhrovNahan || 0);
      acc.mhrovRampur += (r.mhrovRampur || 0);
      acc.mhrovRohru += (r.mhrovRohru || 0);

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
      mhrovSolan: 0, mhrovNahan: 0, mhrovRampur: 0, mhrovRohru: 0,
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

  
  const handleExportPDF = () => {
    if (data.length === 0) return alert('No data to export');

    // Create a very wide PDF to accommodate all 68+ columns (Width: 2000mm, Height: A4 297mm)
    const doc = new jsPDF({ orientation: 'landscape', format: [2000, 297] });
    
    doc.setFontSize(20);
    doc.text(`Item Summary Report (Multi-Circle LOA / BOM Matrix)`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // We will build the headers dynamically based on what is shown in CSV
    const headers = [
      'Sr. No.', 'LOA Sr. No.', 'Temp Code', 'Item Name', 'Package', 'Circle',
      'Solan LOA Qty', 'Solan BOM Qty', 'Nahan LOA Qty', 'Nahan BOM Qty', 'Rampur LOA Qty', 'Rampur BOM Qty', 'Rohru LOA Qty', 'Rohru BOM Qty',
      'Total Dispatched Solan', 'Total Dispatched Nahan', 'Total Dispatched Rampur', 'Total Dispatched Rohru',
      'Total Inward (IR) Solan', 'Total Inward (IR) Nahan', 'Total Inward (IR) Rampur', 'Total Inward (IR) Rohru',
      'Total MRHOV Solan', 'Total MRHOV Nahan', 'Total MRHOV Rampur', 'Total MRHOV Rohru',
      'Total MIN/Issue Solan', 'Total MIN/Issue Nahan', 'Total MIN/Issue Rampur', 'Total MIN/Issue Rohru',
      'Total JMC Solan', 'Total JMC Nahan', 'Total JMC Rampur', 'Total JMC Rohru',
      'Total Supply Billed Solan', 'Total Supply Billed Nahan', 'Total Supply Billed Rampur', 'Total Supply Billed Rohru',
      'Total Erection Billed Solan', 'Total Erection Billed Nahan', 'Total Erection Billed Rampur', 'Total Erection Billed Rohru',
      ...['SOLAN', 'NAHAN', 'RAMPUR', 'ROHRU'].flatMap(c => [
        `Bal for DI (${c})`, `Bal for Dispatch (${c})`,
        `Bal for IR (${c})`, `Bal for MRHOv (${c})`, `Bal for JMC (${c})`,
        `Bal for Supply (${c})`, `Bal for Erection (${c})`
      ])
    ];

    const rows = data.map((r, i) => {
      const itemCirc = String(r.circle || '').toLowerCase();
      const cv = (circ: string, val: any) => !itemCirc.includes(circ) ? '-' : (val?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || '0');

      return [
        r.srNo || (i + 1),
        r.loaSerialNo || r.tempCode || '-',
        r.tempCode || '-',
        r.itemName || '-',
        r.package || '-',
        r.circle || '-',
        cv('solan', r.solanLoaQty), cv('solan', r.solanBomQty), cv('nahan', r.nahanLoaQty), cv('nahan', r.nahanBomQty), cv('rampur', r.rampurLoaQty), cv('rampur', r.rampurBomQty), cv('rohru', r.rohruLoaQty), cv('rohru', r.rohruBomQty),
        cv('solan', r.dispatchedSolan), cv('nahan', r.dispatchedNahan), cv('rampur', r.dispatchedRampur), cv('rohru', r.dispatchedRohru),
        cv('solan', r.inwardSolan), cv('nahan', r.inwardNahan), cv('rampur', r.inwardRampur), cv('rohru', r.inwardRohru),
        cv('solan', r.mhrovSolan), cv('nahan', r.mhrovNahan), cv('rampur', r.mhrovRampur), cv('rohru', r.mhrovRohru),
        cv('solan', r.minSolan), cv('nahan', r.minNahan), cv('rampur', r.minRampur), cv('rohru', r.minRohru),
        cv('solan', r.imcSolan), cv('nahan', r.imcNahan), cv('rampur', r.imcRampur), cv('rohru', r.imcRohru),
        cv('solan', r.supplyBilledSolan), cv('nahan', r.supplyBilledNahan), cv('rampur', r.supplyBilledRampur), cv('rohru', r.supplyBilledRohru),
        cv('solan', r.erectionBilledSolan), cv('nahan', r.erectionBilledNahan), cv('rampur', r.erectionBilledRampur), cv('rohru', r.erectionBilledRohru),
        ...['solan', 'nahan', 'rampur', 'rohru'].flatMap(c => {
          if (!itemCirc.includes(c)) return ['-', '-', '-', '-', '-', '-', '-'];
          const b = r.allBalances ? r.allBalances[c] : (r.balances || {});
          return [
            b.diVsLoa?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '0.00', 
            b.diVsBom?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '0.00', 
            b.mrn?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '0.00', 
            b.mhrov?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '0.00', 
            b.imc?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '0.00', 
            b.supplyBill?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '0.00', 
            b.erectionBill?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '0.00'
          ];
        })
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [headers],
      body: rows,
      styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        3: { cellWidth: 50 } // Item name slightly wider
      },
      theme: 'grid'
    });

    doc.save(`Item_Summary_Matrix_${debouncedFilters.targetCircle}_${new Date().toISOString().slice(0,10)}.pdf`);
  };


  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      'Sr. No.', 'LOA Sr. No.', 'Temp Code', 'Item Name', 'Package', 'Circle',
      'Solan LOA Qty', 'Solan BOM Qty', 'Nahan LOA Qty', 'Nahan BOM Qty', 'Rampur LOA Qty', 'Rampur BOM Qty', 'Rohru LOA Qty', 'Rohru BOM Qty',
      'Total Dispatched Solan', 'Total Dispatched Nahan', 'Total Dispatched Rampur', 'Total Dispatched Rohru',
      'Total Inward (IR) Solan', 'Total Inward (IR) Nahan', 'Total Inward (IR) Rampur', 'Total Inward (IR) Rohru',
      'Total MRHOV Solan', 'Total MRHOV Nahan', 'Total MRHOV Rampur', 'Total MRHOV Rohru',
      'Total MIN/Issue Solan', 'Total MIN/Issue Nahan', 'Total MIN/Issue Rampur', 'Total MIN/Issue Rohru',
      'Total JMC Solan', 'Total JMC Nahan', 'Total JMC Rampur', 'Total JMC Rohru',
      'Total Supply Billed Solan', 'Total Supply Billed Nahan', 'Total Supply Billed Rampur', 'Total Supply Billed Rohru',
      'Total Erection Billed Solan', 'Total Erection Billed Nahan', 'Total Erection Billed Rampur', 'Total Erection Billed Rohru',
      ...['SOLAN', 'NAHAN', 'RAMPUR', 'ROHRU'].flatMap(c => [
        `Bal for DI against ${c} LOA`, `Bal for Dispatch against ${c} LOA`,
        `Bal for IR-${c}`, `Bal for MRHOv-${c}`, `Bal for JMC-${c}`,
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
        cv('solan', r.mhrovSolan), cv('nahan', r.mhrovNahan), cv('rampur', r.mhrovRampur), cv('rohru', r.mhrovRohru),
        cv('solan', r.minSolan), cv('nahan', r.minNahan), cv('rampur', r.minRampur), cv('rohru', r.minRohru),
        cv('solan', r.imcSolan), cv('nahan', r.imcNahan), cv('rampur', r.imcRampur), cv('rohru', r.imcRohru),
        cv('solan', r.supplyBilledSolan), cv('nahan', r.supplyBilledNahan), cv('rampur', r.supplyBilledRampur), cv('rohru', r.supplyBilledRohru),
        cv('solan', r.erectionBilledSolan), cv('nahan', r.erectionBilledNahan), cv('rampur', r.erectionBilledRampur), cv('rohru', r.erectionBilledRohru),
        ...['solan', 'nahan', 'rampur', 'rohru'].flatMap(c => {
          if (!itemCirc.includes(c)) return ['', '', '', '', '', '', ''];
          const b = r.allBalances ? r.allBalances[c] : (r.balances || {});
          return [b.diVsLoa ?? 0, b.diVsBom ?? 0, b.mrn ?? 0, b.mhrov ?? 0, b.imc ?? 0, b.supplyBill ?? 0, b.erectionBill ?? 0];
        })
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Item_Summary_Matrix_${debouncedFilters.targetCircle}.csv`);
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
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
          >
            <span>📄</span> Export to PDF
          </button>
          <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
        >
          <span>📥</span> Export to CSV
          </button>
        </div>
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
            {(totals.solanLoa + totals.nahanLoa + totals.rampurLoa + totals.rohruLoa).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">All 4 Circles LOA Sum</div>
        </div>

        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">Total Dispatched (DI)</div>
          <div className="text-lg font-extrabold text-blue-950 mt-0.5 font-mono">
            {(totals.dispatchedSolan + totals.dispatchedNahan + totals.dispatchedRampur + totals.dispatchedRohru).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-blue-700 mt-0.5">Dispatched across all DIs</div>
        </div>

        <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Total Inward (IR)</div>
        <div className="bg-cyan-50/50 p-3 rounded-xl border border-cyan-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-cyan-800 uppercase tracking-wider">Total MRHOV</div>
          <div className="text-lg font-extrabold text-cyan-950 mt-0.5 font-mono">
            {(totals.mhrovSolan + totals.mhrovNahan + totals.mhrovRampur + totals.mhrovRohru).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-cyan-700 mt-0.5">Handed over to Contractor</div>
        </div>
          <div className="text-lg font-extrabold text-emerald-950 mt-0.5 font-mono">
            {(totals.inwardSolan + totals.inwardNahan + totals.inwardRampur + totals.inwardRohru).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Received Store Stock</div>
        </div>

        <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-sky-800 uppercase tracking-wider">Total Supply Billed</div>
          <div className="text-lg font-extrabold text-sky-950 mt-0.5 font-mono">
            {(totals.supSolan + totals.supNahan + totals.supRampur + totals.supRohru).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-sky-700 mt-0.5">Purchase Invoices Billed</div>
        </div>

        <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-200/80 shadow-sm">
          <div className="text-[11px] font-semibold text-orange-900 uppercase tracking-wider">Bal DI vs LOA ({debouncedFilters.targetCircle})</div>
          <div className={`text-lg font-extrabold mt-0.5 font-mono ${totals.balDiLoa < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {totals.balDiLoa.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
              value={filters.packageFilter || ''}
              onChange={e => { setFilter('packageFilter', e.target.value); setFilter('page', '1'); }}
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
              value={filters.circleFilter || ''}
              onChange={e => { setFilter('circleFilter', e.target.value); setFilter('page', '1'); }}
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
              value={debouncedFilters.targetCircle}
              onChange={e => { setFilter('targetCircle', e.target.value); setFilter('page', '1'); }}
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
              value={filters.search || ''}
              onChange={e => { setFilter('search', e.target.value); setFilter('page', '1'); }}
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
            <input type="checkbox" checked={showMhrov} onChange={e => setShowMhrov(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            MRHOV
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-indigo-600">
            <input type="checkbox" checked={showMrn} onChange={e => setShowMrn(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
            Inward (IR)
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
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 divide-x divide-slate-200 sticky top-0 z-20">
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
                  <th className="p-2 min-w-[80px] bg-slate-100">Temp Code</th>
                  <th className="p-2 min-w-[220px] bg-slate-100">Item Name</th>
                  <th className="p-2 min-w-[120px] bg-slate-100">Package</th>
                  <th className="p-2 min-w-[100px] bg-slate-100">Circle</th>

                  <th className="p-2 min-w-[100px] bg-amber-50 text-right font-bold text-amber-900">LOA Quantity</th>
                  <th className="p-2 min-w-[100px] bg-amber-50 text-right font-bold text-amber-900">BOM Quantity</th>
                  
                  {showDi && <th className="p-2 min-w-[100px] bg-blue-50 text-right font-bold text-blue-900">Total DI Done</th>}
                  {showDi && <th className="p-2 min-w-[100px] bg-orange-50 text-right font-bold text-orange-900">Bal for DI against LOA</th>}
                  {showDi && <th className="p-2 min-w-[100px] bg-orange-50 text-right font-bold text-orange-900">Bal for Dispatch against LOA</th>}
                  
                  {showMrn && <th className="p-2 min-w-[100px] bg-emerald-50 text-right font-bold text-emerald-900">Total PI Done (IR)</th>}
                  {showMrn && <th className="p-2 min-w-[100px] bg-orange-50 text-right font-bold text-orange-900">Bal for IR</th>}
                  
                  {showMhrov && <th className="p-2 min-w-[100px] bg-cyan-50 text-right font-bold text-cyan-900">Total MRHOV Done</th>}
                  {showMhrov && <th className="p-2 min-w-[100px] bg-orange-50 text-right font-bold text-orange-900">Bal for MRHOV</th>}
                  
                  {showImc && <th className="p-2 min-w-[100px] bg-fuchsia-50 text-right font-bold text-fuchsia-900">Total JMC Done</th>}
                  {showImc && <th className="p-2 min-w-[100px] bg-orange-50 text-right font-bold text-orange-900">Bal for JMC</th>}
                  
                  {showSupplyBill && <th className="p-2 min-w-[100px] bg-indigo-50 text-right font-bold text-indigo-900">Supply Bill RA</th>}
                  {showSupplyBill && <th className="p-2 min-w-[100px] bg-orange-50 text-right font-bold text-orange-900">Bal for Supply Bill</th>}
                  
                  {showErectionBill && <th className="p-2 min-w-[100px] bg-violet-50 text-right font-bold text-violet-900">Erection Bill RA</th>}
                  {showErectionBill && <th className="p-2 min-w-[100px] bg-orange-50 text-right font-bold text-orange-900">Bal for Erection Bill</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400 font-sans">
                      No summary items found matching selected filters.
                    </td>
                  </tr>
                ) : (
                  data.map((r, idx) => {
                    const c = String(r.circle || '').toLowerCase();
                    
                    // Compute dynamic values based on the item's circle
                    const loaQty = r.solanLoaQty || r.nahanLoaQty || r.rampurLoaQty || r.rohruLoaQty || 0;
                    const bomQty = r.solanBomQty || r.nahanBomQty || r.rampurBomQty || r.rohruBomQty || 0;
                    
                    const diQty = r.dispatchedSolan || r.dispatchedNahan || r.dispatchedRampur || r.dispatchedRohru || r.dispatched?.solan || r.dispatched?.nahan || r.dispatched?.rampur || r.dispatched?.rohru || 0;
                    
                    const piQty = r.inwardSolan || r.inwardNahan || r.inwardRampur || r.inwardRohru || r.inward?.solan || r.inward?.nahan || r.inward?.rampur || r.inward?.rohru || 0;
                    
                    const mhrovQty = r.mhrovSolan || r.mhrovNahan || r.mhrovRampur || r.mhrovRohru || r.mhrov?.solan || r.mhrov?.nahan || r.mhrov?.rampur || r.mhrov?.rohru || 0;
                    const jmcQty = r.imcSolan || r.imcNahan || r.imcRampur || r.imcRohru || r.imc?.solan || r.imc?.nahan || r.imc?.rampur || r.imc?.rohru || 0;
                    const supplyBillQty = r.supplyBilledSolan || r.supplyBilledNahan || r.supplyBilledRampur || r.supplyBilledRohru || 0;
                    const erectionBillQty = r.erectionBilledSolan || r.erectionBilledNahan || r.erectionBilledRampur || r.erectionBilledRohru || 0;
                    
                    const itemCircleKey = c === 'solan' || c === 'nahan' || c === 'rampur' || c === 'rohru' ? c : 'solan';
                    const bal = r.allBalances ? r.allBalances[itemCircleKey] : (r.balances || {});

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 border-r bg-white sticky left-0 z-10 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedItems.has(r.tempCode || String(idx))}
                            onChange={(e) => {
                              const newSet = new Set(selectedItems);
                              if (e.target.checked) newSet.add(r.tempCode || String(idx));
                              else newSet.delete(r.tempCode || String(idx));
                              setSelectedItems(newSet);
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3 h-3 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 text-center text-slate-500 border-r">{idx + 1 + (Number(filters.page || 1) - 1) * Number(filters.limit || 50)}</td>
                        <td className="p-2 text-slate-700 border-r">{r.tempCode}</td>
                        <td className="p-2 font-medium text-slate-900 border-r max-w-[220px] truncate" title={r.itemName || r.name}>{r.itemName || r.name}</td>
                        <td className="p-2 text-slate-700 border-r">{r.package}</td>
                        <td className="p-2 text-slate-700 border-r">{r.circle}</td>

                        <td className="p-2 text-right text-amber-900 font-medium bg-amber-50/20">{loaQty || '-'}</td>
                        <td className="p-2 text-right text-amber-900 font-medium bg-amber-50/20">{bomQty || '-'}</td>

                        {showDi && <td className="p-2 text-right text-blue-900 font-medium bg-blue-50/20">{diQty || '-'}</td>}
                        {showDi && <td className="p-2 text-right text-orange-900 font-medium bg-orange-50/20">{bal?.diVsLoa ?? '-'}</td>}
                        {showDi && <td className="p-2 text-right text-orange-900 font-medium bg-orange-50/20">{bal?.diVsBom ?? '-'}</td>}
                        
                        {showMrn && <td className="p-2 text-right text-emerald-900 font-medium bg-emerald-50/20">{piQty || '-'}</td>}
                        {showMrn && <td className="p-2 text-right text-orange-900 font-medium bg-orange-50/20">{bal?.mrn ?? '-'}</td>}
                        
                        {showMhrov && <td className="p-2 text-right text-cyan-900 font-medium bg-cyan-50/20">{mhrovQty || '-'}</td>}
                        {showMhrov && <td className="p-2 text-right text-orange-900 font-medium bg-orange-50/20">{bal?.mhrov ?? '-'}</td>}
                        
                        {showImc && <td className="p-2 text-right text-fuchsia-900 font-medium bg-fuchsia-50/20">{jmcQty || '-'}</td>}
                        {showImc && <td className="p-2 text-right text-orange-900 font-medium bg-orange-50/20">{bal?.imc ?? '-'}</td>}
                        
                        {showSupplyBill && <td className="p-2 text-right text-indigo-900 font-medium bg-indigo-50/20">{supplyBillQty || '-'}</td>}
                        {showSupplyBill && <td className="p-2 text-right text-orange-900 font-medium bg-orange-50/20">{bal?.supplyBill ?? '-'}</td>}
                        
                        {showErectionBill && <td className="p-2 text-right text-violet-900 font-medium bg-violet-50/20">{erectionBillQty || '-'}</td>}
                        {showErectionBill && <td className="p-2 text-right text-orange-900 font-medium bg-orange-50/20">{bal?.erectionBill ?? '-'}</td>}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                {!loading && data.length > 0 && (() => {
                  let totalLoa = 0;
                  let totalBom = 0;
                  let totalDi = 0;
                  let totalPi = 0;
                  let totalMhrov = 0;
                  let totalJmc = 0;
                  let totalSupplyBill = 0;
                  let totalErectionBill = 0;
                  
                  let totalBalDiLoa = 0;
                  let totalBalDiBom = 0;
                  let totalBalMrn = 0;
                  let totalBalMhrov = 0;
                  let totalBalImc = 0;
                  let totalBalSupplyBill = 0;
                  let totalBalErectionBill = 0;

                  data.forEach(r => {
                    if (selectedItems.size > 0 && !selectedItems.has(r.tempCode || '')) return;
                    totalLoa += (r.solanLoaQty || r.nahanLoaQty || r.rampurLoaQty || r.rohruLoaQty || 0);
                    totalBom += (r.solanBomQty || r.nahanBomQty || r.rampurBomQty || r.rohruBomQty || 0);
                    totalDi += (r.dispatchedSolan || r.dispatchedNahan || r.dispatchedRampur || r.dispatchedRohru || r.dispatched?.solan || r.dispatched?.nahan || r.dispatched?.rampur || r.dispatched?.rohru || 0);
                    totalPi += (r.inwardSolan || r.inwardNahan || r.inwardRampur || r.inwardRohru || r.inward?.solan || r.inward?.nahan || r.inward?.rampur || r.inward?.rohru || 0);
                    totalMhrov += (r.mhrovSolan || r.mhrovNahan || r.mhrovRampur || r.mhrovRohru || r.mhrov?.solan || r.mhrov?.nahan || r.mhrov?.rampur || r.mhrov?.rohru || 0);
                    totalJmc += (r.imcSolan || r.imcNahan || r.imcRampur || r.imcRohru || r.imc?.solan || r.imc?.nahan || r.imc?.rampur || r.imc?.rohru || 0);
                    totalSupplyBill += (r.supplyBilledSolan || r.supplyBilledNahan || r.supplyBilledRampur || r.supplyBilledRohru || 0);
                    totalErectionBill += (r.erectionBilledSolan || r.erectionBilledNahan || r.erectionBilledRampur || r.erectionBilledRohru || 0);
                    
                    const c = String(r.circle || '').toLowerCase();
                    const itemCircleKey = c === 'solan' || c === 'nahan' || c === 'rampur' || c === 'rohru' ? c : 'solan';
                    const bal = r.allBalances ? r.allBalances[itemCircleKey] : (r.balances || {});
                    
                    totalBalDiLoa += (bal?.diVsLoa || 0);
                    totalBalDiBom += (bal?.diVsBom || 0);
                    totalBalMrn += (bal?.mrn || 0);
                    totalBalMhrov += (bal?.mhrov || 0);
                    totalBalImc += (bal?.imc || 0);
                    totalBalSupplyBill += (bal?.supplyBill || 0);
                    totalBalErectionBill += (bal?.erectionBill || 0);
                  });

                  return (
                    <tr className="bg-slate-800 text-white font-bold divide-x divide-slate-700 text-[11px]">
                      <td colSpan={6} className="p-2 text-right font-sans">
                        {selectedItems.size > 0 ? `TOTAL (Selected ${selectedItems.size} items)` : 'TOTAL (Current Page)'}
                      </td>
                      <td className="p-2 text-right text-amber-300">{totalLoa}</td>
                      <td className="p-2 text-right text-amber-300">{totalBom}</td>
                      
                      {showDi && <td className="p-2 text-right text-blue-300">{totalDi}</td>}
                      {showDi && <td className="p-2 text-right text-orange-300">{totalBalDiLoa}</td>}
                      {showDi && <td className="p-2 text-right text-orange-300">{totalBalDiBom}</td>}
                      
                      {showMrn && <td className="p-2 text-right text-emerald-300">{totalPi}</td>}
                      {showMrn && <td className="p-2 text-right text-orange-300">{totalBalMrn}</td>}
                      
                      {showMhrov && <td className="p-2 text-right text-cyan-300">{totalMhrov}</td>}
                      {showMhrov && <td className="p-2 text-right text-orange-300">{totalBalMhrov}</td>}
                      
                      {showImc && <td className="p-2 text-right text-fuchsia-300">{totalJmc}</td>}
                      {showImc && <td className="p-2 text-right text-orange-300">{totalBalImc}</td>}
                      
                      {showSupplyBill && <td className="p-2 text-right text-indigo-300">{totalSupplyBill}</td>}
                      {showSupplyBill && <td className="p-2 text-right text-orange-300">{totalBalSupplyBill}</td>}
                      
                      {showErectionBill && <td className="p-2 text-right text-violet-300">{totalErectionBill}</td>}
                      {showErectionBill && <td className="p-2 text-right text-orange-300">{totalBalErectionBill}</td>}
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-600 gap-3">
          <div>
            Showing <span className="font-bold text-slate-900">{data.length > 0 ? (Number(filters.page || 1) - 1) * Number(filters.limit || 50) + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-900">{Math.min(Number(filters.page || 1) * Number(filters.limit || 50), totalItems)}</span> of{' '}
            <span className="font-bold text-slate-900">{totalItems}</span> master items
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filters.limit || '50'}
              onChange={e => { setFilter('limit', e.target.value); setFilter('page', '1'); }}
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
              disabled={Number(filters.page || 1) <= 1}
              onClick={() => setFilter('page', String(Math.max(1, Number(filters.page || 1) - 1)))}
              className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 font-medium"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-800">Page {filters.page || 1} of {Math.ceil(totalItems / Number(filters.limit || 50)) || 1}</span>
            <button
              disabled={Number(filters.page || 1) * Number(filters.limit || 50) >= totalItems}
              onClick={() => setFilter('page', String(Number(filters.page || 1) + 1))}
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
