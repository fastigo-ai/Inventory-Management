"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, RefreshCw, MoreHorizontal, Upload, Download, Loader2 } from "lucide-react";
import { getDIs, exportDIsToCsv } from "@/features/di/api/di.api";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DIImportModal } from "@/features/di/components/DIImportModal";

export default function DIPage() {
  const router = useRouter();
  const [dis, setDis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportDIsToCsv();
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer group">
          <h1 className="text-xl font-bold text-slate-800">All DI Registrations</h1>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchDIs} className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <Link href="/di/new" className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            New
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center text-slate-500 hover:bg-slate-100 p-2 rounded-md border border-slate-200 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-[13px]">
              <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-slate-500" />
                Import DI Registrations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer" disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-500" /> : <Download className="w-4 h-4 mr-2 text-slate-500" />}
                Export DI Registrations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-6">

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : dis.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No DIs found</h3>
              <p className="text-slate-500 mb-6">Create a DI registration after a Purchase Order is inspected.</p>
              <Link href="/di/new">
                <Button variant="outline">Create your first DI</Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">DI NUMBER</th>
                  <th className="px-6 py-3">PO NUMBER</th>
                  <th className="px-6 py-3">DATE</th>
                  <th className="px-6 py-3">STATUS</th>
                  <th className="px-6 py-3 text-right">ITEMS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dis.map(di => (
                  <tr 
                    key={di._id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (di.status === 'Draft') {
                        router.push(`/di/edit/${di._id}`);
                      } else {
                        // A dedicated view page doesn't exist yet, so we redirect to edit mode for now
                        router.push(`/di/edit/${di._id}`);
                      }
                    }}
                  >
                    <td className="px-6 py-4 font-medium text-blue-600">{di.diNumber}</td>
                    <td className="px-6 py-4">{di.purchaseOrderId?.purchaseOrderNumber || '-'}</td>
                    <td className="px-6 py-4">{new Date(di.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        di.status === 'Received' ? 'bg-green-100 text-green-700' :
                        di.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {di.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">{di.lineItems?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isImportModalOpen && (
        <DIImportModal
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
