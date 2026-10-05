"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getMhrovById } from "@/features/store/api/store.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, CheckCircle2, Clock, AlertCircle, Box, MapPin, Package, Calendar, ListTodo } from "lucide-react";
import { toast } from "sonner";

export default function MhrovDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };

  const [mhrov, setMhrov] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchMhrovDetails();
  }, [id]);

  const fetchMhrovDetails = async () => {
    try {
      setLoading(true);
      const res = await getMhrovById(id);
      setMhrov(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load MHROV details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading MHROV details...</p>
        </div>
      </div>
    );
  }

  if (!mhrov) {
    return (
      <div className="flex-1 p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">MHROV not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isDone = mhrov.status?.toUpperCase() === "DONE" || mhrov.status?.toUpperCase() === "VERIFIED";
  const isPending = mhrov.status?.toUpperCase() === "PENDING";

  // Consolidate items
  const allItems: any[] = [];
  const handledInwardIds = new Set();
  
  if (mhrov.inwardEntries?.length) {
    mhrov.inwardEntries.forEach((entry: any) => {
      allItems.push({ ...entry, rowType: 'inward' });
      handledInwardIds.add(entry._id?.toString());
    });
  }
  
  if (mhrov.items?.length) {
    mhrov.items.forEach((item: any) => {
      if (!item.inwardEntryId || !handledInwardIds.has(item.inwardEntryId.toString())) {
        allItems.push({ ...item, rowType: 'direct' });
      }
    });
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50/50 pb-12">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 px-6 sm:px-10 py-8 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 -ml-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to MHROVs
          </Button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {mhrov.mhrovNumber}
                </h1>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isDone
                      ? "bg-emerald-100 text-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.2)] border border-emerald-200"
                      : isPending
                      ? "bg-amber-100 text-amber-700 shadow-[0_0_10px_rgba(245,158,11,0.2)] border border-amber-200"
                      : "bg-blue-100 text-blue-700 border border-blue-200"
                  }`}
                >
                  {isDone && <CheckCircle2 className="w-3 h-3 mr-1.5" />}
                  {isPending && <Clock className="w-3 h-3 mr-1.5" />}
                  {mhrov.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Created on {new Date(mhrov.createdAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {mhrov.documentUrl && (
              <Button
                onClick={() => window.open(mhrov.documentUrl, "_blank")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all w-full md:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Document
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 mt-8 space-y-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-5 flex items-center gap-4 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 z-10">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="z-10">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">MHROV Date</p>
                <p className="text-sm font-semibold text-slate-800">{new Date(mhrov.mhrovDate).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-5 flex items-center gap-4 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 z-10">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="z-10">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Circle</p>
                <p className="text-sm font-semibold text-slate-800">{mhrov.circle || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-5 flex items-center gap-4 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shrink-0 z-10">
                <Package className="w-5 h-5" />
              </div>
              <div className="z-10">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Package</p>
                <p className="text-sm font-semibold text-slate-800">{mhrov.package || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-5 flex items-center gap-4 relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 z-10">
                <Box className="w-5 h-5" />
              </div>
              <div className="z-10">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Items</p>
                <p className="text-sm font-semibold text-slate-800">{allItems.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Section */}
        <Card className="border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ListTodo className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Linked Items</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">DI No</th>
                  <th className="px-6 py-4 whitespace-nowrap">Item Details</th>
                  <th className="px-6 py-4 whitespace-nowrap">Invoice No</th>
                  <th className="px-6 py-4 whitespace-nowrap">Identifiers</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
                        <p className="font-medium text-slate-600">No items linked</p>
                        <p className="text-xs mt-1">This MHROV currently has no items assigned to it.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allItems.map((item: any, idx: number) => {
                    const diNo = item.diId?.diNumber || item.diRefNo || "N/A";
                    const itemName = item.itemName || item.itemId?.dynamicData?.name || item.itemId?.name || "Unknown Item";
                    const vendorName = item.vendorName || "Unknown Vendor";
                    const invoiceNo = item.invoiceNumber || item.invoiceNo || (item.rowType === 'direct' ? "N/A (DI Only)" : "N/A");
                    const loaSrNo = item.loaSrNo || item.inwardEntryId?.loaSrNo || item.itemId?.dynamicData?.loaSerialNo || '-';
                    const tempCode = item.tempCode || item.inwardEntryId?.tempCode || item.itemId?.dynamicData?.tempCode || '-';
                    const qty = item.mhrovDoneQty || 0;

                    return (
                      <tr key={item._id || idx} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-indigo-700 whitespace-nowrap">
                          {diNo}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">{itemName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{vendorName}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                            {invoiceNo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-slate-600"><span className="text-slate-400 font-medium mr-1">LOA:</span> {loaSrNo}</span>
                            <span className="text-xs text-slate-600"><span className="text-slate-400 font-medium mr-1">TEMP:</span> {tempCode}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm border border-emerald-100">
                            {qty}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

