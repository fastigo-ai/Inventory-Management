"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Building, Package, Tag, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getDashboardSummary } from '@/features/dashboard/api/dashboard.api';

import { TopStockedItems } from '@/features/dashboard/components/TopStockedItems';
import { RecentActivity } from '@/features/dashboard/components/RecentActivity';
import { PendingActions } from '@/features/dashboard/components/PendingActions';
import { StockSummaryTable } from "@/features/store/components/StockSummaryTable";
import { getStockSummary } from "@/features/store/api/store.api";
import { useAuthStore } from '@/shared/store/auth.store';

export default function Home() {
  const { user } = useAuthStore();
  const isStoreManager = user?.role?.name === 'Store Manager';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock'>(
    isStoreManager ? 'stock' : 'dashboard'
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    // Only fetch dashboard data if not a store manager (since store managers don't use it)
    if (!isStoreManager) {
      const fetchData = async () => {
        try {
          const res = await getDashboardSummary();
          if (res.success) {
            setData(res.data);
          }
        } catch (err) {
          toast.error('Failed to load dashboard data');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isStoreManager]);

  useEffect(() => {
    // Force active tab to 'stock' if the role resolves dynamically to Store Manager
    if (isStoreManager && activeTab !== 'stock') {
      setActiveTab('stock');
    }
  }, [isStoreManager, activeTab]);

  useEffect(() => {
    if (activeTab === 'stock' && summaryData.length === 0) {
      fetchStockSummary();
    }
  }, [activeTab]);

  const fetchStockSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await getStockSummary({});
      setSummaryData(res.data || []);
    } catch (error) {
      console.error("Failed to fetch stock summary:", error);
    } finally {
      setSummaryLoading(false);
    }
  };
  return (
    <div className="flex flex-col min-h-full">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-4">
            <Image src="/logoholistic.png" alt="Holistic Logo" width={120} height={48} className="object-contain" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Holistic TechnoEngineer Pvt Ltd</h1>
              <p className="text-sm text-slate-500 mt-0.5">Developed by Fastigo AI</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-800">Fastigo Inventory helpline :<span className="font-bold">9599094941</span></p>
            <p className="text-[11px] font-medium text-slate-500 mt-1 uppercase tracking-wider">Mon - Fri • 9:00 AM - 7:00 PM • Toll Free</p>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-8 flex gap-8">
          {!isStoreManager && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 text-sm font-semibold transition-colors ${
                activeTab === 'dashboard' ? 'text-blue-600 border-b-[3px] border-blue-600' : 'text-slate-500 hover:text-slate-700 border-b-[3px] border-transparent'
              }`}
            >
              Dashboard
            </button>
          )}
          
          <button 
            onClick={() => setActiveTab('stock')}
            className={`pb-3 text-sm font-semibold transition-colors ${
              activeTab === 'stock' ? 'text-blue-600 border-b-[3px] border-blue-600' : 'text-slate-500 hover:text-slate-700 border-b-[3px] border-transparent'
            }`}
          >
            {isStoreManager ? 'Your Stock Ledger' : 'Stock Summary'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 flex gap-6 flex-1 bg-slate-50/50">
        
        {activeTab === 'dashboard' ? (
          <>
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              <div className="flex gap-6">
                <div className="flex-1 min-w-0">
                  <TopStockedItems items={data?.topStockedItems || []} />
                </div>
                <div className="flex-1 min-w-0">
                  <RecentActivity activities={data?.recentActivities || []} />
                </div>
              </div>
            </div>
            
            {/* Right Column (Sidebar of dashboard) */}
            <div className="w-[340px] shrink-0">
              <PendingActions summary={data?.summary || {}} />
            </div>
          </>
        ) : (
          <div className="flex-1 w-full max-w-[1400px] mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Circle Stock Summary</h2>
            </div>
            <StockSummaryTable data={summaryData} isLoading={summaryLoading} />
          </div>
        )}
        
      </div>
    </div>
  );
}
