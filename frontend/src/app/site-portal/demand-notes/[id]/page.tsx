"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { ArrowLeft, Loader2, FileText, CheckCircle, AlertCircle, Printer, Building2, Pencil, Trash2 } from 'lucide-react';
import { getDemandNoteById, deleteDemandNote } from '@/features/site-portal/api/demand-notes.api';
import { getStockSummary } from '@/features/store/api/store.api';
import { toast } from 'sonner';
import { DocumentAttachment } from '@/shared/components/DocumentAttachment';
import { AuditTimeline } from '@/shared/components/audit/AuditTimeline';

export default function DemandNoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { id } = params;
  
  const [demandNote, setDemandNote] = useState<any>(null);
  const [stockSummary, setStockSummary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination states for items
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Determine portal from path to correctly route print button
  const portalPrefix = pathname.split('/')[1] || 'site-portal';

  useEffect(() => {
    const fetchDN = async () => {
      try {
        setIsLoading(true);
        const res = await getDemandNoteById(id as string);
        if (res.success && res.data?.demandNote) {
          setDemandNote(res.data.demandNote);
          const circle = res.data.demandNote.circle;
          if (circle) {
            try {
              const stockRes = await getStockSummary({ circle });
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
    if (id) fetchDN();
  }, [id]);

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

  const isApprovedByPM = demandNote.status === 'Approved' || demandNote.status === 'Pending PD Approval' || demandNote.status === 'Fulfilled';

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
                  By <span className="font-medium text-slate-700">{demandNote.createdBy.firstName} {demandNote.createdBy.lastName}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {!isApprovedByPM && demandNote.status !== 'Rejected' && (
            <button
              onClick={() => router.push(`/${portalPrefix}/demand-notes/${demandNote._id}/edit`)}
              className="flex items-center px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors shadow-sm"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </button>
          )}
          {!isApprovedByPM && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Delete
            </button>
          )}
          <button
            onClick={() => window.open(`/${portalPrefix}/demand-notes/${demandNote._id}/print`, '_blank')}
            className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" /> Print PDF
          </button>
        </div>
      </div>

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
      {(() => {
        const totalItems = demandNote.items?.length || 0;
        const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
        const currentItems = demandNote.items?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) || [];

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Requested Items</h2>
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                {totalItems} Items
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
                    <th className="px-6 py-4 font-bold text-indigo-700 bg-indigo-50/50">Demand Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentItems.length > 0 ? (
                    currentItems.map((item: any, idx: number) => {
                      const actualIdx = (currentPage - 1) * itemsPerPage + idx;
                      const stockMatch = stockSummary.find(s => 
                        s.loaSrNo === item.loaSrNo && 
                        s.activity === item.activity && 
                        (s.description === item.itemName || s.itemName === item.itemName)
                      );
                      const inStock = stockMatch ? stockMatch.totalBalanceQty : 0;
                      return (
                      <tr key={actualIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-500">{actualIdx + 1}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{item.tempCode || '-'}</td>
                        <td className="px-6 py-4 text-slate-700 max-w-sm truncate" title={item.itemName}>{item.itemName}</td>
                        <td className="px-6 py-4 text-slate-500">{item.activity || '-'}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono">{item.loaSrNo || '-'}</td>
                        <td className="px-6 py-4 text-slate-500">{item.unit || '-'}</td>
                        <td className="px-6 py-4 text-center font-medium text-emerald-600">{Math.round(Number(inStock))}</td>
                        <td className="px-6 py-4 font-bold text-indigo-600 bg-indigo-50/30">{Math.round(Number(item.demandQty))}</td>
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                        No items in this Demand Note.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalItems > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-white gap-4">
                <span className="text-sm text-slate-500 font-medium">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-indigo-200">
                    {currentPage}
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="ml-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 font-medium focus:outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Document Attachment */}
      {demandNote.locationDrawingUrl && (
        <DocumentAttachment url={demandNote.locationDrawingUrl} label="Location Drawing / Attached Document" />
      )}

      {/* Full Audit Log */}
      <AuditTimeline entityType="DemandNote" entityId={demandNote._id} />
    </div>
  );
}
