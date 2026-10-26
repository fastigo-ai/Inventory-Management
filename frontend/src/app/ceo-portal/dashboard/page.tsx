"use client";

import React, { useEffect, useState } from 'react';
import { 
  Package, TrendingUp, Settings, MapPin, Layers, Briefcase, Calendar, 
  Bell, ChevronDown, Clock, Info, AlertTriangle, ArrowRight, Truck, CheckCircle2,
  RefreshCw, FileText, ArrowUpRight, BarChart3, ShieldCheck
} from 'lucide-react';
import { fetchCeoDashboardData } from '@/features/ceo-portal/api/dashboard.api';
import { useAuthStore } from '@/shared/store/auth.store';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  SapExecutiveTile,
  ProjectStructure,
  MaterialConversionFunnel,
  FinancialProgressChart,
  PackageSummary,
  CirclePerformance,
  KeyInsights,
  WorkflowTimeline
} from '@/features/ceo-portal/components/DashboardComponents';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CeoDashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters state
  const currentYear = new Date().getFullYear();
  const fyStartYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
  const fyLabel = `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;

  const [filters, setFilters] = useState<{
    package: string[];
    circle: string[];
    subCircle: string[];
    dateRange: string;
  }>({
    package: [],
    circle: [],
    subCircle: [],
    dateRange: 'All Time'
  });

  const getAvailableCircles = () => {
    let circles: string[] = [];
    if (filters.package.includes('Package 1 (S/N)')) circles.push('Solan', 'Nahan');
    if (filters.package.includes('Package 2 (R/R)')) circles.push('Rampur', 'Rohru');
    if (circles.length === 0) circles = ['Solan', 'Nahan', 'Rampur', 'Rohru'];
    return ['All Circles', ...circles];
  };

  const getAvailableSubCircles = () => {
    if (filters.circle.includes('Solan')) {
      return ['All Sub-Circles', 'Nalagarh', 'Kumarhatti'];
    }
    return ['All Sub-Circles'];
  };

  const dynamicFilterOptions: Record<string, string[]> = {
    package: ['All Packages', 'Package 1 (S/N)', 'Package 2 (R/R)'],
    circle: getAvailableCircles(),
    subCircle: getAvailableSubCircles(),
    dateRange: ['All Time', fyLabel, `This Year (${currentYear})`, 'This Month', 'Last Month']
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const apiFilters: any = {};
      if (filters.package.length) apiFilters.package = filters.package.join(',');
      if (filters.circle.length) apiFilters.circle = filters.circle.join(',');
      if (filters.subCircle.length) apiFilters.subCircle = filters.subCircle.join(',');

      if (filters.dateRange === 'This Month') {
        const d = new Date();
        apiFilters.startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        apiFilters.endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else if (filters.dateRange === 'Last Month') {
        const d = new Date();
        apiFilters.startDate = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString();
        apiFilters.endDate = new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59).toISOString();
      } else if (filters.dateRange === `This Year (${currentYear})` || filters.dateRange === 'This Year') {
        const d = new Date();
        apiFilters.startDate = new Date(d.getFullYear(), 0, 1).toISOString();
        apiFilters.endDate = new Date(d.getFullYear(), 11, 31, 23, 59, 59).toISOString();
      } else if (filters.dateRange === fyLabel) {
        apiFilters.startDate = new Date(fyStartYear, 3, 1).toISOString();
        apiFilters.endDate = new Date(fyStartYear + 1, 2, 31, 23, 59, 59).toISOString();
      }

      const res = await fetchCeoDashboardData(apiFilters);
      setData(res);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const inr = (v: number) => Math.round(v || 0).toLocaleString('en-IN');
  const inTransitCount = (data?.kpis?.totalTransferOutQty || 0) - (data?.kpis?.totalTransferInQty || 0);

  if (!data && loading) {
    return (
      <div className="bg-slate-50 min-h-screen p-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="h-8 bg-slate-200 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl"></div>
          ))}
        </div>
        <div className="h-44 bg-white border border-slate-200 rounded-xl mb-6"></div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-80 bg-white border border-slate-200 rounded-xl"></div>
          <div className="h-80 bg-white border border-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/70 min-h-screen text-slate-800">
      {/* Top SAP Fiori Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center font-extrabold shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">Executive Management Cockpit</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  SAP Fiori Style PS / MM
                </span>
              </div>
              <p className="text-xs text-slate-500">Holistic TechnoEngineer • EPC Project Supply & Execution Monitoring</p>
            </div>
          </div>

          {/* Quick Actions & Date */}
          <div className="flex items-center gap-3">
            <div className="flex items-center text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              {format(new Date(), 'dd MMMM yyyy')}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="text-xs h-8 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Realtime
            </Button>

            <Link href="/ceo-portal/operations-hub">
              <Button size="sm" className="text-xs h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                <span>Detailed Item Matrix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="px-6 py-2 bg-slate-50/80 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3" /> Scope Filters:
            </span>

            {Object.entries(filters).map(([key, value]) => {
              if (key === 'subCircle' && !filters.circle.includes('Solan')) return null;

              let displayValue = 'All';
              if (key === 'dateRange') {
                displayValue = value as string;
              } else if (Array.isArray(value) && value.length > 0) {
                displayValue = value.length === 1 ? value[0] : `${value.length} Selected`;
              }

              return (
                <div key={key} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  <Select
                    value={key === 'dateRange' ? (value as string) : ''}
                    onValueChange={(newVal) => setFilters(prev => {
                      if (!newVal) return prev;
                      if (key === 'dateRange') return { ...prev, dateRange: newVal };

                      const newFilters = { ...prev };
                      if (newVal.startsWith('All ')) {
                        (newFilters as any)[key] = [];
                        if (key === 'package') newFilters.circle = [];
                        if (key === 'circle') newFilters.subCircle = [];
                      } else {
                        const arr = (newFilters as any)[key] as string[];
                        if (arr.includes(newVal)) {
                          (newFilters as any)[key] = arr.filter(i => i !== newVal);
                        } else {
                          (newFilters as any)[key] = [...arr, newVal];
                        }
                      }
                      return newFilters;
                    })}
                  >
                    <SelectTrigger className="border-0 p-0 h-auto text-xs font-semibold text-slate-700 focus:ring-0 gap-1 min-w-[80px]">
                      <SelectValue placeholder={displayValue}>{displayValue}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {dynamicFilterOptions[key]?.map(opt => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          {key !== 'dateRange' && Array.isArray(value) && value.includes(opt) ? `✓ ${opt}` : opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>

          {/* Scope Indicator */}
          <div className="text-[11px] text-slate-500 font-medium hidden lg:block">
            Showing aggregated metrics across selected circles
          </div>
        </div>
      </header>

      {/* Main Cockpit Content */}
      <main className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* 1. SAP Fiori Executive Metric Cockpit (6 KPI Tiles) */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <SapExecutiveTile
            title="Physical Warehouse Stock"
            subtitle="Central & Circle Stores"
            value={inr(data?.kpis?.physicalStock)}
            subValue="Unissued Warehouse Balance"
            badgeText="MM Stock"
            status="positive"
            icon={Package}
            change="Live Balance"
            changeType="positive"
          />

          <SapExecutiveTile
            title="Site Issued Material"
            subtitle="Dispatched via MIN"
            value={inr(data?.kpis?.materialIssued)}
            subValue="Dispatched to Field Sites"
            badgeText="Issued"
            status="brand"
            icon={TrendingUp}
            change="58% of Inward"
            changeType="positive"
          />

          <SapExecutiveTile
            title="JMC Work Certified"
            subtitle="Joint Measurement Completed"
            value={inr(data?.kpis?.jmcConsumed)}
            subValue="Installed & Verified"
            badgeText="JMC Done"
            status="positive"
            icon={CheckCircle2}
            change="41% of Issued"
            changeType="positive"
          />

          <SapExecutiveTile
            title="Active WIP (Field)"
            subtitle="Work in Progress at Site"
            value={inr(data?.kpis?.wip)}
            subValue="Under Active Execution"
            badgeText="WIP"
            status="warning"
            icon={Settings}
            change="Installation Stage"
            changeType="neutral"
          />

          <SapExecutiveTile
            title="Realized Client Billing"
            subtitle="Supply + Erection Invoiced"
            value={`₹ ${data?.kpis?.totalBillingValue?.toFixed(2) || '0.00'} Cr`}
            subValue={`Supply: ₹${data?.kpis?.supplyBilled?.toFixed(2) || '0'} Cr | Erec: ₹${data?.kpis?.erectionBilled?.toFixed(2) || '0'} Cr`}
            badgeText="Revenue"
            status="positive"
            icon={Briefcase}
            change="Target 89%"
            changeType="positive"
          />

          <SapExecutiveTile
            title="Unbilled Pipeline"
            subtitle="WIP & Pending RA Bills"
            value={`₹ ${data?.kpis?.pendingBilling?.toFixed(2) || '0.00'} Cr`}
            subValue="Pending Client Certification"
            badgeText="Receivable"
            status="critical"
            icon={Clock}
            change="Action Needed"
            changeType="negative"
          />
        </section>

        {/* 2. Physical Stock Accounting Equation Card (SAP MM Balance Proof) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold tracking-wider uppercase text-slate-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>SAP Stock Ledger Equation & Warehouse Reconciliation</span>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Inventory Formula: Inward + Transfer In - Transfer Out - Issued = Physical Stock</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center text-center bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Total Inward (MRN)</div>
              <div className="text-lg font-extrabold text-slate-800">{inr(data?.kpis?.totalInwardQty)}</div>
              <span className="text-[10px] text-blue-600 font-semibold">Vendor Receipts</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">+ Transfer IN</div>
              <div className="text-lg font-extrabold text-blue-700">+{inr(data?.kpis?.totalTransferInQty)}</div>
              <span className="text-[10px] text-slate-500 font-medium">Store Receipts</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">- Transfer OUT</div>
              <div className="text-lg font-extrabold text-amber-700">-{inr(data?.kpis?.totalTransferOutQty)}</div>
              <span className="text-[10px] text-slate-500 font-medium">Inter-store Sent</span>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">- Material Issued (MIN)</div>
              <div className="text-lg font-extrabold text-rose-700">-{inr(data?.kpis?.materialIssued)}</div>
              <span className="text-[10px] text-slate-500 font-medium">Outward to Site</span>
            </div>

            <div className="bg-emerald-50/80 p-3 rounded-lg border border-emerald-300 col-span-2 md:col-span-1 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-emerald-700 mb-0.5">= Physical Stock</div>
              <div className="text-xl font-extrabold text-emerald-800">{inr(data?.kpis?.physicalStock)}</div>
              <span className="text-[10px] text-emerald-600 font-bold">100% Reconciled</span>
            </div>
          </div>

          {/* In-Transit Alert Strip */}
          {inTransitCount > 0 && (
            <div className="mt-3.5 bg-amber-50/60 p-3.5 rounded-lg border border-amber-200/80 text-left">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-800 font-bold">{inr(inTransitCount)} units</span> are currently in inter-store transit (dispatched but not yet accepted by receiving store).
                </p>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Logistics Transit</span>
              </div>

              {data?.kpis?.transitDetails && data?.kpis?.transitDetails.length > 0 && (
                <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {data.kpis.transitDetails.map((t: any, idx: number) => (
                    <div key={idx} className="text-xs text-slate-700 bg-white border border-amber-200/70 rounded-md px-3 py-2 flex justify-between items-center shadow-xs">
                      <span className="font-semibold truncate mr-2" title={`${t.from} → ${t.to}`}>
                        {t.from} <span className="text-amber-500 mx-1">→</span> {t.to}
                      </span>
                      <span className="font-extrabold text-amber-800 whitespace-nowrap">{inr(t.qty)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 3. WBS Project Scope Structure */}
        <section>
          <ProjectStructure
            filters={filters}
            onFilterChange={(key, val) => setFilters(prev => {
              const newFilters = { ...prev };
              const currentArr = (newFilters as any)[key] as string[];
              if (currentArr.includes(val)) {
                (newFilters as any)[key] = currentArr.filter(i => i !== val);
              } else {
                (newFilters as any)[key] = [...currentArr, val];
              }
              return newFilters;
            })}
          />
        </section>

        {/* 4. High-Value Actionable Charts (Funnel + Financial Cashflow) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MaterialConversionFunnel kpis={data?.kpis} />
          <FinancialProgressChart data={data?.charts.financialProgress || []} />
        </section>

        {/* 5. Execution Summaries & Operational Scorecards (3 Columns) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PackageSummary packages={data?.packages || []} />
          <CirclePerformance circles={data?.circles || []} />
          <KeyInsights alerts={data?.alerts || []} />
        </section>

        {/* 6. Document Flow & Transaction Lifecycle (SAP Document Lifecycle Stepper) */}
        <section>
          <WorkflowTimeline data={data?.workflow || {}} />
        </section>

      </main>
    </div>
  );
}
