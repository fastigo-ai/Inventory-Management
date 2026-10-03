"use client";

import React, { useEffect, useState } from 'react';
import { fetchCeoDashboardV2Data } from '@/features/ceo-portal/api/dashboard.api';
import { format } from 'date-fns';
import { Calendar, Search, Activity, Building, Package, Tag, Clock, TrendingUp, AlertTriangle, ChevronRight, DollarSign, Wallet, Receipt, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

type ActiveModule = 'financials' | 'operations' | 'supply-chain' | 'risks';

export default function CeoDashboardV3Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<ActiveModule>('financials');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchCeoDashboardV2Data({});
      setData(res);
    } catch (error) {
      console.error('Failed to load V2 dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-indigo-600 animate-pulse text-lg font-semibold tracking-wide">
          Syncing Enterprise Operations...
        </div>
      </div>
    );
  }

  const formatCr = (val: number) => `₹ ${(val / 10000000).toFixed(2)} Cr`;

  return (
    <div className="bg-[#f4f7fb] min-h-screen text-slate-800 font-sans pb-12">
      {/* 1. Top Header */}
      <div className="bg-white px-6 py-3 border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">CEO PORTAL V3</h1>
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-emerald-100">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Single Page Enterprise Dashboard</p>
          </div>
        </div>
        
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search packages, contractors, or KPIs..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm">
            <Download className="w-4 h-4" /> Export Report
          </button>
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
            CEO
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* 2. Global Telemetry Filters (Visual only for V3 mockup) */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Global Filters:</div>
          <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg block p-2 outline-none w-40">
            <option>All Circles</option>
            <option>Jaipur</option>
            <option>Pune</option>
          </select>
          <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg block p-2 outline-none w-40">
            <option>All Packages</option>
            <option>PKG-01</option>
            <option>PKG-02</option>
          </select>
          <div className="ml-auto text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> As of {format(new Date(), 'dd MMM yyyy, HH:mm')}
          </div>
        </div>

        {/* 3. Top KPI Ribbon */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group">
            <div className="flex items-center text-slate-500 mb-2">
              <DollarSign className="w-4 h-4 mr-1.5 group-hover:text-indigo-500 transition-colors" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Total Capital Deployed</h3>
            </div>
            <p className="text-2xl font-black text-slate-900">{formatCr(data.kpiRibbon.totalCapitalDeployed)}</p>
            <div className="mt-3 flex justify-between items-center text-[10px] font-bold">
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">Active POs</span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group">
            <div className="flex items-center text-slate-500 mb-2">
              <TrendingUp className="w-4 h-4 mr-1.5 group-hover:text-emerald-500 transition-colors" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Overall Margin %</h3>
            </div>
            <p className="text-2xl font-black text-emerald-600">{data.kpiRibbon.overallMarginPercent.toFixed(1)}%</p>
            <div className="mt-3 flex justify-between items-center text-[10px] font-bold">
              <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">Healthy</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group">
            <div className="flex items-center text-slate-500 mb-2">
              <Clock className="w-4 h-4 mr-1.5 group-hover:text-amber-500 transition-colors" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Cash Conversion Cycle</h3>
            </div>
            <p className="text-2xl font-black text-slate-900">{data.kpiRibbon.cashConversionCycleDays} Days</p>
            <div className="mt-3 flex justify-between items-center text-[10px] font-bold">
              <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Needs Opt.</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group">
            <div className="flex items-center text-slate-500 mb-2">
              <Receipt className="w-4 h-4 mr-1.5 group-hover:text-indigo-500 transition-colors" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Outstanding Recv.</h3>
            </div>
            <p className="text-2xl font-black text-amber-600">{formatCr(data.kpiRibbon.outstandingReceivables)}</p>
            <div className="mt-3 flex justify-between items-center text-[10px] font-bold">
              <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">JMC Uncollected</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition group">
            <div className="flex items-center text-slate-500 mb-2">
              <Wallet className="w-4 h-4 mr-1.5 group-hover:text-rose-500 transition-colors" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Outstanding Payables</h3>
            </div>
            <p className="text-2xl font-black text-rose-600">{formatCr(data.kpiRibbon.outstandingPayables)}</p>
            <div className="mt-3 flex justify-between items-center text-[10px] font-bold">
              <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded">Unpaid Inv.</span>
            </div>
          </div>
        </div>

        {/* 4. Single Page Operations Hub Layout */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Enterprise Hub — Core Modules</h2>
              <p className="text-xs text-slate-500">Select a module below to dynamically load its ledger.</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { id: 'financials', title: 'Financial Portfolio', icon: DollarSign, color: 'indigo', count: 12 },
              { id: 'operations', title: 'Operations (Heatmap)', icon: Activity, color: 'blue', count: 5 },
              { id: 'supply-chain', title: 'Supply Chain Funnel', icon: Package, color: 'emerald', count: 8 },
              { id: 'risks', title: 'Exceptions & Risks', icon: AlertTriangle, color: 'rose', count: Object.values(data.exceptions).flat().length },
            ].map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id as ActiveModule)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  activeModule === mod.id 
                    ? `bg-${mod.color}-50 border-${mod.color}-200 shadow-sm ring-1 ring-${mod.color}-300` 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${activeModule === mod.id ? `bg-${mod.color}-100 text-${mod.color}-700` : 'bg-white text-slate-500 border border-slate-200'}`}>
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeModule === mod.id ? `bg-${mod.color}-200 text-${mod.color}-800` : 'bg-slate-200 text-slate-600'}`}>
                    {mod.count} Items
                  </span>
                </div>
                <h3 className={`font-black text-sm ${activeModule === mod.id ? `text-${mod.color}-900` : 'text-slate-700'}`}>
                  {mod.title}
                </h3>
                <div className="mt-2 flex items-center justify-between text-xs font-bold">
                  <span className={activeModule === mod.id ? `text-${mod.color}-600` : 'text-slate-400'}>
                    {activeModule === mod.id ? 'Active Module' : 'View Module'}
                  </span>
                  <ChevronRight className={`w-4 h-4 ${activeModule === mod.id ? `text-${mod.color}-600` : 'text-slate-400'}`} />
                </div>
              </button>
            ))}
          </div>

          {/* Dynamic Content Area based on Module */}
          <div className="bg-[#0f172a] rounded-xl overflow-hidden shadow-lg border border-slate-800">
            
            {/* Header Banner */}
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <span className="text-indigo-400 font-bold text-sm">
                    {activeModule === 'financials' ? 'F' : activeModule === 'operations' ? 'O' : activeModule === 'supply-chain' ? 'S' : 'R'}
                  </span>
                </div>
                <div>
                  <h3 className="text-slate-200 text-sm font-bold uppercase tracking-wider">
                    MODULE: {activeModule.replace('-', ' ')}
                  </h3>
                  <p className="text-slate-400 text-xs">Live Dynamic Ledger</p>
                </div>
              </div>
              <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition">
                + Add {activeModule === 'risks' ? 'Override' : 'Entry'}
              </button>
            </div>

            <div className="bg-white min-h-[400px]">
              
              {/* === FINANCIALS MODULE === */}
              {activeModule === 'financials' && (
                <div>
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-indigo-500" /> Portfolio Execution Matrix
                    </h4>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Search portfolio..." className="text-xs px-3 py-1.5 border border-slate-200 rounded outline-none" />
                      <button className="text-xs font-bold border border-slate-200 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100">Columns</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[10px] uppercase bg-slate-50 text-slate-500 font-black tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Package / Circle</th>
                          <th className="px-4 py-3 text-right">PO Value</th>
                          <th className="px-4 py-3 text-center">% Received</th>
                          <th className="px-4 py-3 text-center">% Issued (MIN)</th>
                          <th className="px-4 py-3 text-center">% JMC Approved</th>
                          <th className="px-4 py-3 text-center">% Client Billed</th>
                          <th className="px-4 py-3 text-right">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.portfolioTable.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-3 font-bold text-slate-800">{row.packageCircle}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-600">{formatCr(row.poValue)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold text-xs">{row.pctReceived}%</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-bold text-xs">{row.pctIssued}%</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-1 rounded bg-amber-50 text-amber-700 font-bold text-xs">{row.pctJmcApproved}%</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-block px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-bold text-xs">{row.pctClientBilled}%</span>
                            </td>
                            <td className={`px-4 py-3 text-right font-black ${row.marginPct < 20 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {row.marginPct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === OPERATIONS MODULE === */}
              {activeModule === 'operations' && (
                <div className="p-6">
                  <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                    <Activity className="w-5 h-5 text-indigo-500" /> Process Bottleneck Heatmap
                  </h4>
                  <div className="space-y-6 max-w-3xl">
                    {data.bottleneckHeatmap.map((item: any, i: number) => (
                      <div key={i} className="flex flex-col">
                        <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                          <span>{item.stage}</span>
                          <span className={item.status === 'red' ? 'text-red-600' : item.status === 'yellow' ? 'text-amber-500' : 'text-emerald-500'}>
                            {item.days} {item.stage.includes('Variance') ? '%' : 'Days'}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${item.status === 'red' ? 'bg-red-500' : item.status === 'yellow' ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(100, (item.days / (item.stage.includes('Variance') ? 50 : 30)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === SUPPLY CHAIN MODULE === */}
              {activeModule === 'supply-chain' && (
                <div className="p-6">
                  <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2 border-b pb-2">
                    <Package className="w-5 h-5 text-indigo-500" /> Financial Value Funnel
                  </h4>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.financialFunnel} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} angle={-25} textAnchor="end" />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${(val / 10000000).toFixed(0)}Cr`} />
                        <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [formatCr(value), 'Value']} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                          {data.financialFunnel.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 5 ? '#10b981' : '#6366f1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* === RISKS & EXCEPTIONS MODULE === */}
              {activeModule === 'risks' && (
                <div className="p-6">
                  <h4 className="font-bold text-rose-700 mb-6 flex items-center gap-2 border-b border-rose-100 pb-2">
                    <AlertTriangle className="w-5 h-5" /> Executive Exceptions & Attention Required
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* MIN Hoarding */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 flex justify-between items-center">
                        Contractor Hoarding (MIN &#8594; JMC Lag)
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{data.exceptions.minHoarding.length} Flags</span>
                      </h4>
                      {data.exceptions.minHoarding.length === 0 ? <p className="text-sm text-slate-400">Clear.</p> : (
                        <ul className="space-y-3">
                          {data.exceptions.minHoarding.map((item: any, i: number) => (
                            <li key={i} className="text-sm p-3 bg-slate-50 text-slate-900 rounded-lg border border-slate-100 flex justify-between items-center">
                              <span className="font-bold">{item.contractorName}</span>
                              <span className="font-black bg-rose-500 text-white px-2 py-1 rounded text-xs shadow-sm">{item.daysPending} Days lag</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* JMC Overclaims */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 flex justify-between items-center">
                        JMC Overclaim Patterns
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{data.exceptions.jmcOverclaim.length} Flags</span>
                      </h4>
                      {data.exceptions.jmcOverclaim.length === 0 ? <p className="text-sm text-slate-400">Clear.</p> : (
                        <ul className="space-y-3">
                          {data.exceptions.jmcOverclaim.map((item: any, i: number) => (
                            <li key={i} className="text-sm p-3 bg-slate-50 text-slate-900 rounded-lg border border-slate-100 flex justify-between items-center">
                              <span className="font-bold">{item.contractorName}</span>
                              <span className="font-black bg-amber-500 text-white px-2 py-1 rounded text-xs shadow-sm">+{item.variancePercent}% vs appr.</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Aged Unpaid Invoices */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm col-span-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4">Aged Unpaid Invoices</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-2">Client Bills</p>
                          <ul className="space-y-2">
                            {data.exceptions.unpaidClientBill.map((item: any, i: number) => (
                              <li key={`cb-${i}`} className="text-sm p-2 bg-emerald-50 text-emerald-900 rounded border border-emerald-100 flex justify-between items-center">
                                <span className="font-semibold">{item.reference}</span>
                                <span className="font-black bg-emerald-200 px-2 py-0.5 rounded text-emerald-800">{item.daysPending} Days</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-2">Contractor Invoices</p>
                          <ul className="space-y-2">
                            {data.exceptions.pendingContractorInvoice.map((item: any, i: number) => (
                              <li key={`inv-${i}`} className="text-sm p-2 bg-amber-50 text-amber-900 rounded border border-amber-100 flex justify-between items-center">
                                <span className="font-semibold">{item.reference}</span>
                                <span className="font-black bg-amber-200 px-2 py-0.5 rounded text-amber-800">{item.daysPending} Days</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
