"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, FileText, CheckCircle, AlertCircle, Edit, Printer } from 'lucide-react';
import { getDemandNoteById } from '@/features/site-portal/api/demand-notes.api';
import { toast } from 'sonner';

export default function DemandNoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const [demandNote, setDemandNote] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDN = async () => {
      try {
        setIsLoading(true);
        const res = await getDemandNoteById(id as string);
        if (res.success && res.data?.demandNote) {
          setDemandNote(res.data.demandNote);
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
      case 'Pending Approval': return <span className={`${baseStyle} bg-amber-100 text-amber-700 border-amber-200`}><AlertCircle className="w-3 h-3"/> {status}</span>;
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
                  By <span className="font-medium text-slate-700">{demandNote.createdBy.firstName} {demandNote.createdBy.lastName}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </button>
        </div>
      </div>

      {/* Basic Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">General Information</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Package</p>
            <p className="text-sm font-semibold text-slate-800">{demandNote.package || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Circle</p>
            <p className="text-sm font-semibold text-slate-800">{demandNote.circle || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Contractor</p>
            <p className="text-sm font-semibold text-slate-800">{demandNote.contractorName || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Division</p>
            <p className="text-sm font-semibold text-slate-800">{demandNote.division || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Sub-Division</p>
            <p className="text-sm font-semibold text-slate-800">{demandNote.subDivision || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Location</p>
            <p className="text-sm font-semibold text-slate-800">{demandNote.location || '-'}</p>
          </div>
          <div className="lg:col-span-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Remarks</p>
            <p className="text-sm font-medium text-slate-700">{demandNote.remarks || '-'}</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-slate-800">Requested Items</h2>
          <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            {demandNote.items?.length || 0} Items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">S.No</th>
                <th className="px-6 py-4 min-w-[250px]">Item Description</th>
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4 text-right">Requested Qty</th>
                <th className="px-6 py-4 text-right">Already Issued</th>
                <th className="px-6 py-4 text-right">Stock Bal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!demandNote.items || demandNote.items.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No items found in this demand note.
                  </td>
                </tr>
              ) : (
                demandNote.items.map((item: any, idx: number) => (
                  <tr key={item._id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{item.itemName}</p>
                      {item.tempCode && <p className="text-xs font-mono text-slate-500 mt-1">{item.tempCode}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {item.activity || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.unit || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-600">
                      {item.demandQty}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {item.alreadyIssuedQty || 0}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700">
                      {item.stockBal || 0}
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
