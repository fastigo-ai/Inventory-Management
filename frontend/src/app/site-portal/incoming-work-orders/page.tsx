"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Layers, FileText, ChevronRight, CheckCircle } from 'lucide-react';
import { getContractorWorkOrders, updateContractorWorkOrderStatus } from '@/features/contractors/api/contractorWorkOrder.api';
import { toast } from 'sonner';

export default function IncomingWorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');

  const circles = ['Solan', 'Nahan', 'Rampur', 'Rohru'];

  const getDivisions = (circle: string) => {
    switch (circle?.toLowerCase()) {
      case 'nahan':
        return ['Nahan', 'Rajgarh', 'Poanta'];
      case 'solan':
        return ['Solan', 'Nalagarh', 'Baddhi', 'Parwahoo', 'Arki'];
      default:
        return [];
    }
  };

  const fetchWorkOrders = async () => {
    try {
      setIsLoading(true);
      const res = await getContractorWorkOrders({ 
        search, 
        circle: selectedCircle, 
        division: selectedDivision,
        status: 'Approved,Site Approved'
      });
      if (res.success) {
        setWorkOrders(res.data?.data || []);
      }
    } catch (error) {
      toast.error('Failed to load work orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [search, selectedCircle, selectedDivision]);

  const handleApprove = async (id: string) => {
    try {
      await updateContractorWorkOrderStatus(id, 'Site Approved');
      toast.success('Work Order approved successfully');
      fetchWorkOrders();
    } catch (e) {
      toast.error('Failed to approve Work Order');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-500" /> Incoming Work Orders
          </h1>
          <p className="text-slate-500 text-sm mt-1">Select a Circle and Division to view incoming work orders for your site.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-end">
        <div className="w-64">
          <label className="block text-[13px] font-semibold text-slate-800 mb-1">Circle</label>
          <select
            value={selectedCircle}
            onChange={(e) => {
              setSelectedCircle(e.target.value);
              setSelectedDivision(''); // Reset division when circle changes
            }}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
          >
            <option value="">All Circles</option>
            {circles.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <div className="w-64">
          <label className="block text-[13px] font-semibold text-slate-800 mb-1">Division</label>
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            disabled={!selectedCircle || getDivisions(selectedCircle).length === 0}
            className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="">All Divisions</option>
            {getDivisions(selectedCircle).map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] relative">
          <label className="block text-[13px] font-semibold text-slate-800 mb-1">Search</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search WO Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left">WO Number</th>
                <th className="px-6 py-4 text-left">Contractor</th>
                <th className="px-6 py-4 text-left">Location (Div/SubDiv)</th>
                <th className="px-6 py-4 text-left">Package / Circle</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading incoming work orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No incoming work orders found for the selected filters.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">
                      {wo.workOrderNumber}
                    </td>
                    <td className="px-6 py-4">
                      {wo.contractorId?.dynamicData?.companyName || wo.contractorId?.dynamicData?.displayName || wo.contractorId?.dynamicData?.contractorName || 'Unknown Contractor'}
                    </td>
                    <td className="px-6 py-4">
                      {wo.division || 'N/A'} <br />
                      <span className="text-xs text-slate-500">{wo.subDivision || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {wo.package} <br />
                      <span className="text-xs text-slate-500">{wo.circle}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(wo.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {wo.status === 'Approved' ? (
                        <button
                          onClick={() => handleApprove(wo._id)}
                          className="inline-flex items-center space-x-1 bg-white border border-green-200 text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve Work Order</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => router.push(`/site-portal/demand-notes/new?workOrderId=${wo._id}`)}
                          className="inline-flex items-center space-x-1 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Create Demand Note</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
