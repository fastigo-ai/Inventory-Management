"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/shared/api/axios';
import { Store, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4'];

export default function StoreSummary() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (dateRange.start) query.append('startDate', dateRange.start);
      if (dateRange.end) query.append('endDate', dateRange.end);

      const res = await api.get(`/reports/summary/store-summary?${query.toString()}`);
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

  const pieData = data.map(s => ({
    name: s.storeName || 'Unassigned',
    value: s.totalValue || 0
  })).filter(s => s.value > 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto">
          <Link href="/reports" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Reports
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Store Summary</h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">View total inventory valuation and inward stock movement broken down by store/circle.</p>
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
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2"
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
        {!loading && pieData.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6 tracking-tight">Inventory Value Distribution by Circle</h2>
            <div className="h-72 w-full flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Inventory Value']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap border-r border-slate-100">Store / Circle</th>
                  <th className="px-6 py-4 text-center whitespace-nowrap border-r border-slate-100">Inward Count</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap border-r border-slate-100">Total Received Qty</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Total Inventory Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No store data available for this date range.</td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-blue-600 border-r border-slate-100">{row.storeName || 'Unassigned'}</td>
                      <td className="px-6 py-4 text-center text-slate-600 border-r border-slate-100">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold">{row.inwardCount}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-800 border-r border-slate-100">
                        {row.totalReceivedQty?.toLocaleString() || '0'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">
                        ₹{row.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
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
