"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Edit, Trash2, Handshake, X, Printer, Columns, Check } from 'lucide-react';
import { api } from '@/shared/api/axios';
import { getContractorWorkOrderById, deleteContractorWorkOrder } from '@/features/contractors/api/contractorWorkOrder.api';
import { toast } from 'sonner';

const ResizableHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const [width, setWidth] = useState<string | number>('auto');
  const thRef = React.useRef<HTMLTableCellElement>(null);
  
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!thRef.current) return;
    
    const startX = e.pageX;
    const startWidth = thRef.current.getBoundingClientRect().width;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.pageX - startX);
      setWidth(Math.max(30, newWidth)); // Min width 30px so it can be collapsed almost entirely
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };
  
  return (
    <th 
      ref={thRef} 
      style={{ width, minWidth: width !== 'auto' ? width : undefined, maxWidth: width !== 'auto' ? width : undefined }} 
      className={`${className} relative group bg-white`}
    >
      <div className="overflow-hidden text-ellipsis whitespace-nowrap">
        {children}
      </div>
      <div 
        onMouseDown={startResize}
        className="absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize hover:bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Drag to resize"
      />
    </th>
  );
};

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
  
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    tempCode: true,
    activity: true,
    loaSrNo: true,
    description: true,
    unit: true,
    woQty: true,
    rate: true,
    amount: true,
    gstType: true,
    totalAmount: true
  });
  
  const toggleColumn = (col: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const fetchContractors = async () => {
    try {
      const res = await api.get('/contractors?limit=500');
      setContractors(Array.isArray(res.data.data) ? res.data.data : (res.data.data?.contractors || []));
    } catch (e) {
      toast.error('Failed to load contractors');
    }
  };

  const handleHandoverSubmit = async () => {
    try {
      setIsHandovering(true);
      const assignmentsArr = Object.entries(handoverAssignments).map(([idx, cId]) => ({
        itemIndex: Number(idx),
        contractorId: cId
      }));
      
      await api.post(`/ho-billing/contractor-work-orders/${workOrder._id}/handover`, {
        assignments: assignmentsArr,
        materialDisposition: 'TRANSFER_TO_NEW_CONTRACTOR'
      });
      toast.success('Handover successful');
      setIsHandoverModalOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to complete handover');
    } finally {
      setIsHandovering(false);
    }
  };
  
  const handleAssignmentChange = (index: number, cId: string) => {
    setHandoverAssignments(prev => ({ ...prev, [index]: cId }));
  };
  
  const handleAssignAll = (cId: string) => {
    const newAss: Record<number, string> = {};
    if (workOrder?.items) {
       workOrder.items.forEach((_: any, idx: number) => {
         newAss[idx] = cId;
       });
    }
    setHandoverAssignments(newAss);
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
            onClick={() => router.push(`/ho-billing/contractor-work-orders/${id}/print`)}
            className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 mr-2" /> Print
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
            <div className="text-sm font-medium text-slate-800">
              {workOrder.drawings?.map((d: any) => d.division).filter(Boolean).join(', ') || workOrder.division || 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Sub Division</label>
            <div className="text-sm font-medium text-slate-800">
              {workOrder.drawings?.map((d: any) => d.subDivision).filter(Boolean).join(', ') || workOrder.subDivision || 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">Location</label>
            <div className="text-sm font-medium text-slate-800">
              {workOrder.drawings?.map((d: any) => d.location).filter(Boolean).join(', ') || workOrder.location || 'N/A'}
            </div>
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
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-50 transition-colors"
              >
                <Columns className="w-4 h-4" />
                <span>Columns</span>
              </button>
              {showColumnDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowColumnDropdown(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-2">
                    {Object.entries({
                      tempCode: 'Temp Code',
                      activity: 'Activity',
                      loaSrNo: 'LOA Sr No',
                      description: 'Description',
                      unit: 'Unit',
                      woQty: 'WO Qty',
                      rate: 'Rate',
                      amount: 'Amount',
                      gstType: 'GST Type',
                      totalAmount: 'Total Amount'
                    }).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => toggleColumn(key as keyof typeof visibleColumns)}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                      >
                        <span>{label}</span>
                        {visibleColumns[key as keyof typeof visibleColumns] && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="text-sm font-bold text-indigo-700">
              Total WO Amount: ₹{workOrder.totalWoAmount?.toLocaleString() || 0}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead className="bg-white text-slate-500 text-[11px] uppercase tracking-wider font-medium border-b border-slate-200">
              <tr>
                {visibleColumns.tempCode && <ResizableHeader className="px-4 py-3 text-left">Temp Code</ResizableHeader>}
                {visibleColumns.activity && <ResizableHeader className="px-4 py-3 text-left">Activity</ResizableHeader>}
                {visibleColumns.loaSrNo && <ResizableHeader className="px-4 py-3 text-left">LOA Sr No</ResizableHeader>}
                {visibleColumns.description && <ResizableHeader className="px-4 py-3 text-left">Description</ResizableHeader>}
                {visibleColumns.unit && <ResizableHeader className="px-4 py-3 text-left">Unit</ResizableHeader>}
                {visibleColumns.woQty && <ResizableHeader className="px-4 py-3 text-right text-indigo-600">WO Qty</ResizableHeader>}
                {visibleColumns.rate && <ResizableHeader className="px-4 py-3 text-right text-indigo-600">Rate</ResizableHeader>}
                {visibleColumns.amount && <ResizableHeader className="px-4 py-3 text-right">Amount</ResizableHeader>}
                {visibleColumns.gstType && <ResizableHeader className="px-4 py-3 text-left">GST Type</ResizableHeader>}
                {visibleColumns.totalAmount && <ResizableHeader className="px-4 py-3 text-right">Total Amount</ResizableHeader>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {(() => {
                // Filter out items with woQty === 0 and group by activity
                const filteredItems = (workOrder.items || []).filter((i: any) => Number(i.woQty) > 0);
                let currentActivity = '';
                
                return filteredItems.length > 0 ? (
                  filteredItems.map((item: any, index: number) => {
                    let isNewGroup = false;
                    if (item.activity !== currentActivity) {
                      isNewGroup = true;
                      currentActivity = item.activity;
                    }
                    
                    return (
                      <React.Fragment key={index}>
                        {isNewGroup && (
                          <tr className="bg-indigo-50/80 border-y border-indigo-100/50">
                            <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-4 py-2 font-bold text-indigo-900 text-xs tracking-wide uppercase">
                              {currentActivity || 'Uncategorized Activity'}
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50 transition-colors">
                          {visibleColumns.tempCode && <td className="px-4 py-3 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">{item.tempCode || 'N/A'}</td>}
                          {visibleColumns.activity && <td className="px-4 py-3 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis" title={item.activity}>{item.activity || 'N/A'}</td>}
                          {visibleColumns.loaSrNo && <td className="px-4 py-3 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">{item.loaSrNo || 'N/A'}</td>}
                          {visibleColumns.description && <td className="px-4 py-3 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis" title={item.description}>{item.description || 'N/A'}</td>}
                          {visibleColumns.unit && <td className="px-4 py-3 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">{item.unit || 'N/A'}</td>}
                          {visibleColumns.woQty && <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">{item.woQty || 0}</td>}
                          {visibleColumns.rate && <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">₹{item.contractorErectionRate || 0}</td>}
                          {visibleColumns.amount && <td className="px-4 py-3 text-right text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">₹{item.amount?.toLocaleString() || 0}</td>}
                          {visibleColumns.gstType && <td className="px-4 py-3 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">{item.gstType || 'N/A'}</td>}
                          {visibleColumns.totalAmount && <td className="px-4 py-3 text-right font-bold text-indigo-700 bg-indigo-50/20 whitespace-nowrap overflow-hidden text-ellipsis">
                            ₹{item.totalAmount?.toLocaleString() || 0}
                          </td>}
                        </tr>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center text-slate-500">
                      No items with a Work Order quantity greater than 0 were found.
                    </td>
                  </tr>
                );
              })()}
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
