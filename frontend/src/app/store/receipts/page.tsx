"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getPendingStoreReceipts, approveStoreReceipt } from "@/features/store/api/store.api";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";

export default function StoreReceiptsPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = () => {
    setLoading(true);
    getPendingStoreReceipts()
      .then(res => setEntries(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleApprove = async (entryId: string) => {
    if (!confirm("Are you sure you want to approve this item receipt?")) return;
    try {
      await approveStoreReceipt(entryId);
      fetchReceipts(); // Refresh list
    } catch (error) {
      console.error(error);
      alert("Failed to approve receipt");
    }
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
  } = useClientTable(entries);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Store Receipts (Pending Items)</h1>
            <p className="text-sm text-slate-500 mt-1">Approve incoming items from Purchase Invoices</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No pending items</h3>
              <p className="text-slate-500 mb-6">There are currently no items pending receipt for your store.</p>
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
                  <thead className="bg-slate-50 text-slate-500 font-medium border-y border-slate-200">
                    <tr>
                      <th className="px-6 py-3">INVOICE NUMBER</th>
                      <th className="px-6 py-3">ITEM</th>
                      <th className="px-6 py-3">QTY</th>
                      <th className="px-6 py-3">PACKAGE</th>
                      <th className="px-6 py-3">STATUS</th>
                      <th className="px-6 py-3 text-right">ACTION</th>
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
                      paginatedData.map(entry => (
                        <tr 
                          key={entry._id} 
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-slate-900">{entry.invoiceNumber}</td>
                          <td className="px-6 py-4">{entry.itemName || '-'}</td>
                          <td className="px-6 py-4">{entry.invoiceQty || 0} {entry.unit || ''}</td>
                          <td className="px-6 py-4">{entry.package || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              entry.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {entry.status === 'APPROVED' ? 'Approved' : 'Pending Receipt'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {entry.status === 'PENDING_RECEIPT' ? (
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(entry._id);
                                }}
                                className="h-8 bg-green-600 hover:bg-green-700 text-white"
                              >
                                Approve Receipt
                              </Button>
                            ) : (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/store/inventory/inward/entry/${entry._id}`);
                                }}
                                className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Register Inward
                              </Button>
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
