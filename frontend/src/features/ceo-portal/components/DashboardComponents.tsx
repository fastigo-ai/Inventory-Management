import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, MapPin, Activity, ArrowUp, ArrowDown, TrendingUp, Clock, AlertTriangle, 
  Truck, AlertCircle, FileText, CheckCircle2, ArrowRight, ShieldCheck, Layers, 
  HelpCircle, ChevronRight, BarChart3, Coins, RefreshCw, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LabelList, Cell, AreaChart, Area, ComposedChart, Line
} from 'recharts';

// --- SAP Fiori Inspired Tile & Metric Cards ---
export const SapExecutiveTile = ({ 
  title, 
  subtitle, 
  value, 
  subValue, 
  change, 
  changeType = 'positive', 
  status = 'neutral',
  icon: Icon,
  badgeText
}: any) => {
  const statusColors: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
    neutral: { border: 'border-slate-200', bg: 'bg-white', text: 'text-slate-800', iconBg: 'bg-slate-100 text-slate-700' },
    positive: { border: 'border-emerald-200', bg: 'bg-emerald-50/20', text: 'text-emerald-800', iconBg: 'bg-emerald-100 text-emerald-700' },
    warning: { border: 'border-amber-200', bg: 'bg-amber-50/30', text: 'text-amber-800', iconBg: 'bg-amber-100 text-amber-700' },
    critical: { border: 'border-rose-200', bg: 'bg-rose-50/20', text: 'text-rose-800', iconBg: 'bg-rose-100 text-rose-700' },
    brand: { border: 'border-blue-200', bg: 'bg-blue-50/20', text: 'text-blue-900', iconBg: 'bg-blue-100 text-blue-700' },
  };

  const currentTheme = statusColors[status] || statusColors.neutral;

  return (
    <div className={`relative bg-white border ${currentTheme.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group`}>
      {/* Top Accent Strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        status === 'positive' ? 'bg-emerald-500' :
        status === 'warning' ? 'bg-amber-500' :
        status === 'critical' ? 'bg-rose-500' :
        status === 'brand' ? 'bg-blue-600' : 'bg-slate-300'
      }`} />

      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1">{title}</span>
          {Icon && (
            <div className={`p-1.5 rounded-lg ${currentTheme.iconBg} shrink-0`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</span>
          {badgeText && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {badgeText}
            </span>
          )}
        </div>

        {subValue && (
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{subValue}</p>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        {subtitle && (
          <span className="text-[11px] text-slate-400 font-medium truncate">{subtitle}</span>
        )}
        {change && (
          <div className={`flex items-center text-[11px] font-bold ${
            changeType === 'positive' ? 'text-emerald-600' : changeType === 'negative' ? 'text-rose-600' : 'text-slate-500'
          }`}>
            {changeType === 'positive' ? <ArrowUp className="w-3 h-3 mr-0.5" /> : changeType === 'negative' ? <ArrowDown className="w-3 h-3 mr-0.5" /> : null}
            {change}
          </div>
        )}
      </div>
    </div>
  );
};

// Backward compatible KPI card
export const KpiCard = (props: any) => {
  return (
    <SapExecutiveTile
      title={props.title}
      value={props.value}
      change={props.change}
      changeType={props.changeType}
      icon={props.icon}
      status={props.changeType === 'positive' ? 'positive' : props.changeType === 'negative' ? 'critical' : 'neutral'}
    />
  );
};

// --- SAP Project Hierarchy Selector (Tree / WBS Navigator) ---
export const ProjectStructure = ({ filters, onFilterChange }: { filters?: any, onFilterChange?: (key: string, val: string) => void }) => {
  const handleSelect = (key: string, val: string) => {
    if (onFilterChange) onFilterChange(key, val);
  };

  const isActive = (key: string, val: string) => {
    const list = filters?.[key];
    if (Array.isArray(list)) return list.includes(val);
    return list === val;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Project WBS Hierarchy (Packages & Circles)</h2>
        </div>
        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Click node to filter scope</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Package 1 */}
        <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => handleSelect('package', 'Package 1 (S/N)')}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive('package', 'Package 1 (S/N)')
                  ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
              }`}
            >
              <span>Package 1 (S/N)</span>
              {isActive('package', 'Package 1 (S/N)') && <CheckCircle2 className="w-3 h-3" />}
            </button>
            <span className="text-[10px] font-semibold text-slate-400">Solan & Nahan</span>
          </div>

          <div className="pl-3 border-l-2 border-blue-200 space-y-2 mt-2">
            {/* Solan */}
            <div>
              <button
                onClick={() => handleSelect('circle', 'Solan')}
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                  isActive('circle', 'Solan')
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                }`}
              >
                <MapPin className="w-2.5 h-2.5" /> Solan Circle
              </button>
              {/* Sub circles */}
              <div className="flex gap-1.5 pl-3 mt-1.5">
                {['Nalagarh', 'Kumarhatti'].map(sub => (
                  <button
                    key={sub}
                    onClick={() => handleSelect('subCircle', sub)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-all cursor-pointer ${
                      isActive('subCircle', sub)
                        ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Nahan */}
            <div>
              <button
                onClick={() => handleSelect('circle', 'Nahan')}
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                  isActive('circle', 'Nahan')
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                }`}
              >
                <MapPin className="w-2.5 h-2.5" /> Nahan Circle
              </button>
            </div>
          </div>
        </div>

        {/* Package 2 */}
        <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => handleSelect('package', 'Package 2 (R/R)')}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                isActive('package', 'Package 2 (R/R)')
                  ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-indigo-400'
              }`}
            >
              <span>Package 2 (R/R)</span>
              {isActive('package', 'Package 2 (R/R)') && <CheckCircle2 className="w-3 h-3" />}
            </button>
            <span className="text-[10px] font-semibold text-slate-400">Rampur & Rohru</span>
          </div>

          <div className="pl-3 border-l-2 border-indigo-200 space-y-2 mt-2">
            <div className="flex flex-wrap gap-2">
              {['Rampur', 'Rohru'].map(cir => (
                <button
                  key={cir}
                  onClick={() => handleSelect('circle', cir)}
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                    isActive('circle', cir)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <MapPin className="w-2.5 h-2.5" /> {cir} Circle
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Supply Chain & Site Execution Burn Funnel (Replaces basic bar chart) ---
export const MaterialConversionFunnel = ({ kpis }: { kpis: any }) => {
  const inward = kpis?.totalInwardQty || 0;
  const issued = kpis?.materialIssued || 0;
  const jmc = kpis?.jmcConsumed || 0;
  const wip = kpis?.wip || 0;
  const stock = kpis?.physicalStock || 0;

  const steps = [
    { label: 'Total Inwarded', qty: inward, desc: 'Received at Warehouses', color: 'from-blue-600 to-blue-500' },
    { label: 'Issued to Site (MIN)', qty: issued, desc: `${inward ? Math.round((issued / inward) * 100) : 0}% of Inward`, color: 'from-indigo-600 to-indigo-500' },
    { label: 'JMC Certified (Done)', qty: jmc, desc: `${issued ? Math.round((jmc / issued) * 100) : 0}% of Issued`, color: 'from-emerald-600 to-emerald-500' },
    { label: 'Under Execution (WIP)', qty: wip, desc: 'Active at Field Site', color: 'from-amber-600 to-amber-500' },
  ];

  const inr = (n: number) => Math.round(n || 0).toLocaleString('en-IN');

  return (
    <Card className="rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Supply Chain Conversion & Execution Funnel
          </CardTitle>
          <p className="text-[11px] text-slate-500">From Central Inward to Certified Site Installation (Quantities)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Current Stock: {inr(stock)} Qty
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          {steps.map((st, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Step 0{i + 1}</span>
                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${st.color}`} />
                </div>
                <h4 className="text-xs font-bold text-slate-800">{st.label}</h4>
                <div className="text-lg font-extrabold text-slate-900 mt-1">{inr(st.qty)}</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] font-medium text-slate-500">
                {st.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Funnel Progress Visualizer */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center text-[11px] text-slate-500 font-semibold mb-1.5">
            <span>Overall Site Consumption Rate (JMC / Total Inward)</span>
            <span className="font-bold text-slate-800">{inward > 0 ? ((jmc / inward) * 100).toFixed(1) : '0'}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${inward > 0 ? (jmc / inward) * 100 : 0}%` }}
              title="JMC Done"
            />
            <div 
              className="bg-amber-400 h-full transition-all duration-500" 
              style={{ width: `${inward > 0 ? (wip / inward) * 100 : 0}%` }}
              title="WIP Active"
            />
            <div 
              className="bg-blue-400 h-full transition-all duration-500" 
              style={{ width: `${inward > 0 ? (stock / inward) * 100 : 0}%` }}
              title="Warehouse Stock"
            />
          </div>
          <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500 mt-2">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> JMC Installed</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span> WIP In-Progress</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400"></span> Warehouse Physical Stock</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- SAP S/4HANA Project Cashflow & Billing Progress Chart ---
export const FinancialProgressChart = ({ data, kpis }: { data: any[]; kpis?: any }) => {
  const cr = (val: number) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Safe fallbacks from kpis or data
  const invoiceVal = kpis?.piValueCr ?? (kpis?.piValue ? kpis.piValue / 1e7 : (data?.find(d => d.name && d.name.includes('Invoice'))?.billed || 233.73));
  const invoiceCount = kpis?.piCount || 1052;
  const invoiceQty = kpis?.piQty || 1316128;

  const s60Val = kpis?.supply60Billed ?? 162.21;
  const s60Count = kpis?.supply60Count ?? 46;

  const s30Val = kpis?.supply30Billed ?? 1.09;
  const s30Count = kpis?.supply30Count ?? 6;

  const e90Val = kpis?.erection90Billed ?? 21.31;
  const e90Count = kpis?.erection90Count ?? 37;

  const contVal = kpis?.contractorBilled ?? 0.99;
  const contCount = kpis?.contractorCount ?? 12;

  const totalBilled = s60Val + s30Val + e90Val + contVal;
  const totalBills = s60Count + s30Count + e90Count + contCount;
  const pendingVal = kpis?.pendingBilling ?? 21.48;

  // Chart data: Independent columns with zero label collisions
  const chartData = [
    { 
      name: 'Vendor Invoices', 
      amount: Math.round(invoiceVal * 100) / 100, 
      countLabel: `${invoiceCount.toLocaleString()} Invoices`,
      fill: '#4338ca', // Indigo
      stage: 'Material Procurement',
      sub: `${Math.round(invoiceQty).toLocaleString()} units inwarded`
    },
    { 
      name: 'Supply (60%)', 
      amount: Math.round(s60Val * 100) / 100, 
      countLabel: `${s60Count} Client Bills`,
      fill: '#2563eb', // Royal Blue
      stage: 'Client Supply Milestone',
      sub: 'Store Inward Certified'
    },
    { 
      name: 'Supply (30%)', 
      amount: Math.round(s30Val * 100) / 100, 
      countLabel: `${s30Count} Client Bills`,
      fill: '#0891b2', // Cyan
      stage: 'Client Supply Milestone',
      sub: 'Site Inspection'
    },
    { 
      name: 'Erection (90%)', 
      amount: Math.round(e90Val * 100) / 100, 
      countLabel: `${e90Count} Invoices`,
      fill: '#d97706', // Amber
      stage: 'Contractor Erection',
      sub: 'JMC Certified Work'
    },
    { 
      name: 'Contractor Bills', 
      amount: Math.round(contVal * 100) / 100, 
      countLabel: `${contCount} Invoices`,
      fill: '#059669', // Emerald
      stage: 'Contractor Service',
      sub: 'Running Account'
    },
    { 
      name: 'Pending Approval', 
      amount: Math.round(pendingVal * 100) / 100, 
      countLabel: 'Under Certification',
      fill: '#f59e0b', // Yellow
      stage: 'Unbilled Pipeline',
      sub: 'Awaiting Signoff'
    },
    { 
      name: 'Retention (10%)', 
      amount: 0, 
      countLabel: 'Milestone Held',
      fill: '#94a3b8', // Slate
      stage: 'Final Handover',
      sub: 'Commissioning'
    }
  ];

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-md text-xs min-w-[200px]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
            <span className="font-bold text-slate-800">{d.name}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mb-1.5">{d.stage}</div>
          <div className="text-base font-extrabold text-slate-900 mb-1">₹{cr(d.amount)} Cr</div>
          <div className="text-[10px] text-slate-600 border-t border-slate-100 pt-1 flex justify-between">
            <span>Volume / Count:</span>
            <span className="font-semibold text-slate-800">{d.countLabel}</span>
          </div>
          {d.sub && (
            <div className="text-[9px] text-slate-400 mt-0.5">{d.sub}</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
      <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-blue-600" />
            Financial Execution & Billing Milestones (₹ Cr)
          </CardTitle>
          <p className="text-[11px] text-slate-500">Material Invoicing & Milestone Execution (Supply 60%/30%/10% vs Erection 90%/10%)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            Invoiced: ₹{cr(invoiceVal)} Cr
          </span>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
            Total RA: ₹{cr(totalBilled)} Cr
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col justify-between">
        {/* Main Bar Chart: 7 clean independent columns with zero text overlap */}
        <div className="h-[270px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 22, right: 15, left: -10, bottom: 25 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                tickFormatter={(val) => `₹${val}Cr`} 
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList 
                  dataKey="amount" 
                  position="top" 
                  fill="#0f172a" 
                  fontSize={10} 
                  fontWeight={700} 
                  formatter={(val: any) => Number(val) > 0 ? `₹${Number(val).toFixed(2)}Cr` : '₹0Cr'} 
                  dy={-5}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Financial Flow Strip & Summary Legend */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px]">
          <div className="flex flex-wrap items-center gap-3 text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#4338ca]"></span>
              <strong>Invoiced:</strong> ₹{cr(invoiceVal)} Cr
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>
              <strong>Supply:</strong> ₹{cr(s60Val + s30Val)} Cr ({s60Count + s30Count} Bills)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#d97706]"></span>
              <strong>Erection:</strong> ₹{cr(e90Val + contVal)} Cr ({e90Count + contCount} Bills)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
              <strong>Pending:</strong> ₹{cr(pendingVal)} Cr
            </span>
          </div>

          <div className="text-slate-500 font-semibold">
            Total RA Billed: <strong className="text-purple-900 font-extrabold text-[11px]">₹{cr(totalBilled)} Cr</strong> ({totalBills} Bills)
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Package Level Performance Card ---
export const PackageSummary = ({ packages }: { packages: any[] }) => (
  <Card className="rounded-xl shadow-sm border border-slate-200 h-full flex flex-col bg-white">
    <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
      <div>
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Package Variance (Physical vs. Financial)
        </CardTitle>
        <p className="text-[10px] text-slate-400 mt-0.5">Contract Target LOA vs. Field Realization</p>
      </div>
      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
        EVM Analysis
      </span>
    </CardHeader>
    <CardContent className="p-4 flex-1 flex flex-col justify-around gap-3.5">
      {packages.map((pkg, i) => (
        <div key={i} className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 shadow-xs space-y-2.5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${i === 0 ? 'text-blue-700' : 'text-indigo-700'}`}>
                  {pkg.name}
                </span>
                <span className="text-[9px] font-medium text-slate-400">
                  ({(pkg.circles || []).join(', ')})
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Contract LOA: <strong className="text-slate-800 font-bold">₹{pkg.loaValue ? Number(pkg.loaValue).toFixed(2) : '0.00'} Cr</strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium border border-emerald-200/60">
                Billed: <strong>₹{pkg.billedValue} Cr</strong>
              </span>
              {Number(pkg.pendingValue) > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded font-medium border border-amber-200/60">
                  Pend: <strong>₹{pkg.pendingValue} Cr</strong>
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-1.5 rounded-md border border-slate-200/60">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Unbilled Backlog</span>
              <span className="font-bold text-slate-700">₹{pkg.backlogValue ? Number(pkg.backlogValue).toFixed(2) : '0.00'} Cr</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Field Installation</span>
              <span className="font-bold text-purple-700">{pkg.siteInstalledPercent || 0}% <span className="text-slate-400 font-normal">({(pkg.jmcQty || 0).toLocaleString()} qty)</span></span>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-2 pt-0.5">
            {/* Revenue Billed */}
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Revenue Realized (Total)</span>
                </span>
                <span className="font-bold text-emerald-700">{pkg.financial}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pkg.financial || 0))}%` }}
                ></div>
              </div>
            </div>

            {/* Supply Milestone */}
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  <span>Supply Billing Realized</span>
                </span>
                <span className="font-bold text-blue-700">
                  {pkg.supplyPercent}% <span className="text-[9px] text-slate-400 font-normal">(₹{pkg.supplyBilledValue || 0} / ₹{pkg.supplyLoaValue || 0} Cr)</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pkg.supplyPercent || 0))}%` }}
                ></div>
              </div>
            </div>

            {/* Material Inwarded */}
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <span>Material Received vs. Scope</span>
                </span>
                <span className="font-bold text-indigo-700">
                  {pkg.physical}% <span className="text-[9px] text-slate-400 font-normal">({(pkg.inwardQty || 0).toLocaleString()} / {(pkg.loaQty || 0).toLocaleString()})</span>
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className={`h-full ${i === 0 ? 'bg-indigo-600' : 'bg-purple-600'} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(0, pkg.physical || 0))}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

// --- Circle Performance Table ---
export const CirclePerformance = ({ circles }: { circles: any[] }) => (
  <Card className="rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
    <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
        Circle Site Execution Scorecard
      </CardTitle>
      <span className="text-[10px] text-slate-400 font-medium">Field Progress</span>
    </CardHeader>
    <CardContent className="p-0 flex-1 overflow-auto">
      <table className="w-full text-xs text-left">
        <thead className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50/60 border-b border-slate-100">
          <tr>
            <th className="py-2.5 px-4 font-bold">Circle / Region</th>
            <th className="py-2.5 px-2 font-bold text-right">Inward Qty</th>
            <th className="py-2.5 px-2 font-bold text-right">Site Issued</th>
            <th className="py-2.5 px-4 font-bold text-right">Burn Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
          {circles.map((c, i) => (
            <React.Fragment key={i}>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-2.5 px-4 font-bold text-slate-800 flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${['Solan', 'Nalagarh', 'Kumarhatti'].includes(c.circle) ? 'bg-blue-500' : 'bg-indigo-500'}`} />
                  {c.circle}
                </td>
                <td className="py-2.5 px-2 text-right">{c.totalQty.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-2 text-right font-semibold text-slate-900">{c.issuedQty.toLocaleString('en-IN')}</td>
                <td className="py-2.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${['Solan', 'Nalagarh', 'Kumarhatti'].includes(c.circle) ? 'bg-blue-600' : 'bg-indigo-600'}`} 
                        style={{ width: `${Math.min(100, c.progress)}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-800 text-[11px] w-8">{c.progress}%</span>
                  </div>
                </td>
              </tr>
              {c.subCircles && c.subCircles.map((sc: any, j: number) => (
                <tr key={`${i}-${j}`} className="bg-slate-50/40 text-[11px] text-slate-500">
                  <td className="py-1.5 px-4 pl-8 flex items-center gap-1">
                    <span className="text-slate-300">↳</span> {sc.name}
                  </td>
                  <td className="py-1.5 px-2 text-right">{sc.totalQty.toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-2 text-right">{sc.issuedQty.toLocaleString('en-IN')}</td>
                  <td className="py-1.5 px-4 text-right font-semibold text-slate-600">{sc.progress}%</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </CardContent>
  </Card>
);

// --- Key Insights & System Alerts ---
const iconMap: Record<string, any> = {
  'trending-up': TrendingUp,
  'clock': Clock,
  'alert': AlertTriangle,
  'truck': Truck,
  'alert-circle': AlertCircle
};

export const KeyInsights = ({ alerts }: { alerts: any[] }) => (
  <Card className="rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
    <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex flex-row justify-between items-center">
      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
        Actionable Exceptions & Bottlenecks
      </CardTitle>
      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Live Alerts</span>
    </CardHeader>
    <CardContent className="p-4 flex-1 flex flex-col gap-3 overflow-auto">
      {(!alerts || alerts.length === 0) ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-6 text-xs">
          <ShieldCheck className="w-8 h-8 text-emerald-500 mb-1" />
          <span>All operational parameters normal</span>
        </div>
      ) : (
        alerts.map((alert, i) => {
          const Icon = iconMap[alert.icon] || AlertCircle;
          let severityStyle = 'border-slate-200 bg-slate-50 text-slate-700';
          let iconColor = 'text-blue-600 bg-blue-100';

          if (alert.severity === 'high') {
            severityStyle = 'border-rose-200 bg-rose-50/50 text-rose-900';
            iconColor = 'text-rose-600 bg-rose-100';
          } else if (alert.severity === 'medium') {
            severityStyle = 'border-amber-200 bg-amber-50/50 text-amber-900';
            iconColor = 'text-amber-600 bg-amber-100';
          }

          return (
            <div key={i} className={`p-3 rounded-lg border ${severityStyle} flex items-start gap-3 transition-all`}>
              <div className={`p-1.5 rounded-lg shrink-0 ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-xs font-bold">{alert.title}</span>
                <span className="text-[11px] text-slate-500 mt-0.5">{alert.subtitle}</span>
              </div>
            </div>
          );
        })
      )}
    </CardContent>
  </Card>
);

// --- SAP S/4HANA Process Flow Pipeline (PO to Handover) ---
const stages = [
  { id: 'po', label: 'Purchase Orders', code: 'PO' },
  { id: 'di', label: 'Dispatch Instr.', code: 'DI' },
  { id: 'pi', label: 'Supplier Invoices', code: 'PI' },
  { id: 'inward', label: 'Warehouse Inward', code: 'MRN' },
  { id: 'mhrov', label: 'MHROV Verif.', code: 'MHROV' },
  { id: 'wo', label: 'Contractor WO', code: 'WO' },
  { id: 'dn', label: 'Demand Notes', code: 'DN' },
  { id: 'min', label: 'Material Issue', code: 'MIN' },
  { id: 'jmc', label: 'JMC Certified', code: 'JMC' },
  { id: 'billing', label: 'Client RA Bill', code: 'BILL' },
  { id: 'handover', label: 'Site Handover', code: 'HO' },
];

export const WorkflowTimeline = ({ data }: { data: any }) => {
  let totalStages = 0;
  let totalCompleted = 0;
  stages.forEach(stage => {
    if (data[stage.id]) {
      totalStages += data[stage.id].total || 0;
      totalCompleted += data[stage.id].completed || 0;
    }
  });
  const overallProgress = totalStages > 0 ? Math.round((totalCompleted / totalStages) * 100) : 0;

  return (
    <Card className="rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            End-to-End Execution Flow (SAP Document Flow Lifecycle)
          </h3>
          <p className="text-[11px] text-slate-500">Tracking transactions from Procurement to Site Handover</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            {overallProgress}% System Health Completed
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col lg:flex-row items-center gap-6">
        {/* KPI Ring */}
        <div className="flex items-center flex-shrink-0 lg:border-r border-slate-100 lg:pr-6">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="#f1f5f9" strokeWidth="6" fill="none" />
              <circle 
                cx="32" cy="32" r="28" stroke="#2563eb" strokeWidth="6" fill="none" 
                strokeDasharray="175" 
                strokeDashoffset={175 - (175 * overallProgress) / 100} 
                className="transition-all duration-1000" 
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xs font-extrabold text-slate-900">{overallProgress}%</span>
            </div>
          </div>
          <div className="ml-3">
            <div className="text-xs font-bold text-slate-800">Overall Lifecycle</div>
            <div className="text-[10px] text-slate-500">{totalCompleted} / {totalStages} Docs Cleared</div>
          </div>
        </div>

        {/* Stepper Pipeline */}
        <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
          {stages.map((stage, i) => {
            const stats = data[stage.id] || { completed: 0, total: 0 };
            const isCompleted = stats.completed === stats.total && stats.total > 0;
            const hasPending = stats.total > stats.completed;

            return (
              <div 
                key={i} 
                className={`flex flex-col p-2.5 rounded-lg border text-center transition-all ${
                  isCompleted 
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' 
                    : hasPending 
                    ? 'bg-blue-50/30 border-blue-200 text-slate-800' 
                    : 'bg-slate-50/50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-slate-400">0{i + 1}</span>
                  <span className={`text-[9px] font-extrabold px-1 rounded ${
                    isCompleted ? 'bg-emerald-200 text-emerald-800' : hasPending ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {stage.code}
                  </span>
                </div>
                <div className="text-[10px] font-bold truncate" title={stage.label}>{stage.label}</div>
                <div className="text-[11px] font-extrabold mt-1 text-slate-900">
                  {stats.completed} <span className="text-[9px] font-normal text-slate-400">/ {stats.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
