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
            onClick={() => window.open(`/site-portal/demand-notes/${demandNote._id}/print`, '_blank')}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </button>
        </div>
      </div>

      {/* PDF View Container */}
      <div className="flex justify-center bg-slate-100 p-8 rounded-xl border border-slate-200 overflow-x-auto">
        <div className="w-[210mm] min-h-[297mm] bg-white border border-slate-200 shadow-lg p-[10mm] text-black font-serif shrink-0">
          
          {/* Header Section */}
          <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
            <div className="text-4xl font-bold font-serif tracking-tighter">
              {/* Left Logo Placeholder */}
              A
            </div>
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold tracking-wide uppercase">AIREF-HOLISTIC JV</h1>
              <p className="text-sm mt-1">Registered Office: D-94, Sector 26, Noida 201301</p>
              <h2 className="text-xl font-bold mt-2 uppercase">Material Demand Note</h2>
            </div>
            <div className="text-5xl font-serif italic font-bold">
              {/* Right Logo Placeholder */}
              H
            </div>
          </div>

          {/* Info Grid Section */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
            {/* Left Column */}
            <div className="flex flex-col gap-3">
              <div className="flex">
                <span className="font-bold whitespace-nowrap mr-2">WORK ORDER NO :</span>
                <span className="flex-1 border-b border-black"></span>
              </div>
              <div className="flex">
                <span className="font-bold whitespace-nowrap mr-2">Contractor Name :</span>
                <span className="flex-1 border-b border-black text-blue-800 italic">{demandNote.contractorName || ""}</span>
              </div>
              <div className="flex">
                <span className="font-bold whitespace-nowrap mr-2">Cont. Work Order No.:</span>
                <span className="flex-1 border-b border-black"></span>
              </div>
              <div className="flex">
                <span className="font-bold whitespace-nowrap mr-2">Demand for Sale / Feeder Name :</span>
                <span className="flex-1 border-b border-black text-blue-800 italic">{demandNote.location || ""}</span>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="flex flex-col gap-3">
              <div className="flex">
                <span className="font-bold whitespace-nowrap mr-2">STORE ADDRESS :</span>
                <span className="flex-1 border-b border-black text-blue-800 italic">{demandNote.division || ""}</span>
              </div>
              <div className="flex">
                <span className="font-bold whitespace-nowrap mr-2">MDN No. :</span>
                <span className="flex-1 border-b border-black text-center">{demandNote.demandNoteNumber || ""}</span>
              </div>
              <div className="flex">
                <span className="font-bold whitespace-nowrap mr-2">Date :</span>
                <span className="flex-1 border-b border-black text-blue-800 italic">{new Date(demandNote.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex">
                <span className="font-bold whitespace-nowrap mr-2">Town Name :</span>
                <span className="flex-1 border-b border-black text-blue-800 italic">{demandNote.circle || ""}</span>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <table className="w-full border-collapse border-2 border-black text-sm mb-6">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 text-center w-12 font-bold">Sr.<br/>No.</th>
                <th className="border border-black px-2 py-1 text-center w-24 font-bold">Material<br/>Code</th>
                <th className="border border-black px-2 py-1 text-center font-bold uppercase">Description of Material</th>
                <th className="border border-black px-2 py-1 text-center w-16 font-bold">Unit</th>
                <th className="border border-black px-2 py-1 text-center w-24 font-bold">Qty. Demand</th>
              </tr>
            </thead>
            <tbody>
              {demandNote.items && demandNote.items.length > 0 ? (
                demandNote.items.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                    <td className="border border-black px-2 py-1 text-center">{item.tempCode || ""}</td>
                    <td className="border border-black px-2 py-1 text-blue-800 italic">{item.itemName}</td>
                    <td className="border border-black px-2 py-1 text-center text-blue-800 italic">{item.unit || ""}</td>
                    <td className="border border-black px-2 py-1 text-center text-blue-800 italic">{item.demandQty || ""}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="border border-black px-2 py-6 text-center italic text-gray-500">No items available</td>
                </tr>
              )}
              {/* Add some blank rows to mimic the lined paper format */}
              {Array.from({ length: Math.max(0, 10 - (demandNote.items?.length || 0)) }).map((_, i) => (
                <tr key={`blank-${i}`}>
                  <td className="border border-black px-2 py-4"></td>
                  <td className="border border-black px-2 py-4"></td>
                  <td className="border border-black px-2 py-4"></td>
                  <td className="border border-black px-2 py-4"></td>
                  <td className="border border-black px-2 py-4"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Section */}
          <div className="mt-8">
            <p className="font-bold text-sm mb-12">Certified that the above material is required for erectionwork at site.</p>
            
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-6">
                <div className="flex items-end">
                  <span className="font-bold whitespace-nowrap mr-2">Engineer Sign. :</span>
                  <span className="w-48 border-b border-black"></span>
                </div>
                <div className="flex items-end">
                  <span className="font-bold whitespace-nowrap mr-2">Engineer Name :</span>
                  <span className="w-48 border-b border-black text-blue-800 italic">
                    {demandNote.createdBy ? `${demandNote.createdBy.firstName} ${demandNote.createdBy.lastName}` : ""}
                  </span>
                </div>
                <div className="flex items-end">
                  <span className="font-bold whitespace-nowrap mr-2">Contractor Sign. :</span>
                  <span className="w-48 border-b border-black"></span>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                <h3 className="font-bold text-lg mb-16">For AIREF-HOLISTIC JV</h3>
                <p className="font-bold">Town Incharge/Area Manager</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
