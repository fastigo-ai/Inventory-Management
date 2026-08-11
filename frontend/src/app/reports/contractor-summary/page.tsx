"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/shared/api/axios';
import { Users, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ContractorSummary() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (dateRange.start) query.append('startDate', dateRange.start);
      if (dateRange.end) query.append('endDate', dateRange.end);

      const res = await api.get(`/reports/summary/contractor-summary?${query.toString()}`);
      setData(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const topContractors = [...data]
    .sort((a, b) => (b.balanceLiability || 0) - (a.balanceLiability || 0))
    .slice(0, 5)
    .map(c => ({
      name: (c.contractorName || 'Unknown').substring(0, 15) + ((c.contractorName?.length > 15) ? '...' : ''),
      Issued: c.totalIssuedValue || 0,
      Billed: c.totalBilledValue || 0,
      Liability: Math.max(0, c.balanceLiability || 0)
    }));

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto">
          <Link href="/reports" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Reports
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Contractor Summary</h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">Monitor total materials issued vs total work billed to calculate unbilled liability.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-400 ml-2" />
              <input 
                type="date" 
                className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <span className="text-slate-400 text-sm">to</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-sm text-slate-700 focus:ring-0 cursor-pointer"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
              {(dateRange.start || dateRange.end) && (
                <button 
                  onClick={() => setDateRange({ start: '', end: '' })}
                  className="text-xs text-amber-600 hover:text-amber-800 font-medium px-2"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-8 flex flex-col gap-8">

        {/* Visual Analytics */}
        {!loading && topContractors.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6 tracking-tight">Top 5 Contractors by Liability Risk</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={topContractors} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${(val/100000).toFixed(1)}L`} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Issued" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="Billed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Line type="monotone" dataKey="Liability" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap border-r border-slate-100">Contractor Name</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap border-r border-slate-100">MINs Issued</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap border-r border-slate-100">Total Material Value</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap border-r border-slate-100">Bills Created</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap border-r border-slate-100">Total Billed Value</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Unbilled Liability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No contractor data available for this date range.</td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/reports/contractor-summary/${encodeURIComponent(row.contractorName || 'Unknown')}`}>
                      <td className="px-6 py-4 font-semibold text-amber-600 border-r border-slate-100 hover:underline">{row.contractorName}</td>
                      <td className="px-6 py-4 text-center text-slate-600 border-r border-slate-100">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold">{row.minCount}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-800 border-r border-slate-100">
                        ₹{row.totalIssuedValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600 border-r border-slate-100">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold">{row.billCount}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-emerald-600 border-r border-slate-100">
                        ₹{row.totalBilledValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-red-500">
                        ₹{Math.max(0, row.balanceLiability || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
