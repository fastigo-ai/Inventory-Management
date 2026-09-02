"use client";

import React, { useEffect, useState } from 'react';
import { api } from '@/shared/api/axios';
import { toast } from 'sonner';
import { Loader2, FileText, CheckCircle, PackageOpen, Building2, TrendingUp, Archive } from 'lucide-react';
import Link from 'next/link';

export default function PDPortalDashboard() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard/pd-portal-summary');
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        toast.error('Failed to load PD Dashboard data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data) return null;

  const { pendingApprovals, contractorProgress, materialConsumption } = data;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Project Director Dashboard</h1>
          <p className="text-slate-500 mt-2">Overview of your assigned projects and overall project health.</p>
        </div>

        {/* Action Required / Pending Approvals */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-600" /> Action Required (Pending Approvals)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/pd-portal/demand-notes?tab=pending" className="block group">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-50 rounded-full group-hover:bg-orange-100 transition-colors"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Pending Demand Notes</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{pendingApprovals.demandNotes}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </Link>

            <Link href="#" className="block group">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Pending JMCs</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{pendingApprovals.jmcs}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/billing/approvals" className="block group">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:bg-emerald-100 transition-colors"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Pending Billing</p>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{pendingApprovals.invoices}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Contractor Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" /> Contractor Progress (JMC Value)
              </h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {contractorProgress.length > 0 ? (
                <div className="space-y-6">
                  {contractorProgress.map((cp: any, idx: number) => {
                    const percentage = cp.totalJmcAmount > 0 
                      ? Math.round((cp.approvedJmcAmount / cp.totalJmcAmount) * 100) 
                      : 0;
                    
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-slate-700">{cp.contractor}</span>
                          <span className="font-medium text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded-full">
                            ₹{cp.approvedJmcAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ₹{cp.totalJmcAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-400 text-right">{percentage}% Approved</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                  <TrendingUp className="w-10 h-10 mb-3 opacity-20" />
                  <p>No contractor data available.</p>
                </div>
              )}
            </div>
          </div>

          {/* Material Consumption */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-indigo-600" /> Material Consumption Overview
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Archive className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-medium text-slate-600">Total MHROV Qty</span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-700">{materialConsumption.totalMhrovQty.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                
                <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-600">Total WIP Qty Consumed</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{materialConsumption.totalWipQty.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                
                <div className="col-span-2 p-5 bg-blue-50/50 border border-blue-100 rounded-xl mt-2">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-slate-600">Total Approved JMC Value</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">₹{materialConsumption.totalApprovedJmcAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-slate-500 mt-2">Overall financial value of completed and approved work on site.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
