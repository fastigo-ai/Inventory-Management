import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Layers, FileText, ClipboardList, Filter, X, Truck, AlertTriangle, ArrowLeftRight, Clock, Activity, CheckCircle2 } from 'lucide-react';
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

  const { contractorData, itemData, metrics, totalJmcQty, totalWipQty, recentActivityFeed = [] } = data;

  // Calculate milestone progress (Total Work vs Total Demand Notes assumed 1:1 loosely for display)
  const totalApproved = (metrics?.approvedDemandNotes || 0);
  const totalDemand = (metrics?.totalDemandNotes || 0);
  const progressPercent = totalDemand > 0 ? Math.round((totalApproved / totalDemand) * 100) : 0;

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
      {/* KPIs Header - Actionable SAP Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Pending Returns KPI */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-orange-200 p-6 flex flex-col justify-center gap-4 relative overflow-hidden transition-all hover:shadow-md hover:border-orange-300 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">Action Required</span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {metrics?.pendingContractorReturns || 0}
            </h3>
            <p className="text-sm font-semibold text-slate-500 tracking-wide mt-1">Pending Contractor Returns</p>
          </div>
        </div>

        {/* Expected Deliveries KPI */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-blue-200 p-6 flex flex-col justify-center gap-4 relative overflow-hidden transition-all hover:shadow-md hover:border-blue-300 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Truck className="w-6 h-6" />
            </div>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">Pending Receipt</span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {metrics?.pendingMhrovs || 0}
            </h3>
            <p className="text-sm font-semibold text-slate-500 tracking-wide mt-1">Expected Deliveries (MHROVs)</p>
          </div>
        </div>

        {/* WIP Alerts KPI */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-red-200 p-6 flex flex-col justify-center gap-4 relative overflow-hidden transition-all hover:shadow-md hover:border-red-300 cursor-pointer group">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">Alerts</span>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {metrics?.wipAlerts || 0}
            </h3>
            <p className="text-sm font-semibold text-slate-500 tracking-wide mt-1">WIP Alerts (Pending Approvals)</p>
          </div>
        </div>

        {/* Total Work KPI */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-emerald-200 p-6 flex flex-col justify-center gap-4 relative overflow-hidden transition-all hover:shadow-md hover:border-emerald-300 group">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {(totalJmcQty + totalWipQty).toLocaleString()}
            </h3>
            <p className="text-sm font-semibold text-slate-500 tracking-wide mt-1">Total Executed Qty (JMC + WIP)</p>
          </div>
        </div>
      </div>

      {/* Project Milestone Tracking */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Project / Milestone Tracking</h2>
          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{progressPercent}% Completed</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4 mb-4 overflow-hidden border border-slate-200">
          <div className="bg-blue-600 h-4 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className="flex justify-between text-sm text-slate-500 font-medium">
          <span>0 Demand Notes</span>
          <span>{totalApproved} Approved / {totalDemand} Total Demand Notes</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Contractor Wise Chart */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-8">
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

        {/* Recent Activity Feed */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col h-[460px]">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {recentActivityFeed && recentActivityFeed.length > 0 ? (
              recentActivityFeed.map((activity: any, idx: number) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      activity.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                      activity.type === 'WIP' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {activity.status === 'Approved' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    {idx < recentActivityFeed.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 my-1"></div>}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-semibold text-slate-800">{activity.type} {activity.status}</p>
                    <p className="text-xs text-slate-500 mt-1">Ref: <span className="font-medium text-slate-700">{activity.referenceNo}</span></p>
                    <p className="text-xs text-slate-500">Contractor: {activity.contractor}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase">{new Date(activity.date).toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No recent activities found.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
