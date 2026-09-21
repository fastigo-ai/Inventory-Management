"use client";

import React, { useEffect, useState } from 'react';
import { fetchCeoDashboardV2Data } from '@/features/ceo-portal/api/dashboard.api';
import { format } from 'date-fns';
import { Calendar, DollarSign, AlertTriangle, TrendingUp, Clock, Activity, Wallet, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

export default function CeoDashboardV2Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

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
    return <div className="p-8 flex justify-center items-center min-h-screen text-gray-500">Loading Enterprise Control Tower...</div>;
  }

  const formatCr = (val: number) => `₹ ${(val / 10000000).toFixed(2)} Cr`;
  
  const heatmapColors: Record<string, string> = {
    'green': 'bg-green-500',
    'yellow': 'bg-yellow-400',
    'red': 'bg-red-500'
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans pb-12">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200 sticky top-0 z-10 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enterprise Control Tower</h1>
          <div className="flex items-center text-xs text-slate-500 mt-1 font-medium">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            As of {format(new Date(), 'dd MMM yyyy, HH:mm')}
          </div>
        </div>
        <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
          CEO / Board View
        </div>
      </div>

      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        
        {/* 1. Top KPI Ribbon */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center text-slate-500 mb-2">
              <DollarSign className="w-4 h-4 mr-1.5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Total Capital Deployed</h3>
            </div>
            <p className="text-2xl font-black text-slate-900">{formatCr(data.kpiRibbon.totalCapitalDeployed)}</p>
            <p className="text-xs text-slate-400 mt-1">Active PO Value</p>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center text-slate-500 mb-2">
              <TrendingUp className="w-4 h-4 mr-1.5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Overall Margin %</h3>
            </div>
            <p className="text-2xl font-black text-emerald-600">{data.kpiRibbon.overallMarginPercent.toFixed(1)}%</p>
            <p className="text-xs text-slate-400 mt-1">Revenue vs Costs</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center text-slate-500 mb-2">
              <Clock className="w-4 h-4 mr-1.5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Cash Conversion Cycle</h3>
            </div>
            <p className="text-2xl font-black text-slate-900">{data.kpiRibbon.cashConversionCycleDays} Days</p>
            <p className="text-xs text-slate-400 mt-1">PO Issue to Client Payment</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center text-slate-500 mb-2">
              <Receipt className="w-4 h-4 mr-1.5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Outstanding Receivables</h3>
            </div>
            <p className="text-2xl font-black text-amber-600">{formatCr(data.kpiRibbon.outstandingReceivables)}</p>
            <p className="text-xs text-slate-400 mt-1">JMC/Bills Uncollected</p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
            <div className="flex items-center text-slate-500 mb-2">
              <Wallet className="w-4 h-4 mr-1.5" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Outstanding Payables</h3>
            </div>
            <p className="text-2xl font-black text-rose-600">{formatCr(data.kpiRibbon.outstandingPayables)}</p>
            <p className="text-xs text-slate-400 mt-1">Approved Unpaid Invoices</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* 2. Financial Funnel */}
          <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-black text-slate-800 mb-6 border-b pb-3">Financial Funnel (Value Recovery)</h2>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.financialFunnel} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="stage" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(val) => `₹${(val / 10000000).toFixed(0)}Cr`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [formatCr(value), 'Value']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {data.financialFunnel.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 5 ? '#10b981' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Bottleneck Heatmap */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-black text-slate-800 mb-6 border-b pb-3 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-indigo-500" />
              Bottleneck Heatmap
            </h2>
            <div className="space-y-4">
              {data.bottleneckHeatmap.map((item: any, i: number) => (
                <div key={i} className="flex flex-col">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>{item.stage}</span>
                    <span className={item.status === 'red' ? 'text-red-600' : item.status === 'yellow' ? 'text-yellow-600' : 'text-green-600'}>
                      {item.days} {item.stage.includes('Variance') ? '%' : 'Days'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${heatmapColors[item.status]}`} 
                      style={{ width: `${Math.min(100, (item.days / (item.stage.includes('Variance') ? 50 : 30)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Package/Circle Portfolio Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-black text-slate-800">Portfolio Execution Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-100 text-slate-500 font-black tracking-wider">
                <tr>
                  <th className="px-6 py-4">Package / Circle</th>
                  <th className="px-6 py-4 text-right">PO Value</th>
                  <th className="px-6 py-4 text-center">% Received</th>
                  <th className="px-6 py-4 text-center">% Issued (MIN)</th>
                  <th className="px-6 py-4 text-center">% JMC Approved</th>
                  <th className="px-6 py-4 text-center">% Client Billed</th>
                  <th className="px-6 py-4 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.portfolioTable.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-bold text-slate-800">{row.packageCircle}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCr(row.poValue)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-6 rounded bg-blue-100 text-blue-700 font-bold text-xs">
                        {row.pctReceived}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-6 rounded bg-indigo-100 text-indigo-700 font-bold text-xs">
                        {row.pctIssued}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-6 rounded bg-amber-100 text-amber-700 font-bold text-xs">
                        {row.pctJmcApproved}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-6 rounded bg-emerald-100 text-emerald-700 font-bold text-xs">
                        {row.pctClientBilled}%
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-right font-black ${row.marginPct < 20 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {row.marginPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Exceptions & Risk Flags */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-rose-200 bg-rose-50/30">
          <h2 className="text-lg font-black text-rose-700 mb-6 flex items-center border-b border-rose-100 pb-3">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Exceptions & Attention Required
          </h2>
          
          <div className="grid grid-cols-3 gap-6">
            
            {/* MIN Hoarding */}
            <div className="bg-white border border-rose-100 rounded-lg p-4 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 mb-3 border-b border-rose-50 pb-2">Contractor Hoarding (MIN &#8594; JMC Lag)</h4>
              {data.exceptions.minHoarding.length === 0 ? <p className="text-xs text-slate-400 font-medium">Clear.</p> : (
                <ul className="space-y-2">
                  {data.exceptions.minHoarding.map((item: any, i: number) => (
                    <li key={i} className="text-xs p-2 bg-rose-50 text-rose-900 rounded border border-rose-100 flex justify-between items-center">
                      <span className="font-semibold">{item.contractorName}</span>
                      <span className="font-black bg-rose-200 px-2 py-0.5 rounded text-rose-800">{item.daysPending} Days lag</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* JMC Overclaims */}
            <div className="bg-white border border-rose-100 rounded-lg p-4 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 mb-3 border-b border-rose-50 pb-2">JMC Overclaim Patterns</h4>
              {data.exceptions.jmcOverclaim.length === 0 ? <p className="text-xs text-slate-400 font-medium">Clear.</p> : (
                <ul className="space-y-2">
                  {data.exceptions.jmcOverclaim.map((item: any, i: number) => (
                    <li key={i} className="text-xs p-2 bg-rose-50 text-rose-900 rounded border border-rose-100 flex justify-between items-center">
                      <span className="font-semibold">{item.contractorName}</span>
                      <span className="font-black bg-rose-200 px-2 py-0.5 rounded text-rose-800">+{item.variancePercent}% vs appr.</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Ledger Limits */}
            <div className="bg-white border border-rose-100 rounded-lg p-4 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 mb-3 border-b border-rose-50 pb-2">Ledger Limits Reached (100%)</h4>
              {data.exceptions.ledgerLimits.length === 0 ? <p className="text-xs text-slate-400 font-medium">Clear.</p> : (
                <ul className="space-y-2">
                  {data.exceptions.ledgerLimits.map((item: any, i: number) => (
                    <li key={i} className="text-xs p-2 bg-rose-50 text-rose-900 rounded border border-rose-100 flex justify-between items-center">
                      <span className="font-semibold">Work Order:</span>
                      <span className="font-black bg-rose-200 px-2 py-0.5 rounded text-rose-800">{item.workOrderId}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Aged MHROVs */}
            <div className="bg-white border border-amber-100 rounded-lg p-4 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 mb-3 border-b border-amber-50 pb-2">Aged MHROVs (&#62; 7 Days)</h4>
              {data.exceptions.agedMhrov.length === 0 ? <p className="text-xs text-slate-400 font-medium">Clear.</p> : (
                <ul className="space-y-2">
                  {data.exceptions.agedMhrov.map((item: any, i: number) => (
                    <li key={i} className="text-xs p-2 bg-amber-50 text-amber-900 rounded border border-amber-100 flex justify-between items-center">
                      <span className="font-semibold">{item.reference}</span>
                      <span className="font-black bg-amber-200 px-2 py-0.5 rounded text-amber-800">{item.daysPending} Days</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* PO with no DI */}
            <div className="bg-white border border-amber-100 rounded-lg p-4 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 mb-3 border-b border-amber-50 pb-2">POs w/ No DI (&#62; N Days)</h4>
              {data.exceptions.poNoDi.length === 0 ? <p className="text-xs text-slate-400 font-medium">Clear.</p> : (
                <ul className="space-y-2">
                  {data.exceptions.poNoDi.map((item: any, i: number) => (
                    <li key={i} className="text-xs p-2 bg-amber-50 text-amber-900 rounded border border-amber-100 flex justify-between items-center">
                      <span className="font-semibold">{item.reference}</span>
                      <span className="font-black bg-amber-200 px-2 py-0.5 rounded text-amber-800">{item.daysPending} Days</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Financial Aging */}
            <div className="bg-white border border-amber-100 rounded-lg p-4 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 mb-3 border-b border-amber-50 pb-2">Aged Unpaid Invoices</h4>
              {data.exceptions.pendingContractorInvoice.length === 0 && data.exceptions.unpaidClientBill.length === 0 ? <p className="text-xs text-slate-400 font-medium">Clear.</p> : (
                <ul className="space-y-2">
                  {data.exceptions.unpaidClientBill.map((item: any, i: number) => (
                    <li key={`cb-${i}`} className="text-xs p-2 bg-emerald-50 text-emerald-900 rounded border border-emerald-100 flex justify-between items-center">
                      <span className="font-semibold">Client: {item.reference}</span>
                      <span className="font-black bg-emerald-200 px-2 py-0.5 rounded text-emerald-800">{item.daysPending} Days</span>
                    </li>
                  ))}
                  {data.exceptions.pendingContractorInvoice.map((item: any, i: number) => (
                    <li key={`inv-${i}`} className="text-xs p-2 bg-amber-50 text-amber-900 rounded border border-amber-100 flex justify-between items-center">
                      <span className="font-semibold">Contr: {item.reference}</span>
                      <span className="font-black bg-amber-200 px-2 py-0.5 rounded text-amber-800">{item.daysPending} Days</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
