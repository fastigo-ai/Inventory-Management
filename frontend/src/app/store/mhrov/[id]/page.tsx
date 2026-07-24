"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getMhrovById } from "@/features/store/api/store.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Download } from "lucide-react";
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
        <p className="text-slate-500">Loading MHROV details...</p>
      </div>
    );
  }

  if (!mhrov) {
    return (
      <div className="flex-1 p-8 bg-slate-50 min-h-screen flex items-center justify-center">
        <p className="text-slate-500">MHROV not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-slate-200 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              MHROV: {mhrov.mhrovNumber}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Created on {new Date(mhrov.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {mhrov.documentUrl && (
            <Button
              onClick={() => window.open(mhrov.documentUrl, "_blank")}
              variant="outline"
              className="bg-white border-slate-200 hover:bg-slate-50 h-9 text-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              View Document
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-slate-200 shadow-sm col-span-1">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-medium text-slate-800">
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                MHROV Number
              </p>
              <p className="text-sm font-medium text-slate-900">
                {mhrov.mhrovNumber}
              </p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Date
              </p>
              <p className="text-sm font-medium text-slate-900">
                {new Date(mhrov.mhrovDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wider mb-1">
                Status
              </p>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider ${
                  mhrov.status === "done"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : mhrov.status === "pending"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {mhrov.status}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm col-span-1 md:col-span-2">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-medium text-slate-800">
              Linked Inward Items
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-[13px] text-slate-500 font-medium bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3">DI No</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Invoice No</th>
                  <th className="px-6 py-3">Item Name</th>
                  <th className="px-6 py-3 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-[13px] text-slate-700">
                {mhrov.inwardEntries?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No items linked to this MHROV.
                    </td>
                  </tr>
                ) : (
                  mhrov.inwardEntries.map((entry: any) => (
                    <tr key={entry._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">{entry.diId?.diNumber || "N/A"}</td>
                      <td className="px-6 py-3 font-medium text-slate-900">{entry.vendorName}</td>
                      <td className="px-6 py-3">{entry.invoiceNumber}</td>
                      <td className="px-6 py-3 max-w-[200px] truncate" title={entry.itemName}>
                        {entry.itemName}
                      </td>
                      <td className="px-6 py-3 text-right font-medium">{entry.totalQty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
