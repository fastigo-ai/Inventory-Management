import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Layers, FileText, ClipboardList } from 'lucide-react';

interface SitePortalDashboardProps {
  data: any;
}

export function SitePortalDashboard({ data }: SitePortalDashboardProps) {
  if (!data) return null;

  const { contractorData, itemData, metrics, totalJmcQty, totalWipQty } = data;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">
      {/* KPIs Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Work Qty (JMC + WIP)</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {(totalJmcQty + totalWipQty).toLocaleString()}
            </h3>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Demand Notes (Approved / Total)</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {metrics?.approvedDemandNotes || 0} / {metrics?.totalDemandNotes || 0}
            </h3>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total MHROVs</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {metrics?.totalMhrovs || 0}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contractor Wise Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Contractor Execution Progress</h2>
          <div className="w-full h-[350px]">
            {contractorData && contractorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contractorData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="contractor" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="jmcQty" name="JMC Qty" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wipQty" name="WIP Qty" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                No contractor execution data available.
              </div>
            )}
          </div>
        </div>

        {/* Item Wise Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Top Executed Items (Temp Code)</h2>
          <div className="w-full h-[350px]">
            {itemData && itemData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={itemData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorJmc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="item" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val.substring(0, 15) + '...'} />
                  <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    cursor={{ fill: '#f1f5f9' }} 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="jmcQty" name="Total JMC Qty" stroke="#10b981" fillOpacity={1} fill="url(#colorJmc)" />
                  <Area type="monotone" dataKey="wipQty" name="Total WIP Qty" stroke="#f59e0b" fill="#fef3c7" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                No item execution data available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
