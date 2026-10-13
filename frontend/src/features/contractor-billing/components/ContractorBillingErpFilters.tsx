'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Building2, 
  Calendar, 
  IndianRupee, 
  Tag, 
  Layers, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface BillingFilterState {
  search: string;
  presetView: 'ALL' | 'CONTRACTOR_BILL' | 'ERECTION_BILL' | 'PENDING' | 'APPROVED' | 'HIGH_VALUE';
  category: string; // 'ALL' | 'Contractor Bill' | 'Erection Bill'
  contractor: string; // 'ALL' | contractor name
  status: string; // 'ALL' | 'Pending PM Approval' | 'Approved' | 'Submitted' | 'Draft' | 'Paid' | 'Rejected'
  stage: string; // 'ALL' | '90%' | '100%' | etc.
  circle: string; // 'ALL' | circle name
  packageVal: string; // 'ALL' | package name
  datePreset: 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_FY' | 'CUSTOM';
  startDate: string;
  endDate: string;
  amountRange: 'ALL' | 'UNDER_5L' | '5L_25L' | '25L_1CR' | 'OVER_1CR' | 'CUSTOM';
  minAmount: string;
  maxAmount: string;
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'bill_asc' | 'contractor_asc';
}

export const initialBillingFilterState: BillingFilterState = {
  search: '',
  presetView: 'ALL',
  category: 'ALL',
  contractor: 'ALL',
  status: 'ALL',
  stage: 'ALL',
  circle: 'ALL',
  packageVal: 'ALL',
  datePreset: 'ALL',
  startDate: '',
  endDate: '',
  amountRange: 'ALL',
  minAmount: '',
  maxAmount: '',
  sortBy: 'date_desc',
};

interface ContractorBillingErpFiltersProps {
  filters: BillingFilterState;
  onFilterChange: (filters: BillingFilterState) => void;
  rawBills: any[];
  filteredCount: number;
  filteredTotalAmount: number;
}

