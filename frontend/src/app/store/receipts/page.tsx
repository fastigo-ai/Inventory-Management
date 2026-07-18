"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getDIs, updateDIStatus } from "@/features/di/api/di.api";

export default function StoreReceiptsPage() {
  const [dis, setDis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDIs = () => {
    setLoading(true);
    getDIs()
      .then(res => setDis(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDIs();
  }, []);

  const handleReceive = async (diId: string) => {
    if (!confirm("Are you sure you want to approve this DI and receive items into inventory?")) return;
    try {
      await updateDIStatus(diId, 'Received');
      fetchDIs(); // Refresh list
    } catch (error) {
      console.error(error);
      alert("Failed to receive DI");
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Store Receipts</h1>
            <p className="text-sm text-slate-500 mt-1">Approve incoming DIs to receive items into inventory</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : dis.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No incoming DIs</h3>
              <p className="text-slate-500 mb-6">There are currently no DIs pending receipt for your store.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">DI NUMBER</th>
                  <th className="px-6 py-3">PO NUMBER</th>
                  <th className="px-6 py-3">DATE</th>
                  <th className="px-6 py-3">STATUS</th>
                  <th className="px-6 py-3">ITEMS</th>
                  <th className="px-6 py-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dis.map(di => (
                  <tr key={di._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{di.diNumber}</td>
                    <td className="px-6 py-4">{di.purchaseOrderId?.purchaseOrderNumber || '-'}</td>
                    <td className="px-6 py-4">{new Date(di.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        di.status === 'Received' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {di.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{di.lineItems?.length || 0}</td>
                    <td className="px-6 py-4 text-right">
                      {di.status === 'Pending Receipt' ? (
                        <Button 
                          onClick={() => handleReceive(di._id)}
                          className="h-8 bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve Receipt
                        </Button>
                      ) : (
                        <span className="text-slate-400 font-medium">Received</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
