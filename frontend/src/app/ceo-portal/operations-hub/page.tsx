"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Download, ChevronLeft, ChevronRight, Search, X, SlidersHorizontal, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { fetchCeoDashboardData } from '@/features/ceo-portal/api/dashboard.api';
import { api } from '@/shared/api/axios';

// --- UTILS & DATA GENERATOR ---
const DAY = 864e5;
const TODAY = Date.UTC(2026, 9, 6);
const FY = Date.UTC(2026, 3, 1);
const CODE: Record<string, string> = { Jaipur: 'JPR', Lucknow: 'LKO', Pune: 'PNQ', Indore: 'IDR' };
const DEPOT: Record<string, string> = { Jaipur: 'Jaipur Central', Lucknow: 'Lucknow North', Pune: 'Pune West', Indore: 'Indore Main' };

const inr = (n: number) => Math.round(n).toLocaleString('en-IN');
const money = (n: number) => '₹' + inr(n);
const cr = (n: number) => (n / 1e7).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdate = (ms: number) => new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

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
    sr: db.loaSerialNo || (i + 1), 
    code: b[8] || ('TC-' + (1001 + i)), 
    name: b[0], 
    cat: b[1], 
    pkg: b[2], 
    circle: b[3], 
    subcircle: db.subcircle || db.subCircle || '', 
    unit: b[4], 
    rate: b[5], 
    loa: b[6], 
    bom: db.bomQty || 0,
    stock: b[7],
    date: Date.now()
  };
  
  const d: any = {};
  
  const loaQty = db.loaQty || 0;
  const poQty = db.loaQty || 0; 
  const poVal = poQty * it.rate;
  
  const diQty = db.diQty || 0;
  const invQty = db.invQty || 0;
  const actQty = db.actQty || 0;
  const billedQty = db.billedQty || 0;
  
  const issuedQty = db.issuedQty || 0;
  const returnedQty = db.returnedQty || 0;
  const transferInQty = db.transferInQty || 0;
  const transferOutQty = db.transferOutQty || 0;
  
  d.item = { unit: it.unit, rate: it.rate, loa: it.loa, stock: it.stock };
  d.po = poQty > 0 ? { no: 'N/A', date: it.date, qty: poQty, val: poVal, status: 'Active' } : null;
  d.di = diQty > 0 ? { no: db.diNo || 'N/A', qty: diQty, date: it.date } : null;
  d.pi = invQty > 0 ? { no: db.piNo || 'N/A', qty: invQty, amt: invQty * it.rate, status: 'N/A' } : null;
  
  d.store = { depot: DEPOT[it.circle] || (it.circle + ' Central'), reorder: Math.round(loaQty * 0.15) };
  d.receipt = invQty > 0 ? { no: 'N/A', qty: invQty } : null;
  d.inward = invQty > 0 ? { qty: invQty, date: it.date } : null;
  
  d.min = issuedQty > 0 ? { no: 'N/A', qty: issuedQty } : null;
  d.cret = returnedQty > 0 ? { qty: returnedQty } : null;
  d.outward = actQty > 0 ? { qty: actQty } : null;
  d.inter = (transferInQty > 0 || transferOutQty > 0) ? { qty: transferInQty + transferOutQty, route: 'N/A' } : null;
  
  d.wo = loaQty > 0 ? { no: 'N/A', val: poVal, prog: loaQty ? Math.round((actQty / loaQty) * 100) : 0 } : null;
  d.dn = issuedQty > 0 ? { no: 'N/A', qty: issuedQty } : null;
  d.mrhov = returnedQty > 0 ? { status: 'N/A' } : null;
  
  d.cbill = billedQty > 0 ? { amt: billedQty * it.rate, ra: 'N/A' } : null;
  d.kbill = billedQty > 0 ? { amt: billedQty * it.rate, status: 'N/A' } : null;
  
  d.mis_s = { di: diQty, mrhov: returnedQty, issued: issuedQty, balStore: it.stock };
  d.mis_c = { dn: issuedQty, jmc: billedQty, wipC: actQty, wipR: Math.max(0, Math.round((loaQty - actQty)*1000)/1000), issued: issuedQty, balCont: Math.max(0, Math.round((issuedQty - actQty - returnedQty)*1000)/1000) };
  
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
  { id: 'm6', n: 2, name: 'Contractor MIS', color: 'teal' }
];

