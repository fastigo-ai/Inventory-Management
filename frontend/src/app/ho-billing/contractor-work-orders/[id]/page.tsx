"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Edit, Trash2, Handshake, X } from 'lucide-react';
import { api } from '@/shared/api/axios';
import { getContractorWorkOrderById, deleteContractorWorkOrder } from '@/features/contractors/api/contractorWorkOrder.api';
import { toast } from 'sonner';

export default function ContractorWorkOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [contractors, setContractors] = useState<any[]>([]);
  const [handoverAssignments, setHandoverAssignments] = useState<Record<number, string>>({});
  const [isHandovering, setIsHandovering] = useState(false);

  const fetchContractors = async () => {
    try {
      const res = await api.get('/contractors?limit=500');
      setContractors(Array.isArray(res.data.data) ? res.data.data : (res.data.data?.contractors || []));
    } catch (e) {
      toast.error('Failed to load contractors');
    }
  };

  const handleHandoverSubmit = async () => {
    if (!handoverContractorId) return toast.error('Please select a new contractor');
    setIsHandovering(true);
    try {
      await api.post(`/contractor-work-orders/${id}/handover`, {
        newContractorId: handoverContractorId,
        materialDisposition: 'TRANSFER_TO_NEW_CONTRACTOR'
      });
      toast.success('Handover successful! Drafts created.');
      setIsHandoverModalOpen(false);
      window.location.reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to process handover');
    } finally {
      setIsHandovering(false);
    }
  };

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
          {workOrder.handoverStatus === 'Active' && (
            <button
              onClick={() => {
                fetchContractors();
                setIsHandoverModalOpen(true);
              }}
              className="flex items-center px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <Handshake className="w-4 h-4 mr-2" /> Handover
            </button>
          )}
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

      {/* Handover Modal */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Handshake className="w-5 h-5 text-indigo-600" /> Handover to New Contractors
              </h3>
              <button onClick={() => setIsHandoverModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[13px] text-amber-800">
                <span className="font-bold">Note:</span> The old contractor's unerected liability will be calculated and pushed to a Draft Return. 
                Any assigned items will generate separate Work Orders (with the same WO Number) and Demand Notes for the selected contractors.
                Unassigned items will be abandoned.
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <span className="text-sm font-semibold text-slate-700">Quick Assign All:</span>
                 <select
                    onChange={(e) => handleAssignAll(e.target.value)}
                    className="h-9 bg-white border border-slate-300 rounded-md px-3 text-sm focus:outline-none focus:border-indigo-500"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select Contractor to assign to all --</option>
                    {contractors.map((c) => (
                      <option key={c._id} value={c._id}>{c.dynamicData?.companyName || 'Unknown'}</option>
                    ))}
                 </select>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 text-left">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Temp Code</th>
                      <th className="px-4 py-2 font-semibold">Activity</th>
                      <th className="px-4 py-2 font-semibold">Description</th>
                      <th className="px-4 py-2 font-semibold w-1/3">Assign To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workOrder.items?.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{item.tempCode || 'N/A'}</td>
                        <td className="px-4 py-2 text-slate-700 font-medium">{item.activity || 'N/A'}</td>
                        <td className="px-4 py-2 text-slate-500 text-xs truncate max-w-[200px]" title={item.description}>{item.description || 'N/A'}</td>
                        <td className="px-4 py-2">
                           <select
                              value={handoverAssignments[index] || ''}
                              onChange={(e) => handleAssignmentChange(index, e.target.value)}
                              className="w-full h-8 bg-white border border-slate-300 rounded-md px-2 text-xs focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">-- Unassigned (Abandon) --</option>
                              {contractors.map((c) => (
                                <option key={c._id} value={c._id}>{c.dynamicData?.companyName || 'Unknown'}</option>
                              ))}
                           </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsHandoverModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleHandoverSubmit}
                disabled={isHandovering || Object.keys(handoverAssignments).length === 0}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isHandovering ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Confirm Handover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
