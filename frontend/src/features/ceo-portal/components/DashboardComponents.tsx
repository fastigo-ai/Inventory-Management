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
export const FinancialProgressChart = ({ data }: { data: any[] }) => {
  // Format data cleanly
  const formattedData = (data || []).map(d => ({
    name: d.name,
    Billed: d.billed || 0,
    Pending: d.pending || 0,
    Total: (d.billed || 0) + (d.pending || 0)
  }));

  return (
    <Card className="rounded-xl shadow-sm border border-slate-200">
      <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Financial Execution & Billing Milestones (₹ Cr)
          </CardTitle>
          <p className="text-[11px] text-slate-500">Contract Revenue Realization vs. Pipeline</p>
        </div>
        <div className="flex gap-4 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center"><div className="w-2.5 h-2.5 bg-blue-600 rounded-sm mr-1"></div> Realized / Billed</div>
          <div className="flex items-center"><div className="w-2.5 h-2.5 bg-amber-400 rounded-sm mr-1"></div> Pending / Unbilled</div>
        </div>
      </CardHeader>
      <CardContent className="p-4 h-[290px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 20, right: 15, left: -10, bottom: 20 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${val}Cr`} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              formatter={(val: any, name: any) => [`₹ ${Number(val).toFixed(2)} Cr`, name]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="Billed" stackId="a" fill="#2563eb" radius={[0, 0, 4, 4]}>
              <LabelList dataKey="Billed" position="top" fill="#1e293b" fontSize={10} formatter={(val: any) => val > 0 ? `₹${val}Cr` : ''} />
            </Bar>
            <Bar dataKey="Pending" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="Pending" position="top" fill="#92400e" fontSize={10} formatter={(val: any) => val > 0 ? `₹${val}Cr` : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// --- Package Level Performance Card ---
export const PackageSummary = ({ packages }: { packages: any[] }) => (
  <Card className="rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
    <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
      <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
        Package Variance (Physical vs. Financial)
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 flex-1 flex flex-col justify-around gap-4">
      {packages.map((pkg, i) => (
        <div key={i} className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${i === 0 ? 'text-blue-700' : 'text-indigo-700'}`}>
              {pkg.name}
            </span>
            <div className="flex gap-2 text-[10px]">
              <span className="text-slate-600 font-semibold">Billed: <strong className="text-slate-900">₹{pkg.billedValue} Cr</strong></span>
              <span className="text-amber-700 font-semibold">Pending: <strong className="text-amber-900">₹{pkg.pendingValue} Cr</strong></span>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-0.5">
                <span>Material Execution</span>
                <span className="font-bold text-slate-800">{pkg.physical}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${i === 0 ? 'bg-blue-600' : 'bg-indigo-600'}`} style={{ width: `${pkg.physical}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-0.5">
                <span>Revenue Billed</span>
                <span className="font-bold text-slate-800">{pkg.financial}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${i === 0 ? 'bg-emerald-500' : 'bg-teal-500'}`} style={{ width: `${pkg.financial}%` }}></div>
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
