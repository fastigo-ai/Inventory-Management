"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDemandNoteById } from "@/features/site-portal/api/demand-notes.api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DemandNotePrintPage() {
  const { id } = useParams();
  const router = useRouter();
  const [demandNote, setDemandNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getDemandNoteById(id as string);
        setDemandNote(res.data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch Demand Note details");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id]);

  useEffect(() => {
    if (!loading && demandNote) {
      // Trigger print dialog once data is loaded and rendered
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, demandNote]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
    <div className="bg-white min-h-screen w-full print:p-0 p-8 flex justify-center text-black font-serif">
      {/* A4 Size Container */}
      <div className="w-[210mm] min-h-[297mm] bg-white border border-slate-200 print:border-none shadow-lg print:shadow-none p-[10mm]">
        
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
          
          <div className="flex justify-between items-end relative">
            <div className="flex flex-col gap-6">
              <div className="flex items-end">
                <span className="font-bold whitespace-nowrap mr-2">Engineer Sign. :</span>
                <span className="w-48 border-b border-black"></span>
              </div>
              <div className="flex items-end relative">
                <span className="font-bold whitespace-nowrap mr-2">Engineer Name :</span>
                <span className="w-48 border-b border-black text-blue-800 italic">
                  {demandNote.createdBy ? `${demandNote.createdBy.firstName} ${demandNote.createdBy.lastName}` : ""}
                </span>
                
                {/* PM Approval Stamp */}
                {(demandNote.status === 'Approved' || demandNote.status === 'Pending PD Approval' || demandNote.status === 'Fulfilled') && demandNote.pmApprovedBy && demandNote.pmApprovedAt && (
                  <div className="absolute left-[300px] -top-10 -rotate-[15deg] border-[3px] border-emerald-600 text-emerald-700 p-3 rounded-md bg-white shadow-sm z-10 w-[220px]"
                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <div className="font-bold text-lg uppercase tracking-widest border-b-[2px] border-emerald-600 pb-1 mb-1 text-center">
                      AUTHORIZED
                    </div>
                    <div className="text-xs font-semibold text-center uppercase">
                      BY PM: {demandNote.pmApprovedBy.firstName} {demandNote.pmApprovedBy.lastName}
                    </div>
                    <div className="text-[10px] font-mono text-center mt-1">
                      {new Date(demandNote.pmApprovedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST
                    </div>
                  </div>
                )}
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
  );
}