export const ContractorBillingErpFilters: React.FC<ContractorBillingErpFiltersProps> = ({
  filters,
  onFilterChange,
  rawBills,
  filteredCount,
  filteredTotalAmount,
}) => {
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Dynamic distinct lists from dataset
  const dynamicOptions = useMemo(() => {
    const contractorsMap = new Map<string, number>();
    const circlesSet = new Set<string>();
    const packagesSet = new Set<string>();
    const stagesSet = new Set<string>();
    const statusesSet = new Set<string>();

    let totalContractorBills = 0;
    let totalErectionBills = 0;
    let totalPendingBills = 0;
    let totalApprovedBills = 0;
    let totalHighValueBills = 0;

    rawBills.forEach((b: any) => {
      const cName = b.contractorId?.dynamicData?.displayName || 
                    b.contractorId?.name || 
                    b.legacyMetadata?.billedBy || 
                    'Legacy Data (Unlinked)';
      contractorsMap.set(cName, (contractorsMap.get(cName) || 0) + 1);

      const circle = b.workOrderId?.circle || b.legacyMetadata?.circle;
      if (circle) circlesSet.add(String(circle).trim());

      const pkg = b.workOrderId?.package || b.legacyMetadata?.package;
      if (pkg) packagesSet.add(String(pkg).trim());

      if (b.stage) stagesSet.add(String(b.stage).trim());
      if (b.status) statusesSet.add(String(b.status).trim());

      const isErection = b.billingCategory === 'Erection Bill' || String(b.invoiceNumber || '').includes('/ER/');
      if (isErection) totalErectionBills++;
      else totalContractorBills++;

      if (String(b.status).toLowerCase().includes('pending') || b.status === 'Submitted') {
        totalPendingBills++;
      }
      if (b.status === 'Approved') {
        totalApprovedBills++;
      }
      if ((b.grandTotal || 0) >= 1000000) {
        totalHighValueBills++;
      }
    });

    return {
      contractors: Array.from(contractorsMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      circles: Array.from(circlesSet).sort(),
      packages: Array.from(packagesSet).sort(),
      stages: Array.from(stagesSet).sort(),
      statuses: Array.from(statusesSet).sort(),
      counts: {
        all: rawBills.length,
        contractor: totalContractorBills,
        erection: totalErectionBills,
        pending: totalPendingBills,
        approved: totalApprovedBills,
        highValue: totalHighValueBills,
      }
    };
  }, [rawBills]);

  // Count active filters (excluding default preset values)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count++;
    if (filters.category !== 'ALL') count++;
    if (filters.contractor !== 'ALL') count++;
    if (filters.status !== 'ALL') count++;
    if (filters.stage !== 'ALL') count++;
    if (filters.circle !== 'ALL') count++;
    if (filters.packageVal !== 'ALL') count++;
    if (filters.datePreset !== 'ALL' || filters.startDate || filters.endDate) count++;
    if (filters.amountRange !== 'ALL' || filters.minAmount || filters.maxAmount) count++;
    return count;
  }, [filters]);

  const handleUpdate = (patch: Partial<BillingFilterState>) => {
    onFilterChange({ ...filters, ...patch });
  };

  const handleReset = () => {
    onFilterChange(initialBillingFilterState);
  };

  const handlePresetView = (view: BillingFilterState['presetView']) => {
    const updated = { ...initialBillingFilterState, presetView: view };
    if (view === 'CONTRACTOR_BILL') updated.category = 'Contractor Bill';
    if (view === 'ERECTION_BILL') updated.category = 'Erection Bill';
    if (view === 'PENDING') updated.status = 'Pending PM Approval';
    if (view === 'APPROVED') updated.status = 'Approved';
    if (view === 'HIGH_VALUE') updated.amountRange = 'OVER_1CR';
    onFilterChange(updated);
  };

  // Export to Excel (Enterprise ERP standard)
  const handleExportExcel = () => {
    if (rawBills.length === 0) return;

    // Filter data using current filter props
    const exportRows = rawBills.map((b: any, index: number) => {
      const isErection = b.billingCategory === 'Erection Bill' || String(b.invoiceNumber || '').includes('/ER/');
      return {
        'SL No': index + 1,
        'Bill Number': b.invoiceNumber || '-',
        'Date': b.date ? new Date(b.date).toLocaleDateString('en-IN') : '-',
        'Billing Nature': isErection ? 'Erection Bill' : 'Contractor Bill',
        'Contractor Name': b.contractorId?.dynamicData?.displayName || b.contractorId?.name || b.legacyMetadata?.billedBy || '-',
        'Work Order / Pkg': b.workOrderId?.workOrderNumber || b.legacyMetadata?.package || '-',
        'Circle / Region': b.workOrderId?.circle || b.legacyMetadata?.circle || '-',
        'Billing Stage': b.stage || '-',
        'Base Amount (₹)': b.totalBaseAmount || 0,
        'GST Amount (₹)': b.totalGstAmount || 0,
        'Grand Total (₹)': b.grandTotal || 0,
        'Approval Status': b.status || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contractor Bills');
    
    // Auto-fit column widths
    const maxProps = Object.keys(exportRows[0] || {}).map(k => ({
      wch: Math.max(k.length, 14)
    }));
    worksheet['!cols'] = maxProps;

    XLSX.writeFile(workbook, `Contractor_Billing_ERP_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-3 mb-6">
      {/* 1. SAP Fiori / Zoho Segmented View Selector */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar text-xs font-medium">
        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1 hidden sm:inline">
          View:
        </span>
        
        <button
          onClick={() => handlePresetView('ALL')}
          className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap ${
            filters.presetView === 'ALL' && activeFiltersCount === 0
              ? 'bg-slate-900 border-slate-900 text-white shadow-sm font-semibold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span>All Bills</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
            filters.presetView === 'ALL' && activeFiltersCount === 0
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {dynamicOptions.counts.all}
          </span>
        </button>

        <button
          onClick={() => handlePresetView('CONTRACTOR_BILL')}
          className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap ${
            filters.presetView === 'CONTRACTOR_BILL'
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-semibold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span>Contractor Bill (Supply)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
            filters.presetView === 'CONTRACTOR_BILL'
              ? 'bg-white/20 text-white'
              : 'bg-blue-50 text-blue-700'
          }`}>
            {dynamicOptions.counts.contractor}
          </span>
        </button>

        <button
          onClick={() => handlePresetView('ERECTION_BILL')}
          className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap ${
            filters.presetView === 'ERECTION_BILL'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-semibold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <span>Erection Bill</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
            filters.presetView === 'ERECTION_BILL'
              ? 'bg-white/20 text-white'
              : 'bg-indigo-50 text-indigo-700'
          }`}>
            {dynamicOptions.counts.erection}
          </span>
        </button>

        <button
          onClick={() => handlePresetView('PENDING')}
          className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap ${
            filters.presetView === 'PENDING'
              ? 'bg-amber-600 border-amber-600 text-white shadow-sm font-semibold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Approvals</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
            filters.presetView === 'PENDING'
              ? 'bg-white/20 text-white'
              : 'bg-amber-50 text-amber-700'
          }`}>
            {dynamicOptions.counts.pending}
          </span>
        </button>

        <button
          onClick={() => handlePresetView('APPROVED')}
          className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap ${
            filters.presetView === 'APPROVED'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-semibold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approved</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
            filters.presetView === 'APPROVED'
              ? 'bg-white/20 text-white'
              : 'bg-emerald-50 text-emerald-700'
          }`}>
            {dynamicOptions.counts.approved}
          </span>
        </button>

        <button
          onClick={() => handlePresetView('HIGH_VALUE')}
          className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap ${
            filters.presetView === 'HIGH_VALUE'
              ? 'bg-purple-600 border-purple-600 text-white shadow-sm font-semibold'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>High Value (≥ ₹10L)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
            filters.presetView === 'HIGH_VALUE'
              ? 'bg-white/20 text-white'
              : 'bg-purple-50 text-purple-700'
          }`}>
            {dynamicOptions.counts.highValue}
          </span>
        </button>
      </div>

      {/* 2. Main Enterprise Filter Bar (SAP S/4HANA & Zoho Books Style) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/40">
          
          {/* Universal Instant Search */}
          <div className="relative flex-1 min-w-[280px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by Bill #, Contractor, Work Order, Circle, Package..."
              value={filters.search}
              onChange={(e) => handleUpdate({ search: e.target.value })}
              className="w-full h-10 pl-10 pr-9 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
            />
            {filters.search && (
              <button
                onClick={() => handleUpdate({ search: '' })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Toggle Advanced Filters Button */}
            <button
              onClick={() => setIsFilterPanelOpen(prev => !prev)}
              className={`h-10 px-3.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                isFilterPanelOpen || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                  {activeFiltersCount}
                </span>
              )}
              {isFilterPanelOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Quick Sort Dropdown */}
            <div className="relative">
              <select
                value={filters.sortBy}
                onChange={(e) => handleUpdate({ sortBy: e.target.value as any })}
                className="h-10 pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none shadow-2xs"
              >
                <option value="date_desc">Sort: Date (Newest first)</option>
                <option value="date_asc">Sort: Date (Oldest first)</option>
                <option value="amount_desc">Sort: Amount (High to Low)</option>
                <option value="amount_asc">Sort: Amount (Low to High)</option>
                <option value="bill_asc">Sort: Bill Number (A → Z)</option>
                <option value="contractor_asc">Sort: Contractor (A → Z)</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset Filters Button */}
            {activeFiltersCount > 0 && (
              <button
                onClick={handleReset}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* Export to Excel */}
            <button
              onClick={handleExportExcel}
              className="h-10 px-3.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Download currently filtered records in Excel"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* 3. Collapsible Multi-Dimension Advanced Filters Grid (SAP Fiori Style) */}
        {isFilterPanelOpen && (
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 text-slate-800 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              
              {/* Category / Nature */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Bill Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleUpdate({ category: e.target.value, presetView: 'ALL' })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Contractor Bill">Contractor Bill (Supply)</option>
                  <option value="Erection Bill">Erection Bill</option>
                </select>
              </div>

              {/* Contractor */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Contractor
                </label>
                <select
                  value={filters.contractor}
                  onChange={(e) => handleUpdate({ contractor: e.target.value, presetView: 'ALL' })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Contractors ({dynamicOptions.contractors.length})</option>
                  {dynamicOptions.contractors.map(([name, count]) => (
                    <option key={name} value={name}>
                      {name} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Approval Status */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Approval Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleUpdate({ status: e.target.value, presetView: 'ALL' })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending PM Approval">Pending PM Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Draft">Draft</option>
                  <option value="Paid">Paid</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Billing Stage */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Stage / Milestone
                </label>
                <select
                  value={filters.stage}
                  onChange={(e) => handleUpdate({ stage: e.target.value, presetView: 'ALL' })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Stages</option>
                  {dynamicOptions.stages.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Circle / Region */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Circle / Region
                </label>
                <select
                  value={filters.circle}
                  onChange={(e) => handleUpdate({ circle: e.target.value, presetView: 'ALL' })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Circles</option>
                  {dynamicOptions.circles.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Package */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Package
                </label>
                <select
                  value={filters.packageVal}
                  onChange={(e) => handleUpdate({ packageVal: e.target.value, presetView: 'ALL' })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Packages</option>
                  {dynamicOptions.packages.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Date Presets */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Date Range
                </label>
                <select
                  value={filters.datePreset}
                  onChange={(e) => handleUpdate({ datePreset: e.target.value as any, presetView: 'ALL' })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today</option>
                  <option value="THIS_WEEK">This Week</option>
                  <option value="THIS_MONTH">This Month</option>
                  <option value="LAST_MONTH">Last Month</option>
                  <option value="THIS_FY">This Financial Year</option>
                  <option value="CUSTOM">Custom Range</option>
                </select>
              </div>

              {/* Amount Range */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                  Amount Range (₹)
                </label>
                <select
                  value={filters.amountRange}
                  onChange={(e) => handleUpdate({ amountRange: e.target.value as any, presetView: 'ALL' })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Amounts</option>
                  <option value="UNDER_5L">Under ₹5 Lakhs</option>
                  <option value="5L_25L">₹5 Lakhs – ₹25 Lakhs</option>
                  <option value="25L_1CR">₹25 Lakhs – ₹1 Crore</option>
                  <option value="OVER_1CR">Over ₹1 Crore</option>
                  <option value="CUSTOM">Custom Threshold</option>
                </select>
              </div>

              {/* Custom Date Pickers when CUSTOM is active */}
              {filters.datePreset === 'CUSTOM' && (
                <>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleUpdate({ startDate: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleUpdate({ endDate: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Custom Min/Max Amount inputs when CUSTOM is active */}
              {filters.amountRange === 'CUSTOM' && (
                <>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Min Amount (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 100000"
                      value={filters.minAmount}
                      onChange={(e) => handleUpdate({ minAmount: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                      Max Amount (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000000"
                      value={filters.maxAmount}
                      onChange={(e) => handleUpdate({ maxAmount: e.target.value })}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 4. Active Filter Tags Strip (Zoho & SAP Style) */}
        {activeFiltersCount > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mr-1">
                Active:
              </span>

              {filters.search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[11px]">
                  <span>Search: &quot;{filters.search}&quot;</span>
                  <button onClick={() => handleUpdate({ search: '' })} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.category !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium text-[11px]">
                  <span>Category: {filters.category}</span>
                  <button onClick={() => handleUpdate({ category: 'ALL' })} className="hover:text-indigo-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.contractor !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 font-medium text-[11px]">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  <span className="max-w-[150px] truncate">{filters.contractor}</span>
                  <button onClick={() => handleUpdate({ contractor: 'ALL' })} className="hover:text-slate-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.status !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[11px]">
                  <span>Status: {filters.status}</span>
                  <button onClick={() => handleUpdate({ status: 'ALL' })} className="hover:text-amber-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.stage !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium text-[11px]">
                  <span>Stage: {filters.stage}</span>
                  <button onClick={() => handleUpdate({ stage: 'ALL' })} className="hover:text-purple-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.circle !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium text-[11px]">
                  <span>Circle: {filters.circle}</span>
                  <button onClick={() => handleUpdate({ circle: 'ALL' })} className="hover:text-teal-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.packageVal !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-medium text-[11px]">
                  <span>Package: {filters.packageVal}</span>
                  <button onClick={() => handleUpdate({ packageVal: 'ALL' })} className="hover:text-cyan-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.datePreset !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                  <Calendar className="w-3 h-3" />
                  <span>Date: {filters.datePreset.replace('_', ' ')}</span>
                  <button onClick={() => handleUpdate({ datePreset: 'ALL', startDate: '', endDate: '' })} className="hover:text-emerald-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {filters.amountRange !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium text-[11px]">
                  <IndianRupee className="w-3 h-3" />
                  <span>Amount: {filters.amountRange.replace('_', ' ')}</span>
                  <button onClick={() => handleUpdate({ amountRange: 'ALL', minAmount: '', maxAmount: '' })} className="hover:text-rose-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={handleReset}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold ml-1 underline decoration-dotted"
              >
                Clear all
              </button>
            </div>

            {/* Live Filter Counter & Aggregate */}
            <div className="text-right text-slate-500 font-medium text-[11px]">
              Showing <span className="font-bold text-slate-900">{filteredCount}</span> of <span className="font-semibold text-slate-700">{rawBills.length}</span> bills 
              <span className="mx-1.5">•</span>
              Filtered Total: <span className="font-bold text-slate-900">₹ {filteredTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
