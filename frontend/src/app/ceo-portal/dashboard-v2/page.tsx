"use client";

import React, { useEffect, useState } from 'react';
import { fetchCeoDashboardV2Data } from '@/features/ceo-portal/api/dashboard.api';
import { useAuthStore } from '@/shared/store/auth.store';
import { format } from 'date-fns';
import { Calendar, DollarSign, AlertTriangle, Clock, TrendingUp, Package } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KpiCard } from '@/features/ceo-portal/components/DashboardComponents';

const filterOptions: Record<string, string[]> = {
  package: ['All Packages', 'Package 1 (S/N)', 'Package 2 (R/R)'],
  circle: ['All Circles', 'Solan', 'Shimla', 'Nahan', 'Rampur', 'Rohru'],
  dateRange: ['This Month', 'Last Month', 'This Year']
};

export default function CeoDashboardV2Page() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const [filters, setFilters] = useState({
    package: 'All Packages',
    circle: 'All Circles',
    dateRange: 'This Month'
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchCeoDashboardV2Data(filters);
      setData(res);
    } catch (error) {
      console.error('Failed to load V2 dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!data && loading) {
    return <div className="p-8 flex justify-center items-center h-full">Loading Enterprise Dashboard...</div>;
  }

  const kpis = [
    { title: 'Cash Flow', value: `₹ ${(data?.financialHealth.cashFlow / 10000000).toFixed(2)} Cr`, change: 'Net Margin', changeType: data?.financialHealth.cashFlow > 0 ? 'positive' : 'negative', icon: DollarSign },
    { title: 'Gross Margin %', value: `${data?.financialHealth.grossMarginPercent}%`, change: 'vs Target', changeType: data?.financialHealth.grossMarginPercent > 10 ? 'positive' : 'negative', icon: TrendingUp },
    { title: 'Turnover Ratio', value: `${data?.supplyChain.inventoryTurnoverRatio}`, change: 'Inventory Velocity', changeType: 'positive', icon: Package },
    { title: 'Avg TAT (DI to Inward)', value: `${data?.operationsTAT.avgDiToInwardDays} Days`, change: 'Based on recent 50', changeType: 'negative', icon: Clock }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-6">
        {/* Welcome Section */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Dashboard V2 (Strategic View)</h1>
            <p className="text-sm text-gray-500 mt-1">Advanced financial, operational, and risk insights.</p>
            
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
        </div>

        {/* Strategic KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Financial Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-blue-500" />
              Financial Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Total Billed to Client (Inflow)</span>
                <span className="text-sm font-bold text-green-600">₹ {(data?.financialHealth.totalInflow / 10000000).toFixed(2)} Cr</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Procurement Outflow (PO Value)</span>
                <span className="text-sm font-bold text-red-500">₹ {(data?.financialHealth.totalPOValue / 10000000).toFixed(2)} Cr</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">Contractor Billing Outflow</span>
                <span className="text-sm font-bold text-red-500">₹ {(data?.financialHealth.totalContractorOutflow / 10000000).toFixed(2)} Cr</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <span className="text-sm font-medium text-yellow-800">Unbilled Revenue (JMC Approved, Not Invoiced)</span>
                <span className="text-sm font-bold text-yellow-600">₹ {(data?.financialHealth.unbilledRevenue / 10000000).toFixed(2)} Cr</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-sm font-medium text-blue-800">Contractor Liability (Material Issued, Not JMC'd)</span>
                <span className="text-sm font-bold text-blue-600">₹ {(data?.financialHealth.contractorLiabilityValue / 10000000).toFixed(2)} Cr</span>
              </div>
            </div>
          </div>

          {/* Supply Chain Health */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-indigo-500" />
              Supply Chain Health
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm font-medium text-indigo-900">Total Inward Volume</span>
                <span className="text-sm font-bold text-indigo-700">{data?.supplyChain.totalInwardQty.toLocaleString()} Units</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm font-medium text-indigo-900">Material Issued to Site</span>
                <span className="text-sm font-bold text-indigo-700">{data?.supplyChain.totalIssuedQty.toLocaleString()} Units</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                <span className="text-sm font-medium text-orange-800">Aging Stock (&#62; 60 Days Old)</span>
                <span className="text-sm font-bold text-orange-600">{data?.supplyChain.agingInwardCount} Entries</span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk & Exceptions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Risks & Exceptions
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Aged MHROVs (&#62; 7 Days)</h4>
              {data?.risksAndExceptions.agedMhrovs.length === 0 ? (
                <p className="text-sm text-gray-500">No aged MHROVs found.</p>
              ) : (
                <ul className="space-y-2">
                  {data?.risksAndExceptions.agedMhrovs.map((m: any) => (
                    <li key={m.id} className="text-xs p-2 bg-red-50 text-red-800 rounded border border-red-100 flex justify-between">
                      <span>{m.reference} ({m.circle})</span>
                      <span className="font-bold">{m.daysPending} Days</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-3 border-b pb-2">Delayed Contractor Invoices (&#62; 30 Days)</h4>
              {data?.risksAndExceptions.delayedContractorInvoices.length === 0 ? (
                <p className="text-sm text-gray-500">No delayed invoices found.</p>
              ) : (
                <ul className="space-y-2">
                  {data?.risksAndExceptions.delayedContractorInvoices.map((i: any) => (
                    <li key={i.id} className="text-xs p-2 bg-red-50 text-red-800 rounded border border-red-100 flex justify-between">
                      <span>{i.reference}</span>
                      <span className="font-bold">₹ {(i.value / 100000).toFixed(2)} L ({i.daysPending} Days)</span>
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
