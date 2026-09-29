"use client";

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Settings, ShieldAlert, CheckCircle2, 
  TrendingUp, Clock, Package, Briefcase, FileText, 
  ArrowRight, Activity, Drill, MapPin, Calendar, Link2, 
  Bell, FileOutput, CheckSquare, XCircle, FileSpreadsheet, 
  FileCheck, ListTodo, MoreHorizontal, ChevronDown, 
  Search, Info, X
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/shared/api/axios';

const CircularProgress = ({ value, label, planned, actual, variance, colorClass, strokeColor }: any) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col items-center flex-1 min-w-[200px]">
      <h3 className="text-sm font-bold text-slate-800 mb-4">{label}</h3>
      <div className="flex items-center gap-6 w-full px-2">
        {/* Circle */}
        <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} className="stroke-slate-100" strokeWidth="8" fill="transparent" />
            <circle 
              cx="50" cy="50" r={radius} 
              className={strokeColor}
              strokeWidth="8" fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={strokeDashoffset} 
              strokeLinecap="round" 
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-2xl font-bold text-slate-800">{value}%</span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Planned</span>
            <span className="font-semibold text-slate-700">{planned}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Actual</span>
            <span className="font-semibold text-slate-700">{actual}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Variance</span>
            <span className={`font-semibold ${variance.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>{variance}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ label, count, percentage, colorClass }: any) => (
  <div className="flex items-center gap-3 mb-3">
    <div className="w-24 text-xs font-medium text-slate-600 truncate">{label}</div>
    <div className="w-10 text-xs text-right font-semibold text-slate-800">{count}</div>
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
    </div>
    <div className="w-8 text-xs text-right text-slate-500">{percentage}%</div>
  </div>
);

export default function ProgressControlCenter() {
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState(new Date());
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const url = selectedProject && selectedProject !== 'All' 
          ? `/progress?package=${encodeURIComponent(selectedProject)}` 
          : '/progress';
        const res = await api.get(url);
        if (res.data?.success) {
          setMetrics(res.data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [selectedProject]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        
        {/* Header section matching UI */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <ArrowRight className="w-4 h-4" /> Projects
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tower A - Commercial Building</h1>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> On Track
              </span>
            </div>
            
            <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
              <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Downtown, Mumbai</div>
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Start Date: 01 Jan 2025</div>
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> End Date: 31 Dec 2026</div>
              <div className="flex items-center gap-1"><Link2 className="w-4 h-4" /> Project Code: TA-001</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">29 Sep 2026</span>
          </div>
        </div>

        {/* Circular Progress Dials Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <CircularProgress label="Overall Project Progress" value={57} planned={62} actual={57} variance="-5%" strokeColor="stroke-blue-500" />
          <CircularProgress label="Procurement Progress" value={82} planned={80} actual={82} variance="+2%" strokeColor="stroke-emerald-500" />
          <CircularProgress label="Material Progress" value={74} planned={76} actual={74} variance="-2%" strokeColor="stroke-amber-500" />
          <CircularProgress label="Contractor Progress" value={61} planned={65} actual={61} variance="-4%" strokeColor="stroke-purple-500" />
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-4 mb-6">
          {[
            { icon: <FileText className="w-5 h-5 text-blue-500" />, label: 'Demand Notes', val: metrics?.procurement?.demandNotes || 0 },
            { icon: <FileSpreadsheet className="w-5 h-5 text-indigo-500" />, label: 'PR', val: metrics?.procurement?.prCreated || 0 },
            { icon: <FileCheck className="w-5 h-5 text-emerald-500" />, label: 'PO', val: metrics?.procurement?.poCreated || 0 },
            { icon: <Package className="w-5 h-5 text-cyan-500" />, label: 'Delivered', val: metrics?.procurement?.delivered || 0 },
            { icon: <Package className="w-5 h-5 text-amber-500" />, label: 'Issued', val: metrics?.material?.totalIssued?.toLocaleString() || 0 },
            { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, label: 'Consumed', val: metrics?.material?.totalConsumed?.toLocaleString() || 0 },
            { icon: <ArrowRight className="w-5 h-5 text-purple-500 transform rotate-180" />, label: 'Returned', val: metrics?.material?.totalReturned?.toLocaleString() || 0 },
          ].map((kpi, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-200">
              <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                {kpi.icon}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium mb-1 whitespace-nowrap">{kpi.label}</div>
                <div className="text-xl font-black text-slate-800">{kpi.val}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 3 Column Grid (Top) */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mb-6">
          
          {/* Procurement Progress */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Settings className="w-4 h-4 text-blue-500"/> Procurement Progress</h2>
              <a href="#" className="text-xs text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex text-xs font-bold text-slate-400 mb-3 border-b border-slate-100 pb-2">
              <div className="w-24">Stage</div>
              <div className="w-10 text-right">Count</div>
              <div className="flex-1 text-center">Completion</div>
            </div>
            <ProgressBar label="Demand Notes" count={120} percentage={100} colorClass="bg-blue-500" />
            <ProgressBar label="PR" count={98} percentage={82} colorClass="bg-blue-500" />
            <ProgressBar label="RFQ" count={90} percentage={76} colorClass="bg-blue-500" />
            <ProgressBar label="PO" count={82} percentage={70} colorClass="bg-blue-500" />
            <ProgressBar label="Ordered" count={70} percentage={60} colorClass="bg-blue-500" />
            <ProgressBar label="Delivered" count={61} percentage={52} colorClass="bg-blue-500" />
            <ProgressBar label="Pending Delivery" count={21} percentage={18} colorClass="bg-blue-500" />
          </div>

          {/* Material Movement */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-500"/> Material Movement</h2>
              <a href="#" className="text-xs text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 border-b border-slate-100 sticky top-0 bg-white">
                  <tr>
                    <th className="py-2 px-2 font-semibold whitespace-nowrap">Material</th>
                    <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Required</th>
                    <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Procured</th>
                    <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Issued</th>
                    <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Consumed</th>
                    <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {metrics?.material?.materialMovement?.length > 0 ? metrics.material.materialMovement.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 px-2 font-medium text-slate-800 whitespace-nowrap truncate max-w-[200px]" title={m.material}>{m.material}</td>
                      <td className="px-2 text-right">{m.required?.toLocaleString()}</td>
                      <td className="px-2 text-right">{m.procured?.toLocaleString()}</td>
                      <td className="px-2 text-right text-indigo-600">{m.issued?.toLocaleString()}</td>
                      <td className="px-2 text-right text-emerald-600">{m.consumed?.toLocaleString()}</td>
                      <td className="px-2 text-right font-medium">{m.balance?.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="py-4 text-center text-slate-400">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Contractor Material */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-4 h-4 text-emerald-500"/> Contractor Material</h2>
              <a href="#" className="text-xs text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 border-b border-slate-100 sticky top-0 bg-white">
                  <tr>
                    <th className="py-2 px-2 font-semibold whitespace-nowrap">Contractor</th>
                    <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Issued</th>
                    <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Consumed</th>
                    <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Returned</th>
                    <th className="py-2 px-2 font-semibold text-right whitespace-nowrap">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {metrics?.material?.contractorMaterial?.length > 0 ? metrics.material.contractorMaterial.map((c: any, i: number) => (
                    <tr key={i}>
                      <td className="py-3 px-2 font-medium text-slate-800 whitespace-nowrap truncate max-w-[150px]" title={c.contractor}>{c.contractor}</td>
                      <td className="px-2 text-right">{c.issued?.toLocaleString()}</td>
                      <td className="px-2 text-right text-emerald-600">{c.consumed?.toLocaleString()}</td>
                      <td className="px-2 text-right text-purple-600">{c.returned?.toLocaleString()}</td>
                      <td className="px-2 text-right font-medium">{c.balance?.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="py-4 text-center text-slate-400">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3 Column Grid (Bottom) */}
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 mb-6">
          
          {/* WIP */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Settings className="w-4 h-4 text-blue-500"/> WIP (Work In Progress)</h2>
              <a href="#" className="text-xs text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 border-b border-slate-100 sticky top-0 bg-white">
                  <tr>
                    <th className="py-2 px-1 font-semibold whitespace-nowrap">Material</th>
                    <th className="py-2 px-1 font-semibold text-right whitespace-nowrap">Required</th>
                    <th className="py-2 px-1 font-semibold text-right whitespace-nowrap">Issued</th>
                    <th className="py-2 px-1 font-semibold text-right whitespace-nowrap">Consumed</th>
                    <th className="py-2 px-1 font-semibold text-right whitespace-nowrap">Remaining</th>
                    <th className="py-2 px-1 font-semibold text-right whitespace-nowrap">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  <tr><td className="py-3 px-1 font-medium text-slate-800 whitespace-nowrap">Steel (MT)</td><td className="px-1 text-right">8,000</td><td className="px-1 text-right">7,500</td><td className="px-1 text-right text-emerald-600">6,900</td><td className="px-1 text-right font-medium">600</td><td className="px-1 text-right text-rose-500 font-bold">-100</td></tr>
                  <tr><td className="py-3 px-1 font-medium text-slate-800 whitespace-nowrap">Cement (Bags)</td><td className="px-1 text-right">4,000</td><td className="px-1 text-right">3,800</td><td className="px-1 text-right text-emerald-600">3,500</td><td className="px-1 text-right font-medium">300</td><td className="px-1 text-right text-rose-500 font-bold">-50</td></tr>
                  <tr><td className="py-3 px-1 font-medium text-slate-800 whitespace-nowrap">Concrete (m³)</td><td className="px-1 text-right">1,200</td><td className="px-1 text-right">1,150</td><td className="px-1 text-right text-emerald-600">1,100</td><td className="px-1 text-right font-medium">50</td><td className="px-1 text-right text-rose-500 font-bold">-20</td></tr>
                  <tr><td className="py-3 px-1 font-medium text-slate-800 whitespace-nowrap">Formwork (Nos)</td><td className="px-1 text-right">500</td><td className="px-1 text-right">480</td><td className="px-1 text-right text-emerald-600">450</td><td className="px-1 text-right font-medium">30</td><td className="px-1 text-right text-rose-500 font-bold">-10</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Work Orders */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><ListTodo className="w-4 h-4 text-blue-500"/> Work Orders</h2>
              <a href="#" className="text-xs text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex text-xs font-bold text-slate-400 mb-3 border-b border-slate-100 pb-2">
              <div className="w-24">Status</div>
              <div className="w-10 text-right">Count</div>
              <div className="flex-1 text-center">%</div>
            </div>
            {metrics?.workExecution?.workOrders?.length > 0 ? metrics.workExecution.workOrders.map((st: any, i: number) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <div className="w-24 text-xs font-medium text-slate-600 flex items-center gap-1.5 truncate">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    st.label === 'Completed' ? 'bg-emerald-500' :
                    st.label === 'In Progress' ? 'bg-amber-500' :
                    st.label === 'On Hold' || st.label === 'Cancelled' ? 'bg-rose-500' : 'bg-blue-500'
                  }`}></div>
                  {st.label}
                </div>
                <div className="w-10 text-xs text-right font-semibold text-slate-800">{st.count}</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    st.label === 'Completed' ? 'bg-emerald-500' :
                    st.label === 'In Progress' ? 'bg-amber-500' :
                    st.label === 'On Hold' || st.label === 'Cancelled' ? 'bg-rose-500' : 'bg-blue-500'
                  }`} style={{ width: `${st.pct}%` }}></div>
                </div>
                <div className="w-8 text-xs text-right text-slate-500">{st.pct}%</div>
              </div>
            )) : (
              <div className="text-center text-xs text-slate-400 py-4">No data available</div>
            )}
          </div>

          {/* JMC */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-emerald-500"/> JMC (Joint Measurement Certificate)</h2>
              <a href="#" className="text-xs text-blue-600 font-medium hover:underline">View All</a>
            </div>
            <div className="flex text-xs font-bold text-slate-400 mb-4 border-b border-slate-100 pb-2">
              <div className="w-24">Status</div>
              <div className="w-10 text-right">Count</div>
              <div className="flex-1 text-center">%</div>
            </div>
            {metrics?.workExecution?.jmcs?.length > 0 ? metrics.workExecution.jmcs.map((st: any, i: number) => (
              <div key={i} className="flex items-center gap-3 mb-5">
                <div className="w-24 text-xs font-medium text-slate-600 flex items-center gap-1.5 truncate">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    st.label === 'Rejected' ? 'bg-rose-500' :
                    st.label === 'Approved' || st.label === 'Verified' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}></div>
                  {st.label}
                </div>
                <div className="w-10 text-xs text-right font-semibold text-slate-800">{st.count}</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    st.label === 'Rejected' ? 'bg-rose-500' :
                    st.label === 'Approved' || st.label === 'Verified' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} style={{ width: `${st.pct}%` }}></div>
                </div>
                <div className="w-8 text-xs text-right text-slate-500">{st.pct}%</div>
              </div>
            )) : (
              <div className="text-center text-xs text-slate-400 py-4">No data available</div>
            )}
          </div>
        </div>

        {/* Exceptions & Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-4 h-4" /> Exceptions & Alerts
            </h2>
            <a href="#" className="text-xs text-blue-600 font-medium hover:underline">View All</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-100 flex items-start gap-3 cursor-pointer hover:bg-rose-50 transition-colors">
              <div className="bg-rose-500 p-2 rounded-md text-white"><ShieldAlert className="w-4 h-4"/></div>
              <div>
                <div className="font-bold text-rose-700 text-lg leading-none mb-1">12</div>
                <div className="text-xs font-medium text-rose-800/70">Materials below required quantity</div>
              </div>
            </div>
            <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 flex items-start gap-3 cursor-pointer hover:bg-orange-50 transition-colors">
              <div className="bg-orange-500 p-2 rounded-md text-white"><Clock className="w-4 h-4"/></div>
              <div>
                <div className="font-bold text-orange-700 text-lg leading-none mb-1">7</div>
                <div className="text-xs font-medium text-orange-800/70">PO deliveries overdue</div>
              </div>
            </div>
            <div className="bg-amber-50/50 p-4 rounded-lg border border-amber-100 flex items-start gap-3 cursor-pointer hover:bg-amber-50 transition-colors">
              <div className="bg-amber-500 p-2 rounded-md text-white"><ArrowRight className="w-4 h-4 transform rotate-180"/></div>
              <div>
                <div className="font-bold text-amber-700 text-lg leading-none mb-1">4</div>
                <div className="text-xs font-medium text-amber-800/70">Contractors with pending returns</div>
              </div>
            </div>
            <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100 flex items-start gap-3 cursor-pointer hover:bg-purple-50 transition-colors">
              <div className="bg-purple-500 p-2 rounded-md text-white"><CheckSquare className="w-4 h-4"/></div>
              <div>
                <div className="font-bold text-purple-700 text-lg leading-none mb-1">8</div>
                <div className="text-xs font-medium text-purple-800/70">JMCs pending approval</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar (Drill Down) - Hidden on smaller screens */}
      <div className="hidden xl:flex w-[400px] border-l border-slate-200 bg-white flex-col h-full overflow-hidden flex-shrink-0">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h2 className="font-bold text-slate-800">Material Issue Details</h2>
          <button className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex overflow-x-auto text-xs font-medium text-slate-500 border-b border-slate-200 scrollbar-hide">
          <div className="px-4 py-3 text-blue-600 border-b-2 border-blue-600 whitespace-nowrap cursor-pointer">Summary</div>
          <div className="px-4 py-3 hover:text-slate-700 whitespace-nowrap cursor-pointer">By Contractor</div>
          <div className="px-4 py-3 hover:text-slate-700 whitespace-nowrap cursor-pointer">By Activity</div>
          <div className="px-4 py-3 hover:text-slate-700 whitespace-nowrap cursor-pointer">By Work Order</div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
          {/* Sidebar Stats */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-center">
              <div className="text-blue-500 flex justify-center mb-1"><FileOutput className="w-4 h-4"/></div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Total Issued</div>
              <div className="font-bold text-slate-800">7,200 <span className="text-[10px] font-normal">MT</span></div>
            </div>
            <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 text-center">
              <div className="text-emerald-500 flex justify-center mb-1"><CheckCircle2 className="w-4 h-4"/></div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Total Consumed</div>
              <div className="font-bold text-slate-800">6,500 <span className="text-[10px] font-normal">MT</span></div>
            </div>
            <div className="flex-1 bg-purple-50/50 border border-purple-100 rounded-lg p-3 text-center">
              <div className="text-purple-500 flex justify-center mb-1"><ArrowRight className="w-4 h-4 transform rotate-180"/></div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Returned</div>
              <div className="font-bold text-slate-800">500 <span className="text-[10px] font-normal">MT</span></div>
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-800 mb-3">Issued Material Details</h3>
          <table className="w-full text-[11px] text-left mb-8 border-collapse">
            <thead className="bg-slate-50 text-slate-500 border-y border-slate-200">
              <tr>
                <th className="py-2 px-2 font-semibold">Material</th>
                <th className="py-2 px-2 font-semibold text-right">Issued Qty</th>
                <th className="py-2 px-2 font-semibold text-right">Consumed Qty</th>
                <th className="py-2 px-2 font-semibold text-right">Returned Qty</th>
                <th className="py-2 px-2 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="bg-blue-50/30">
                <td className="py-2.5 px-2 font-semibold text-blue-700">Cement (MT)</td><td className="px-2 text-right">720</td><td className="px-2 text-right">650</td><td className="px-2 text-right">50</td><td className="px-2 text-right font-medium">20</td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-slate-800">Steel (MT)</td><td className="px-2 text-right">380</td><td className="px-2 text-right">340</td><td className="px-2 text-right">30</td><td className="px-2 text-right font-medium">10</td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-slate-800">Bricks (Nos)</td><td className="px-2 text-right">35,000</td><td className="px-2 text-right">32,000</td><td className="px-2 text-right">2,000</td><td className="px-2 text-right font-medium">1,000</td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-slate-800">Sand (MT)</td><td className="px-2 text-right">700</td><td className="px-2 text-right">640</td><td className="px-2 text-right">40</td><td className="px-2 text-right font-medium">20</td>
              </tr>
              <tr>
                <td className="py-2.5 px-2 font-medium text-slate-800">Aggregate (MT)</td><td className="px-2 text-right">480</td><td className="px-2 text-right">430</td><td className="px-2 text-right">30</td><td className="px-2 text-right font-medium">20</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-xs font-bold text-slate-800 mb-3">Drill Down</h3>
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <div className="bg-slate-50 px-3 py-2.5 flex justify-between items-center cursor-pointer border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ChevronDown className="w-4 h-4 text-slate-400" /> Steel (MT)
              </div>
            </div>
            <div className="p-4 bg-white">
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs mb-4">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Total Issued</span><span className="font-semibold">380 MT</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Total Returned</span><span className="font-semibold">30 MT</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Total Consumed</span><span className="font-semibold text-emerald-600">340 MT</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">Balance</span><span className="font-semibold">10 MT</span>
                </div>
              </div>
              <a href="#" className="text-blue-600 text-xs flex items-center gap-1 font-medium hover:underline mb-4">View Transactions <ArrowRight className="w-3 h-3"/></a>
              
              <h4 className="text-[11px] font-bold text-slate-800 mb-2 mt-4">Issued To (Contractor)</h4>
              <table className="w-full text-[10px] text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="py-1.5 px-2 font-medium border-y border-slate-200">Contractor</th>
                    <th className="py-1.5 px-2 font-medium border-y border-slate-200 text-right">Issued</th>
                    <th className="py-1.5 px-2 font-medium border-y border-slate-200 text-right">Consumed</th>
                    <th className="py-1.5 px-2 font-medium border-y border-slate-200 text-right">Returned</th>
                    <th className="py-1.5 px-2 font-medium border-y border-slate-200">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2 px-2 font-medium text-slate-800 truncate max-w-[80px]">ABC Construction</td><td className="px-2 text-right">150</td><td className="px-2 text-right">130</td><td className="px-2 text-right">10</td><td className="px-2 text-slate-500">RCC - L4</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-medium text-slate-800 truncate max-w-[80px]">XYZ Infra</td><td className="px-2 text-right">100</td><td className="px-2 text-right">90</td><td className="px-2 text-right">10</td><td className="px-2 text-slate-500">RCC - L3</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-medium text-slate-800 truncate max-w-[80px]">Delta Builders</td><td className="px-2 text-right">80</td><td className="px-2 text-right">70</td><td className="px-2 text-right">5</td><td className="px-2 text-slate-500">Finishing</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 font-medium text-slate-800 truncate max-w-[80px]">RK Contractors</td><td className="px-2 text-right">50</td><td className="px-2 text-right">50</td><td className="px-2 text-right">5</td><td className="px-2 text-slate-500">Plumbing</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-800 mb-3">Related Documents</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <FileText className="w-4 h-4 text-blue-500" /> 
              <span className="text-slate-600">Purchase Orders</span>
              <a href="#" className="text-blue-600 hover:underline ml-auto">(PO-1023, PO-1045)</a>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" /> 
              <span className="text-slate-600">Material Issue</span>
              <a href="#" className="text-blue-600 hover:underline ml-auto">(MI-000876, MI-002901)</a>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <ListTodo className="w-4 h-4 text-blue-500" /> 
              <span className="text-slate-600">Work Orders</span>
              <a href="#" className="text-blue-600 hover:underline ml-auto">(WO-1024, WO-1035)</a>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}
