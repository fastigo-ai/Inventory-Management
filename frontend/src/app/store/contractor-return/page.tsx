"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getContractorReturns } from "@/features/contractors/api/contractors.api";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";

export default function StoreContractorReturnPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContractorReturns()
      .then(res => setReturns(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
  } = useClientTable(returns);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Contractor Returns</h1>
            <p className="text-sm text-slate-500 mt-1">View and record items returned by contractors</p>
          </div>
          <Link href="/store/contractor-return/new">
            <Button className="bg-[#0076f2] hover:bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              New Return
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : returns.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Returns Found</h3>
              <p className="text-slate-500 mb-6">Create a new return to record stock received from a contractor.</p>
              <Link href="/store/contractor-return/new">
                <Button variant="outline">Create your first Return</Button>
              </Link>
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
                      <th className="px-6 py-3">CHALLAN NO.</th>
                      <th className="px-6 py-3">CHALLAN DATE</th>
                      <th className="px-6 py-3">CONTRACTOR</th>
                      <th className="px-6 py-3">STATUS</th>
                      <th className="px-6 py-3 text-right">TOTAL ITEMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          No matching records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map(a => {
                        const totalItems = a.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
                        return (
                          <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-medium text-blue-600">{a.returnChallanNo}</td>
                            <td className="px-6 py-4">{new Date(a.returnChallanDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4">{a.contractorId?.name || a.contractorId?.dynamicData?.displayName || 'Unknown'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                a.status === 'Submitted' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium">{totalItems}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <DataTableBottomControls
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={setPageSize}
                totalItems={totalItems}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
