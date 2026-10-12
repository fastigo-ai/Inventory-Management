"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Copy, Check, ArrowRight, TrendingUp, AlertTriangle, 
  CheckCircle2, Box, Package, Truck, FileText, IndianRupee, 
  Layers, Warehouse, Building2, User, RefreshCw, Sparkles, Filter
} from 'lucide-react';

interface Item360DrawerProps {
  item: any | null;
  onClose: () => void;
  onFilterByCode?: (code: string) => void;
  onFilterByCircle?: (circle: string) => void;
}

const inr = (n: number) => Math.round(n || 0).toLocaleString('en-IN');
const money = (n: number) => '₹' + inr(n);
const cr = (n: number) => ((n || 0) / 1e7).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdate = (ms: any) => {
  if (!ms) return '—';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export default function Item360Drawer({ item, onClose, onFilterByCode, onFilterByCircle }: Item360DrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'procurement' | 'store' | 'site' | 'billing'>('overview');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const d = item.d || {};
  const rate = item.rate || 0;
  const loaQty = item.loa || 0;
  const bomQty = item.bom || 0;
  const poQty = d.po?.qty ?? loaQty;
  const poVal = d.po?.val ?? (poQty * rate);
  const diQty = d.di?.qty || 0;
  const grnQty = d.receipt?.qty || d.inward?.qty || 0;
  const stockQty = item.stock || 0;
  const issuedQty = d.min?.qty || 0;
  const returnedQty = d.cret?.qty || 0;
  const mhrovQty = d.mrhov?.qty || returnedQty;
  const woQty = d.wo?.qty || 0;
  const demandQty = d.dn?.qty || 0;
  const transferInQty = d.inter?.qty || 0;
  const transferOutQty = d.outward?.qty || 0;
  const inTransitQty = Math.max(0, transferOutQty - transferInQty);

  // Billing
  const supplyBilled = (d.mis_b_c_s?.ra60Qty || 0) + (d.mis_b_c_s?.ra30Qty || 0) + (d.mis_b_c_s?.ra10Qty || 0);
  const erectionBilled = (d.mis_b_c_e?.er90Qty || 0) + (d.mis_b_c_e?.er10Qty || 0);
  const billedQty = (supplyBilled + erectionBilled) || (d.cbill?.amt ? Math.round(d.cbill.amt / (rate || 1)) : 0);
  const billedVal = d.cbill?.amt || (billedQty * rate);

  // Reorder & Health
  const reorderLevel = d.store?.reorder ?? Math.round(loaQty * 0.15);
  const stockRatio = loaQty > 0 ? (stockQty / loaQty) : 0;
  const isCrit = stockRatio < 0.2 || stockQty <= reorderLevel;
  const isWarn = !isCrit && stockRatio < 0.5;

  // Percentage Fulfilment
  const poFulfillment = loaQty > 0 ? Math.min(100, Math.round((poQty / loaQty) * 100)) : 100;
  const deliveryFulfillment = poQty > 0 ? Math.min(100, Math.round((grnQty / poQty) * 100)) : 0;
  const siteIssueFulfillment = grnQty > 0 ? Math.min(100, Math.round((issuedQty / grnQty) * 100)) : 0;
  const billingFulfillment = issuedQty > 0 ? Math.min(100, Math.round((billedQty / issuedQty) * 100)) : 0;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(item.code || '');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopySummary = () => {
    const summaryText = `[Item 360] ${item.code}: ${item.name} | Circle: ${item.circle} | Unit: ${item.unit} | Rate: ₹${inr(rate)} | LOA: ${inr(loaQty)} | Stock: ${inr(stockQty)} | Issued: ${inr(issuedQty)} | Billed: ${inr(billedQty)}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-3xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                  {item.code || 'NO-CODE'}
                </span>
                <button 
                  onClick={handleCopyCode} 
                  title="Copy Temp Code"
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {item.pkg || 'Package N/A'}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {item.circle || 'Global'} {item.subcircle ? `(${item.subcircle})` : ''}
                </span>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white leading-snug pr-8 tracking-tight">
                {item.name}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>Category: <strong className="text-slate-200">{item.cat || 'General'}</strong></span>
                <span>•</span>
                <span>Unit: <strong className="text-slate-200">{item.unit || 'Nos'}</strong></span>
                <span>•</span>
                <span>Contract Rate: <strong className="text-emerald-400">₹{inr(rate)}</strong></span>
              </div>
            </div>

            {/* Health & Quick Action bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  isCrit ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                  isWarn ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isCrit ? <AlertTriangle className="w-3 h-3 text-red-400" /> : <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {isCrit ? 'Critical Stock' : isWarn ? 'Low Stock Warning' : 'Healthy Stock Level'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Available: <strong className="text-white font-mono">{inr(stockQty)} {item.unit}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onFilterByCode && (
                  <button 
                    onClick={() => { onFilterByCode(item.code); onClose(); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/60 hover:bg-indigo-600 text-white font-medium text-[11px] transition-colors"
                  >
                    <Filter className="w-3 h-3" /> Focus Item in Table
                  </button>
                )}
                <button 
                  onClick={handleCopySummary}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px]"
                >
                  {copiedSummary ? <Check className="w-3 h-3 text-emerald-400" /> : <Sparkles className="w-3 h-3 text-indigo-400" />}
                  {copiedSummary ? 'Copied' : 'Share'}
                </button>
              </div>
            </div>
          </div>

          {/* End-to-End Lifecycle Funnel / Flow Pipeline */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" /> Complete Supply Chain & Billing Pipeline
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">1. LOA Contract</span>
                <span className="text-sm font-extrabold text-slate-800 tabular-nums block mt-0.5">{inr(loaQty)}</span>
                <span className="text-[10px] text-slate-500 font-medium">{item.unit}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">2. PO Ordered</span>
                <span className="text-sm font-extrabold text-indigo-700 tabular-nums block mt-0.5">{inr(poQty)}</span>
                <span className="text-[10px] text-slate-500 font-medium">{poFulfillment}% of LOA</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">3. Inward / GRN</span>
                <span className="text-sm font-extrabold text-blue-700 tabular-nums block mt-0.5">{inr(grnQty)}</span>
                <span className="text-[10px] text-slate-500 font-medium">{deliveryFulfillment}% of PO</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">4. Store Stock</span>
                <span className={`text-sm font-extrabold tabular-nums block mt-0.5 ${isCrit ? 'text-red-600' : 'text-emerald-700'}`}>{inr(stockQty)}</span>
                <span className="text-[10px] text-slate-500 font-medium">Reorder: {inr(reorderLevel)}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">5. Issued (MIN)</span>
                <span className="text-sm font-extrabold text-purple-700 tabular-nums block mt-0.5">{inr(issuedQty)}</span>
                <span className="text-[10px] text-slate-500 font-medium">{siteIssueFulfillment}% of Inward</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">6. RA Billed</span>
                <span className="text-sm font-extrabold text-teal-700 tabular-nums block mt-0.5">{inr(billedQty)}</span>
                <span className="text-[10px] text-slate-500 font-medium">{billingFulfillment}% of Issued</span>
              </div>
            </div>

            {/* Pipeline Fulfillment Bars */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/60">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">Delivery Fulfilled</span>
                  <span className="font-bold text-slate-700">{deliveryFulfillment}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${deliveryFulfillment}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">Issued to Contractors</span>
                  <span className="font-bold text-slate-700">{siteIssueFulfillment}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${siteIssueFulfillment}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-500 font-medium">Billing Realized</span>
                  <span className="font-bold text-slate-700">{billingFulfillment}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${billingFulfillment}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-white px-6 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview & Stock Health', icon: <Box className="w-3.5 h-3.5" /> },
              { id: 'procurement', label: 'Procurement (PO/DI/PI)', icon: <Package className="w-3.5 h-3.5" /> },
              { id: 'store', label: 'Store & In-Transit', icon: <Warehouse className="w-3.5 h-3.5" /> },
              { id: 'site', label: 'Site & Contractors (MIN)', icon: <Truck className="w-3.5 h-3.5" /> },
              { id: 'billing', label: 'Billing & Commercials', icon: <IndianRupee className="w-3.5 h-3.5" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">

            {/* TAB 1: OVERVIEW & STOCK HEALTH */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Total Contract Value (LOA)</span>
                    <div className="text-xl font-black text-slate-800 mt-1">{money(loaQty * rate)}</div>
                    <div className="text-xs text-slate-500 mt-1">₹{cr(loaQty * rate)} Cr • {inr(loaQty)} {item.unit}</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Inventory Stock Value</span>
                    <div className="text-xl font-black text-emerald-700 mt-1">{money(stockQty * rate)}</div>
                    <div className="text-xs text-slate-500 mt-1">At warehouse • {inr(stockQty)} {item.unit}</div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Client Billed Value</span>
                    <div className="text-xl font-black text-indigo-700 mt-1">{money(billedVal)}</div>
                    <div className="text-xs text-slate-500 mt-1">Supply + Erection • {inr(billedQty)} {item.unit}</div>
                  </div>
                </div>

                {/* Stock Health & Safety Stock Gauge */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center justify-between">
                    <span>Stock Health & Reorder Analysis</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      isCrit ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {isCrit ? 'Needs Reorder' : 'Adequate Safety Buffer'}
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Available In Depot</span>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">{inr(stockQty)} {item.unit}</div>
                      <span className="text-[11px] text-slate-500">Depot: {d.store?.depot || 'Main Central Depot'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Reorder Threshold</span>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">{inr(reorderLevel)} {item.unit}</div>
                      <span className="text-[11px] text-slate-500">15% of LOA Target</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Safety Buffer</span>
                      <div className={`text-lg font-bold mt-0.5 ${stockQty >= reorderLevel ? 'text-emerald-700' : 'text-red-600'}`}>
                        {stockQty >= reorderLevel ? `+${inr(stockQty - reorderLevel)}` : `-${inr(reorderLevel - stockQty)}`} {item.unit}
                      </div>
                      <span className="text-[11px] text-slate-500">{stockQty >= reorderLevel ? 'Above safety level' : 'Below safety level'}</span>
                    </div>
                  </div>

                  {inTransitQty > 0 && (
                    <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200/60 text-xs text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>{inr(inTransitQty)} {item.unit}</strong> are currently in transit between stores and will replenish depot upon arrival.
                      </span>
                    </div>
                  )}
                </div>

                {/* Assigned Contractors */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" /> Active Contractors on this Item
                  </h4>
                  {Array.isArray(item.contractors) && item.contractors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.contractors.map((c: string, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                          <Building2 className="w-3 h-3 text-slate-400" /> {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No specific contractor assigned yet.</p>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: PROCUREMENT & PO */}
            {activeTab === 'procurement' && (
              <div className="space-y-6">
                
                {/* Purchase Order (PO) */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-600" /> Purchase Order (PO)
                    </h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      d.po?.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      d.po?.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {d.po?.status || 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">PO Number</span>
                      <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{d.po?.no || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">PO Date</span>
                      <div className="text-sm font-semibold text-slate-700 mt-0.5">{fdate(d.po?.date)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">PO Quantity</span>
                      <div className="text-sm font-bold text-indigo-700 mt-0.5">{inr(poQty)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">PO Value</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{money(poVal)}</div>
                    </div>
                  </div>
                </div>

                {/* Dispatch Instruction (DI) */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" /> Dispatch Instruction (DI)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">DI Number</span>
                      <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{d.di?.no || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Dispatched Quantity</span>
                      <div className="text-sm font-bold text-blue-700 mt-0.5">{inr(diQty)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">DI Date</span>
                      <div className="text-sm font-semibold text-slate-700 mt-0.5">{fdate(d.di?.date)}</div>
                    </div>
                  </div>
                </div>

                {/* Purchase Invoice (PI) */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" /> Vendor Purchase Invoice (PI)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Invoice Number</span>
                      <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{d.pi?.no || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Invoiced Quantity</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{inr(d.pi?.qty || 0)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Invoice Amount</span>
                      <div className="text-sm font-bold text-purple-700 mt-0.5">{money(d.pi?.amt || 0)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Payment Status</span>
                      <div className="text-sm font-bold text-slate-700 mt-0.5">{d.pi?.status || 'Posted'}</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: STORE & IN-TRANSIT */}
            {activeTab === 'store' && (
              <div className="space-y-6">

                {/* Warehouse Location & Inward */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-emerald-600" /> Depot Receipt & GRN
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Depot</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{d.store?.depot || 'Central Depot'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">GRN No.</span>
                      <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{d.receipt?.no || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Received Qty</span>
                      <div className="text-sm font-bold text-emerald-700 mt-0.5">{inr(grnQty)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Last Inward Date</span>
                      <div className="text-sm font-semibold text-slate-700 mt-0.5">{fdate(d.inward?.date)}</div>
                    </div>
                  </div>
                </div>

                {/* Inter-Store Transfers */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" /> Inter-Depot Transfers
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Transfer IN</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{inr(transferInQty)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Transfer OUT</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{inr(transferOutQty)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Route Details</span>
                      <div className="text-sm font-semibold text-slate-700 mt-0.5">{d.inter?.route || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Net In-Transit</span>
                      <div className={`text-sm font-bold mt-0.5 ${inTransitQty > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                        {inr(inTransitQty)} {item.unit}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: SITE & CONTRACTORS */}
            {activeTab === 'site' && (
              <div className="space-y-6">

                {/* Work Order & Demand Note */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" /> Execution Work Order & Demand Note
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Work Order No.</span>
                      <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{d.wo?.no || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">WO Quantity</span>
                      <div className="text-sm font-bold text-indigo-700 mt-0.5">{inr(woQty)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Demand Note (DN)</span>
                      <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{d.dn?.no || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Demand Quantity</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{inr(demandQty)} {item.unit}</div>
                    </div>
                  </div>
                </div>

                {/* Material Issue Note (MIN) & Returns */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-purple-600" /> Material Issue (MIN) & Contractor Handover
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">MIN Number</span>
                      <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{d.min?.no || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Issued Quantity</span>
                      <div className="text-sm font-bold text-purple-700 mt-0.5">{inr(issuedQty)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Contractor Return (MHROV)</span>
                      <div className="text-sm font-bold text-emerald-700 mt-0.5">{inr(mhrovQty)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Net Site Holding</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{inr(Math.max(0, issuedQty - mhrovQty))} {item.unit}</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: BILLING & COMMERCIALS */}
            {activeTab === 'billing' && (
              <div className="space-y-6">

                {/* Client RA Billing */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-teal-600" /> Client RA Billing
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Latest RA Bill No.</span>
                      <div className="text-sm font-bold text-slate-800 font-mono mt-0.5">{d.cbill?.ra || '—'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Supply Billed Qty</span>
                      <div className="text-sm font-bold text-teal-700 mt-0.5">{inr(supplyBilled)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Erection Billed Qty</span>
                      <div className="text-sm font-bold text-teal-700 mt-0.5">{inr(erectionBilled)} {item.unit}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Billed Amount</span>
                      <div className="text-sm font-black text-slate-800 mt-0.5">{money(billedVal)}</div>
                    </div>
                  </div>
                </div>

                {/* Contractor Billing */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" /> Contractor Settlement
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Contractor Payable</span>
                      <div className="text-sm font-bold text-purple-700 mt-0.5">{money(d.kbill?.amt || 0)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Payment Status</span>
                      <div className="text-sm font-bold text-slate-700 mt-0.5">{d.kbill?.status || 'Processed'}</div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Contractor JMC Progress</span>
                      <div className="text-sm font-bold text-slate-800 mt-0.5">{inr(d.mis_c?.jmc || 0)} {item.unit}</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Drawer Footer */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-600">Esc</kbd> to exit drawer
            </span>
            <div className="flex items-center gap-2">
              {onFilterByCircle && item.circle && (
                <button 
                  onClick={() => { onFilterByCircle(item.circle); onClose(); }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Filter by {item.circle} Circle
                </button>
              )}
              <button 
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
