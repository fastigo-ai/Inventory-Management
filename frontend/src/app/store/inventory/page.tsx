"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPendingDIs, getStockSummary } from "@/features/store/api/store.api";
import { FileText, Package, ListChecks } from "lucide-react";
import { StockSummaryTable } from "@/features/store/components/StockSummaryTable";

export default function StoreInventoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'summary'>('pending');
  const [dis, setDis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchDIs();
    } else {
      fetchStockSummary();
    }
  }, [activeTab]);

  const fetchDIs = async () => {
    try {
      setLoading(true);
      const res = await getPendingDIs();
      setDis(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockSummary = async () => {
    try {
      setSummaryLoading(true);
      // We pass no filters for store manager, as they see their own circle usually
      // If we need to pass circle/package, we can get it from their profile or add dropdowns
      const res = await getStockSummary({});
      setSummaryData(res.data || []);
    } catch (error) {
      console.error("Failed to fetch stock summary:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-white min-h-screen p-6">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Inventory Management</h1>

        <div className="flex space-x-1 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            <span>Pending Inward Registrations</span>
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stock Summary</span>
          </button>
        </div>

        {activeTab === 'pending' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-6 py-4">DI Number</th>
                    <th className="px-6 py-4">PO Number</th>
                    <th className="px-6 py-4">Circle</th>
                    <th className="px-6 py-4">Package</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : dis.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No pending DIs found for your circle.</p>
                      </td>
                    </tr>
                  ) : (
                    dis.map((di: any) => (
                      <tr key={di._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-blue-600">{di.diNumber}</td>
                        <td className="px-6 py-4">{di.purchaseOrderId?.purchaseOrderNumber || '-'}</td>
                        <td className="px-6 py-4">{di.circle || '-'}</td>
                        <td className="px-6 py-4">{di.package || '-'}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            {di.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => router.push(`/store/inventory/inward/${di._id}`)}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Register Inward
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Circle Stock Summary</h2>
             </div>
             <StockSummaryTable data={summaryData} isLoading={summaryLoading} />
          </div>
        )}

      </div>
    </div>
  );
}