const SUBS = [
  { id: 'item', m: 'm1', name: 'Item Master', cols: [['unit', 'Unit', 'text'], ['rate', 'Unit rate (₹)', 'money'], ['stock', 'Available stock', 'stock']] },
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
  { id: 'wo', m: 'm3', name: 'Work Order (WO) Creation', cols: [['no', 'WO no.', 'code'], ['val', 'WO value (₹)', 'money'], ['prog', 'Progress', 'pct']] },
  { id: 'dn', m: 'm3', name: 'Demand Note', cols: [['no', 'DN no.', 'code'], ['qty', 'Demand qty', 'qty']] },
  { id: 'mrhov', m: 'm3', name: 'MRHOV', cols: [['status', 'MRHOV status', 'status']] },
  { id: 'cbill', m: 'm4', name: 'Client Billing', cols: [['ra', 'RA bill', 'code'], ['amt', 'RA amount (₹)', 'money']] },
  { id: 'kbill', m: 'm4', name: 'Contractor Billing', cols: [['amt', 'Payable (₹)', 'money'], ['status', 'Payment', 'status']] },
  { id: 'mis_s', m: 'm5', name: 'Store MIS', cols: [['di', 'DI qty', 'qty'], ['mrhov', 'MRHOV qty', 'qty'], ['issued', 'Issued qty', 'qty'], ['balStore', 'Balance at store', 'qty']] },
  { id: 'mis_c', m: 'm6', name: 'Contractor MIS', cols: [['dn', 'Demand Notes', 'qty'], ['jmc', 'JMC qty', 'qty'], ['wipC', 'WIP Consumed', 'qty'], ['wipR', 'WIP Required', 'qty'], ['issued', 'Store Issued', 'qty'], ['balCont', 'Balance at contractor', 'qty']] }
];

const STATIC = [
  { id: 'sr', label: 'Sr. No.', type: 'sr', cls: 'text-center sticky left-0 z-10 bg-white min-w-[64px] max-w-[64px]' },
  { id: 'code', label: 'Temp code', type: 'tcode', cls: 'sticky left-[64px] z-10 bg-white min-w-[112px] max-w-[112px]' },
  { id: 'name', label: 'Item name', type: 'name', cls: 'sticky left-[176px] z-10 bg-white min-w-[260px] max-w-[260px]' },
  { id: 'loa', label: 'LOA qty', type: 'qty', cls: 'sticky left-[436px] z-10 bg-white min-w-[100px] max-w-[100px]' },
  { id: 'bom', label: 'BOM qty', type: 'qty', cls: 'sticky left-[536px] z-10 bg-white min-w-[100px] max-w-[100px] border-r border-slate-200' },
  { id: 'pkg', label: 'Package', type: 'text', cls: '' },
  { id: 'circle', label: 'Circle', type: 'text', cls: '' },
  { id: 'flags', label: 'Flags', type: 'flags', cls: '' }
];

const VIEWS = [
  { id: 'overview', name: 'CEO overview', sel: ['item', 'po', 'wo', 'cbill'], keep: ['item.stock', 'po.val', 'po.status', 'wo.prog', 'cbill.amt'] },
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
  if (d.wo && d.wo.prog < 50) f.push({ t: 'WO behind', c: 'crit' });
  return f;
}

const ALERTS = [
  { id: 'low', label: 'Items running low on stock', tone: 'crit', test: (i: any) => health(i) === 'crit', view: 'stock' },
  { id: 'pend', label: 'Purchase orders waiting for approval', tone: 'warn', test: (i: any) => i.d.po && i.d.po.status === 'Pending', view: 'money' },
  { id: 'wo', label: 'Items on work orders under 50% done', tone: 'crit', test: (i: any) => !!(i.d.wo && i.d.wo.prog < 50), view: 'site' },
  { id: 'mrhov', label: 'MRHOV not yet cleared', tone: 'warn', test: (i: any) => !!(i.d.mrhov && i.d.mrhov.status !== 'Cleared'), view: 'site' },
  { id: 'due', label: 'Supplier invoices not yet paid', tone: 'warn', test: (i: any) => !!(i.d.pi && i.d.pi.status === 'Due'), view: 'money' }
];


