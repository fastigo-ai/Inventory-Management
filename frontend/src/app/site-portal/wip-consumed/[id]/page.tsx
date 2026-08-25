"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getWipById } from "@/features/site-portal/api/wip.api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";

export default function WipDetailPage() {
  const router = useRouter();
  const params = useParams();
  const wipId = params.id as string;

  const [wip, setWip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wipId && wipId !== 'new') {
      fetchWip();
    }
  }, [wipId]);

  const fetchWip = async () => {
    try {
      setLoading(true);
      const res = await getWipById(wipId);
      setWip(res.data?.data || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading WIP details...</div>;
  if (!wip) return <div className="p-8 text-center text-slate-500">WIP not found.</div>;

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.push('/site-portal/wip-consumed')}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">
              WIP Details: {wip.wipNumber || ''}
            </h1>
          </div>
          <div className="flex space-x-3">
            <Button 
              onClick={() => router.push(`/site-portal/wip-consumed/${wipId}/edit`)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit WIP
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-4">General Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Date</label>
                <div className="text-sm font-medium text-slate-900">
                  {wip.date ? new Date(wip.date).toLocaleDateString() : '-'}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Contractor</label>
                <div className="text-sm font-medium text-slate-900">
                  {wip.contractorId?.name || wip.contractorId?.vendorName || wip.contractorId?.dynamicData?.companyName || '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase mb-4">Location Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Package</label>
                <div className="text-sm font-medium text-slate-900">{wip.package || '-'}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Circle</label>
                <div className="text-sm font-medium text-slate-900">{wip.circle || '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-700 uppercase">WIP Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3 border-r">LOA Sr No</th>
                  <th className="px-4 py-3 border-r">Temp Code</th>
                  <th className="px-4 py-3 border-r">Activity</th>
                  <th className="px-4 py-3 border-r min-w-[300px]">Description</th>
                  <th className="px-4 py-3 border-r">Unit</th>
                  <th className="px-4 py-3 border-r bg-blue-50">Prev WIP Qty</th>
                  <th className="px-4 py-3 border-r bg-green-50 text-green-800">New WIP Qty</th>
                  <th className="px-4 py-3 border-r bg-purple-50 text-purple-800">Total WIP Qty</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wip.items && wip.items.length > 0 ? (
                  wip.items.map((item: any, index: number) => {
                    const showDivider = index > 0 && item.activity !== wip.items[index - 1].activity;
                    return (
                      <React.Fragment key={index}>
                        {showDivider && (
                          <tr>
                            <td colSpan={9} className="p-0 border-0">
                              <div className="h-[3px] bg-slate-300 w-full"></div>
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 border-r border-slate-100 text-slate-700">{item.loaSrNo || '-'}</td>
                          <td className="px-4 py-3 border-r border-slate-100 text-slate-700">{item.tempCode || '-'}</td>
                          <td className="px-4 py-3 border-r border-slate-100 text-slate-700">{item.activity || '-'}</td>
                          <td className="px-4 py-3 border-r border-slate-100 text-slate-700">{item.description || '-'}</td>
                          <td className="px-4 py-3 border-r border-slate-100 text-slate-700">{item.unit || '-'}</td>
                          <td className="px-4 py-3 border-r border-slate-100 bg-blue-50/30 text-slate-700">
                            {Number(item.prevQty || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 bg-green-50/30 font-medium text-green-700">
                            {Number(item.claimedQty || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 font-semibold text-purple-700 bg-purple-50/30">
                            {(Number(item.prevQty || 0) + Number(item.claimedQty || 0)).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{item.remarks || '-'}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                      No items found in this WIP.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
