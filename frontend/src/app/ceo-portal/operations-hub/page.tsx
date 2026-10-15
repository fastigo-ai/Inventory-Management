"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Download, ChevronLeft, ChevronRight, Search, X, SlidersHorizontal, ArrowUpRight, 
  CheckCircle2, AlertTriangle, XCircle, Info, CheckSquare, Settings2, Columns, 
  RotateCcw, Sigma, FileSpreadsheet, FileText
} from 'lucide-react';
import { fetchCeoDashboardData } from '@/features/ceo-portal/api/dashboard.api';
import { api } from '@/shared/api/axios';
import Item360Drawer from './Item360Drawer';

// --- UTILS & DATA GENERATOR ---
const DAY = 864e5;
const TODAY = Date.UTC(2026, 9, 6);
const FY = Date.UTC(2026, 3, 1);
const CODE: Record<string, string> = { Jaipur: 'JPR', Lucknow: 'LKO', Pune: 'PNQ', Indore: 'IDR' };
const DEPOT: Record<string, string> = { Jaipur: 'Jaipur Central', Lucknow: 'Lucknow North', Pune: 'Pune West', Indore: 'Indore Main' };

const inr = (n: number) => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  if (Number.isInteger(n)) return n.toLocaleString('en-IN');
  return Number(n.toFixed(3)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};
