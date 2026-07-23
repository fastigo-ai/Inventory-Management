"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPendingDIs } from "@/features/store/api/store.api";
import { FileText, ListChecks, Upload, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InwardImportModal } from "@/features/store/components/InwardImportModal";

export default function StoreInventoryPage() {
  const router = useRouter();
  const [dis, setDis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    fetchDIs();
  }, []);

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

  return (
    <div className="flex-1 bg-white min-h-screen p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Inventory Management</h1>
          
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

      </div>
      
      {isImportModalOpen && (
        <InwardImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            fetchDIs();
          }}
        />
      )}
    </div>
  );
}
