"use client";

import { useEffect, useState } from "react";
import { getInwardRegister } from "@/features/store/api/store.api";
import { FileText, ListChecks, Upload, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InwardImportModal } from "@/features/store/components/InwardImportModal";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";

export default function StoreInwardRegisterPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    fetchInwardRegister();
  }, []);

  const fetchInwardRegister = async () => {
    try {
      setLoading(true);
      const res = await getInwardRegister();
      // res.data from the backend comes as { entries: [...] } for this specific API wrapper
      setEntries(res.data?.entries || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
    <div className="flex-1 bg-white min-h-screen p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Inward Register</h1>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center text-slate-500 hover:bg-slate-100 p-2 rounded-md border border-slate-200 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-[13px]">
              <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-slate-500" />
                Import Bulk GRNs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <DataTableTopControls
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalItems={totalItems}
          />
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-6 py-4">Inward ID</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">PO Number</th>
                    <th className="px-6 py-4">PI Number</th>
                    <th className="px-6 py-4">Circle</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No inward entries found for your search.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((entry: any) => (
                      <tr key={entry._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-blue-600">{entry.inwardId}</td>
                        <td className="px-6 py-4">{new Date(entry.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{entry.vendorName || '-'}</td>
                        <td className="px-6 py-4">{entry.poNumber || '-'}</td>
                        <td className="px-6 py-4 font-medium">{entry.purchaseInvoiceId?.invoiceNumber || '-'}</td>
                        <td className="px-6 py-4">{entry.circle || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                            entry.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                            entry.status === 'INWARDED' ? 'bg-blue-100 text-blue-700' :
                            entry.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {entry.status}
                          </span>
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
              totalItems={totalItems}
            />
        </div>
      </div>
      <InwardImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchInwardRegister}
      />
    </div>
  );
}
