"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter } from 'lucide-react';
import { getContractorWorkOrders } from '@/features/contractors/api/contractorWorkOrder.api';
import { toast } from 'sonner';

export default function ContractorWorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchWorkOrders = async () => {
    try {
      setIsLoading(true);
      const res = await getContractorWorkOrders({ search });
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
  }, [search]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Contractor Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track work orders assigned to contractors</p>
        </div>
        <button
          onClick={() => router.push('/ho-billing/contractor-work-orders/new')}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Work Order</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search WO Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <button className="flex items-center space-x-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium">WO Number</th>
                <th className="px-6 py-3 text-left font-medium">Contractor</th>
                <th className="px-6 py-3 text-left font-medium">Package / Circle</th>
                <th className="px-6 py-3 text-left font-medium">Activity</th>
                <th className="px-6 py-3 text-left font-medium">Total Amount</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading work orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No work orders found. Create one to get started.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">
                      {wo.workOrderNumber}
                    </td>
                    <td className="px-6 py-4">
                      {wo.contractorId?.dynamicData?.displayName || wo.contractorId?.dynamicData?.companyName || 'Unknown Contractor'}
                    </td>
                    <td className="px-6 py-4">
                      {wo.package} <br />
                      <span className="text-xs text-slate-500">{wo.circle}</span>
                    </td>
                    <td className="px-6 py-4">
                      {wo.activities && wo.activities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {wo.activities.map((act: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs truncate max-w-[150px]" title={act}>
                              {act}
                            </span>
                          ))}
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      ₹{wo.totalWoAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        wo.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        wo.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(wo.createdAt).toLocaleDateString()}
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
