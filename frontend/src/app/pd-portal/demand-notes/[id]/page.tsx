"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, FileText, CheckCircle, AlertCircle, Edit, Printer, Building2 } from 'lucide-react';
import { getStockSummary } from '@/features/store/api/store.api';
import { getDemandNoteById, updateDemandNote } from '@/features/site-portal/api/demand-notes.api';
import { toast } from 'sonner';
import { DocumentAttachment } from '@/shared/components/DocumentAttachment';
import { AuditTimeline } from '@/shared/components/audit/AuditTimeline';

export default function DemandNoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const [demandNote, setDemandNote] = useState<any>(null);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchDemandNote = async () => {
    try {
      setIsLoading(true);
      const res = await getDemandNoteById(id as string);
      if (res.success && res.data?.demandNote) {
        setDemandNote(res.data.demandNote);
        const circle = res.data.demandNote.circle;
        const contractorId = typeof res.data.demandNote.contractor === 'object' 
          ? res.data.demandNote.contractor?._id 
          : res.data.demandNote.contractor;
        const contractorName = res.data.demandNote.contractorName;
          
        if (circle) {
          try {
            const stockRes = await getStockSummary({ circle, contractorId, contractorName });
            if (stockRes.success && stockRes.data) {
              setStockSummary(stockRes.data);
            }
          } catch (err) {
            console.error('Failed to fetch stock', err);
          }
        }
      } else {
        toast.error('Failed to fetch Demand Note details');
      }
    } catch (error) {
      toast.error('Failed to fetch Demand Note details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDemandNote();
  }, [id]);

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      const res = await updateDemandNote(demandNote._id, { status: 'Approved' });
      if (res.success) {
        toast.success('Demand Note approved successfully');
        fetchDemandNote();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve demand note');
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionRemarks.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      setIsRejecting(true);
      const res = await updateDemandNote(demandNote._id, { status: 'Rejected', rejectionRemarks });
      if (res.success) {
        toast.success('Demand Note rejected successfully');
        setIsRejectModalOpen(false);
        fetchDemandNote();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject demand note');
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseStyle = "px-2.5 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5";
    switch (status) {
      case 'Draft': return <span className={`${baseStyle} bg-slate-100 text-slate-700 border-slate-200`}><AlertCircle className="w-3 h-3"/> {status}</span>;
      case 'Pending Approval':
      case 'Pending PM Approval': 
      case 'Pending PD Approval': return <span className={`${baseStyle} bg-amber-100 text-amber-700 border-amber-200`}><AlertCircle className="w-3 h-3"/> {status}</span>;
      case 'Approved': return <span className={`${baseStyle} bg-emerald-100 text-emerald-700 border-emerald-200`}><CheckCircle className="w-3 h-3"/> {status}</span>;
      case 'Rejected': return <span className={`${baseStyle} bg-red-100 text-red-700 border-red-200`}><AlertCircle className="w-3 h-3"/> {status}</span>;
      case 'Fulfilled': return <span className={`${baseStyle} bg-blue-100 text-blue-700 border-blue-200`}><CheckCircle className="w-3 h-3"/> {status}</span>;
      default: return <span className={`${baseStyle} bg-slate-100 text-slate-700 border-slate-200`}>{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!demandNote) {
    return (
      <div className="p-6 text-center text-slate-500">
        Demand Note not found.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-500 hidden sm:block" /> 
                {demandNote.demandNoteNumber}
              </h1>
              {getStatusBadge(demandNote.status)}
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              Created on <span className="font-medium text-slate-700">{new Date(demandNote.createdAt).toLocaleDateString()}</span>
              {demandNote.createdBy && (
                <>
                  <span className="text-slate-300">•</span>
                  Created By <span className="font-medium text-slate-700">{demandNote.createdBy.firstName} {demandNote.createdBy.lastName}</span>
                </>
              )}
              {demandNote.pmApprovedBy && (
                <>
                  <span className="text-slate-300">•</span>
                  PM Approved By <span className="font-medium text-slate-700">{demandNote.pmApprovedBy.firstName} {demandNote.pmApprovedBy.lastName}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {demandNote.status === 'Pending PD Approval' && (
            <>
              <button
                onClick={() => setIsRejectModalOpen(true)}
                className="flex items-center px-4 py-2 bg-red-600 rounded-lg text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
              >
                <AlertCircle className="w-4 h-4 mr-2" /> Reject
              </button>
              <button
                onClick={handleApprove}
                className="flex items-center px-4 py-2 bg-purple-600 rounded-lg text-sm font-semibold text-white hover:bg-purple-700 transition-colors shadow-sm cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Grant Final PD Approval
              </button>
            </>
          )}
          <button
            onClick={() => window.open(`/pd-portal/demand-notes/${demandNote._id}/print`, '_blank')}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </button>
        </div>
      </div>

      {/* Approval Audit Trail Timeline Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Approval Lifecycle & Audit Trail</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Step 1: Requisition */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">1. Site Requisition</p>
              <p className="text-xs text-slate-600 font-medium">
                {demandNote.createdBy ? `${demandNote.createdBy.firstName} ${demandNote.createdBy.lastName}` : 'Site Engineer'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{new Date(demandNote.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {/* Step 2: PM Approval */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            demandNote.pmApprovedBy 
              ? 'bg-emerald-50/70 border-emerald-200/80' 
              : 'bg-amber-50/70 border-amber-200/80'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              demandNote.pmApprovedBy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {demandNote.pmApprovedBy ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">2. PM Approval</p>
              {demandNote.pmApprovedBy ? (
                <>
                  <p className="text-xs text-emerald-800 font-semibold">
                    {demandNote.pmApprovedBy.firstName} {demandNote.pmApprovedBy.lastName}
                  </p>
                  {demandNote.pmApprovedAt && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(demandNote.pmApprovedAt).toLocaleString()}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-amber-700 font-medium">Pending PM Review</p>
              )}
            </div>
          </div>

          {/* Step 3: PD Approval */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            demandNote.pdApprovedBy 
              ? 'bg-emerald-50/70 border-emerald-200/80' 
              : demandNote.status === 'Pending PD Approval'
              ? 'bg-purple-50/70 border-purple-200/80'
              : 'bg-slate-50 border-slate-200/70'
          }`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              demandNote.pdApprovedBy 
                ? 'bg-emerald-100 text-emerald-700' 
                : demandNote.status === 'Pending PD Approval'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-slate-200 text-slate-500'
            }`}>
              {demandNote.pdApprovedBy ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">3. PD Final Sign-Off</p>
              {demandNote.pdApprovedBy ? (
                <>
                  <p className="text-xs text-emerald-800 font-semibold">
                    {demandNote.pdApprovedBy.firstName} {demandNote.pdApprovedBy.lastName}
                  </p>
                  {demandNote.pdApprovedAt && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(demandNote.pdApprovedAt).toLocaleString()}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-purple-700 font-medium">
                  {demandNote.status === 'Pending PD Approval' ? 'Awaiting Your Sign-Off' : 'Pending Previous Steps'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" /> Project Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Contractor</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.contractorName || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Town / Circle</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.circle || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Store Address</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.division || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Location</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.location || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" /> Additional Info
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Package</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.package || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Status</span>
              <span className="col-span-2">{getStatusBadge(demandNote.status)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Remarks</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.remarks || 'No remarks provided'}</span>
            </div>
            {demandNote.status === 'Rejected' && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                <span className="text-sm text-slate-500">Rejection Reason</span>
                <span className="col-span-2 text-sm font-medium text-red-600">{demandNote.rejectionRemarks || 'No reason provided'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Requested Items</h2>
          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
            {demandNote.items?.length || 0} Items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-6 py-4">Sr No</th>
                <th className="px-6 py-4">Material Code</th>
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4">LOA Sr No</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4 text-center">In Stock</th>
                <th className="px-6 py-4 text-center">Till Issued</th>
                <th className="px-6 py-4 text-center">Consumption</th>
                <th className="px-6 py-4 text-center">JMC Done</th>
                <th className="px-6 py-4 font-bold text-indigo-700 bg-indigo-50/50">Demand Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demandNote.items && demandNote.items.length > 0 ? (
                demandNote.items.map((item: any, idx: number) => {
                  const stockMatch = stockSummary.find(s => {
                    if (item.tempCode && s.tempCode && String(item.tempCode).trim() === String(s.tempCode).trim()) {
                      return true;
                    }
                    return String(s.loaSrNo) === String(item.loaSrNo) && 
                           String(s.activity) === String(item.activity) && 
                           (s.description === item.itemName || s.itemName === item.itemName);
                  });
                  const inStock = stockMatch ? stockMatch.totalBalanceQty : 0;
                  const tillIssued = stockMatch ? stockMatch.contractorsActualIssued : 0;
                  const consumption = stockMatch ? (stockMatch.wipConsumed || stockMatch.consumedQty || 0) : 0;
                  const jmcDone = stockMatch ? (stockMatch.jmcDone || 0) : 0;
                  return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{item.tempCode || '-'}</td>
                    <td className="px-6 py-4 text-slate-700 max-w-sm truncate" title={item.itemName}>{item.itemName}</td>
                    <td className="px-6 py-4 text-slate-500">{item.activity || '-'}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{item.loaSrNo || '-'}</td>
                    <td className="px-6 py-4 text-slate-500">{item.unit || '-'}</td>
                    <td className="px-6 py-4 text-center font-medium text-emerald-600">{inStock}</td>
                    <td className="px-6 py-4 text-center font-medium text-blue-600">{tillIssued}</td>
                    <td className="px-6 py-4 text-center font-medium text-orange-600">{consumption}</td>
                    <td className="px-6 py-4 text-center font-medium text-purple-600">{jmcDone}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600 bg-indigo-50/30">{item.demandQty}</td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-slate-500">
                    No items in this Demand Note.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Attachment */}
      {demandNote.locationDrawingUrl && (
        <DocumentAttachment url={demandNote.locationDrawingUrl} label="Location Drawing / Attached Document" />
      )}

      {/* Full Audit Log */}
      <AuditTimeline entityType="DemandNote" entityId={demandNote._id} />

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">Reject Demand Note</h3>
              <p className="text-sm text-slate-500 mt-1">Please provide a reason for rejecting this demand note.</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Rejection Remarks <span className="text-red-500">*</span></label>
              <textarea
                value={rejectionRemarks}
                onChange={(e) => setRejectionRemarks(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors text-sm"
                rows={4}
                placeholder="Enter remarks..."
                required
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={isRejecting}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
