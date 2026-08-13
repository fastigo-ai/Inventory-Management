import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Layers, FileText, ClipboardList, Filter, X } from 'lucide-react';
import { getContractors } from '@/features/contractors/api/contractors.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface SitePortalDashboardProps {
  onFilterChange?: (filters: { contractorId?: string; tempCode?: string }) => void;
  data: any;
}

export function SitePortalDashboard({ data, onFilterChange }: SitePortalDashboardProps) {
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedContractor, setSelectedContractor] = useState<string>('all');
  const [tempCode, setTempCode] = useState<string>('');
  
  useEffect(() => {
    getContractors().then(res => {
      if (res.success) setContractors(res.data?.contractors || res.data?.data || (Array.isArray(res.data) ? res.data : []));
    }).catch(console.error);
  }, []);

  const handleApplyFilter = () => {
    if (onFilterChange) {
      onFilterChange({
        contractorId: selectedContractor === 'all' ? undefined : selectedContractor,
        tempCode: tempCode.trim() || undefined
      });
    }
  };

  const handleClearFilters = () => {
    setSelectedContractor('all');
    setTempCode('');
    if (onFilterChange) {
      onFilterChange({ contractorId: undefined, tempCode: undefined });
    }
  };
  if (!data) return null;

  const { contractorData, itemData, metrics, totalJmcQty, totalWipQty } = data;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1400px] mx-auto">
      {/* Filter Bar */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 p-5 flex flex-col md:flex-row items-end md:items-center gap-5 sticky top-0 z-10">
        <div className="flex items-center gap-2 text-slate-700 font-semibold w-full md:w-auto">
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </div>
        
        <div className="w-full md:w-64">
          <select 
            value={selectedContractor} 
            onChange={(e) => setSelectedContractor(e.target.value)}
            className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Contractors</option>
            {contractors.map(c => (
              <option key={c._id} value={c._id}>{c.dynamicData?.displayName || c.dynamicData?.companyName || 'Unknown Contractor'}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-64">
          <Input 
            placeholder="Search Temp Code..." 
            value={tempCode}
            onChange={(e) => setTempCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <Button onClick={handleApplyFilter} className="flex-1 md:flex-none">
            Apply Filters
          </Button>
          {(selectedContractor !== 'all' || tempCode) && (
            <Button variant="outline" onClick={handleClearFilters} className="px-3">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      {/* KPIs Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 flex flex-col justify-center gap-6 relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0 mb-2">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">Total Work Qty (JMC + WIP)</p>
            <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {(totalJmcQty + totalWipQty).toLocaleString()}
            </h3>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 flex flex-col justify-center gap-6 relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/30 shrink-0 mb-2">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">Demand Notes (Approved / Total)</p>
            <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {metrics?.approvedDemandNotes || 0} / {metrics?.totalDemandNotes || 0}
            </h3>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 flex flex-col justify-center gap-6 relative overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 shrink-0 mb-2">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">Total MHROVs</p>
            <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {metrics?.totalMhrovs || 0}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contractor Wise Chart */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-8 tracking-tight">Contractor Execution Progress</h2>
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
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-8 tracking-tight">Top Executed Items (Temp Code)</h2>
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
