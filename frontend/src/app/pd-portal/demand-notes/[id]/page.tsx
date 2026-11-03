"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Edit,
  Printer,
  Building2,
  RotateCcw,
  Ban,
  AlertTriangle
} from 'lucide-react';
import { getStockSummary } from '@/features/store/api/store.api';
import { getContractorActivitySummary, getContractors } from '@/features/contractors/api/contractors.api';
import {
  getDemandNoteById,
  updateDemandNote,
  revokeDemandNote,
  cancelDemandNote,
  getDemandNoteIssuanceStatus
} from '@/features/site-portal/api/demand-notes.api';
import { toast } from 'sonner';
import { DocumentAttachment } from '@/shared/components/DocumentAttachment';
import { AuditTimeline } from '@/shared/components/audit/AuditTimeline';
import { useStickyColumnResize } from '@/shared/hooks/useStickyColumnResize';
import { DataTable } from '@/shared/components/ui/data-table';
import { getDemandNoteColumns } from '@/features/site-portal/components/demand-note-columns';

export default function DemandNoteDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  
  useStickyColumnResize();
  
  const [demandNote, setDemandNote] = useState<any>(null);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [activitySummary, setActivitySummary] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Rejection Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Revocation Modal (SAP MM Revoke / Send Back for Revision)
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [correctionRemarks, setCorrectionRemarks] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  // Cancellation Modal (SAP Deletion / Void)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationRemarks, setCancellationRemarks] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Material issuance tracking
  const [issuanceInfo, setIssuanceInfo] = useState<{ isIssued: boolean; reason?: string } | null>(null);

  const fetchDemandNote = async () => {
    try {
      setIsLoading(true);
      const res = await getDemandNoteById(id as string);
      if (res.success && res.data?.demandNote) {
        setDemandNote(res.data.demandNote);
        const circle = res.data.demandNote.circle;
        let contractorId = typeof res.data.demandNote.contractor === 'object' 
          ? res.data.demandNote.contractor?._id 
          : res.data.demandNote.contractor;
        const contractorName = res.data.demandNote.contractorName;
        
        if (!contractorId && contractorName) {
          try {
            const contractorsList = await getContractors(undefined, contractorName);
            if (contractorsList?.data?.length > 0) {
              contractorId = contractorsList.data[0]._id;
            }
          } catch(e) {
            console.error('Failed to resolve contractor ID', e);
          }
        }
          
        if (circle) {
          try {
            const [stockRes, actRes] = await Promise.all([
              getStockSummary({ circle, contractorId, contractorName }),
              contractorId ? getContractorActivitySummary(contractorId) : Promise.resolve({ data: {} })
            ]);
            if (actRes?.data) setActivitySummary(actRes.data);
            if (stockRes.success && stockRes.data) {
              setStockSummary(stockRes.data);
            }
          } catch (err) {
            console.error('Failed to fetch stock', err);
          }
        }

        // Fetch store issuance status
        try {
          const issueRes = await getDemandNoteIssuanceStatus(id as string);
          if (issueRes?.success && issueRes.data) {
            setIssuanceInfo(issueRes.data);
          }
        } catch (e) {
          console.error('Failed to check issuance status', e);
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

  const handleRevoke = async () => {
    if (!correctionRemarks.trim()) {
      toast.error('Please provide correction remarks for revision');
      return;
    }
    try {
      setIsRevoking(true);
      const res = await revokeDemandNote(demandNote._id, correctionRemarks.trim());
      if (res.success) {
        toast.success('Demand Note revoked and sent back for revision successfully');
        setIsRevokeModalOpen(false);
        setCorrectionRemarks('');
        fetchDemandNote();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to revoke Demand Note');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationRemarks.trim()) {
      toast.error('Please provide cancellation remarks');
      return;
    }
    try {
      setIsCancelling(true);
      const res = await cancelDemandNote(demandNote._id, cancellationRemarks.trim());
      if (res.success) {
        toast.success('Demand Note cancelled and voided successfully');
        setIsCancelModalOpen(false);
        setCancellationRemarks('');
        fetchDemandNote();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel Demand Note');
    } finally {
      setIsCancelling(false);
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
      case 'Revision Required': return <span className={`${baseStyle} bg-amber-50 text-amber-800 border-amber-300`}><RotateCcw className="w-3 h-3 text-amber-600"/> Revision Required</span>;
      case 'Cancelled': return <span className={`${baseStyle} bg-rose-50 text-rose-700 border-rose-200`}><Ban className="w-3 h-3 text-rose-600"/> Cancelled</span>;
      case 'Rejected': return <span className={`${baseStyle} bg-red-100 text-red-700 border-red-200`}><AlertCircle className="w-3 h-3"/> {status}</span>;
      case 'Fulfilled': return <span className={`${baseStyle} bg-blue-100 text-blue-700 border-blue-200`}><CheckCircle className="w-3 h-3"/> {status}</span>;
      default: return <span className={`${baseStyle} bg-slate-100 text-slate-700 border-slate-200`}>{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0"></div>
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-200 rounded"></div>
              <div className="h-4 w-64 bg-slate-200 rounded"></div>
            </div>
          </div>
          <div className="flex space-x-3">
            <div className="w-24 h-10 bg-slate-200 rounded-lg"></div>
            <div className="w-24 h-10 bg-slate-200 rounded-lg"></div>
          </div>
        </div>

        {/* Audit Trail Skeleton */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="h-4 w-48 bg-slate-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-200 h-20 bg-slate-50"></div>
            <div className="p-3.5 rounded-xl border border-slate-200 h-20 bg-slate-50"></div>
            <div className="p-3.5 rounded-xl border border-slate-200 h-20 bg-slate-50"></div>
          </div>
        </div>

        {/* Details Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
            <div className="h-4 w-full bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-200 rounded"></div>
            <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded mb-4"></div>
            <div className="h-4 w-full bg-slate-200 rounded"></div>
            <div className="h-4 w-full bg-slate-200 rounded"></div>
            <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 w-32 bg-slate-200 rounded"></div>
            <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
          </div>
          <div className="space-y-3">
            <div className="h-10 w-full bg-slate-200 rounded"></div>
            <div className="h-12 w-full bg-slate-100 rounded"></div>
            <div className="h-12 w-full bg-slate-100 rounded"></div>
            <div className="h-12 w-full bg-slate-100 rounded"></div>
          </div>
        </div>
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
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 cursor-pointer">
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
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              Created on <span className="font-medium text-slate-700">{new Date(demandNote.createdAt).toLocaleDateString()}</span>
              <span className="text-slate-300">•</span>
              Created By <span className="font-medium text-slate-700">
                {demandNote.authorizedByEngineer || (demandNote.createdBy ? `${demandNote.createdBy.firstName} ${demandNote.createdBy.lastName}` : 'Site Engineer')}
              </span>
              {demandNote.pmApprovedBy && (
                <>
                  <span className="text-slate-300">•</span>
                  PM Approved By <span className="font-medium text-slate-700">{demandNote.pmApprovedBy.firstName} {demandNote.pmApprovedBy.lastName}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
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

          {/* SAP MM Operations: Revoke for Revision or Cancel/Void */}
          {demandNote.status === 'Approved' && (
            <>
              {issuanceInfo?.isIssued ? (
                <div
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold"
                  title={issuanceInfo.reason || 'Material already issued from store'}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Material Issued (Revocation Locked)
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setCorrectionRemarks('');
                      setIsRevokeModalOpen(true);
                    }}
                    className="flex items-center px-4 py-2 bg-amber-500 rounded-lg text-sm font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm cursor-pointer"
                    title="Send back to Site Engineer for corrections. Previous approvals will reset."
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Revoke for Revision
                  </button>
                  <button
                    onClick={() => {
                      setCancellationRemarks('');
                      setIsCancelModalOpen(true);
                    }}
                    className="flex items-center px-4 py-2 bg-rose-600 rounded-lg text-sm font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
                    title="Void this demand note completely and release work order demands"
                  >
                    <Ban className="w-4 h-4 mr-2" /> Cancel / Void
                  </button>
                </>
              )}
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

      {/* SAP Status Notification Banners */}
      {demandNote.status === 'Revision Required' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-xs flex items-start gap-3">
          <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">Revoked for Revision</h4>
            <p className="text-xs text-amber-800 mt-1">
              This Demand Note was revoked and sent back to the site team for correction. Once edited and saved, it will require PM and PD approvals again.
            </p>
            {demandNote.revocationRemarks && (
              <div className="mt-2 p-2.5 bg-white/80 rounded-lg border border-amber-200 text-xs text-amber-900">
                <span className="font-semibold">Correction Remarks:</span> {demandNote.revocationRemarks}
              </div>
            )}
          </div>
        </div>
      )}

      {demandNote.status === 'Cancelled' && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl shadow-xs flex items-start gap-3">
          <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-900">Cancelled / Voided Demand Note</h4>
            <p className="text-xs text-rose-800 mt-1">
              This Demand Note has been cancelled and voided. All work order demanded quantities have been released back.
            </p>
            {demandNote.cancellationRemarks && (
              <div className="mt-2 p-2.5 bg-white/80 rounded-lg border border-rose-200 text-xs text-rose-900">
                <span className="font-semibold">Cancellation Remarks:</span> {demandNote.cancellationRemarks}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval Audit Trail Timeline Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Approval Lifecycle & Audit Trail</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Step 1: Requisition */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">1. Site Requisition</p>
              <p className="text-xs text-slate-600 font-medium">
                {demandNote.authorizedByEngineer || (demandNote.createdBy ? `${demandNote.createdBy.firstName} ${demandNote.createdBy.lastName}` : 'Site Engineer')}
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

          {/* Step 4: Revocation / Cancellation Status (if applicable) */}
          {demandNote.revokedBy && (
            <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">4. Revocation for Revision</p>
                <p className="text-xs text-amber-900 font-semibold">
                  {demandNote.revokedBy.firstName} {demandNote.revokedBy.lastName}
                </p>
                {demandNote.revokedAt && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{new Date(demandNote.revokedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}

          {demandNote.cancelledBy && (
            <div className="p-3.5 rounded-xl border border-rose-300 bg-rose-50/70 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Voided / Cancelled</p>
                <p className="text-xs text-rose-900 font-semibold">
                  {demandNote.cancelledBy.firstName} {demandNote.cancelledBy.lastName}
                </p>
                {demandNote.cancelledAt && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{new Date(demandNote.cancelledAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
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
              <span className="text-sm text-slate-500">Package</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.package}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Circle</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.circle}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Sub Circle</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.subcircle || '-'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" /> Location & Tracking
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Division</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.division || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Sub Division</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.subDivision || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Location</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.location || '-'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-sm text-slate-500">Drawing / Scheme</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.drawingNumber || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Requested Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Requested Items</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
            {demandNote.items?.length || 0} Items
          </span>
        </div>

        {(() => {
          let tableData: any[] = [];
          if (demandNote && demandNote.items) {
            const grouped = demandNote.items.reduce((acc: any, item: any, originalIdx: number) => {
              const act = item.activity || 'General';
              if (!acc[act]) acc[act] = [];
              acc[act].push({ ...item, originalIdx });
              return acc;
            }, {});

            Object.entries(grouped).forEach(([activityName, activityItems]: [string, any]) => {
              tableData.push({
                isGroupRow: true,
                activityName: activityName,
                itemCount: activityItems.length
              });

              activityItems.forEach((item: any) => {
                const stockItem = stockSummary.find((s: any) => 
                  s.tempCode === item.tempCode || s.itemName === item.itemName
                );
                const currentStock = stockItem ? (stockItem.goodStock || stockItem.currentStock || 0) : (item.stockBal || 0);
                
                const itemActSummary = activitySummary[item.activity] || {};
                const circleLoaQty = item.circleLoaQty !== undefined ? item.circleLoaQty : (itemActSummary.loaQty || 0);
                const invoiceQty = item.circleBomQty !== undefined ? item.circleBomQty : (itemActSummary.invoiceQty || 0);
                const tillIssued = item.alreadyIssuedQty !== undefined ? item.alreadyIssuedQty : (itemActSummary.issuedQty || 0);
                const consumption = item.wipQty !== undefined ? item.wipQty : (itemActSummary.consumption || 0);
                const jmcDone = item.jmcQty !== undefined ? item.jmcQty : (itemActSummary.jmcDone || 0);
                const contractorBalance = tillIssued - consumption;

                tableData.push({
                  isGroupRow: false,
                  originalIdx: item.originalIdx,
                  tempCode: item.tempCode,
                  materialCode: item.tempCode,
                  itemName: item.itemName,
                  activity: item.activity,
                  loaSrNo: item.loaSrNo,
                  circleLoaQty: circleLoaQty,
                  invoiceQty: invoiceQty,
                  unit: item.unit,
                  inStock: currentStock,
                  tillIssued: tillIssued,
                  consumption: consumption,
                  jmcDone: jmcDone,
                  contractorBalance: contractorBalance,
                  demandQty: item.demandQty
                });
              });
            });
          }
          
          return (
            <DataTable 
              columns={getDemandNoteColumns()} 
              data={tableData} 
              isLoading={isLoading}
              initialPinning={{ left: ["originalIdx", "tempCode", "itemName", "activity", "loaSrNo"] }}
            />
          );
        })()}
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
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                disabled={isRejecting}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting || !rejectionRemarks.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revocation Modal (SAP MM Revoke for Revision) */}
      {isRevokeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" /> Revoke Demand Note for Revision
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Moves status to <strong>Revision Required</strong> and resets approvals. The site engineer will be able to edit items/details and resubmit for fresh PM and PD sign-off.
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Correction Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                value={correctionRemarks}
                onChange={(e) => setCorrectionRemarks(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-colors text-sm"
                rows={4}
                placeholder="Specify what needs to be corrected by the site engineer..."
                required
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsRevokeModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                disabled={isRevoking}
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={isRevoking || !correctionRemarks.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isRevoking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm & Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal (SAP Deletion / Void) */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" /> Cancel & Void Demand Note
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Permanently cancels this Demand Note and releases any work order demands back to available scope.
              </p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cancellation Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancellationRemarks}
                onChange={(e) => setCancellationRemarks(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-colors text-sm"
                rows={4}
                placeholder="State reason for cancelling (e.g. wrong contractor or work order selected)..."
                required
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                disabled={isCancelling}
              >
                Close
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling || !cancellationRemarks.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm & Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
