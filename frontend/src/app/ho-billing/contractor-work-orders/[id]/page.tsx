"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Edit, Trash2 } from 'lucide-react';
import { getContractorWorkOrderById, deleteContractorWorkOrder } from '@/features/contractors/api/contractorWorkOrder.api';
import { toast } from 'sonner';

export default function ContractorWorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWO = async () => {
      try {
        setIsLoading(true);
        const res = await getContractorWorkOrderById(id as string);
        if (res.success && res.data) {
          setWorkOrder(res.data);
        } else {
          toast.error('Failed to fetch work order details');
        }
      } catch (error) {
        toast.error('Failed to fetch work order details');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchWO();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this work order?')) return;
    try {
      await deleteContractorWorkOrder(id as string);
      toast.success('Work order deleted successfully');
      router.push('/ho-billing/contractor-work-orders');
    } catch (error) {
      toast.error('Failed to delete work order');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-6 text-center text-slate-500">
        Work Order not found.
      </div>
    );
  }

  return (
    <div className="p-6 pb-24 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              Work Order: <span className="text-indigo-600">{workOrder.workOrderNumber}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ml-2 ${
                workOrder.status === 'Approved' ? 'bg-green-100 text-green-800' :
                workOrder.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {workOrder.status}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Created on {new Date(workOrder.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.push(`/ho-billing/contractor-work-orders/${id}/edit`)}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" /> Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Package</label>
            <div className="text-sm font-medium text-slate-800">{workOrder.package || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Circle</label>
            <div className="text-sm font-medium text-slate-800">{workOrder.circle || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Contractor</label>
            <div className="text-sm font-medium text-slate-800">
              {workOrder.contractorId?.dynamicData?.companyName || workOrder.contractorId?.dynamicData?.displayName || workOrder.contractorId?.dynamicData?.contractorName || 'Unknown Contractor'}
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Division</label>
            <div className="text-sm font-medium text-slate-800">{workOrder.division || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Sub Division</label>
            <div className="text-sm font-medium text-slate-800">{workOrder.subDivision || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Location</label>
            <div className="text-sm font-medium text-slate-800">{workOrder.location || 'N/A'}</div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Remarks</label>
            <div className="text-sm font-medium text-slate-800">{workOrder.remarks || 'None'}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-800">Work Order Items</h2>
          <div className="text-sm font-bold text-indigo-700">
            Total WO Amount: ₹{workOrder.totalWoAmount?.toLocaleString() || 0}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-white text-slate-500 text-[11px] uppercase tracking-wider font-medium border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">Temp Code</th>
                <th className="px-4 py-3 text-left">Activity</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">LOA Sr No</th>
                <th className="px-4 py-3 text-left max-w-[200px]">Description</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-right text-indigo-600 whitespace-nowrap">WO Qty</th>
                <th className="px-4 py-3 text-right text-indigo-600">Rate</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">GST Type</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {workOrder.items && workOrder.items.length > 0 ? (
                workOrder.items.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{item.tempCode || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-700 truncate max-w-[150px]" title={item.activity}>{item.activity || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-700">{item.loaSrNo || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-700 truncate max-w-[200px]" title={item.description}>{item.description || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-700">{item.unit || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{item.woQty || 0}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">₹{item.contractorErectionRate || 0}</td>
                    <td className="px-4 py-3 text-right text-slate-800">₹{item.amount?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 text-slate-700">{item.gstType || 'N/A'}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-700 bg-indigo-50/20">
                      ₹{item.totalAmount?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-500">
                    No items found in this work order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
