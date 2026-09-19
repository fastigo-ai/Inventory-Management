"use client";

import React, { useEffect, useState } from 'react';
import { Package, TrendingUp, Settings, MapPin, Layers, Briefcase, Calendar, Bell, ChevronDown, Clock } from 'lucide-react';
import { fetchCeoDashboardData } from '@/features/ceo-portal/api/dashboard.api';
import { useAuthStore } from '@/shared/store/auth.store';
import { format } from 'date-fns';
import { 
  KpiCard, 
  ProjectStructure, 
  PhysicalStockChart, 
  FinancialProgressChart, 
  PackageSummary, 
  CirclePerformance, 
  KeyInsights, 
  WorkflowTimeline 
} from '@/features/ceo-portal/components/DashboardComponents';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const filterOptions: Record<string, string[]> = {
  package: ['All Packages', 'Package 1 (S/N)', 'Package 2 (R/R)'],
  circle: ['All Circles', 'Solan', 'Shimla', 'Nahan', 'Rampur', 'Rohru'],
  subCircle: ['All Sub-Circles', 'Nalagarh', 'Kumarhatti'],
  site: ['All Sites', 'Site A', 'Site B'],
  activity: ['All Activities', 'Erection', 'Testing', 'Commissioning'],
  dateRange: ['01 Apr 2025 - 12 Sep 2025', 'This Month', 'Last Month', 'This Year']
};

export default function CeoDashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters state
  const [filters, setFilters] = useState({
    package: 'All Packages',
    circle: 'All Circles',
    subCircle: 'All Sub-Circles',
    site: 'All Sites',
    activity: 'All Activities',
    dateRange: '01 Apr 2025 - 12 Sep 2025'
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchCeoDashboardData({});
      setData(res);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!data && loading) {
    return <div className="p-8 flex justify-center items-center h-full">Loading Dashboard...</div>;
  }

  const kpis = [
    { title: 'Physical Stock (Total Qty)', value: data?.kpis.physicalStock.toLocaleString(undefined, { maximumFractionDigits: 2 }), change: '12% vs last month', changeType: 'positive', icon: Package },
    { title: 'Material Issued (Qty)', value: data?.kpis.materialIssued.toLocaleString(undefined, { maximumFractionDigits: 2 }), change: '8% vs last month', changeType: 'positive', icon: TrendingUp },
    { title: 'JMC Consumed (Qty)', value: data?.kpis.jmcConsumed.toLocaleString(undefined, { maximumFractionDigits: 2 }), change: '10% vs last month', changeType: 'positive', icon: Settings },
    { title: 'WIP (Qty)', value: data?.kpis.wip.toLocaleString(undefined, { maximumFractionDigits: 2 }), change: '6% vs last month', changeType: 'positive', icon: Settings },
    { title: 'Total Billing Value', value: `₹ ${data?.kpis.totalBillingValue.toFixed(2)} Cr`, change: '17% vs last month', changeType: 'positive', icon: Briefcase },
    { title: 'Pending Billing', value: `₹ ${data?.kpis.pendingBilling.toFixed(2)} Cr`, change: '8% vs last month', changeType: 'negative', icon: Clock }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-6">
        {/* Welcome Section & Project Structure */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900">Good Morning, {user?.firstName} 👋</h1>
            <p className="text-sm text-gray-500 mt-1">Here's your project and business performance at a glance.</p>
            
            <div className="flex items-center text-xs text-gray-500 mt-2 font-medium">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              {format(new Date(), 'dd MMM yyyy')}
            </div>

            {/* Global Filter Bar */}
            <div className="flex gap-3 mt-6">
              {Object.entries(filters).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <Select
                    value={value}
                    onValueChange={(newVal) => setFilters(prev => ({ ...prev, [key]: newVal }))}
                  >
                    <SelectTrigger className="text-xs h-8 px-3 border-gray-200 text-gray-700 bg-white shadow-sm min-w-[120px]">
                      <SelectValue placeholder={value} />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions[key]?.map(opt => (
                        <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-[350px]">
            <ProjectStructure />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          {kpis.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <PhysicalStockChart data={data?.charts.physicalStockProgress || []} />
          <FinancialProgressChart data={data?.charts.financialProgress || []} />
        </div>

        {/* Summaries */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-1">
            <PackageSummary packages={data?.packages || []} />
          </div>
          <div className="col-span-1">
            <CirclePerformance circles={data?.circles || []} />
          </div>
          <div className="col-span-1">
            <KeyInsights alerts={data?.alerts || []} />
          </div>
        </div>

        {/* Workflow Timeline */}
        <WorkflowTimeline data={data?.workflow || {}} />
      </div>
    </div>
  );
}
