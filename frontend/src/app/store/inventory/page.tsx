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
                    <th className="px-4 py-4">Inward ID</th>
                    <th className="px-4 py-4">Date</th>
                    <th className="px-4 py-4">Vendor & PI</th>
                    <th className="px-4 py-4">Item Details</th>
                    <th className="px-4 py-4 text-right">Challan Qty</th>
                    <th className="px-4 py-4 text-right">Recv Qty</th>
                    <th className="px-4 py-4 text-right">Accpt Qty</th>
                    <th className="px-4 py-4 text-right">Amount</th>
                    <th className="px-4 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
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
                        <td className="px-4 py-4 font-medium text-blue-600 whitespace-nowrap">{entry.inwardId}</td>
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
