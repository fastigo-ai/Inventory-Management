"use client";

import { useEffect, useState } from "react";
import { getInwardRegister } from "@/features/store/api/store.api";
import { FileText, ListChecks, Upload, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InwardImportModal } from "@/features/store/components/InwardImportModal";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";
import { InwardStatistics } from "@/features/store/components/InwardStatistics";
import { BarChart3 } from "lucide-react";

export default function StoreInwardRegisterPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const [statusTab, setStatusTab] = useState<'All' | 'PENDING_RECEIPT' | 'APPROVED'>('All');

  useEffect(() => {
    fetchInwardRegister();
  }, [statusTab]);

  const fetchInwardRegister = async () => {
    try {
      setLoading(true);
      const res = await getInwardRegister({ status: statusTab });
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
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center justify-center px-3 py-2 rounded-md border transition-colors text-sm font-medium ${
                showStats 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showStats ? "Hide Dashboard" : "Dashboard"}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-center text-slate-500 hover:bg-slate-100 p-2 rounded-md border border-slate-200 transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-[13px]">
              <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-slate-500" />
                Import Bulk GRNs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const csvRows = [];
                // Headers
                csvRows.push(['Inward ID', 'Date', 'Vendor', 'PO Number', 'PI Number', 'Circle', 'Status', 'Material Description', 'LOA Serial No', 'Temp Code', 'HSN Code', 'Unit', 'Challan Qty', 'Received Qty', 'Rejected Qty', 'Accepted Qty', 'Pack Type', 'Pack Unit', 'Pack Qty', 'Rate', 'GST', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total Amount', 'Remarks'].join(','));
                
                // Data rows
                entries.forEach((entry: any) => {
                  const date = new Date(entry.createdAt).toLocaleDateString();
                  // Avoid commas breaking CSV by wrapping strings in quotes
                  const esc = (s: any) => `"${(s || '').toString().replace(/"/g, '""')}"`;
                  csvRows.push([
                    esc(entry.inwardId),
                    esc(date),
                    esc(entry.vendorName),
                    esc(entry.poNumber),
                    esc(entry.purchaseInvoiceId?.invoiceNumber),
                    esc(entry.circle),
                    esc(entry.status),
                    esc(entry.description),
                    esc(entry.serialNumber),
                    esc(entry.tempCode),
                    esc(entry.hsnCode),
                    esc(entry.unit),
                    esc(entry.challanQty),
                    esc(entry.totalQty),
                    esc(entry.rejectedQty),
                    esc(entry.invoiceQty), // This is the Accepted Qty
                    esc(entry.packType),
                    esc(entry.packUnit),
                    esc(entry.packQty),
                    esc(entry.rate),
                    esc(entry.gst),
                    esc(entry.taxableAmount),
                    esc(entry.cgst),
                    esc(entry.sgst),
                    esc(entry.igst),
                    esc(entry.amount),
                    esc(entry.remarks)
                  ].join(','));
                });

                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Inward_Register_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              }} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2 text-slate-500" />
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* Dashboard Section */}
        {showStats && !loading && entries.length > 0 && (
          <div className="mb-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <InwardStatistics entries={entries} />
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* Tabs for Status */}
          <div className="flex px-5 pt-3 gap-6 border-b border-slate-100 bg-white">
            <button
              onClick={() => { setStatusTab('All'); setCurrentPage(1); }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                statusTab === 'All'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setStatusTab('PENDING_RECEIPT'); setCurrentPage(1); }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                statusTab === 'PENDING_RECEIPT'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => { setStatusTab('APPROVED'); setCurrentPage(1); }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                statusTab === 'APPROVED'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Approved
            </button>
          </div>

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
                    <th className="px-4 py-4">Inward ID</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Vendor & PI</th>
                    <th className="px-4 py-4">Item Details</th>
                    <th className="px-4 py-4 text-right">Challan Qty</th>
                    <th className="px-4 py-4 text-right">Total Inv Qty</th>
                    <th className="px-4 py-4 text-right">SRT</th>
                    <th className="px-4 py-4 text-right">ACT</th>
                    <th className="px-4 py-4 text-right">Received Qty</th>
                    <th className="px-4 py-4 text-right">Amount</th>
                    <th className="px-4 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No inward entries found for your search.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((entry: any) => (
                      <tr 
                        key={entry._id} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/store/inventory/inward/entry/${entry._id}`}
                      >
                        <td className="px-4 py-4 font-medium text-blue-600 whitespace-nowrap">
                          {entry.inwardId || (entry._id ? `INW-${entry._id.toString().slice(-6).toUpperCase()}` : '-')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-slate-600">{new Date(entry.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-4 min-w-[200px]">
                          <div className="font-semibold text-slate-800">{entry.vendorName || '-'}</div>
                          <div className="text-xs text-slate-500 mt-0.5">PI: {entry.purchaseInvoiceId?.invoiceNumber || '-'}</div>
                        </td>
                        <td className="px-4 py-4 max-w-[250px] truncate" title={entry.description}>
                          <div className="font-semibold text-slate-800">{entry.tempCode || '-'}</div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">{entry.description || '-'}</div>
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-slate-700">{entry.challanQty || 0}</td>
                        <td className="px-4 py-4 text-right font-medium text-slate-700">{entry.totalQty || 0}</td>
                        <td className="px-4 py-4 text-right font-medium text-slate-700">{entry.srt ?? '-'}</td>
                        <td className="px-4 py-4 text-right font-medium text-slate-700">{entry.act ?? '-'}</td>
                        <td className="px-4 py-4 text-right font-bold text-emerald-600">{entry.invoiceQty || 0}</td>
                        <td className="px-4 py-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                          ₹{(entry.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap ${
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
