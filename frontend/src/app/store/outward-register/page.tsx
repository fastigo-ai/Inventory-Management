"use client";

import { useEffect, useState } from "react";
import { getStoreTransfers } from "@/features/store/api/store.api";
import { Download, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { OutwardImportModal } from "@/features/store/components/OutwardImportModal";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";
import { TransferDetailModal } from "@/features/store/components/TransferDetailModal";
import { TransferEditModal } from "@/features/store/components/TransferEditModal";
import { deleteStoreTransfer } from "@/features/store/api/store.api";
import { toast } from "sonner";
import { Eye, Trash2, Edit, LayoutDashboard, List as ListIcon } from "lucide-react";
import { OutwardTransferStatistics } from "@/features/store/components/OutwardTransferStatistics";

export default function OutwardRegisterPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'dashboard'>('list');
  
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await getStoreTransfers({ registerType: 'OUTWARD' });
      const allTransfers = res.data || [];
      
      const dispatchedTransfers = allTransfers.filter((t: any) => 
        t.status === 'IN_TRANSIT' || t.status === 'RECEIVED'
      );
      
      const flatList: any[] = [];
      let srNo = 1;
      dispatchedTransfers.forEach((t: any) => {
        if (t.items && t.items.length > 0) {
          t.items.forEach((item: any) => {
            flatList.push({
              srNo: srNo++,
              id: t._id,
              date: t.requestDate,
              vendorName: t.vendorName || "-",
              description: item.description,
              loaSerialNo: item.loaSerialNo || "-",
              loaQty: item.loaQty !== undefined && item.loaQty !== null ? item.loaQty : "-",
              unit: item.unit,
              transferQty: item.dispatchedQty || item.requestedQty,
              minBookNo: t.minBookNo || "-",
              minNo: t.minNo || "-",
              minDate: t.minDate,
              challanNo: t.challanNo || "-",
              challanDate: t.challanDate,
              fromStore: t.fromStore,
              toStore: t.toStore,
              transportName: t.transportName || "-",
              truckNumber: t.truckNumber || "-",
              grNumber: t.grNumber || "-",
              grDate: t.grDate,
              driverName: t.driverName || "-",
              driverMobile: t.driverMobile || "-",
              remarks: t.remarks || "-"
            });
          });
        }
      });

      setTransfers(flatList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: any) => d ? new Date(d).toLocaleDateString() : "-";

  const exportToCSV = () => {
    const headers = [
      'Sr. No', 'Date', 'Name of Vendor', 'Description of Material', 'LOA Serial No', 'LOA Qty',
      'Unit', 'Transfer Qty', 'MIN BOOK No', 'MIN No', 'MIN Date', 'Challan No', 'Challan Date',
      'From', 'To', 'Transport', 'Truck No', 'GR No', 'GR Date', 'Driver Name', 'Mobile No', 'Remark'
    ].join(',');

    const csvData = transfers.map((t, idx) => {
      const esc = (s: any) => `"${String(s || '').replace(/"/g, '""')}"`;
      return [
        idx + 1,
        esc(formatDate(t.date)),
        esc(t.vendorName),
        esc(t.description),
        esc(t.loaSerialNo),
        esc(t.loaQty),
        esc(t.unit),
        esc(t.transferQty),
        esc(t.minBookNo),
        esc(t.minNo),
        esc(formatDate(t.minDate)),
        esc(t.challanNo),
        esc(formatDate(t.challanDate)),
        esc(t.fromStore),
        esc(t.toStore),
        esc(t.transportName),
        esc(t.truckNumber),
        esc(t.grNumber),
        esc(formatDate(t.grDate)),
        esc(t.driverName),
        esc(t.driverMobile),
        esc(t.remarks)
      ].join(',');
    }).join('\n');

    const blob = new Blob([headers + '\n' + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `outward_register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transfer? This action cannot be undone.")) return;
    try {
      await deleteStoreTransfer(id);
      toast.success("Transfer deleted successfully");
      fetchTransfers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete transfer");
    }
  };

  const handleView = (id: string) => {
    setSelectedTransferId(id);
    setIsDetailOpen(true);
  };

  const handleEdit = (id: string) => {
    setSelectedTransferId(id);
    setIsEditOpen(true);
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Transfer to Other Store (Outward Register)</h1>
            <p className="text-sm text-slate-500 mt-1">Track and analyze materials transferred out to other stores</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm mr-2">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <ListIcon className="w-4 h-4 mr-2" />
                List
              </button>
              <button
                onClick={() => setViewMode('dashboard')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </button>
            </div>
            <Button 
              variant="outline"
              className="text-slate-600 border-slate-200 hover:bg-slate-50 bg-white shadow-sm"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button 
              variant="outline"
              className="text-slate-600 border-slate-200 hover:bg-slate-50 bg-white shadow-sm"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Link href="/store/outward-register/new">
              <Button className="bg-[#0076f2] hover:bg-blue-600 shadow-sm text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Transfer Out
              </Button>
            </Link>
          </div>
        </div>

        {viewMode === 'dashboard' ? (
          <OutwardTransferStatistics data={transfers} />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading register...</div>
            ) : transfers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No outward transfers found.
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
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                      <tr>
                        <th className="px-4 py-3 border-r border-slate-200">Sr. No</th>
                        <th className="px-4 py-3 border-r border-slate-200">Date</th>
                        <th className="px-4 py-3 border-r border-slate-200">Name of Vendor</th>
                        <th className="px-4 py-3 border-r border-slate-200">Description of Material</th>
                        <th className="px-4 py-3 border-r border-slate-200">LOA Serial No</th>
                        <th className="px-4 py-3 border-r border-slate-200">LOA Qty</th>
                        <th className="px-4 py-3 border-r border-slate-200">Unit</th>
                        <th className="px-4 py-3 border-r border-slate-200 bg-blue-50">Transfer Qty.</th>
                        <th className="px-4 py-3 border-r border-slate-200">MIN BOOK No.</th>
                        <th className="px-4 py-3 border-r border-slate-200">MIN No.</th>
                        <th className="px-4 py-3 border-r border-slate-200">MIN Date</th>
                        <th className="px-4 py-3 border-r border-slate-200">Challan No.</th>
                        <th className="px-4 py-3 border-r border-slate-200">Challan Date</th>
                        <th className="px-4 py-3 border-r border-slate-200">From</th>
                        <th className="px-4 py-3 border-r border-slate-200">To</th>
                        <th className="px-4 py-3 border-r border-slate-200">Transport</th>
                        <th className="px-4 py-3 border-r border-slate-200">Truck No.</th>
                        <th className="px-4 py-3 border-r border-slate-200">GR No.</th>
                        <th className="px-4 py-3 border-r border-slate-200">GR Date</th>
                        <th className="px-4 py-3 border-r border-slate-200">Driver Name</th>
                        <th className="px-4 py-3 border-r border-slate-200">Mobile No.</th>
                        <th className="px-4 py-3 border-r border-slate-200">Remark</th>
                        <th className="px-4 py-3 text-center sticky right-0 bg-slate-50 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan={20} className="px-6 py-8 text-center text-slate-500">
                            No matching records found.
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((t: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 border-r border-slate-100 text-center">{t.srNo}</td>
                            <td className="px-4 py-3 border-r border-slate-100">{formatDate(t.date)}</td>
                            <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800">{t.vendorName}</td>
                            <td className="px-4 py-3 border-r border-slate-100">{t.description}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{t.loaSerialNo}</td>
                            <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-700">{t.loaQty}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{t.unit}</td>
                            <td className="px-4 py-3 border-r border-slate-100 font-bold text-blue-700 bg-blue-50/50">{t.transferQty}</td>
                            <td className="px-4 py-3 border-r border-slate-100">{t.minBookNo}</td>
                            <td className="px-4 py-3 border-r border-slate-100 font-medium">{t.minNo}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{formatDate(t.minDate)}</td>
                            <td className="px-4 py-3 border-r border-slate-100">{t.challanNo}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{formatDate(t.challanDate)}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-600">{t.fromStore}</td>
                            <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800">{t.toStore}</td>
                            <td className="px-4 py-3 border-r border-slate-100">{t.transportName}</td>
                            <td className="px-4 py-3 border-r border-slate-100">{t.truckNumber}</td>
                            <td className="px-4 py-3 border-r border-slate-100">{t.grNumber}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{formatDate(t.grDate)}</td>
                            <td className="px-4 py-3 border-r border-slate-100">{t.driverName}</td>
                            <td className="px-4 py-3 border-r border-slate-100">{t.driverMobile}</td>
                            <td className="px-4 py-3 border-r border-slate-100 text-slate-500">{t.remarks}</td>
                            <td className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 transition-colors z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => handleView(t.id)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleEdit(t.id)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(t.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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
                  pageSize={pageSize}
                  setPageSize={setPageSize}
                  totalItems={totalItems}
                />
              </>
            )}
          </div>
        )}
      </div>
      <OutwardImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchTransfers}
      />
      <TransferDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        transferId={selectedTransferId}
      />
      <TransferEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        transferId={selectedTransferId}
        onSuccess={fetchTransfers}
      />
    </div>
  );
}
