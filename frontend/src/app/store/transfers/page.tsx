"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getStoreTransfers, updateStoreTransferStatus } from "@/features/store/api/store.api";
import { ArrowRightLeft, Send, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";

export default function StoreTransfersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'outgoing') setActiveTab('outgoing');
    else if (tab === 'incoming') setActiveTab('incoming');
  }, [searchParams]);

  // In a real app we'd get this from auth context, assuming 'Circle A' for now to filter mock-wise if needed
  // The backend currently fetches everything if no circle is provided.
  const currentStoreCircle = 'Circle A'; 

  useEffect(() => {
    fetchTransfers();
  }, [activeTab]);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      // Let's fetch all and filter client side for simplicity unless backend strictly enforces it
      const res = await getStoreTransfers();
      const allTransfers = res.data || [];
      
      if (activeTab === 'incoming') {
        // Here we'd filter where toStore === currentStoreCircle if we had a strict context
        // For demonstration, we'll show all pending/approved where toStore could be us
        setTransfers(allTransfers.filter((t: any) => t.status !== 'REJECTED'));
      } else {
        // Outgoing transfers
        setTransfers(allTransfers);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'APPROVED': 'bg-blue-100 text-blue-800',
      'IN_TRANSIT': 'bg-purple-100 text-purple-800',
      'RECEIVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-slate-100 text-slate-800'}`}>{status}</span>;
  };

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems
  } = useClientTable(transfers);

  return (
    <div className="flex-1 bg-white min-h-screen p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Inter-Store Transfers (Incoming)</h1>
        </div>

        <div className="flex space-x-1 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors border-blue-600 text-blue-600`}
          >
            <Download className="w-4 h-4" />
            <span>Incoming Transfers (Action Required)</span>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : transfers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No {activeTab} transfers found.
            </div>
          ) : (
            <>
              <DataTableTopControls
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                pageSize={pageSize}
                setPageSize={setPageSize}
                totalItems={totalItems}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="px-6 py-4">Request Date</th>
                      <th className="px-6 py-4">From Store</th>
                      <th className="px-6 py-4">To Store</th>
                      <th className="px-6 py-4">Items Count</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          No matching records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((t: any) => (
                        <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">
                            {new Date(t.requestDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{t.fromStore}</td>
                          <td className="px-6 py-4 text-slate-600">{t.toStore}</td>
                          <td className="px-6 py-4 text-slate-600">{t.items?.length || 0} items</td>
                          <td className="px-6 py-4">{getStatusBadge(t.status)}</td>
                          <td className="px-6 py-4 text-center">
                            {activeTab === 'incoming' && t.status === 'PENDING' ? (
                              <button
                                onClick={async () => {
                                  try {
                                    await updateStoreTransferStatus(t._id, 'APPROVED');
                                    window.location.reload();
                                  } catch (e) { console.error(e); }
                                }}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center justify-center gap-1 w-full"
                              >
                                Approve
                              </button>
                            ) : activeTab === 'incoming' && t.status === 'APPROVED' ? (
                              <button
                                onClick={() => router.push(`/store/transfers/dispatch/${t._id}`)}
                                className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center justify-center gap-1 w-full"
                              >
                                <Send className="w-4 h-4" />
                                Dispatch
                              </button>
                            ) : activeTab === 'outgoing' && t.status === 'IN_TRANSIT' ? (
                              <button
                                onClick={() => router.push(`/store/transfers/receive/${t._id}`)}
                                className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center justify-center gap-1 w-full"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                                Register Receipt
                              </button>
                            ) : (
                              <span className="text-slate-400 text-sm">View</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <DataTableBottomControls
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