const money = (n: number) => {
  if (n === null || n === undefined || isNaN(n)) return '₹0';
  if (Number.isInteger(n)) return '₹' + n.toLocaleString('en-IN');
  return '₹' + Number(n.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const cr = (n: number) => (n / 1e7).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdate = (ms: any) => {
  if (!ms) return '—';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

function rng(s: number) {
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const BASE: any[] = [
  ['33kV 3-Core XLPE Armoured Power Cable', 'Cables & Conductors', 'PKG-01', 'Jaipur', 'Km', 850000, 120, 97],
  ['11kV 3-Core XLPE Cable (120 sq.mm)', 'Cables & Conductors', 'PKG-01', 'Jaipur', 'Km', 480000, 250, 270],
  ['100 kVA 11/0.433 kV Distribution Transformer', 'Transformers', 'PKG-02', 'Lucknow', 'Nos', 215000, 80, 78],
  ['250 kVA 11/0.433 kV Star-1 Distribution Transformer', 'Transformers', 'PKG-02', 'Lucknow', 'Nos', 360000, 45, 16],
  ['63 kVA 11/0.433 kV Hermetically Sealed Transformer', 'Transformers', 'PKG-03', 'Pune', 'Nos', 165000, 110, 22],
  ["AAA Conductor 'Rabbit' 50 sq.mm", 'Cables & Conductors', 'PKG-01', 'Jaipur', 'Km', 62000, 600, 120],
  ["AAA Conductor 'Dog' 100 sq.mm", 'Cables & Conductors', 'PKG-03', 'Pune', 'Km', 118000, 400, 95],
  ['9-Meter RSJ Poles (150x150 mm)', 'Poles & Structures', 'PKG-04', 'Indore', 'Nos', 14500, 1500, 240],
  ['11-Meter Steel Tubular Swaged Poles (Round)', 'Poles & Structures', 'PKG-04', 'Indore', 'Nos', 19800, 850, 140],
  ['11kV Vacuum Circuit Breaker (VCB) Indoor', 'Switchgear', 'PKG-02', 'Lucknow', 'Sets', 640000, 35, 12],
  ['22kV Outdoor Isolator (Double Break)', 'Switchgear', 'PKG-02', 'Lucknow', 'Nos', 85000, 60, 34],
  ['11kV Lightning Arrester (9kV Polymer)', 'Switchgear', 'PKG-04', 'Indore', 'Nos', 3200, 900, 410],
  ["ACSR 'Panther' 232 sq.mm Conductor", 'Cables & Conductors', 'PKG-01', 'Jaipur', 'Km', 210000, 300, 88],
  ['LT Aerial Bunched Cable 3x95+1x70 sq.mm', 'Cables & Conductors', 'PKG-03', 'Pune', 'Km', 540000, 180, 61],
  ['Single Phase Smart Meter (Prepaid)', 'Metering', 'PKG-05', 'Jaipur', 'Nos', 3850, 12000, 4200],
  ['Three Phase CT Operated Meter', 'Metering', 'PKG-05', 'Lucknow', 'Nos', 9200, 3500, 1180],
  ['11kV Disc Insulator 70kN', 'Insulators & Hardware', 'PKG-04', 'Indore', 'Nos', 780, 25000, 9300],
  ['11kV Pin Insulator (Polymer)', 'Insulators & Hardware', 'PKG-03', 'Pune', 'Nos', 420, 40000, 15200],
  ['Pole Mounted RMU 11kV 3-Way', 'Switchgear', 'PKG-02', 'Lucknow', 'Sets', 1250000, 18, 7],
  ['Galvanised Cross Arm 75x40 mm', 'Insulators & Hardware', 'PKG-04', 'Indore', 'Nos', 1150, 6000, 2100],
  ['Earthing Kit (GI Pipe Type)', 'Insulators & Hardware', 'PKG-05', 'Jaipur', 'Sets', 6800, 1800, 420],
  ['DTR Metering Panel LT', 'Metering', 'PKG-05', 'Pune', 'Nos', 48000, 140, 52]
];

function build(b: any, i: number) {
  const db = b[9] || {};
  const it: any = { 
    uid: db.itemId || `static-${i}`,
    sr: db.loaSerialNo || (i + 1), 
    code: b[8] || ('TC-' + (1001 + i)), 
    name: b[0], 
    cat: b[1], 
    pkg: b[2], 
    circle: b[3], 
    subcircle: db.subcircle || db.subCircle || '', 
    unit: db.unit || b[4] || 'Nos', 
    rate: db.rate || b[5] || 0, 
    loa: b[6], 
    bom: b[7],
    stock: 0,
    date: Date.now()
  };
  
  const d: any = {};
  
  // Calculate totals across all circles for this row's temp code and package
  const loaQty = db.loaQty || 0;
  const bomQty = db.bomQty || 0;
  const poQty = db.poQty ?? loaQty;
  const poVal = poQty * it.rate;
  
  const diQty = db.diQty || 0;
  const invQty = db.invQty || 0;
  const actQty = db.actQty || 0;
  
  const issuedQty = db.issuedQty || 0;
  const returnedQty = db.returnedQty || 0;
  
  const mhrovQty = db.mhrovQty ?? returnedQty; // Fallback to returned if missing
  const transferInQty = db.transferInQty || 0;
  const transferOutQty = db.transferOutQty || 0;
  
  // Total Supply + Erection Billed
  const supplyBilled = db.supplyBilled || 0;
  const erectionBilled = db.erectionBilled || 0;
  const billedQty = supplyBilled + erectionBilled;
  
  it.loa = loaQty;
  it.bom = bomQty;
  it.stock = Math.max(0, invQty - issuedQty + returnedQty);
  
  const parseDate = (val: any) => {
    if (!val) return null;
    const t = new Date(val).getTime();
    return isNaN(t) ? null : t;
  };

  const demandQty = db.demandQty !== undefined && db.demandQty !== null ? db.demandQty : (db.dnQty || 0);
  const receivedQty = db.receivedQty ?? invQty;

  d.item = { unit: it.unit, rate: it.rate, loa: it.loa, stock: it.stock };
  d.po = (poQty > 0 || db.poNo) ? { 
    no: db.poNo || '—', 
    date: parseDate(db.poDate), 
    qty: poQty, 
    val: poVal, 
    status: db.poStatus || 'Active' 
  } : null;
  d.di = (diQty > 0 || db.diNo) ? { 
    no: db.diNo || '—', 
    qty: diQty, 
    date: parseDate(db.diDate) 
  } : null;
  d.pi = (invQty > 0 || db.piNo) ? { 
    no: db.piNo || '—', 
    qty: invQty, 
    amt: invQty * it.rate, 
    status: db.piStatus || 'Posted' 
  } : null;
  
  d.store = { 
    depot: db.depotName || DEPOT[it.circle] || (it.circle ? `${it.circle} Central` : 'Central Depot'), 
    reorder: db.reorderLevel ?? Math.round(loaQty * 0.15) 
  };
  d.receipt = { 
    no: db.grnNo || '—', 
    qty: receivedQty 
  };
  d.inward = { 
    qty: invQty, 
    date: parseDate(db.inwardDate) 
  };
  
  d.min = { 
    no: db.minNo || '—', 
    qty: issuedQty 
  };
  d.cret = { qty: returnedQty };
  d.outward = { qty: db.transferOutQty || 0 };
  d.inter = { 
    qty: (db.transferInQty || 0) + (db.transferOutQty || 0), 
    route: db.transferRoute || '—' 
  };
  
  d.wo = { 
    no: db.woNo || '—', 
    val: db.woVal || poVal, 
    qty: db.woQty || 0 
  };
  d.dn = { 
    no: db.dnNo || '—', 
    qty: demandQty > 0 ? demandQty : (db.dnQty || issuedQty) 
  };
  d.mrhov = { 
    qty: mhrovQty, 
    status: db.mrhovStatus || (mhrovQty > 0 ? 'Done' : 'Pending') 
  };
  
  d.cbill = { 
    amt: db.ra60Amt || (billedQty * it.rate), 
    ra: db.raNo || '—' 
  };
  d.kbill = { 
    amt: db.cBillAmt || db.contractorPayable || (billedQty * it.rate), 
    status: db.contractorPaymentStatus || 'Processed' 
  };
  
  const rawContractors = Array.isArray(db.contractors) ? db.contractors.flat() : (db.contractorName ? [db.contractorName] : []);
  const contractorList = Array.from(new Set(rawContractors.map((c: any) => typeof c === 'string' ? c.trim() : '').filter(Boolean)));
  it.contractors = contractorList;
  it.contractorBreakdown = db.contractorBreakdown || {};
  const contractorStr = contractorList.length > 0 ? contractorList.join(', ') : (db.contractorName || '—');

  d.mis_s = { di: diQty, mrhov: mhrovQty, issued: issuedQty, balStore: it.stock };
  d.mis_c = { 
    contractors: contractorStr, 
    dn: demandQty > 0 ? demandQty : (db.dnQty || issuedQty), 
    jmc: db.jmcQty || 0, 
    wipC: db.wipQty || 0, 
    wipR: Math.max(0, Math.round((loaQty - (db.wipQty || 0))*1000)/1000), 
    issued: issuedQty, 
    balCont: Math.max(0, Math.round((issuedQty - (db.wipQty || 0) - returnedQty)*1000)/1000) 
  };
  
  const vendorStr = Array.isArray(db.vendors) && db.vendors.length > 0 ? db.vendors.join(', ') : 'N/A';
  d.mis_v = { vendors: vendorStr, poQty: poQty, diQty: diQty, invQty: invQty, mrhovQty: mhrovQty };
  
  d.mis_b_c_s = { 
    diQty: diQty, 
    mrhovQty: mhrovQty, 
    ra60Qty: db.ra60Qty || 0, 
    ra60Amt: db.ra60Amt || ((db.ra60Qty || 0) * it.rate), 
    ra30Qty: db.ra30Qty || 0, 
    ra30Amt: db.ra30Amt || ((db.ra30Qty || 0) * it.rate), 
    ra10Qty: db.ra10Qty || 0, 
    ra10Amt: db.ra10Amt || ((db.ra10Qty || 0) * it.rate) 
  };
  d.mis_b_c_e = { 
    diQty: diQty, 
    mrhovQty: mhrovQty, 
    er90Qty: db.er90Qty || 0, 
    er90Amt: db.er90Amt || ((db.er90Qty || 0) * it.rate), 
    er10Qty: db.er10Qty || 0, 
    er10Amt: db.er10Amt || ((db.er10Qty || 0) * it.rate) 
  };
  d.mis_b_cont = { 
    issuedQty: issuedQty, 
    jmcQty: db.jmcQty || 0, 
    cBillQty: db.cBillQty || 0, 
    cBillAmt: db.cBillAmt || ((db.cBillQty || 0) * it.rate) 
  };

  it.d = d; 
  return it;
}

const MODS = [
  { id: 'm1', n: 1, name: 'Purchase Management', color: 'indigo' },
  { id: 'm2', n: 2, name: 'Store & Inventory Management', color: 'blue' },
  { id: 'm3', n: 3, name: 'Work Order & Site Management', color: 'emerald' },
  { id: 'm4', n: 4, name: 'Billing Management', color: 'purple' }
];

const MODS_MIS = [
  { id: 'm5', n: 1, name: 'Store MIS', color: 'orange' },
  { id: 'm6', n: 2, name: 'Contractor MIS', color: 'teal' },
  { id: 'm7', n: 3, name: 'Vendor MIS', color: 'rose' },
  { id: 'm8', n: 4, name: 'Client Billing - Supply', color: 'cyan' },
  { id: 'm9', n: 5, name: 'Client Billing - Erection', color: 'fuchsia' },
  { id: 'm10', n: 6, name: 'Contractor Billing MIS', color: 'amber' }
];

const SUBS = [
  { id: 'item', m: 'm1', name: 'Item Master', cols: [['unit', 'Unit', 'text'], ['rate', 'LOA Supply Rate with GST (₹)', 'money'], ['stock', 'Available stock', 'stock']] },
  { id: 'po', m: 'm1', name: 'Purchase Order (PO)', cols: [['no', 'PO no.', 'code'], ['date', 'PO date', 'date'], ['qty', 'PO qty', 'qty'], ['val', 'PO value (₹)', 'money'], ['status', 'PO status', 'status']] },
  { id: 'di', m: 'm1', name: 'Dispatch Instruction (DI)', cols: [['no', 'DI no.', 'code'], ['qty', 'Dispatched qty', 'qty'], ['date', 'DI date', 'date']] },
  { id: 'pi', m: 'm1', name: 'Purchase Invoice (PI)', cols: [['no', 'Invoice no.', 'code'], ['qty', 'Invoice qty', 'qty'], ['amt', 'Invoice amount (₹)', 'money'], ['status', 'Payment', 'status']] },
  { id: 'store', m: 'm2', name: 'Store Master', cols: [['depot', 'Depot', 'text'], ['reorder', 'Reorder level', 'qty']] },
  { id: 'receipt', m: 'm2', name: 'Store Receipt', cols: [['no', 'GRN no.', 'code'], ['qty', 'Received qty', 'qty']] },
  { id: 'inward', m: 'm2', name: 'Store Inward', cols: [['qty', 'Inward qty', 'qty'], ['date', 'Inward date', 'date']] },
  { id: 'min', m: 'm2', name: 'Material Issue Note', cols: [['no', 'MIN no.', 'code'], ['qty', 'Issued qty', 'qty']] },
  { id: 'cret', m: 'm2', name: 'Contractor Return', cols: [['qty', 'Returned qty', 'qty']] },
  { id: 'outward', m: 'm2', name: 'Outward Register', cols: [['qty', 'Outward qty', 'qty']] },
  { id: 'inter', m: 'm2', name: 'Inter Transfer', cols: [['qty', 'Transfer qty', 'qty'], ['route', 'Route', 'text']] },
  { id: 'wo', m: 'm3', name: 'Work Order (WO) Creation', cols: [['no', 'WO no.', 'code'], ['val', 'WO value (₹)', 'money'], ['qty', 'WO qty', 'qty']] },
  { id: 'dn', m: 'm3', name: 'Demand Note', cols: [['no', 'DN no.', 'code'], ['qty', 'Demand qty', 'qty']] },
  { id: 'mrhov', m: 'm3', name: 'MRHOV', cols: [['qty', 'MRHOV qty', 'qty'], ['status', 'MRHOV status', 'status']] },
  { id: 'cbill', m: 'm4', name: 'Client Billing', cols: [['ra', 'RA bill', 'code'], ['amt', 'RA amount (₹)', 'money']] },
  { id: 'kbill', m: 'm4', name: 'Contractor Billing', cols: [['amt', 'Payable (₹)', 'money'], ['status', 'Payment', 'status']] },
  { id: 'mis_s', m: 'm5', name: 'Store MIS', cols: [['di', 'DI qty', 'qty'], ['mrhov', 'MRHOV qty', 'qty'], ['issued', 'Issued qty', 'qty'], ['balStore', 'Balance at store', 'qty']] },
  { id: 'mis_c', m: 'm6', name: 'Contractor MIS', cols: [['contractors', 'Contractor(s)', 'text'], ['dn', 'Demand Notes', 'qty'], ['jmc', 'JMC qty', 'qty'], ['wipC', 'WIP Consumed', 'qty'], ['wipR', 'WIP Required', 'qty'], ['issued', 'Store Issued', 'qty'], ['balCont', 'Balance at contractor', 'qty']] },
  { id: 'mis_v', m: 'm7', name: 'Vendor MIS', cols: [['vendors', 'Vendor(s)', 'text'], ['poQty', 'PO qty', 'qty'], ['diQty', 'DI qty', 'qty'], ['invQty', 'Invoice qty', 'qty'], ['mrhovQty', 'MRHOV qty', 'qty']] },
  { id: 'mis_b_c_s', m: 'm8', name: 'Client Billing - Supply', cols: [
    ['diQty', 'DI Qty', 'qty'], 
    ['mrhovQty', 'MRHOV Qty', 'qty'], 
    ['ra60Qty', 'RA Bill - 60% Qty', 'qty'], 
    ['ra60Amt', 'RA Bill - 60% Amount', 'money'], 
    ['ra30Qty', 'RA Bill - 30% Qty', 'qty'], 
    ['ra30Amt', 'RA Bill - 30% Amount', 'money'], 
    ['ra10Qty', 'RA Bill - 10% Qty', 'qty'], 
    ['ra10Amt', 'RA Bill - 10% Amount', 'money']
  ] },
  { id: 'mis_b_c_e', m: 'm9', name: 'Client Billing - Erection', cols: [
    ['diQty', 'DI Qty', 'qty'], 
    ['mrhovQty', 'MRHOV Qty', 'qty'], 
    ['er90Qty', 'Erected Qty - 90%', 'qty'], 
    ['er90Amt', 'Erected Amount - 90%', 'money'], 
    ['er10Qty', 'Erected Qty - 10%', 'qty'], 
    ['er10Amt', 'Erected Amount - 10%', 'money']
  ] },
  { id: 'mis_b_cont', m: 'm10', name: 'Contractor Billing MIS', cols: [
    ['issuedQty', 'Issued Qty', 'qty'], 
    ['jmcQty', 'JMC Qty', 'qty'], 
    ['cBillQty', 'Contractor billing Qty', 'qty'], 
    ['cBillAmt', 'Contractor billing Amount', 'money']
  ] }
];

const STATIC = [
  { id: 'select', label: '', type: 'checkbox', isSticky: true, defaultW: 38, cls: 'text-center sticky z-10' },
  { id: 'sr', label: 'Sr. No.', type: 'sr', isSticky: true, defaultW: 52, cls: 'text-center sticky z-10' },
  { id: 'code', label: 'Temp code', type: 'tcode', isSticky: true, defaultW: 100, cls: 'sticky z-10' },
  { id: 'name', label: 'Item name', type: 'name', isSticky: true, defaultW: 240, cls: 'sticky z-10' },
  { id: 'loa', label: 'LOA qty', type: 'qty', isSticky: true, defaultW: 90, cls: 'sticky z-10' },
  { id: 'bom', label: 'BOM qty', type: 'qty', isSticky: true, defaultW: 90, cls: 'sticky z-10 border-r-2 border-slate-400' },
  { id: 'pkg', label: 'Package', type: 'text', cls: '' },
  { id: 'circle', label: 'Circle', type: 'text', cls: '' },
  { id: 'flags', label: 'Flags', type: 'flags', cls: '' }
];

const VIEWS = [
  { id: 'overview', name: 'CEO overview', sel: ['item', 'po', 'wo', 'cbill'], keep: ['item.stock', 'po.val', 'po.status', 'wo.qty', 'cbill.amt'] },
  { id: 'money', name: 'Money: orders & billing', sel: ['po', 'pi', 'cbill', 'kbill'], keep: ['po.val', 'po.status', 'pi.amt', 'pi.status', 'cbill.amt', 'kbill.amt', 'kbill.status'] },
  { id: 'stock', name: 'Stock position', sel: ['item', 'receipt', 'min', 'outward'], keep: ['item.unit', 'item.stock', 'receipt.qty', 'min.qty', 'outward.qty'] },
  { id: 'site', name: 'Site progress', sel: ['wo', 'dn', 'mrhov'], keep: null },
  { id: 'all', name: 'Everything', sel: SUBS.map(s => s.id), keep: null }
];

function health(it: any) {
  const r = it.stock / it.loa;
  return r >= .5 ? 'good' : r >= .2 ? 'warn' : 'crit';
}

function flags(it: any) {
  const f = [], d = it.d;
  if (health(it) === 'crit') f.push({ t: 'Low stock', c: 'crit' });
  if (d.po && d.po.status === 'Pending') f.push({ t: 'PO pending', c: 'warn' });
  if (d.mrhov && d.mrhov.status !== 'Cleared') f.push({ t: 'MRHOV open', c: 'warn' });
  if (d.pi && d.pi.status === 'Due') f.push({ t: 'Invoice due', c: 'warn' });
  // Instead of prog < 50, let's flag if wo qty is < 50% of loaQty
  if (d.wo && it.loa > 0 && (d.wo.qty / it.loa) < 0.5) f.push({ t: 'WO behind', c: 'crit' });
  return f;
}

const ALERTS = [
  { id: 'low', label: 'Items running low on stock', tone: 'crit', test: (i: any) => health(i) === 'crit', view: 'stock' },
  { id: 'pend', label: 'Purchase orders waiting for approval', tone: 'warn', test: (i: any) => i.d.po && i.d.po.status === 'Pending', view: 'money' },
  { id: 'wo', label: 'Items on work orders under 50% done', tone: 'crit', test: (i: any) => !!(i.d.wo && i.loa > 0 && (i.d.wo.qty / i.loa) < 0.5), view: 'site' },
  { id: 'mrhov', label: 'MRHOV not yet cleared', tone: 'warn', test: (i: any) => !!(i.d.mrhov && i.d.mrhov.status !== 'Cleared'), view: 'site' },
  { id: 'due', label: 'Supplier invoices not yet paid', tone: 'warn', test: (i: any) => !!(i.d.pi && i.d.pi.status === 'Due'), view: 'money' }
];


// --- COMPONENT ---
export default function OperationsHub() {
  const [items, setItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [mode, setMode] = useState<'single' | 'multi' | 'all'>('single');
  const [sel, setSel] = useState<Set<string>>(new Set(['item']));
  
  const [f, setF] = useState({ circle: 'All', subCircle: 'All', pkg: 'All', contractor: 'All', code: 'All', name: '', date: 'all', status: 'all' });
  const [q, setQ] = useState('');
  const [kpiLoading, setKpiLoading] = useState(true);

  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingRef = React.useRef<{ id: string, startX: number, startW: number } | null>(null);

  const [apiKpis, setApiKpis] = useState({ 
    piCount: 0, val: 0, qty: 0, 
    availableStock: 0,
    totalInwardQty: 0, totalTransferInQty: 0, totalTransferOutQty: 0, materialIssued: 0,
    transitDetails: [] as any[],
    woCount: 0, totalWoValue: 0,
    supplyBilled: 0, erectionBilled: 0, retentionBilled: 0,
    supplyCount: 0, erectionCount: 0, retentionCount: 0, totalBillingCount: 0,
    supplyBaseAmount: 0, supplyGstAmount: 0,
    erectionBaseAmount: 0, erectionGstAmount: 0,
    billingCircles: [] as any[],
    poPending: 0, poCleared: 0,
    workflow: {} as any
  });

  useEffect(() => {
    setItemsLoading(true);
    api.get('/reports/item-summary', { params: { limit: 50000 } })
      .then(res => {
        if (res.data?.data?.items) {
          const dbItems = res.data.data.items.map((d: any) => {
            const activityLabel = d.activity ? String(d.activity).trim() : 'Uncategorized';
            return [
              d.itemName || 'Unknown', 
              activityLabel, 
              d.package || 'Unknown', 
              d.circle || 'Unknown', 
              d.unit || 'Nos', 
              d.rate || 0, 
              0, // loa is calculated in build()
              0, // bom is calculated in build()
              d.tempCode || '',
              d
            ];
          });
          setItems(dbItems.map(build));
        } else {
          setItems(BASE.map(build));
        }
      })
      .catch((err) => {
        console.error('API FETCH ERROR:', err);
        setItems(BASE.map(build));
      })
      .finally(() => {
        setItemsLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;
    const filters: any = {};
    if (f.circle !== 'All') filters.circle = f.circle;
    if (f.circle === 'Solan' && f.subCircle !== 'All') filters.subCircle = f.subCircle;
    if (f.pkg !== 'All') filters.package = f.pkg;
    
    setKpiLoading(true);
    fetchCeoDashboardData(filters).then((res: any) => {
      if (!active) return;
      setApiKpis({
        piCount: res?.kpis?.piCount || 0,
        val: res?.kpis?.piValue || 0,
        qty: res?.kpis?.piQty || 0,
        availableStock: res?.kpis?.physicalStock || 0,
        totalInwardQty: res?.kpis?.totalInwardQty || 0,
        totalTransferInQty: res?.kpis?.totalTransferInQty || 0,
        totalTransferOutQty: res?.kpis?.totalTransferOutQty || 0,
        transitDetails: res?.kpis?.transitDetails || [],
        materialIssued: res?.kpis?.materialIssued || 0,
        woCount: res?.kpis?.woCount || 0,
        totalWoValue: res?.kpis?.totalWoValueRaw !== undefined ? res?.kpis?.totalWoValueRaw : ((res?.kpis?.totalWoValue || 0) * 1e7),
        supplyBilled: res?.kpis?.supplyBilledRaw !== undefined ? res?.kpis?.supplyBilledRaw : ((res?.kpis?.supplyBilled || 0) * 1e7),
        erectionBilled: res?.kpis?.erectionBilledRaw !== undefined ? res?.kpis?.erectionBilledRaw : ((res?.kpis?.erectionBilled || 0) * 1e7),
        retentionBilled: res?.kpis?.retentionBilledRaw !== undefined ? res?.kpis?.retentionBilledRaw : ((res?.kpis?.retentionBilled || 0) * 1e7),
        supplyCount: res?.kpis?.supplyCount || 0,
        erectionCount: res?.kpis?.erectionCount || 0,
        retentionCount: res?.kpis?.retentionCount || 0,
        totalBillingCount: res?.kpis?.totalBillingCount || (res?.kpis?.supplyCount || 0) + (res?.kpis?.erectionCount || 0),
        supplyBaseAmount: res?.kpis?.supplyBaseAmount || 0,
        supplyGstAmount: res?.kpis?.supplyGstAmount || 0,
        erectionBaseAmount: res?.kpis?.erectionBaseAmount || 0,
        erectionGstAmount: res?.kpis?.erectionGstAmount || 0,
        billingCircles: res?.kpis?.billingCircles || [],
        poPending: res?.kpis?.poPending || 0,
        poCleared: res?.kpis?.poCleared || 0,
        workflow: res?.workflow || {}
      });
    }).catch(console.error).finally(() => {
      if (active) setKpiLoading(false);
    });
    
    return () => { active = false; };
  }, [f.circle, f.pkg, f.subCircle]);
  
  const [sort, setSort] = useState({ id: 'sr', dir: 1 });
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [view, setView] = useState<string | null>('overview');
  const [alert, setAlert] = useState<string | null>(null);
  const [showModules, setShowModules] = useState(true);
  const [showMis, setShowMis] = useState(false);
  const [showSummary, setShowSummary] = useState(true);

  const [viewType, setViewType] = useState<'item' | 'activity'>('item');
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});

  // SAP ALV Grid Settings
  const [density, setDensity] = useState<'compact' | 'standard'>('compact');
  const [showTotalsRow, setShowTotalsRow] = useState<boolean>(true);
  const [showColumnChooser, setShowColumnChooser] = useState<boolean>(false);
  const [columnSearch, setColumnSearch] = useState<string>('');

  // Derived filters
  const circles = ['All', 'Solan', 'Nahan', 'Rampur', 'Rohru'];
  const subcircles = useMemo(() => ['All', ...Array.from(new Set(items.filter(i => i.circle === 'Solan' && i.subcircle).map(i => i.subcircle))).sort()], [items]);
  const pkgs = ['All', 'Package 1(S/N)', 'Package 2(R/R)'];
  const contractors = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => {
      if (Array.isArray(it.contractors)) {
        it.contractors.forEach((c: string) => { if (c && c.trim()) set.add(c.trim()); });
      }
    });
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);
  const codes = useMemo(() => ['All', ...Array.from(new Set(items.map(i => i.code))).sort((a, b) => {
    const strA = String(a || '');
    const strB = String(b || '');
    const numA = parseInt(strA.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(strB.replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return strA.localeCompare(strB);
  })], [items]);

  const filteredItems = useMemo(() => {
    const nm = f.name.trim().toLowerCase();
    let res = items.filter(it =>
      (f.circle === 'All' || (it.circle || '').toLowerCase() === f.circle.toLowerCase()) && 
      (f.circle !== 'Solan' || f.subCircle === 'All' || it.subcircle === f.subCircle) &&
      (f.pkg === 'All' || (it.pkg || '').replace(/\s*\(/g, '(') === f.pkg) && 
      (f.contractor === 'All' || (Array.isArray(it.contractors) && it.contractors.some((c: string) => c.toLowerCase() === f.contractor.toLowerCase()))) &&
      (f.code === 'All' || it.code === f.code) &&
      (!nm || it.name.toLowerCase().includes(nm)) &&
      (f.date === 'all' || (f.date === 'fy' ? it.date >= FY : it.date >= TODAY - (+f.date) * DAY)) &&
      (f.status === 'all' || (it.d.po && it.d.po.status === f.status))
    );
    if (alert) {
      const a = ALERTS.find(x => x.id === alert);
      if (a) res = res.filter(a.test);
    }
    return res;
  }, [items, f, alert]);

  const selSubs = SUBS.filter(s => sel.has(s.id));

  const curCols = useMemo(() => {
    const out: any[] = STATIC.filter(c => c && !hidden.has(c.id)).map(c => ({ ...c, sp: null, k: c.id, m: null }));
    selSubs.forEach(s => {
      if (s && s.cols) {
        s.cols.forEach(([k, label, type], i) => {
          const id = s.id + '.' + k;
          if (!hidden.has(id)) out.push({ id, label, type, sp: s.id, k, m: s.m, cls: i === 0 ? 'border-l border-slate-200' : '' });
        });
      }
    });
    return out.filter(c => c && c.id);
  }, [hidden, selSubs]);

  const raw = (c: any, it: any) => {
    if (c.sp) {
      if (!it.d[c.sp]) return null;
      if (c.sp === 'mis_c' && f.contractor !== 'All') {
        const cMap = it.contractorBreakdown || {};
        const contIssued = cMap[f.contractor] !== undefined 
          ? cMap[f.contractor] 
          : (Object.entries(cMap).find(([k]) => k.toLowerCase() === f.contractor.toLowerCase())?.[1] as number || it.d.mis_c.issued || 0);

        if (c.k === 'issued') return contIssued;
        if (c.k === 'balCont') {
          const wipC = it.d.mis_c.wipC || 0;
          return Math.max(0, Math.round((contIssued - wipC) * 1000) / 1000);
        }
        if (c.k === 'contractors') return f.contractor;
      }
      return it.d[c.sp][c.k];
    }
    if (c.k === 'select') return selectedIds.has(it.uid || it.code);
    return (c.k === 'sr' ? it.sr : c.k === 'flags' ? flags(it).length : it[c.k]);
  };

  const getColWidth = (c: any, isCompactDensity: boolean) => {
    if (colWidths[c.id] !== undefined) return colWidths[c.id];
    if (c.type === 'checkbox') return isCompactDensity ? 38 : 44;
    if (c.isSticky && c.defaultW) return c.defaultW;
    return undefined;
  };

  const getStickyLeft = (c: any) => {
    if (!c.isSticky) return undefined;
    const colIndex = STATIC.findIndex(x => x.id === c.id);
    if (colIndex <= 0) return 0;
    
    let offset = 0;
    for (let i = 0; i < colIndex; i++) {
      const col = STATIC[i];
      if (!hidden.has(col.id)) {
        if (colWidths[col.id] !== undefined) {
          offset += colWidths[col.id];
        } else if (col.type === 'checkbox') {
          offset += density === 'compact' ? 38 : 44;
        } else {
          offset += col.defaultW || 90;
        }
      }
    }
    return offset;
  };

  const sortedRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    let rows = filteredItems;
    if (query) {
      rows = rows.filter(it => curCols.some(c => {
        const v = raw(c, it);
        return v !== null && v !== undefined && String(v).toLowerCase().includes(query);
      }));
    }
    const sc = curCols.find(c => c && c.id === sort?.id) || curCols[0];
    return rows.slice().sort((a, b) => {
      let x = raw(sc, a); let y = raw(sc, b);
      if (x === null || x === undefined) x = -Infinity;
      if (y === null || y === undefined) y = -Infinity;
      if (x !== -Infinity && y !== -Infinity) {
        return String(x).localeCompare(String(y), undefined, { numeric: true }) * sort.dir;
      }
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [filteredItems, curCols, q, sort]);

  const groupedRows = useMemo(() => {
    if (viewType === 'item') return null;
    const groups: Record<string, typeof sortedRows> = {};
    sortedRows.forEach(it => {
      const cat = it.cat || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [sortedRows, viewType]);

  const total = viewType === 'item' ? sortedRows.length : (groupedRows?.length || 0);
  const pages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, pages);
  const slice = viewType === 'item' 
    ? sortedRows.slice((currentPage - 1) * size, currentPage * size)
    : (groupedRows || []).slice((currentPage - 1) * size, currentPage * size);

  // Selection Logic & Selected Totals
  const currentPageItems = useMemo(() => {
    if (viewType === 'item') return slice as any[];
    return (slice as [string, any[]][]).flatMap(([_, catItems]) => catItems);
  }, [slice, viewType]);

  const isAllPageSelected = currentPageItems.length > 0 && currentPageItems.every(it => selectedIds.has(it.uid || it.code));
  const isSomePageSelected = currentPageItems.some(it => selectedIds.has(it.uid || it.code));

  const toggleSelectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        currentPageItems.forEach(it => next.delete(it.uid || it.code));
      } else {
        currentPageItems.forEach(it => next.add(it.uid || it.code));
      }
      return next;
    });
  };

  const toggleSelectItem = (it: any) => {
    const key = it.uid || it.code;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedIds);
    sortedRows.forEach(it => next.add(it.uid || it.code));
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedItemsList = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return items.filter(it => selectedIds.has(it.uid || it.code));
  }, [items, selectedIds]);

  const selectedTotals = useMemo(() => {
    if (selectedItemsList.length === 0) return null;

    let totalLoaQty = 0;
    let totalLoaVal = 0;
    let totalPoQty = 0;
    let totalPoVal = 0;
    let totalGrnQty = 0;
    let totalStockQty = 0;
    let totalStockVal = 0;
    let totalInvQty = 0;
    let totalInvVal = 0;
    let totalIssuedQty = 0;
    let totalBilledVal = 0;

    selectedItemsList.forEach(it => {
      const rate = it.rate || 0;
      const loaQty = it.loa || 0;
      const poQty = it.d?.po?.qty ?? loaQty;
      const poVal = it.d?.po?.val ?? (poQty * rate);
      const invQty = it.d?.pi?.qty || 0;
      const invVal = it.d?.pi?.amt || (invQty * rate);
      const grnQty = it.d?.receipt?.qty || it.d?.inward?.qty || 0;
      const stock = it.stock || 0;
      const issued = it.d?.min?.qty || 0;
      
      const supplyBilled = (it.d?.mis_b_c_s?.ra60Qty || 0) + (it.d?.mis_b_c_s?.ra30Qty || 0) + (it.d?.mis_b_c_s?.ra10Qty || 0);
      const erectionBilled = (it.d?.mis_b_c_e?.er90Qty || 0) + (it.d?.mis_b_c_e?.er10Qty || 0);
      const billedQty = (supplyBilled + erectionBilled) || (it.d?.cbill?.amt ? Math.round(it.d.cbill.amt / (rate || 1)) : 0);
      const billedVal = it.d?.cbill?.amt || (billedQty * rate);

      totalLoaQty += loaQty;
      totalLoaVal += loaQty * rate;
      totalPoQty += poQty;
      totalPoVal += poVal;
      totalInvQty += invQty;
      totalInvVal += invVal;
      totalGrnQty += grnQty;
      totalStockQty += stock;
      totalStockVal += stock * rate;
      totalIssuedQty += issued;
      totalBilledVal += billedVal;
    });

    return {
      count: selectedItemsList.length,
      totalLoaQty,
      totalLoaVal,
      totalPoQty,
      totalPoVal,
      totalInvQty,
      totalInvVal,
      totalGrnQty,
      totalStockQty,
      totalStockVal,
      totalIssuedQty,
      totalBilledVal
    };
  }, [selectedItemsList]);

  // SAP ALV Grand Totals calculation across all filtered items
  const grandTotals = useMemo(() => {
    const sums: Record<string, number> = {};
    curCols.forEach(c => {
      if (['qty', 'money', 'stock'].includes(c.type)) {
        let sum = 0;
        sortedRows.forEach(it => {
          const v = raw(c, it);
          if (typeof v === 'number' && !isNaN(v)) {
            sum += v;
          }
        });
        sums[c.id] = sum;
      }
    });
    return sums;
  }, [sortedRows, curCols, f.contractor]);

  // SAP ALV Column Personalization List
  const allPersonalizableColumns = useMemo(() => {
    const list: { id: string; label: string; group: string }[] = [];
    STATIC.forEach(c => {
      if (c.id !== 'select') {
        list.push({ id: c.id, label: c.label || c.id, group: 'Item Details' });
      }
    });
    selSubs.forEach(s => {
      s.cols.forEach(([k, label]) => {
        list.push({ id: `${s.id}.${k}`, label: `${s.name}: ${label}`, group: s.name });
      });
    });
    return list;
  }, [selSubs]);

  const toggleColumnVisibility = (colId: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  const showAllColumns = () => {
    setHidden(new Set());
  };

  const resetColumnsToDefault = () => {
    applyView(view || 'overview');
  };

  const exportToCSV = (rowsToExport: any[], filename = 'operations-ledger.csv') => {
    if (!rowsToExport.length) return;
    const exportCols = curCols.filter(c => c.type !== 'checkbox');
    const headers = exportCols.map(c => `"${c.label.replace(/"/g, '""')}"`);
    const csvRows = rowsToExport.map(it => {
      return exportCols.map(c => {
        const v = raw(c, it);
        if (v === null || v === undefined) return '""';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',');
    });
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Column Resizing Handlers
  const handleMouseDown = (e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault();
    resizingRef.current = { id: colId, startX: e.pageX, startW: currentWidth };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const activeResize = resizingRef.current;
    if (!activeResize) return;
    const diff = e.pageX - activeResize.startX;
    // We allow collapsing down to 0 width (or very small)
    const newW = Math.max(0, activeResize.startW + diff);
    const targetColId = activeResize.id;
    setColWidths(prev => ({ ...prev, [targetColId]: newW }));
  };

  const handleMouseUp = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Actions
  const applyView = (id: string) => {
    const v = VIEWS.find(x => x.id === id);
    if (!v) return;
    setView(id); setAlert(null); setSel(new Set(v.sel));
    setMode(id === 'all' ? 'all' : v.sel.length > 1 ? 'multi' : 'single');
    const newHidden = new Set<string>();
    if (v.keep) {
      SUBS.filter(s => v.sel.includes(s.id)).forEach(s => s.cols.forEach(([k]) => {
        const cid = s.id + '.' + k;
        if (!v.keep!.includes(cid)) newHidden.add(cid);
      }));
    }
    setHidden(newHidden);
    setSort({ id: 'sr', dir: 1 }); setPage(1);
  };

  const handleModClick = (modId: string) => {
    const ids = SUBS.filter(s => s.m === modId).map(s => s.id);
    if (mode === 'multi') {
      const n = new Set(sel);
      const every = ids.every(i => n.has(i));
      if (every) {
        ids.forEach(i => n.delete(i));
        if (!n.size) ids.forEach(i => n.add(i)); // prevent empty
      } else ids.forEach(i => n.add(i));
      setSel(n); setView(null); setAlert(null);
    } else {
      setMode('single');
      setSel(new Set([ids[0]]));
      setView(null); setAlert(null);
    }
    setPage(1);
  };

  const handleSubClick = (subId: string) => {
    if (mode === 'multi') {
      const n = new Set(sel);
      if (n.has(subId)) {
        if (n.size > 1) n.delete(subId);
      } else n.add(subId);
      setSel(n); setView(null); setAlert(null);
    } else {
      setMode('single');
      setSel(new Set([subId]));
      setView(null); setAlert(null);
    }
    setPage(1);
  };

  const low = filteredItems.filter(i => health(i) === 'crit').length;
  
  const woItems = filteredItems.filter(i => i.d.wo);
  const avg = woItems.length ? Math.round(woItems.reduce((a, i) => a + (i.loa ? (i.d.wo.qty / i.loa) * 100 : 0), 0) / woItems.length) : 0;
  
  useEffect(() => { applyView('overview'); }, []);

  // UI Helpers
  const getColor = (c: string) => {
    if (c === 'indigo') return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', active: 'bg-indigo-600 text-white' };
    if (c === 'blue') return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', active: 'bg-blue-600 text-white' };
    if (c === 'emerald') return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', active: 'bg-emerald-600 text-white' };
    if (c === 'purple') return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', active: 'bg-purple-600 text-white' };
    if (c === 'orange') return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', active: 'bg-orange-600 text-white' };
    if (c === 'teal') return { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', active: 'bg-teal-600 text-white' };
    if (c === 'rose') return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', active: 'bg-rose-600 text-white' };
    if (c === 'cyan') return { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', active: 'bg-cyan-600 text-white' };
    if (c === 'fuchsia') return { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-200', active: 'bg-fuchsia-600 text-white' };
    if (c === 'amber') return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', active: 'bg-amber-600 text-white' };
    return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', active: 'bg-slate-600 text-white' };
  };

  const getPill = (v: string) => {
    if (['Approved', 'Cleared', 'Paid', 'Done'].includes(v)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['Pending', 'Due'].includes(v)) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getStatusDot = (v: string) => {
    if (['Approved', 'Cleared', 'Paid', 'Done'].includes(v)) return 'bg-emerald-500';
    if (['Pending', 'Due'].includes(v)) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  const getHealth = (h: string) => {
    if (h === 'good') return 'text-emerald-700 font-semibold';
    if (h === 'warn') return 'text-amber-700 font-semibold';
    return 'text-rose-700 font-semibold';
  };

  const getFlagTone = (c: string) => {
    if (c === 'good') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (c === 'warn') return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-rose-50 text-rose-700 border border-rose-200';
  };

  const renderRow = (it: any, idx: number, isSub = false) => {
    const isSelected = selectedIds.has(it.uid || it.code);
    const isEven = idx % 2 === 0;
    const isCompact = density === 'compact';
    
    // SAP Classic Zebra striping
    const rowBg = isSelected 
      ? 'bg-[#e0edfd] font-medium' 
      : isSub 
        ? (isEven ? 'bg-slate-50' : 'bg-slate-100/70') 
        : (isEven ? 'bg-white' : 'bg-[#f8fafc]');
    const hoverBg = isSelected 
      ? 'group-hover:bg-[#d0e4fc]' 
      : 'group-hover:bg-[#eaf2fc]';

    return (
      <tr key={it.id || idx} className={`transition-colors group ${rowBg} ${hoverBg}`}>
        {curCols.map(c => {
          const v = raw(c, it);
          const isNull = v === null || v === undefined;
          const isCompact = density === 'compact';
          const align = (c.type === 'money' || c.type === 'qty' || c.type === 'stock' || c.type === 'pct') ? 'text-right tabular-nums' : '';
          
          let content: React.ReactNode = <span className="text-slate-300 font-mono">—</span>;
          
          if (c.type === 'checkbox') {
            content = (
              <div className="flex items-center justify-center w-full h-full">
                <input 
                  type="checkbox"
                  aria-label={`Select item ${it.name}`}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelectItem(it);
                  }}
                />
              </div>
            );
          } else if (!isNull) {
            if (c.type === 'money') {
              content = <span className="font-mono tabular-nums font-semibold text-slate-900">{money(v)}</span>;
            } else if (c.type === 'qty') {
              content = (
                <span className="font-mono tabular-nums text-slate-800 font-medium">
                  {inr(v)} <span className="text-[10px] text-slate-400 font-normal">{it.unit}</span>
                </span>
              );
            } else if (c.type === 'stock') {
              content = (
                <span className={`font-mono tabular-nums font-semibold ${getHealth(health(it))}`}>
                  {inr(v)} <span className="text-[10px] opacity-75 font-normal">{it.unit}</span>
                </span>
              );
            } else if (c.type === 'pct') {
              content = (
                <div className="flex items-center justify-end gap-1.5 font-mono">
                  <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width: `${Math.min(100, Math.max(0, v))}%`}} />
                  </div>
                  <span className="font-bold text-slate-700 w-7 text-right text-[11px]">{v}%</span>
                </div>
              );
            } else if (c.type === 'date') {
              content = <span className="font-mono text-slate-600 text-[11px]">{fdate(v)}</span>;
            } else if (c.type === 'tcode') {
              content = (
                <span 
                  onClick={() => setSelectedItem(it)}
                  className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-100 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-slate-800 font-mono text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
                  title="Click to view 360° Item Lifecycle"
                >
                  {v}
                </span>
              );
            } else if (c.type === 'code') {
              content = <span className="font-mono text-[11px] text-slate-700 font-medium bg-slate-50 px-1 py-0.5 rounded border border-slate-200/60">{v}</span>;
            } else if (c.type === 'status') {
              content = (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getPill(v)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(v)}`} />
                  {v}
                </span>
              );
            } else if (c.type === 'flags') {
              const fList = flags(it);
              content = fList.length > 0 ? (
                <div className="flex items-center gap-1 flex-wrap">
                  {fList.map((fl: any, fi: number) => (
                    <span key={fi} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getFlagTone(fl.c)}`}>
                      {fl.t}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Optimal
                </span>
              );
            } else if (c.type === 'sr') {
              const srVal = (isSub && it.d?.loaSerialNo) ? it.d.loaSerialNo : v;
              content = (
                <div className="flex items-center justify-center gap-1.5">
                  {isSub && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />}
                  <span className="font-mono text-xs text-slate-600 font-medium">
                    {srVal}
                  </span>
                </div>
              );
            } else if (c.type === 'name') {
              content = (
                <div 
                  className="cursor-pointer group/name flex items-center justify-between gap-2" 
                  onClick={() => setSelectedItem(it)}
                  title="Click to view 360° Item Lifecycle"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 group-hover/name:text-blue-700 transition-colors truncate max-w-[240px] leading-tight">
                      {v}
                    </div>
                    {!isCompact && <div className="text-[10px] font-medium text-slate-400 mt-0.5">{it.cat}</div>}
                  </div>
                  <span className="opacity-0 group-hover/name:opacity-100 transition-opacity bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                    360°
                  </span>
                </div>
              );
            } else {
              content = <span className="text-slate-600">{String(v)}</span>;
            }
          }

          const colW = getColWidth(c, isCompact);
          const stickyLeft = getStickyLeft(c);

          const stickyBg = isSelected 
            ? 'bg-[#e0edfd]' 
            : isSub 
              ? (isEven ? 'bg-slate-50' : 'bg-slate-100') 
              : (isEven ? 'bg-white' : 'bg-[#f8fafc]');

          return (
            <td 
              key={c.id} 
              className={`border-r border-slate-200 border-b border-slate-200 ${c.id === 'bom' ? 'border-r-2 border-slate-400' : ''} ${align} ${c.cls} ${rowBg} ${hoverBg} ${c.isSticky ? `${stickyBg} group-hover:bg-[#eaf2fc]` : ''}`}
              style={{ 
                width: colW,
                minWidth: colW,
                maxWidth: colW,
                padding: c.type === 'checkbox' ? '0' : (colWidths[c.id] !== undefined && colWidths[c.id] < 10 ? '0' : (isCompact ? '4px 8px' : '8px 12px')),
                left: stickyLeft !== undefined ? stickyLeft : undefined
              }}
            >
              <div className={`w-full overflow-hidden truncate ${c.type === 'money' || c.type === 'qty' || c.type === 'stock' || c.type === 'pct' ? 'text-right' : ''}`}>
                {content}
              </div>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* Overall Summary Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSummary(!showSummary)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title={showSummary ? 'Hide Overall Summary' : 'Show Overall Summary'}
            >
              {showSummary ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              )}
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight cursor-pointer" onClick={() => setShowSummary(!showSummary)}>Overall Summary</h1>
              <p className="text-sm text-slate-500 mt-1">High-level telemetry and stock breakdown across all locations.</p>
            </div>
          </div>
        </div>

        {showSummary && (
          <>
          {/* KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={`sk-${i}`} className="h-[142px] bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col justify-between">
                <div>
                  <div className="h-3 w-28 bg-slate-200 animate-pulse rounded mb-4"></div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <div className="h-8 w-20 bg-slate-200 animate-pulse rounded"></div>
                    <div className="h-4 w-16 bg-slate-200 animate-pulse rounded"></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="h-4 w-20 bg-slate-200 animate-pulse rounded-full"></div>
                  <div className="h-4 w-12 bg-slate-200 animate-pulse rounded"></div>
                </div>
              </div>
            ))
          ) : [
            { 
              t: 'Total Purchase Invoices', 
              v: apiKpis.piCount.toLocaleString(), 
              sub: 'Invoices', 
              detailLabel: 'Total Invoiced Qty',
              detailValue: `${inr(apiKpis.qty)} units`,
              tag: `${inr(apiKpis.qty)} Qty`, 
              color: 'text-indigo-700 bg-indigo-50', 
              ex: 'pi' 
            },
            { 
              t: 'Available Stock', 
              v: inr(apiKpis.availableStock), 
              sub: 'units in store', 
              detailLabel: 'Total Inward',
              detailValue: `${inr(apiKpis.totalInwardQty)} units`,
              tag: low ? `${low} Low stock` : 'Healthy', 
              color: low ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50', 
              ex: 'item' 
            },
            { 
              t: 'Active Work Orders', 
              v: apiKpis.woCount.toLocaleString(), 
              sub: 'WOs active', 
              detailLabel: 'Target Value',
              detailValue: `₹${cr(apiKpis.totalWoValue)} Cr`,
              tag: `${avg}% avg progress`, 
              color: 'text-blue-700 bg-blue-50', 
              ex: 'wo' 
            },
            { 
              t: 'Total RA Billing', 
              v: `₹${cr(apiKpis.supplyBilled + apiKpis.erectionBilled + apiKpis.retentionBilled)} Cr`, 
              sub: 'Billed Value', 
              detailLabel: 'Supply + Erection',
              detailValue: `₹${cr(apiKpis.supplyBilled)} + ₹${cr(apiKpis.erectionBilled)} Cr`,
              tag: `${apiKpis.totalBillingCount || (apiKpis.supplyCount + apiKpis.erectionCount)} Bills`, 
              color: 'text-purple-700 bg-purple-50', 
              ex: 'cbill' 
            },
            { 
              t: 'Pending Approvals', 
              v: apiKpis.poPending.toLocaleString(), 
              sub: 'Pending actions', 
              detailLabel: 'Cleared POs',
              detailValue: `${apiKpis.poCleared.toLocaleString()} cleared`,
              tag: apiKpis.poPending ? 'Urgent action' : 'All clear', 
              color: apiKpis.poPending ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50', 
              ex: 'po' 
            },
          ].map((k, i) => (
            <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-2">{k.t}</div>
                <div className="flex items-baseline gap-2 flex-wrap mb-2">
                  <span className="text-2xl font-extrabold text-slate-800 tabular-nums leading-none tracking-tight">{k.v}</span>
                  <span className="text-xs text-slate-500 font-medium">{k.sub}</span>
                </div>
                {k.detailLabel && (
                  <div className="text-[11px] font-medium text-slate-500 flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100 mb-3">
                    <span className="text-slate-400">{k.detailLabel}:</span>
                    <strong className="text-indigo-900 font-bold">{k.detailValue}</strong>
                  </div>
                )}
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${k.color}`}>{k.tag}</span>
                <button onClick={() => { setMode('single'); setSel(new Set([k.ex])); setView(null); }} className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1">Explore <ArrowUpRight className="w-3 h-3"/></button>
              </div>
            </div>
          ))}
        </section>

        {/* Stock Breakdown */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm mt-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-2">
              <Info className="w-3.5 h-3.5" /> Physical Stock Math Breakdown
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="font-medium text-slate-400">Total Invoiced:</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{inr(apiKpis.qty)} units</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Inward</div>
              {kpiLoading ? <div className="h-6 w-16 bg-slate-200 animate-pulse rounded mx-auto md:mx-0"></div> : <div className="text-lg font-extrabold text-slate-800">{inr(apiKpis.totalInwardQty)}</div>}
            </div>
            <div className="text-slate-300 font-bold text-xl">+</div>
            <div className="flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Transfer IN</div>
              {kpiLoading ? <div className="h-6 w-16 bg-slate-200 animate-pulse rounded mx-auto md:mx-0"></div> : <div className="text-lg font-extrabold text-slate-800">{inr(apiKpis.totalTransferInQty)}</div>}
            </div>
            <div className="text-slate-300 font-bold text-xl">-</div>
            <div className="flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Transfer OUT</div>
              {kpiLoading ? <div className="h-6 w-16 bg-slate-200 animate-pulse rounded mx-auto md:mx-0"></div> : <div className="text-lg font-extrabold text-slate-800">{inr(apiKpis.totalTransferOutQty)}</div>}
            </div>
            <div className="text-slate-300 font-bold text-xl">-</div>
            <div className="flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">MIN (Issued)</div>
              {kpiLoading ? <div className="h-6 w-16 bg-slate-200 animate-pulse rounded mx-auto md:mx-0"></div> : <div className="text-lg font-extrabold text-slate-800">{inr(apiKpis.materialIssued)}</div>}
            </div>
            <div className="text-slate-300 font-bold text-xl">=</div>
            <div className="flex-1 bg-emerald-50 rounded p-3 border border-emerald-100 shadow-sm">
              <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Physical Stock</div>
              {kpiLoading ? <div className="h-7 w-20 bg-emerald-200/60 animate-pulse rounded mx-auto md:mx-0"></div> : <div className="text-xl font-extrabold text-emerald-700">{inr(apiKpis.availableStock)}</div>}
            </div>
          </div>
          {apiKpis.totalTransferOutQty - apiKpis.totalTransferInQty > 0 && (
            <div className="mt-3 bg-amber-50/50 p-3 rounded-lg border border-amber-100/50 w-full text-left">
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-700 font-bold">{inr(apiKpis.totalTransferOutQty - apiKpis.totalTransferInQty)} units</span> are currently "In Transit" between stores and are not counted in the physical warehouse stock.
              </p>
              {apiKpis.transitDetails && apiKpis.transitDetails.length > 0 && (
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {apiKpis.transitDetails.map((t: any, idx: number) => (
                    <div key={idx} className="text-[10px] text-slate-600 bg-white border border-amber-100/60 rounded px-2.5 py-1.5 flex justify-between items-center shadow-sm">
                      <span className="font-medium truncate mr-2" title={`${t.from} → ${t.to}`}>
                        {t.from} <span className="text-amber-400 mx-1">→</span> {t.to}
                      </span>
                      <span className="font-bold text-amber-700 whitespace-nowrap">{inr(t.qty)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* RA Billing Breakdown (SAP / Enterprise Grade) */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm mt-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-purple-600" /> RA Billing Math & Audit Breakdown
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="font-medium text-slate-400">Total Billed Portfolio:</span>
              <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                ₹{cr(apiKpis.supplyBilled + apiKpis.erectionBilled + apiKpis.retentionBilled)} Cr ({apiKpis.totalBillingCount || (apiKpis.supplyCount + apiKpis.erectionCount)} Bills)
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Supply Billed (60%)</div>
              {kpiLoading ? (
                <div className="h-6 w-20 bg-slate-200 animate-pulse rounded mx-auto md:mx-0"></div>
              ) : (
                <>
                  <div className="text-lg font-extrabold text-slate-800">₹{cr(apiKpis.supplyBilled)} Cr</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {apiKpis.supplyCount} Client Bills
                    {apiKpis.supplyBaseAmount > 0 && <span className="text-slate-400 ml-1">(Base: ₹{cr(apiKpis.supplyBaseAmount)} + GST: ₹{cr(apiKpis.supplyGstAmount)})</span>}
                  </div>
                </>
              )}
            </div>

            <div className="text-slate-300 font-bold text-xl">+</div>

            <div className="flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Erection Billed (90%)</div>
              {kpiLoading ? (
                <div className="h-6 w-20 bg-slate-200 animate-pulse rounded mx-auto md:mx-0"></div>
              ) : (
                <>
                  <div className="text-lg font-extrabold text-slate-800">₹{cr(apiKpis.erectionBilled)} Cr</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {apiKpis.erectionCount} Contractor Bills
                    {apiKpis.erectionBaseAmount > 0 && <span className="text-slate-400 ml-1">(Base: ₹{cr(apiKpis.erectionBaseAmount)} + GST: ₹{cr(apiKpis.erectionGstAmount)})</span>}
                  </div>
                </>
              )}
            </div>

            <div className="text-slate-300 font-bold text-xl">+</div>

            <div className="flex-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Retention / Handover (10%)</div>
              {kpiLoading ? (
                <div className="h-6 w-20 bg-slate-200 animate-pulse rounded mx-auto md:mx-0"></div>
              ) : (
                <>
                  <div className="text-lg font-extrabold text-slate-800">₹{cr(apiKpis.retentionBilled)} Cr</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">Milestone Pending</div>
                </>
              )}
            </div>

            <div className="text-slate-300 font-bold text-xl">=</div>

            <div className="flex-1 bg-purple-50 rounded p-3 border border-purple-100 shadow-sm">
              <div className="text-[10px] uppercase font-bold text-purple-600 mb-1">Total RA Billed</div>
              {kpiLoading ? (
                <div className="h-7 w-24 bg-purple-200/60 animate-pulse rounded mx-auto md:mx-0"></div>
              ) : (
                <>
                  <div className="text-xl font-extrabold text-purple-700">
                    ₹{cr(apiKpis.supplyBilled + apiKpis.erectionBilled + apiKpis.retentionBilled)} Cr
                  </div>
                  <div className="text-[10px] text-purple-500 font-semibold mt-0.5">
                    {apiKpis.totalBillingCount || (apiKpis.supplyCount + apiKpis.erectionCount)} Total Certified / Booked
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Circle-wise Reconciliation Cards */}
          {apiKpis.billingCircles && apiKpis.billingCircles.length > 0 && (
            <div className="mt-3 bg-purple-50/40 p-3 rounded-lg border border-purple-100/60 w-full text-left">
              <p className="text-[11px] text-slate-600 font-medium flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 font-bold text-purple-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                  Circle-Wise RA Billing Reconciliation Ledger
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  All circles verified against Client Bills (60%) & Contractor Invoices (90%)
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {apiKpis.billingCircles.map((c: any, idx: number) => {
                  const grandTotalAll = apiKpis.supplyBilled + apiKpis.erectionBilled + apiKpis.retentionBilled;
                  const pct = grandTotalAll > 0 ? ((c.totalAmount / grandTotalAll) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={idx} className="bg-white border border-purple-100 rounded-lg p-2.5 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
                          <span className="font-bold text-xs text-slate-800">{c.circle} Circle</span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">{pct}%</span>
                        </div>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between items-center text-slate-500">
                            <span>Supply (60%):</span>
                            <span className="font-semibold text-slate-700">₹{cr(c.supplyAmount)} Cr <span className="text-[9px] text-slate-400">({c.supplyCount})</span></span>
                          </div>
                          <div className="flex justify-between items-center text-slate-500">
                            <span>Erection (90%):</span>
                            <span className="font-semibold text-slate-700">₹{cr(c.erectionAmount)} Cr <span className="text-[9px] text-slate-400">({c.erectionCount})</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-purple-50 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-purple-700">Total Billed:</span>
                        <span className="text-xs font-extrabold text-purple-900">₹{cr(c.totalAmount)} Cr</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
        </>
        )}

        {/* Modules Hub */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm">
          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-3">Quick Views</div>
          <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-slate-100">
            {VIEWS.map(v => (
              <button 
                key={v.id} 
                onClick={() => applyView(v.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${view === v.id ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {v.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowModules(!showModules)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title={showModules ? 'Hide modules' : 'Show modules'}
              >
                {showModules ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                )}
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight cursor-pointer" onClick={() => setShowModules(!showModules)}>Or build your own view</h1>
                <p className="text-sm text-slate-500 mt-1">Select one or multiple modules. Their data columns will be added to the Live Ledger below.</p>
              </div>
            </div>
            {showModules && (
              <div className="flex flex-col items-end gap-2">
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button onClick={() => setMode('single')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'single' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Single topic</button>
                  <button onClick={() => setMode('multi')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'multi' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Multi-select</button>
                  <button onClick={() => { setMode('all'); setSel(new Set(SUBS.map(s => s.id))); setView(null); setAlert(null); setPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>All modules</button>
                </div>
              </div>
            )}
          </div>

          {showModules && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {MODS.map(m => {
              const subs = SUBS.filter(s => s.m === m.id);
              const onCount = subs.filter(s => sel.has(s.id)).length;
              const isOn = onCount > 0;
              const theme = getColor(m.color);
              
              let meta = '';
              if (m.id === 'm1') meta = `${apiKpis.poPending + apiKpis.poCleared} POs • ₹${cr(apiKpis.val)} Cr`;
              if (m.id === 'm2') meta = `${new Set(filteredItems.map(i => i.circle)).size} depots • ${inr(apiKpis.availableStock)} stock`;
              if (m.id === 'm3') meta = `${apiKpis.woCount} WOs • ₹${cr(apiKpis.totalWoValue)} Cr execution`;
              if (m.id === 'm4') meta = `₹${cr(apiKpis.supplyBilled + apiKpis.erectionBilled)} Cr billed`;

              return (
                <div key={m.id} className={`flex flex-col border rounded-xl overflow-hidden transition-all ${isOn ? `${theme.border} ring-1 ring-${m.color}-500/20` : 'border-slate-200 bg-white'}`}>
                  <button onClick={() => handleModClick(m.id)} className={`w-full text-left p-3 focus:outline-none ${theme.bg}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${theme.active}`}>{m.n}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.text}`}>{onCount ? `${onCount}/${subs.length} Active` : 'Inactive'}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{m.name}</h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">{meta}</p>
                  </button>
                  <div className="p-2 flex flex-col gap-1 bg-white">
                    {subs.map(s => {
                      const isSubOn = sel.has(s.id);
                      return (
                        <button key={s.id} onClick={() => handleSubClick(s.id)} className={`flex items-center justify-between w-full p-2 text-left text-xs font-bold rounded-lg transition-colors ${isSubOn ? theme.active : 'hover:bg-slate-50 text-slate-700'}`}>
                          <span>{s.name}</span>
                          <span className={`min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] px-1.5 ${isSubOn ? 'bg-white/20 text-white' : theme.bg + ' ' + theme.text}`}>
                            {apiKpis.workflow?.[s.id === 'cbill' || s.id === 'kbill' ? 'billing' : s.id]?.total ?? filteredItems.filter(i => i.d[s.id]).length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          )}

          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowMis(!showMis)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title={showMis ? 'Hide MIS' : 'Show MIS'}
              >
                {showMis ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                )}
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight cursor-pointer" onClick={() => setShowMis(!showMis)}>MIS Summary Modules</h1>
                <p className="text-sm text-slate-500 mt-1">Select Store or Contractor MIS topics to view in the Live Ledger.</p>
              </div>
            </div>
          </div>

          {showMis && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {MODS_MIS.map(m => {
              const subs = SUBS.filter(s => s.m === m.id);
              const onCount = subs.filter(s => sel.has(s.id)).length;
              const isOn = onCount > 0;
              const theme = getColor(m.color);
              
              return (
                <div key={m.id} className={`flex flex-col border rounded-xl overflow-hidden transition-all ${isOn ? `${theme.border} ring-1 ring-${m.color}-500/20` : 'border-slate-200 bg-white'}`}>
                  <button onClick={() => handleModClick(m.id)} className={`w-full text-left p-3 focus:outline-none ${theme.bg}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${theme.active}`}>{m.n}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.text}`}>{onCount ? `${onCount}/${subs.length} Active` : 'Inactive'}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{m.name}</h3>
                  </button>
                  <div className="p-2 flex flex-col gap-1 bg-white">
                    {subs.map(s => {
                      const isSubOn = sel.has(s.id);
                      return (
                        <button key={s.id} onClick={() => handleSubClick(s.id)} className={`flex items-center justify-between w-full p-2 text-left text-xs font-bold rounded-lg transition-colors ${isSubOn ? theme.active : 'hover:bg-slate-50 text-slate-700'}`}>
                          <span>{s.name}</span>
                          <span className={`min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] px-1.5 ${isSubOn ? 'bg-white/20 text-white' : theme.bg + ' ' + theme.text}`}>
                            {apiKpis.workflow?.[s.id === 'cbill' || s.id === 'kbill' ? 'billing' : s.id]?.total ?? filteredItems.filter(i => i.d[s.id]).length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          )}
          </div>
        </section>


        {/* Live Ledger Table & Filters */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col space-y-4 bg-slate-50/50">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{selSubs.length === 1 ? selSubs[0].name + ' Directory' : 'Combined Live Ledger'}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">High-density ERP telemetry ledger • Showing identifiers + {selSubs.length} selected topics.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setF({ circle: 'All', subCircle: 'All', pkg: 'All', contractor: 'All', code: 'All', name: '', date: 'all', status: 'all' }); setQ(''); setPage(1); }}
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-900 border border-slate-200 rounded text-xs font-semibold bg-white flex items-center gap-1 shadow-2xs hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Filters
                </button>
              </div>
            </div>

            {/* Injected Filters */}
            <div className="pt-4 border-t border-slate-200/60 mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Global Telemetry Filters
                </h2>
                <button 
                  onClick={() => { setF({ circle: 'All', subCircle: 'All', pkg: 'All', contractor: 'All', code: 'All', name: '', date: 'all', status: 'all' }); setQ(''); setPage(1); }}
                  className="text-indigo-600 text-[11px] font-bold hover:text-indigo-700 uppercase tracking-wider"
                >
                  Reset filters
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Package</span>
                  <select className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" value={f.pkg} onChange={e => setF({...f, pkg: e.target.value})}>
                    {pkgs.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Circle</span>
                  <select className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" value={f.circle} onChange={e => setF({...f, circle: e.target.value, subCircle: 'All'})}>
                    {circles.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Contractor</span>
                  <select className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" value={f.contractor} onChange={e => { setF({...f, contractor: e.target.value}); setPage(1); }}>
                    <option value="All">All Contractors</option>
                    {contractors.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                {f.circle === 'Solan' && (
                  <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sub-Circle</span>
                    <select className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" value={f.subCircle} onChange={e => setF({...f, subCircle: e.target.value})}>
                      {subcircles.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                )}
                <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Temp Code</span>
                  <select className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" value={f.code} onChange={e => setF({...f, code: e.target.value})}>
                    {codes.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Item Name</span>
                  <input type="search" placeholder="Search..." className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" value={f.name} onChange={e => setF({...f, name: e.target.value})} />
                </label>
                <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Date Range</span>
                  <select className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" value={f.date} onChange={e => setF({...f, date: e.target.value})}>
                    <option value="all">All Time</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                    <option value="fy">FY 2026-27</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5"><span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PO Status</span>
                  <select className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500" value={f.status} onChange={e => setF({...f, status: e.target.value})}>
                    <option value="all">All</option>
                    <option>Approved</option>
                    <option>Cleared</option>
                    <option>Pending</option>
                  </select>
                </label>
              </div>
            </div>

          </div>
          
          {alert && (
            <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Showing alert filter: {ALERTS.find(x => x.id === alert)?.label} ({sortedRows.length})</span>
              <button onClick={() => { setAlert(null); setPage(1); }} className="text-xs font-bold text-amber-700 hover:underline">Clear alert filter</button>
            </div>
          )}

          {/* Docked Selected Items Summary Ribbon (Never blocks rows) */}
          {selectedTotals && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-3 border-b border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200 shadow-inner">
              <div className="flex items-center gap-3">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> {selectedTotals.count} Selected
                </span>
                <button onClick={handleSelectAllFiltered} className="text-xs text-indigo-300 hover:text-white underline font-semibold transition-colors">
                  Select All ({sortedRows.length})
                </button>
                <span className="text-slate-600 text-xs">•</span>
                <button onClick={handleClearSelection} className="text-xs text-slate-400 hover:text-slate-200 font-semibold transition-colors">
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs">
                <div className="flex items-baseline gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">LOA:</span>
                  <strong className="text-white font-mono">{money(selectedTotals.totalLoaVal)}</strong>
                  <span className="text-slate-400 text-[10px]">({inr(selectedTotals.totalLoaQty)})</span>
                </div>
                <div className="flex items-baseline gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">PO:</span>
                  <strong className="text-indigo-300 font-mono">{money(selectedTotals.totalPoVal)}</strong>
                </div>
                <div className="flex items-baseline gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Invoiced:</span>
                  <strong className="text-blue-300 font-mono">{inr(selectedTotals.totalInvQty)}</strong>
                </div>
                <div className="flex items-baseline gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Stock:</span>
                  <strong className="text-emerald-400 font-mono">{inr(selectedTotals.totalStockQty)}</strong>
                  <span className="text-emerald-400/80 text-[10px]">({money(selectedTotals.totalStockVal)})</span>
                </div>
                <div className="flex items-baseline gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Issued:</span>
                  <strong className="text-purple-300 font-mono">{inr(selectedTotals.totalIssuedQty)}</strong>
                </div>
                <div className="flex items-baseline gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Billed:</span>
                  <strong className="text-teal-300 font-mono">{money(selectedTotals.totalBilledVal)}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => exportToCSV(selectedItemsList, 'operations-ledger-selected.csv')} 
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Export Selected ({selectedTotals.count})
                </button>
                <button 
                  onClick={handleClearSelection} 
                  className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors" 
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SAP ALV Smart Table Action Toolbar */}
          <div className="bg-[#f8fafc] border-t border-b border-slate-300 px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left: Table Title, Count & View Mode */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm tracking-tight">Operations Ledger</span>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs">
                  {sortedRows.length.toLocaleString()} Items
                </span>
                {selectedIds.size > 0 && (
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 shadow-2xs">
                    <CheckSquare className="w-3 h-3 text-blue-600" /> {selectedIds.size} Selected
                  </span>
                )}
              </div>

              {/* Segmented View Mode (Item vs Activity) */}
              <div className="flex bg-slate-200 p-0.5 rounded border border-slate-300 ml-1">
                <button 
                  onClick={() => setViewType('item')} 
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${viewType === 'item' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Item-wise
                </button>
                <button 
                  onClick={() => setViewType('activity')} 
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${viewType === 'activity' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Activity-wise
                </button>
              </div>
            </div>

            {/* Right: Search, Density, Column Chooser, Totals Toggle, Export */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Search */}
              <div className="relative w-44 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="search" 
                  placeholder="Filter ledger..." 
                  className="w-full h-7 pl-8 pr-6 rounded border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                  value={q} 
                  onChange={e => { setQ(e.target.value); setPage(1); }} 
                />
                {q && (
                  <button onClick={() => setQ('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* SAP Density Switcher */}
              <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-2xs">
                <button 
                  onClick={() => setDensity('compact')} 
                  className={`px-2 py-1 text-[11px] font-semibold flex items-center gap-1 transition-colors ${density === 'compact' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                  title="High Density (SAP ALV Compact Grid)"
                >
                  Compact
                </button>
                <button 
                  onClick={() => setDensity('standard')} 
                  className={`px-2 py-1 text-[11px] font-semibold flex items-center gap-1 transition-colors ${density === 'standard' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                  title="Standard Density"
                >
                  Standard
                </button>
              </div>

              {/* SAP Grand Totals Toggle */}
              <button 
                onClick={() => setShowTotalsRow(prev => !prev)} 
                className={`h-7 px-2 border rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs ${showTotalsRow ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                title={showTotalsRow ? 'Hide Grand Totals (Σ Row)' : 'Show Grand Totals (Σ Row)'}
              >
                <Sigma className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Totals</span>
              </button>

              {/* SAP Column Chooser (Personalization) */}
              <div className="relative">
                <button 
                  onClick={() => setShowColumnChooser(prev => !prev)} 
                  className={`h-7 px-2 border rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs ${showColumnChooser ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                  title="Personalize Columns"
                >
                  <Columns className="w-3.5 h-3.5" /> 
                  <span>Columns ({curCols.filter(c => c.type !== 'checkbox').length})</span>
                </button>

                {/* Popover */}
                {showColumnChooser && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowColumnChooser(false)} />
                    <div className="absolute right-0 top-8 z-50 w-72 bg-white rounded-lg shadow-xl border border-slate-300 p-3 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <Columns className="w-3.5 h-3.5 text-blue-600" /> Personalize Columns
                        </span>
                        <button onClick={() => setShowColumnChooser(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Find column..." 
                          className="w-full h-7 pl-7 pr-2 rounded border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={columnSearch}
                          onChange={e => setColumnSearch(e.target.value)}
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1">
                        {allPersonalizableColumns
                          .filter(col => !columnSearch || col.label.toLowerCase().includes(columnSearch.toLowerCase()) || col.group.toLowerCase().includes(columnSearch.toLowerCase()))
                          .map(col => {
                            const isVisible = !hidden.has(col.id);
                            return (
                              <label key={col.id} className="flex items-center justify-between py-1.5 px-1 hover:bg-slate-50 rounded cursor-pointer select-none">
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <input 
                                    type="checkbox" 
                                    checked={isVisible} 
                                    onChange={() => toggleColumnVisibility(col.id)}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                  />
                                  <span className={`text-xs truncate ${isVisible ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                                    {col.label}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0 uppercase font-mono">{col.group}</span>
                              </label>
                            );
                          })}
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-semibold">
                        <button 
                          onClick={showAllColumns} 
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Show All
                        </button>
                        <button 
                          onClick={resetColumnsToDefault} 
                          className="text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          Reset Default
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Reset Column Widths */}
              {Object.keys(colWidths).length > 0 && (
                <button 
                  onClick={() => setColWidths({})} 
                  className="h-7 px-2 border border-slate-300 bg-white rounded text-xs text-slate-600 hover:bg-slate-100 flex items-center gap-1 shadow-2xs"
                  title="Reset column widths to auto"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}

              {/* Export to CSV/Excel */}
              <button 
                onClick={() => exportToCSV(selectedIds.size > 0 ? selectedItemsList : sortedRows, selectedIds.size > 0 ? 'operations-ledger-selected.csv' : 'operations-ledger-all.csv')}
                className="h-7 px-2.5 border border-slate-300 bg-white rounded text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 shadow-2xs transition-colors"
                title={selectedIds.size > 0 ? `Export ${selectedIds.size} selected items` : "Export all filtered items"}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> 
                <span>{selectedIds.size > 0 ? `Export (${selectedIds.size})` : 'Export'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse border border-slate-300 text-xs whitespace-nowrap min-w-max select-text">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-2xs">
                {/* Group Header */}
                <tr>
                  {curCols.filter(c => c.isSticky).length > 0 && (
                    <th 
                      colSpan={curCols.filter(c => c.isSticky).length} 
                      className="sticky left-0 z-30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 bg-slate-200 border-r-2 border-slate-400 border-b border-slate-300 shadow-xs"
                    >
                      Item Master & Target
                    </th>
                  )}
                  {curCols.filter(c => !c.isSticky && c.sp === null).length > 0 && (
                    <th 
                      colSpan={curCols.filter(c => !c.isSticky && c.sp === null).length} 
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border-r border-slate-300 border-b border-slate-300"
                    >
                      General Info
                    </th>
                  )}
                  {selSubs.map((s, i) => {
                    const n = curCols.filter(c => c.sp === s.id).length;
                    if (!n) return null;
                    const m = [...MODS, ...MODS_MIS].find(mod => mod.id === s.m)!;
                    const theme = getColor(m.color);
                    return (
                      <th key={s.id} colSpan={n} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-r border-slate-300 border-b ${theme.bg} ${theme.text}`}>
                        {s.name}
                      </th>
                    );
                  })}
                </tr>
                {/* Column Headers */}
                <tr className="bg-[#f1f5f9] text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-300">
                  {curCols.map((c, i) => {
                    const isCompact = density === 'compact';
                    const colW = getColWidth(c, isCompact);
                    const stickyLeft = getStickyLeft(c);
                    return (
                    <th 
                      key={c.id} 
                      className={`relative border-r border-slate-300 border-b border-slate-300 bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors group ${c.cls} ${c.isSticky ? 'z-40 bg-[#f1f5f9]' : ''} ${c.id === 'bom' ? 'border-r-2 border-slate-400' : ''} ${c.type === 'money' || c.type === 'qty' || c.type === 'stock' || c.type === 'pct' ? 'text-right' : ''}`}
                      style={{ 
                        width: colW,
                        minWidth: colW,
                        maxWidth: colW,
                        padding: c.type === 'checkbox' ? '0' : (colWidths[c.id] !== undefined && colWidths[c.id] < 10 ? '0' : (isCompact ? '6px 8px' : '10px 12px')),
                        left: stickyLeft !== undefined ? stickyLeft : undefined
                      }}
                    >
                      {c.type === 'checkbox' ? (
                        <div className="flex items-center justify-center w-full h-full">
                          <input 
                            type="checkbox"
                            aria-label="Select all on this page"
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            checked={isAllPageSelected}
                            ref={el => {
                              if (el) el.indeterminate = isSomePageSelected && !isAllPageSelected;
                            }}
                            onChange={toggleSelectAllPage}
                          />
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1 overflow-hidden ${c.type === 'money' || c.type === 'qty' || c.type === 'stock' || c.type === 'pct' ? 'justify-end' : ''}`}>
                          <div className="flex-1 min-w-0 cursor-pointer truncate select-none" onClick={() => { setSort({ id: c.id, dir: sort?.id === c.id ? -sort.dir : 1 }); setPage(1); }}>
                            {c.label}
                            {sort?.id === c.id && (sort.dir === 1 ? ' ↑' : ' ↓')}
                          </div>
                        </div>
                      )}
                      {c.type !== 'checkbox' && (
                        <div 
                          onMouseDown={(e) => handleMouseDown(e, c.id, e.currentTarget.parentElement!.getBoundingClientRect().width)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500 z-10 touch-none"
                        />
                      )}
                    </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemsLoading ? (
                  <tr>
                    <td colSpan={curCols.length} className="px-6 py-20 text-center bg-white">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading operations ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : slice.length === 0 ? (
                  <tr><td colSpan={curCols.length} className="px-6 py-12 text-center text-slate-500 font-medium bg-white">No items match the current filters.</td></tr>
                ) : (
                  viewType === 'item' ? (
                    (slice as any[]).map((it, i) => renderRow(it, i))
                  ) : (
                    (slice as [string, any[]][]).map(([cat, items], i) => {
                      // Default false (collapsed)
                      const isExpanded = expandedActivities[cat] || false;
                      const seqNo = (page - 1) * size + i + 1;
                      const actName = items[0]?.d?.activity || cat.replace(/^[0-9]+\s*-\s*/, '') || 'Uncategorized';
                      
                      const isCatAllSelected = items.length > 0 && items.every(it => selectedIds.has(it.uid || it.code));
                      const isCatSomeSelected = items.some(it => selectedIds.has(it.uid || it.code));

                      const aggCols = curCols.map(c => {
                        if (['qty', 'money', 'stock'].includes(c.type)) {
                          return items.reduce((a, it) => {
                            const v = raw(c, it);
                            return a + (typeof v === 'number' ? v : 0);
                          }, 0);
                        }
                        return null;
                      });
                      const firstAggIndex = aggCols.findIndex(v => v !== null);
                      const actualSpanCount = firstAggIndex === -1 ? curCols.length : firstAggIndex;

                      const selW = colWidths['select'] !== undefined ? colWidths['select'] : (density === 'compact' ? 38 : 44);
                      const srW = colWidths['sr'] !== undefined ? colWidths['sr'] : (density === 'compact' ? 52 : 64);

                      return (
                        <React.Fragment key={cat}>
                          <tr 
                            className="bg-slate-100 hover:bg-slate-200/80 cursor-pointer transition-colors group font-semibold text-xs border-b border-slate-300"
                            onClick={() => setExpandedActivities(prev => ({...prev, [cat]: !prev[cat]}))}
                          >
                            <td 
                              className="border-r border-slate-300 text-center sticky z-10 bg-slate-100 group-hover:bg-slate-200/80"
                              style={{
                                width: selW,
                                minWidth: selW,
                                maxWidth: selW,
                                left: 0
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-center">
                                <input 
                                  type="checkbox"
                                  aria-label={`Select all in ${actName}`}
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                  checked={isCatAllSelected}
                                  ref={el => {
                                    if (el) el.indeterminate = isCatSomeSelected && !isCatAllSelected;
                                  }}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setSelectedIds(prev => {
                                      const next = new Set(prev);
                                      if (isCatAllSelected) {
                                        items.forEach(it => next.delete(it.uid || it.code));
                                      } else {
                                        items.forEach(it => next.add(it.uid || it.code));
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              </div>
                            </td>
                            <td 
                              className="border-r border-slate-300 text-center border-l-4 border-l-blue-600 sticky z-10 bg-slate-100 group-hover:bg-slate-200/80"
                              style={{
                                width: srW,
                                minWidth: srW,
                                maxWidth: srW,
                                padding: srW < 10 ? '0' : (density === 'compact' ? '4px 6px' : '8px 10px'),
                                left: selW
                              }}
                            >
                              <div className="flex items-center justify-center w-full h-full overflow-hidden">
                                <span className={`transform transition-transform duration-200 text-slate-500 group-hover:text-blue-600 ${isExpanded ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </td>
                            <td 
                              colSpan={Math.max(1, actualSpanCount - 2)} 
                              className="px-3 py-1.5 sticky z-10 bg-slate-100 group-hover:bg-slate-200/80 border-r border-slate-300"
                              style={{ left: selW + srW }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-300 shadow-2xs">{seqNo}</span>
                                <span className="text-xs font-bold text-slate-900">{actName}</span>
                                <span className="text-[11px] font-medium text-slate-500">({items.length} items)</span>
                              </div>
                            </td>
                            {actualSpanCount < curCols.length && curCols.slice(actualSpanCount).map((c, cIdx) => {
                              const sum = aggCols[actualSpanCount + cIdx];
                              const isCompact = density === 'compact';
                              const colW = getColWidth(c, isCompact);
                              const stickyLeft = getStickyLeft(c);

                              if (sum === null) {
                                let content = null;
                                if (c.type === 'text') {
                                  const v = raw(c, items[0]);
                                  if (v) content = <span className="text-slate-600 font-medium text-[11px] truncate">{String(v)}</span>;
                                }
                                return (
                                  <td 
                                    key={c.id} 
                                    className={`border-r border-slate-300 bg-slate-100 group-hover:bg-slate-200/80 ${c.isSticky ? 'sticky z-10' : ''} ${c.id === 'bom' ? 'border-r-2 border-slate-400' : ''}`}
                                    style={{ 
                                      width: colW,
                                      minWidth: colW,
                                      maxWidth: colW,
                                      padding: colWidths[c.id] !== undefined && colWidths[c.id] < 10 ? '0' : (isCompact ? '4px 8px' : '8px 12px'),
                                      left: stickyLeft !== undefined ? stickyLeft : undefined
                                    }}
                                  >
                                    <div className="w-full overflow-hidden truncate">{content}</div>
                                  </td>
                                );
                              }
                              const mod = [...MODS, ...MODS_MIS].find(m => m.id === c.m);
                              const colorCls = mod ? getColor(mod.color).text : 'text-slate-800';
                              return (
                                <td 
                                  key={c.id} 
                                  className={`border-r border-slate-300 text-right tabular-nums text-xs font-mono font-bold ${colorCls} bg-slate-100 group-hover:bg-slate-200/80 ${c.isSticky ? 'sticky z-10' : ''} ${c.id === 'bom' ? 'border-r-2 border-slate-400' : ''}`}
                                  style={{ 
                                    width: colW,
                                    minWidth: colW,
                                    maxWidth: colW,
                                    padding: colWidths[c.id] !== undefined && colWidths[c.id] < 10 ? '0' : (isCompact ? '4px 8px' : '8px 12px'),
                                    left: stickyLeft !== undefined ? stickyLeft : undefined
                                  }}
                                >
                                  <div className="w-full overflow-hidden truncate">
                                    {c.type === 'money' ? money(sum) : sum > 0 ? inr(sum) : '0'}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                          {isExpanded && items.map((it, idx) => renderRow(it, idx, true))}
                        </React.Fragment>
                      );
                    })
                  )
                )}
              </tbody>
              {/* SAP ALV Grand Totals Summary Footer */}
              {showTotalsRow && sortedRows.length > 0 && (
                <tfoot className="sticky bottom-0 z-20 shadow-[0_-2px_4px_rgba(0,0,0,0.06)]">
                  <tr className="bg-[#edf2f7] text-slate-900 font-bold border-t-2 border-slate-400 border-b-2 border-slate-400 text-xs">
                    {curCols.map((c) => {
                      const isSticky = c.isSticky;
                      const stickyLeft = getStickyLeft(c);
                      const isCompact = density === 'compact';
                      const colW = getColWidth(c, isCompact);
                      const pad = c.type === 'checkbox' ? '0' : (isCompact ? '5px 8px' : '9px 12px');
                      
                      let cellContent: React.ReactNode = null;
                      if (c.id === 'select') {
                        cellContent = <span className="font-mono font-bold text-slate-600">Σ</span>;
                      } else if (c.id === 'sr') {
                        cellContent = null;
                      } else if (c.id === 'code') {
                        cellContent = <span className="font-mono uppercase tracking-wider text-[11px] text-slate-800">GRAND TOTAL</span>;
                      } else if (c.id === 'name') {
                        cellContent = <span className="text-[11px] text-slate-600 font-medium">({sortedRows.length.toLocaleString()} items)</span>;
                      } else if (['qty', 'money', 'stock'].includes(c.type)) {
                        const sum = grandTotals[c.id] || 0;
                        cellContent = c.type === 'money' ? money(sum) : inr(sum);
                      } else {
                        cellContent = <span className="text-slate-400 font-mono">—</span>;
                      }

                      const align = ['qty', 'money', 'stock', 'pct'].includes(c.type) ? 'text-right' : c.id === 'select' || c.id === 'sr' ? 'text-center' : 'text-left';

                      return (
                        <td 
                          key={`foot-${c.id}`}
                          className={`border-r border-slate-300 ${c.id === 'bom' ? 'border-r-2 border-slate-400' : ''} ${pad} ${align} font-mono font-bold text-slate-900 bg-[#edf2f7] ${isSticky ? 'sticky z-30' : ''}`}
                          style={{
                            width: colW,
                            minWidth: colW,
                            maxWidth: colW,
                            padding: pad,
                            left: stickyLeft !== undefined ? stickyLeft : undefined
                          }}
                        >
                          <div className="w-full truncate">{cellContent}</div>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-4 py-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-3">
              <span>Rows per page:</span>
              <select className="h-7 rounded border border-slate-200 bg-slate-50 px-2 outline-none" value={size} onChange={e => { setSize(+e.target.value); setPage(1); }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={350}>350</option>
                <option value={450}>450</option>
                <option value={550}>550</option>
                <option value={1000}>1000</option>
                <option value={1300}>1300</option>
                <option value={1600}>1600</option>
                <option value={2300}>2300</option>
                <option value={2700}>2700</option>
                <option value={3200}>3200</option>
                <option value={3500}>3500</option>
                <option value={4000}>4000</option>
                <option value={4300}>4300</option>
                <option value={4800}>4800</option>
                <option value={5000}>5000</option>
                <option value={5300}>5300</option>
              </select>
              <span className="hidden sm:inline">Page {currentPage} of {pages} ({total} items)</span>
            </div>
            <div className="flex items-center gap-1">
              <button disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeft className="w-4 h-4"/></button>
              {[...Array(Math.min(5, pages))].map((_, i) => {
                let p = currentPage - 2 + i;
                if (currentPage <= 2) p = i + 1;
                else if (currentPage >= pages - 1) p = pages - 4 + i;
                if (p < 1 || p > pages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded border font-bold flex items-center justify-center transition-colors ${p === currentPage ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {p}
                  </button>
                );
              })}
              <button disabled={currentPage >= pages} onClick={() => setPage(p => p + 1)} className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        </section>

      </div>

      {/* Sleek Floating Quick Pill for Scroll Visibility */}
      {selectedTotals && (
        <div className="fixed bottom-5 right-6 z-30 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl p-2.5 px-4 shadow-2xl border border-slate-700/80 flex items-center gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
            {selectedTotals.count} Selected
          </span>
          <span className="text-xs text-slate-300 hidden sm:inline">
            Stock: <strong className="text-emerald-400">{inr(selectedTotals.totalStockQty)}</strong> • Val: <strong className="text-white">{money(selectedTotals.totalLoaVal)}</strong>
          </span>
          <button 
            onClick={() => exportToCSV(selectedItemsList, 'operations-ledger-selected.csv')} 
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs transition-colors"
          >
            <Download className="w-3 h-3" /> Export
          </button>
          <button 
            onClick={handleClearSelection} 
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Item 360 Detail Drawer */}
      <Item360Drawer 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        onFilterByCode={(code) => {
          setF(prev => ({ ...prev, code }));
          setPage(1);
        }}
        onFilterByCircle={(circle) => {
          setF(prev => ({ ...prev, circle, subCircle: 'All' }));
          setPage(1);
        }}
      />
    </div>
  );
}
