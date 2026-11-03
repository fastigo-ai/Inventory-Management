"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Printer,
  Building2,
  Pencil,
  Trash2,
  RotateCcw,
  Ban,
  AlertTriangle
} from 'lucide-react';
import {
  getDemandNoteById,
  deleteDemandNote,
  revokeDemandNote,
  cancelDemandNote,
  getDemandNoteIssuanceStatus
} from '@/features/site-portal/api/demand-notes.api';
import { getStockSummary } from '@/features/store/api/store.api';
import { getContractorActivitySummary, getContractors } from '@/features/contractors/api/contractors.api';
import { toast } from 'sonner';
import { DocumentAttachment } from '@/shared/components/DocumentAttachment';
import { AuditTimeline } from '@/shared/components/audit/AuditTimeline';
import { useStickyColumnResize } from '@/shared/hooks/useStickyColumnResize';
import { DataTable } from '@/shared/components/ui/data-table';
import { getDemandNoteColumns } from '@/features/site-portal/components/demand-note-columns';
import { useAuthStore } from '@/shared/store/auth.store';

export default function DemandNoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { id } = params;
  const { user } = useAuthStore();

  useStickyColumnResize();
  
  const [demandNote, setDemandNote] = useState<any>(null);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [activitySummary, setActivitySummary] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Executive Modals (PD / Admin)
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [correctionRemarks, setCorrectionRemarks] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationRemarks, setCancellationRemarks] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [issuanceInfo, setIssuanceInfo] = useState<{ isIssued: boolean; reason?: string } | null>(null);

  // Determine portal from path to correctly route print button
  const portalPrefix = pathname.split('/')[1] || 'site-portal';

  const userRole = (user?.role as any)?.name || (typeof user?.role === 'string' ? user?.role : '');
  const isExecutive = userRole === 'Project Director' || userRole === 'Admin' || userRole === 'System Admin';

  const fetchDN = async () => {
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
    if (id) fetchDN();
  }, [id]);

  const handleRevoke = async () => {
    if (!correctionRemarks.trim()) {
      toast.error('Please enter correction remarks.');
      return;
    }
    try {
      setIsRevoking(true);
      const res = await revokeDemandNote(demandNote._id, correctionRemarks.trim());
      if (res.success) {
        toast.success('Demand Note revoked and sent back for revision successfully');
        setIsRevokeModalOpen(false);
        setCorrectionRemarks('');
        fetchDN();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to revoke Demand Note');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationRemarks.trim()) {
      toast.error('Please enter cancellation remarks.');
      return;
    }
    try {
      setIsCancelling(true);
      const res = await cancelDemandNote(demandNote._id, cancellationRemarks.trim());
      if (res.success) {
        toast.success('Demand Note cancelled and voided successfully');
        setIsCancelModalOpen(false);
        setCancellationRemarks('');
        fetchDN();
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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this Demand Note? This action cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      await deleteDemandNote(id as string);
      toast.success("Demand Note deleted successfully");
      router.push(`/${portalPrefix}/demand-notes`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete Demand Note");
      setIsDeleting(false);
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

  const isApprovedByPM = demandNote.status === 'Approved' || demandNote.status === 'Pending PD Approval' || demandNote.status === 'Fulfilled';
  const isEditable = !isApprovedByPM && demandNote.status !== 'Rejected' && demandNote.status !== 'Cancelled';

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
              By <span className="font-medium text-slate-700">
                {demandNote.authorizedByEngineer || (demandNote.createdBy ? `${demandNote.createdBy.firstName} ${demandNote.createdBy.lastName}` : 'Site Engineer')}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Executive Revoke & Cancel Actions */}
          {isExecutive && demandNote.status === 'Approved' && (
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
                    title="Send back for revision. Previous approvals will reset."
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

          {isEditable && (
            <button
              onClick={() => router.push(`/${portalPrefix}/demand-notes/${demandNote._id}/edit`)}
              className="flex items-center px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors shadow-sm cursor-pointer"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </button>
          )}
          {!isApprovedByPM && demandNote.status !== 'Cancelled' && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Delete
            </button>
          )}
          <button
            onClick={() => window.open(`/${portalPrefix}/demand-notes/${demandNote._id}/print`, '_blank')}
            className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </button>
        </div>
      </div>

      {/* SAP Status Notification Banners */}
      {demandNote.status === 'Revision Required' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-xs flex items-start gap-3">
          <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-amber-900">Revoked for Revision</h4>
              <button
                onClick={() => router.push(`/${portalPrefix}/demand-notes/${demandNote._id}/edit`)}
                className="flex items-center px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit & Resubmit
              </button>
            </div>
            <p className="text-xs text-amber-800 mt-1">
              This Demand Note was revoked and sent back for correction. Please update the quantities or items and save to resubmit for PM and PD approvals.
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

      {isApprovedByPM && demandNote.pmApprovedBy && demandNote.pmApprovedAt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-emerald-900 font-medium text-sm">
              Authorized by PM: {demandNote.pmApprovedBy.firstName} {demandNote.pmApprovedBy.lastName}
            </p>
            <p className="text-emerald-700 text-xs mt-0.5">
              Approved on: {new Date(demandNote.pmApprovedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST
            </p>
          </div>
        </div>
      )}

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
              <span className="text-sm text-slate-500">Sub Circle</span>
              <span className="col-span-2 text-sm font-medium text-slate-800">{demandNote.subcircle || '-'}</span>
            </div>
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
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Requested Items</h2>
          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
            {demandNote.items?.filter((item: any) => Number(item.demandQty) > 0).length || 0} Items
          </span>
        </div>
        
        {(() => {
          const tableData: any[] = [];
          const validItems = demandNote.items?.filter((item: any) => Number(item.demandQty) > 0) || [];
          if (validItems.length > 0) {
            const grouped = validItems.reduce((acc: any, item: any, originalIdx: number) => {
              const act = item.activity || 'Uncategorized Activity';
              if (!acc[act]) acc[act] = [];
              acc[act].push({ ...item, originalIdx });
              return acc;
            }, {});

            Object.entries(grouped).forEach(([activityName, itemsGroup]: [string, any]) => {
              tableData.push({ isGroupRow: true, activityName });
              
              itemsGroup.forEach((item: any) => {
                const stockMatch = stockSummary.find(s => {
                  if (item.tempCode && s.tempCode && String(item.tempCode).trim() === String(s.tempCode).trim()) return true;
                  return String(s.loaSrNo) === String(item.loaSrNo) && String(s.activity) === String(item.activity) && (s.description === item.itemName || s.itemName === item.itemName);
                });
                
                const clean = (s: any) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const cleanTemp = clean(item.tempCode || item.materialCode);
                const cleanAct = clean(item.activity);
                const cleanLoa = clean(item.loaSrNo || item.loaSerialNo);
                const exactKey = `${cleanTemp}_${cleanAct}_${cleanLoa}`;
                let tillIssued = 0;
                let consumption = 0;
                let jmcDone = 0;
                
                if (activitySummary) {
                  let targetEntry = null;
                  for (const [key, val] of Object.entries(activitySummary)) {
                    const cleanKey = clean(key);
                    if (cleanKey === exactKey || cleanKey === `_${exactKey}` || cleanKey.endsWith(`_${exactKey}`)) {
                      targetEntry = val;
                      break;
                    }
                  }

                  if (!targetEntry && cleanAct && cleanLoa) {
                    const fallbackKey = `${cleanAct}_${cleanLoa}`;
                    for (const [key, val] of Object.entries(activitySummary)) {
                      const cleanKey = clean(key);
                      if (cleanKey === fallbackKey) {
                        targetEntry = val;
                        break;
                      }
                    }
                  }

                  if (targetEntry) {
                    tillIssued = Number((targetEntry as any).tillIssued) || 0;
                    consumption = Number((targetEntry as any).wipConsumed) || 0;
                    jmcDone = Number((targetEntry as any).jmcDone) || 0;
                  }
                }

                if (consumption === 0 && item.wipQty) {
                  consumption = Number(item.wipQty) || 0;
                }
                if (jmcDone === 0 && item.jmcQty) {
                  jmcDone = Number(item.jmcQty) || 0;
                }
                if (tillIssued === 0 && item.alreadyIssuedQty) {
                  tillIssued = Number(item.alreadyIssuedQty) || 0;
                }
                
                const inStock = stockMatch ? stockMatch.totalBalanceQty : 0;
                const circleLoaQty = stockMatch ? (stockMatch.circleLoaQty || 0) : 0;
                const invoiceQty = stockMatch ? ((stockMatch.acceptedQty || 0) + (stockMatch.mhrovQty || 0)) : 0;
                const misc = Number(item.miscellaneousQty || 0);
                const wipReq = Number(item.wipRequiredQty || 0);
                const contractorBalance = Number(tillIssued || 0) - Number(jmcDone || 0) - Number(consumption || 0) - wipReq - misc;

                tableData.push({
                  ...item,
                  isGroupRow: false,
                  inStock: Number(Number(inStock).toFixed(3)),
                  circleLoaQty: Number(Number(circleLoaQty).toFixed(3)),
                  invoiceQty: Number(Number(invoiceQty).toFixed(3)),
                  tillIssued: Number(Number(tillIssued).toFixed(3)),
                  consumption: Number(Number(consumption).toFixed(3)),
                  jmcDone: Number(Number(jmcDone).toFixed(3)),
                  contractorBalance: Number(Number(contractorBalance).toFixed(3))
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

      {/* Executive Revocation Modal */}
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

      {/* Executive Cancellation Modal */}
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
