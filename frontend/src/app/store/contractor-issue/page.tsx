"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Eye, Edit, Trash2, XCircle } from "lucide-react";
import { getAssignments, cancelAssignment } from "@/features/contractors/api/contractors.api";
import { ContractorIssueImportModal } from "@/features/store/components/ContractorIssueImportModal";
import { toast } from "sonner";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";

export default function StoreContractorIssuePage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchAssignments = () => {
    setLoading(true);
    getAssignments()
      .then(res => setAssignments(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleCancel = async (id: string, minNo: string) => {
    if (confirm(`Are you sure you want to cancel MIN ${minNo}? This will restore the stock.`)) {
      try {
        await cancelAssignment(id);
        toast.success(`MIN ${minNo} cancelled successfully.`);
        fetchAssignments();
      } catch (error) {
        toast.error(`Failed to cancel MIN ${minNo}`);
      }
    }
  };

  useEffect(() => {
    fetchAssignments();
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
  } = useClientTable(assignments);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">MIN (Material Issue Notes)</h1>
            <p className="text-sm text-slate-500 mt-1">Issue stock to contractors from your local inventory</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Link href="/store/contractor-issue/new">
              <Button className="bg-[#0076f2] hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                New Issue
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Items Issued</h3>
              <p className="text-slate-500 mb-6">Create a new issue to assign stock to a contractor.</p>
              <Link href="/store/contractor-issue/new">
                <Button variant="outline">Create your first Issue</Button>
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
                      <th className="px-6 py-3">MIN NO.</th>
                      <th className="px-6 py-3">MIN DATE</th>
                      <th className="px-6 py-3">CONTRACTOR</th>
                      <th className="px-6 py-3">STATUS</th>
                      <th className="px-6 py-3 text-right">TOTAL ITEMS</th>
                      <th className="px-6 py-3 text-center">ACTIONS</th>
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
                            <td className="px-6 py-4 font-medium text-blue-600">
                              <Link href={`/store/contractor-issue/${a._id}`} className="hover:underline">
                                {a.minNo || a.assignmentNumber}
                              </Link>
                            </td>
                            <td className="px-6 py-4">{new Date(a.minDate || a.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">{a.contractorId?.name || a.contractorId?.dynamicData?.displayName || 'Unknown'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                a.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                a.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium">{totalItems}</td>
                            <td className="px-6 py-4 flex items-center justify-center gap-2">
                              <Link href={`/store/contractor-issue/${a._id}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="View Details">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              {a.status !== 'Cancelled' && (
                                <>
                                  <Link href={`/store/contractor-issue/${a._id}/edit`}>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100" title="Edit MIN">
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                    onClick={() => handleCancel(a._id, a.minNo || a.assignmentNumber)}
                                    title="Cancel MIN"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </td>
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
      <ContractorIssueImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchAssignments}
      />
    </div>
  );
}
