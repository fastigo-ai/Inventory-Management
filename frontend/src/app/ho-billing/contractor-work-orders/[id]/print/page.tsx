"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getContractorWorkOrderById } from "@/features/contractors/api/contractorWorkOrder.api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/shared/api/axios";

export default function WorkOrderPrintPage() {
  const { id } = useParams();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [contractorName, setContractorName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getContractorWorkOrderById(id as string);
        const data = res.data;
        setWorkOrder(data);
        
        // Fetch contractor details to get the name
        if (data?.contractorId) {
          if (typeof data.contractorId === 'object') {
            // It's populated
            setContractorName(data.contractorId.dynamicData?.companyName || data.contractorId.dynamicData?.displayName || data.contractorId.name || 'Unknown');
          } else {
            // It's just an ID string, fetch it
            try {
              const cRes = await api.get(`/contractors/${data.contractorId}`);
              setContractorName(cRes.data?.data?.dynamicData?.companyName || cRes.data?.data?.dynamicData?.displayName || 'Unknown');
            } catch (err) {
              console.error("Failed to fetch contractor", err);
              setContractorName("Unknown");
            }
          }
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to fetch Work Order details");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadData();
  }, [id]);

  useEffect(() => {
    if (!loading && workOrder) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, workOrder]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
    <>
      <div className="bg-white min-h-screen w-full print:p-0 p-8 flex justify-center text-black font-serif relative">
      <div className="print:hidden absolute top-8 left-8 z-50">
        <button 
          onClick={() => { window.history.length > 1 ? router.back() : window.close(); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg shadow-lg transition-all font-sans text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back / Close
        </button>
      </div>
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
            <h2 className="text-xl font-bold mt-2 uppercase">Contractor Work Order</h2>
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
              <span className="font-bold whitespace-nowrap mr-2">WO Number :</span>
              <span className="flex-1 border-b border-black text-center">{workOrder.workOrderNumber || ""}</span>
            </div>
            <div className="flex">
              <span className="font-bold whitespace-nowrap mr-2">Contractor Name :</span>
              <span className="flex-1 border-b border-black text-blue-800 italic">{contractorName}</span>
            </div>
            <div className="flex">
              <span className="font-bold whitespace-nowrap mr-2">Package :</span>
              <span className="flex-1 border-b border-black text-center">{workOrder.package || ""}</span>
            </div>
            <div className="flex">
              <span className="font-bold whitespace-nowrap mr-2">Circle / Subcircle :</span>
              <span className="flex-1 border-b border-black text-center">{workOrder.circle || ""} {workOrder.subcircle ? `/ ${workOrder.subcircle}` : ""}</span>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="flex flex-col gap-3">
            <div className="flex">
              <span className="font-bold whitespace-nowrap mr-2">Date :</span>
              <span className="flex-1 border-b border-black text-blue-800 italic">{new Date(workOrder.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex">
              <span className="font-bold whitespace-nowrap mr-2">Status :</span>
              <span className="flex-1 border-b border-black text-center">{workOrder.status}</span>
            </div>
            <div className="flex">
              <span className="font-bold whitespace-nowrap mr-2">Total Amount :</span>
              <span className="flex-1 border-b border-black text-blue-800 italic">Rs. {(workOrder.totalWoAmount || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <table className="w-full border-collapse border-2 border-black text-xs mb-6">
          <thead>
            <tr>
              <th className="border border-black px-1 py-1 text-center w-8 font-bold">Sr.<br/>No.</th>
              <th className="border border-black px-1 py-1 text-center font-bold">Drawing No</th>
              <th className="border border-black px-1 py-1 text-center font-bold">Temp Code</th>
              <th className="border border-black px-1 py-1 text-center font-bold">Activity</th>
              <th className="border border-black px-1 py-1 text-center font-bold">Description</th>
              <th className="border border-black px-1 py-1 text-center font-bold">Unit</th>
              <th className="border border-black px-1 py-1 text-center font-bold">WO Qty</th>
              <th className="border border-black px-1 py-1 text-center font-bold">Rate</th>
              <th className="border border-black px-1 py-1 text-center font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {workOrder.items && workOrder.items.length > 0 ? (
              workOrder.items.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="border border-black px-1 py-1 text-center">{index + 1}</td>
                  <td className="border border-black px-1 py-1 text-center text-blue-800 italic">{item.drawingNumber || ""}</td>
                  <td className="border border-black px-1 py-1 text-center">{item.tempCode || ""}</td>
                  <td className="border border-black px-1 py-1 text-center text-blue-800 italic">{item.activity || ""}</td>
                  <td className="border border-black px-1 py-1 text-blue-800 italic">{item.description}</td>
                  <td className="border border-black px-1 py-1 text-center text-blue-800 italic">{item.unit || ""}</td>
                  <td className="border border-black px-1 py-1 text-center text-blue-800 italic">{item.woQty ? Math.round(Number(item.woQty)) : 0}</td>
                  <td className="border border-black px-1 py-1 text-center text-blue-800 italic">{item.contractorErectionRate || 0}</td>
                  <td className="border border-black px-1 py-1 text-right text-blue-800 italic font-bold">{(item.amount || 0).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="border border-black px-2 py-6 text-center italic text-gray-500">No items available</td>
              </tr>
            )}
            
            {/* Grand Total Row */}
            {workOrder.items && workOrder.items.length > 0 && (
              <tr>
                <td colSpan={8} className="border border-black px-2 py-2 text-right font-bold text-sm">Grand Total (Incl. GST):</td>
                <td className="border border-black px-2 py-2 text-right font-bold text-sm">Rs. {(workOrder.totalWoAmount || 0).toLocaleString()}</td>
              </tr>
            )}
            
          </tbody>
        </table>

        {/* Drawings Info Section */}
        {workOrder.drawings && workOrder.drawings.length > 0 && (
          <div className="mb-6">
             <h3 className="font-bold text-sm mb-2 border-b border-black inline-block">Associated Drawings / Locations</h3>
             <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr>
                    <th className="border border-black px-1 py-1 text-left font-bold">Drawing No</th>
                    <th className="border border-black px-1 py-1 text-left font-bold">Division</th>
                    <th className="border border-black px-1 py-1 text-left font-bold">Sub Division</th>
                    <th className="border border-black px-1 py-1 text-left font-bold">Location</th>
                  </tr>
                </thead>
                <tbody>
                   {workOrder.drawings.map((dwg: any, i: number) => (
                     <tr key={i}>
                       <td className="border border-black px-1 py-1">{dwg.drawingNumber}</td>
                       <td className="border border-black px-1 py-1">{dwg.division}</td>
                       <td className="border border-black px-1 py-1">{dwg.subDivision}</td>
                       <td className="border border-black px-1 py-1">{dwg.location}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}

        {/* Footer Section */}
        <div className="mt-16">
          <div className="flex justify-between items-end relative">
            <div className="flex flex-col gap-6">
              <div className="flex items-end">
                <span className="font-bold whitespace-nowrap mr-2">Contractor Sign. :</span>
                <span className="w-48 border-b border-black"></span>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <h3 className="font-bold text-lg mb-16">For AIREF-HOLISTIC JV</h3>
              <p className="font-bold">Authorized Signatory</p>
            </div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}