// --- COMPONENT ---
export default function OperationsHub() {
  const [items, setItems] = useState<any[]>([]);
  
  const [mode, setMode] = useState<'single' | 'multi' | 'all'>('single');
  const [sel, setSel] = useState<Set<string>>(new Set(['item']));
  
  const [f, setF] = useState({ circle: 'All', subCircle: 'All', pkg: 'All', code: 'All', name: '', date: 'all', status: 'all' });
  const [q, setQ] = useState('');

  const [apiKpis, setApiKpis] = useState({ 
    piCount: 0, val: 0, qty: 0, 
    availableStock: 0,
    woCount: 0, totalWoValue: 0,
    supplyBilled: 0, erectionBilled: 0,
    poPending: 0, poCleared: 0,
    workflow: {} as any
  });

  useEffect(() => {
    api.get('/reports/item-summary', { params: { limit: 5000 } })
      .then(res => {
        if (res.data?.data?.items) {
          const dbItems = res.data.data.items.map((d: any) => [
            d.itemName || 'Unknown', 
            'Materials', 
            d.package || 'Unknown', 
            d.circle || 'Unknown', 
            'Nos', 
            150, 
            d.loaQty || 0, 
            Math.max(0, (d.invQty || 0) - (d.actQty || 0)),
            d.tempCode || '',
            d
          ]);
          setItems(dbItems.map(build));
        } else {
          setItems(BASE.map(build));
        }
      })
      .catch((err) => {
        console.error('API FETCH ERROR:', err);
        setItems(BASE.map(build));
      });
  }, []);

  useEffect(() => {
    let active = true;
    const filters: any = {};
    if (f.circle !== 'All') filters.circle = f.circle;
    if (f.circle === 'Solan' && f.subCircle !== 'All') filters.subCircle = f.subCircle;
    if (f.pkg !== 'All') filters.package = f.pkg;
    
    fetchCeoDashboardData(filters).then((res: any) => {
      if (!active) return;
      setApiKpis({
        piCount: res?.kpis?.piCount || 0,
        val: res?.kpis?.piValue || 0,
        qty: res?.kpis?.piQty || 0,
        availableStock: res?.kpis?.physicalStock || 0,
        woCount: res?.kpis?.woCount || 0,
        totalWoValue: res?.kpis?.totalWoValue || 0,
        supplyBilled: res?.kpis?.supplyBilled || 0,
        erectionBilled: res?.kpis?.erectionBilled || 0,
        poPending: res?.kpis?.poPending || 0,
        poCleared: res?.kpis?.poCleared || 0,
        workflow: res?.workflow || {}
      });
    }).catch(console.error);
    
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

  // Derived filters
  const circles = ['All', 'Solan', 'Nahan', 'Rampur', 'Rohru'];
  const subcircles = useMemo(() => ['All', ...Array.from(new Set(items.filter(i => i.circle === 'Solan' && i.subcircle).map(i => i.subcircle))).sort()], [items]);
  const pkgs = ['All', 'Package 1(S/N)', 'Package 2(R/R)'];
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
    const out: any[] = STATIC.filter(c => !hidden.has(c.id)).map(c => ({ ...c, sp: null, k: c.id, m: null }));
    selSubs.forEach(s => s.cols.forEach(([k, label, type], i) => {
      const id = s.id + '.' + k;
      if (!hidden.has(id)) out.push({ id, label, type, sp: s.id, k, m: s.m, cls: i === 0 ? 'border-l border-slate-200' : '' });
    }));
    return out;
  }, [hidden, selSubs]);

  const raw = (c: any, it: any) => c.sp ? (it.d[c.sp] ? it.d[c.sp][c.k] : null) : (c.k === 'sr' ? it.sr : c.k === 'flags' ? flags(it).length : it[c.k]);

  const sortedRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    let rows = filteredItems;
    if (query) {
      rows = rows.filter(it => curCols.some(c => {
        const v = raw(c, it);
        return v !== null && v !== undefined && String(v).toLowerCase().includes(query);
      }));
    }
    const sc = curCols.find(c => c.id === sort.id) || curCols[0];
    return rows.slice().sort((a, b) => {
      let x = raw(sc, a); let y = raw(sc, b);
      if (x === null || x === undefined) x = -Infinity;
      if (y === null || y === undefined) y = -Infinity;
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [filteredItems, curCols, q, sort]);

  const total = sortedRows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.min(page, pages);
  const slice = sortedRows.slice((currentPage - 1) * size, currentPage * size);

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

  // KPIs
  const poVal = filteredItems.reduce((a, i) => a + (i.d.po ? i.d.po.val : 0), 0);
  const stock = filteredItems.reduce((a, i) => a + i.stock, 0);
  const low = filteredItems.filter(i => health(i) === 'crit').length;
  
  const wos = new Map();
  filteredItems.forEach(i => { if (i.d.wo) { const w = wos.get(i.d.wo.no) || { val: 0, prog: i.d.wo.prog }; w.val += i.d.wo.val; wos.set(i.d.wo.no, w); } });
  const woVal = [...wos.values()].reduce((a, w) => a + w.val, 0);
  const avg = wos.size ? Math.round([...wos.values()].reduce((a, w) => a + w.prog, 0) / wos.size) : 0;
  
  const ra = filteredItems.reduce((a, i) => a + (i.d.cbill ? i.d.cbill.amt : 0), 0);
  const sup = filteredItems.reduce((a, i) => a + (i.d.pi ? i.d.pi.amt : 0), 0);
  const inv = filteredItems.filter(i => i.d.pi).length;
  
  const pend = filteredItems.filter(i => i.d.po && i.d.po.status === 'Pending').length;
  const clr = filteredItems.filter(i => i.d.po && i.d.po.status === 'Cleared').length;
  const app = filteredItems.filter(i => i.d.po && i.d.po.status === 'Approved').length;

  useEffect(() => { applyView('overview'); }, []);

  // UI Helpers
  const getColor = (c: string) => {
    if (c === 'indigo') return { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', active: 'bg-indigo-600 text-white' };
    if (c === 'blue') return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', active: 'bg-blue-600 text-white' };
    if (c === 'emerald') return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', active: 'bg-emerald-600 text-white' };
    if (c === 'purple') return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', active: 'bg-purple-600 text-white' };
    return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', active: 'bg-slate-600 text-white' };
  };

  const getPill = (v: string) => {
    if (['Approved', 'Cleared', 'Paid'].includes(v)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['Pending', 'Due'].includes(v)) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getHealth = (h: string) => {
    if (h === 'good') return 'text-emerald-600 font-semibold';
    if (h === 'warn') return 'text-amber-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const getFlagTone = (c: string) => {
    if (c === 'good') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (c === 'warn') return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-red-50 text-red-700 border border-red-200';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { t: 'Total Purchase Invoices', v: inv.toLocaleString(), sub: `₹${cr(sup)} Cr`, tag: `${inv} Invoices`, color: 'text-indigo-700 bg-indigo-50', ex: 'pi' },
            { t: 'Available Stock', v: stock.toLocaleString(), sub: ``, tag: low ? `${low} Low stock` : 'Healthy', color: low ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50', ex: 'item' },
            { t: 'Active Work Orders', v: wos.size, sub: `₹${cr(woVal)} Cr target`, tag: `${avg}% avg progress`, color: 'text-blue-700 bg-blue-50', ex: 'wo' },
            { t: 'Total RA Billing', v: `₹${cr(ra)} Cr`, sub: `Client Billed Value`, tag: `Client Bills`, color: 'text-purple-700 bg-purple-50', ex: 'cbill' },
            { t: 'Pending Approvals', v: pend, sub: `${clr} cleared`, tag: pend ? 'Urgent action' : 'All clear', color: pend ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50', ex: 'po' },
          ].map((k, i) => (
            <div key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-2">{k.t}</div>
                <div className="flex items-baseline gap-2 flex-wrap mb-4">
                  <span className="text-2xl font-extrabold text-slate-800 tabular-nums leading-none tracking-tight">{k.v}</span>
                  <span className="text-xs text-slate-500 font-medium">{k.sub}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${k.color}`}>{k.tag}</span>
                <button onClick={() => { setMode('single'); setSel(new Set([k.ex])); setView(null); }} className="text-xs font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1">Explore <ArrowUpRight className="w-3 h-3"/></button>
              </div>
            </div>
          ))}
        </section>



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
              if (m.id === 'm1') meta = `${filteredItems.length} POs • ₹${cr(poVal)} Cr`;
              if (m.id === 'm2') meta = `${new Set(filteredItems.map(i => i.circle)).size} depots • ${inr(stock)} stock`;
              if (m.id === 'm3') meta = `${wos.size} WOs • ₹${cr(woVal)} Cr execution`;
              if (m.id === 'm4') meta = `₹${cr(ra)} Cr billed`;

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
        </section>

        <section className="mb-6 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
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
        </section>


        {/* Live Ledger Table & Filters */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col space-y-4 bg-slate-50/50">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{selSubs.length === 1 ? selSubs[0].name + ' Directory' : 'Combined Live Ledger'}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Showing identifiers + {selSubs.length} selected topics.</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="search" placeholder="Search in ledger..." className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
                </div>
                <button className="h-9 px-3 border border-slate-200 bg-white rounded-md text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap"><Download className="w-3.5 h-3.5"/> CSV</button>
              </div>
            </div>

            {/* Injected Filters */}
            <div className="pt-4 border-t border-slate-200/60 mt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-bold tracking-widest uppercase text-slate-500 flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Global Telemetry Filters
                </h2>
                <button 
                  onClick={() => { setF({ circle: 'All', subCircle: 'All', pkg: 'All', code: 'All', name: '', date: 'all', status: 'all' }); setQ(''); setPage(1); }}
                  className="text-indigo-600 text-[11px] font-bold hover:text-indigo-700 uppercase tracking-wider"
                >
                  Reset filters
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
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

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-max">
              <thead>
                {/* Group Header */}
                <tr>
                  <th colSpan={STATIC.filter(c => !hidden.has(c.id)).length} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 border-b border-slate-200">
                    Item & Flags
                  </th>
                  {selSubs.map((s, i) => {
                    const n = curCols.filter(c => c.sp === s.id).length;
                    if (!n) return null;
                    const m = [...MODS, ...MODS_MIS].find(mod => mod.id === s.m)!;
                    const theme = getColor(m.color);
                    return (
                      <th key={s.id} colSpan={n} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border-l border-slate-200 border-b ${theme.bg} ${theme.text}`}>
                        {s.name}
                      </th>
                    );
                  })}
                </tr>
                {/* Column Headers */}
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                  {curCols.map((c, i) => (
                    <th 
                      key={c.id} 
                      onClick={() => { setSort({ id: c.id, dir: sort.id === c.id ? -sort.dir : 1 }); setPage(1); }}
                      className={`px-4 py-3 cursor-pointer hover:text-slate-800 hover:bg-slate-100 transition-colors ${c.cls} ${c.type === 'money' || c.type === 'qty' || c.type === 'stock' || c.type === 'pct' ? 'text-right' : ''}`}
                    >
                      <div className={`flex items-center gap-1 ${c.type === 'money' || c.type === 'qty' || c.type === 'stock' || c.type === 'pct' ? 'justify-end' : ''}`}>
                        {c.label}
                        {sort.id === c.id && (sort.dir === 1 ? '↑' : '↓')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slice.length === 0 ? (
                  <tr><td colSpan={curCols.length} className="px-6 py-12 text-center text-slate-500 font-medium bg-white">No items match the current filters.</td></tr>
                ) : (
                  slice.map((it, i) => (
                    <tr key={it.id || i} className="hover:bg-slate-50/80 bg-white transition-colors group">
                      {curCols.map(c => {
                        const v = raw(c, it);
                        const isNull = v === null || v === undefined;
                        const align = (c.type === 'money' || c.type === 'qty' || c.type === 'stock' || c.type === 'pct') ? 'text-right tabular-nums' : '';
                        
                        let content: React.ReactNode = <span className="text-slate-300">—</span>;
                        
                        if (!isNull) {
                          if (c.type === 'money') content = <span className="font-medium text-slate-700">{money(v)}</span>;
                          else if (c.type === 'qty') content = <span className="font-medium text-slate-700">{inr(v)} {it.unit}</span>;
                          else if (c.type === 'stock') content = <span className={getHealth(health(it))}>{inr(v)} {it.unit}</span>;
                          else if (c.type === 'pct') content = (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{width: `${v}%`}}></div></div>
                              <span className="font-bold text-slate-700 w-8">{v}%</span>
                            </div>
                          );
                          else if (c.type === 'date') content = <span className="text-slate-600 font-medium">{fdate(v)}</span>;
                          else if (c.type === 'tcode') content = <span className="px-1.5 py-0.5 rounded border border-indigo-100 bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold">{v}</span>;
                          else if (c.type === 'code') content = <span className="font-mono text-xs text-slate-600 font-medium">{v}</span>;
                          else if (c.type === 'status') content = <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getPill(v)}`}>{v}</span>;
                          else if (c.type === 'flags') {
                            const fl = flags(it);
                            content = fl.length 
                              ? <div className="flex gap-1">{fl.map((x, idx) => <span key={idx} className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${getFlagTone(x.c)}`}>{x.t}</span>)}</div>
                              : <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">On track</span>;
                          }
                          else if (c.type === 'name') content = (
                            <div>
                              <div className="font-bold text-slate-800 hover:text-indigo-600 cursor-pointer truncate max-w-[280px] leading-tight mb-0.5">{v}</div>
                              <div className="text-[10px] font-medium text-slate-400">{it.cat}</div>
                            </div>
                          );
                          else content = <span className="text-slate-600">{String(v)}</span>;
                        }

                        return (
                          <td key={c.id} className={`px-4 py-3 ${align} ${c.cls} group-hover:bg-slate-50/80 bg-white`}>
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
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
    </div>
  );
}
