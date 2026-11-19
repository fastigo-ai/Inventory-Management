"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoreTransfers } from "@/features/store/api/store.api";
import { Download, Plus, Upload, Clock, CheckCircle2, Truck, PackageCheck, XCircle, Send } from "lucide-react";
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
import { formatDate } from "@/shared/utils/date";
import { normalizeStoreName } from "@/shared/utils/store";
import { useResizableColumns } from "@/shared/hooks/useResizableColumns";
import { ResizableTh } from "@/shared/components/ResizableHeader";

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  srNo: 70,
  date: 110,
  vendorName: 180,
  description: 250,
  loaSerialNo: 130,
  loaQty: 90,
  unit: 80,
  transferQty: 120,
  minBookNo: 120,
  minNo: 110,
  minDate: 110,
  challanNo: 150,
  challanDate: 110,
  fromStore: 120,
  toStore: 120,
  transportName: 140,
  truckNumber: 130,
  grNumber: 110,
  grDate: 110,
  driverName: 140,
  driverMobile: 130,
  remarks: 200,
  status: 140,
  actions: 120,
};

export default function OutwardRegisterPage() {
  const router = useRouter();
  const { colWidths, handleMouseDown } = useResizableColumns('outward_register', DEFAULT_COL_WIDTHS);
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
      
      const flatList: any[] = [];
      let srNo = 1;
      allTransfers.forEach((t: any) => {
        if (t.items && t.items.length > 0) {
          t.items.forEach((item: any) => {
            flatList.push({
              srNo: srNo++,
              id: t._id,
              status: t.status,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending PD Approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
            Pending PD Approval
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-blue-500" />
            Approved (Ready)
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
            <Truck className="w-3 h-3 text-purple-500" />
            In Transit
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <PackageCheck className="w-3 h-3 text-emerald-600" />
            Received
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
            <XCircle className="w-3 h-3 text-red-500" />
            Rejected
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 whitespace-nowrap">{status}</span>;
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Sr. No', 'Status', 'Date', 'Name of Vendor', 'Description of Material', 'LOA Serial No', 'LOA Qty',
      'Unit', 'Transfer Qty', 'MIN BOOK No', 'MIN No', 'MIN Date', 'Challan No', 'Challan Date',
      'From', 'To', 'Transport', 'Truck No', 'GR No', 'GR Date', 'Driver Name', 'Mobile No', 'Remark'
    ].join(',');

    const csvData = transfers.map((t, idx) => {
      const esc = (s: any) => `"${String(s || '').replace(/"/g, '""')}"`;
      return [
        idx + 1,
        esc(t.status || 'Pending PD Approval'),
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
      <div className="p-3 sm:p-6 max-w-[1600px] mx-auto">
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
                  <table className="w-full text-sm text-left whitespace-nowrap table-fixed">
                    <thead className="bg-slate-50 border-y border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                      <tr>
                        <ResizableTh id="srNo" width={colWidths.srNo} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200 text-center">Sr. No</ResizableTh>
                        <ResizableTh id="date" width={colWidths.date} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Date</ResizableTh>
                        <ResizableTh id="vendorName" width={colWidths.vendorName} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Name of Vendor</ResizableTh>
                        <ResizableTh id="description" width={colWidths.description} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Description of Material</ResizableTh>
                        <ResizableTh id="loaSerialNo" width={colWidths.loaSerialNo} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">LOA Serial No</ResizableTh>
                        <ResizableTh id="loaQty" width={colWidths.loaQty} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">LOA Qty</ResizableTh>
                        <ResizableTh id="unit" width={colWidths.unit} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Unit</ResizableTh>
                        <ResizableTh id="transferQty" width={colWidths.transferQty} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200 bg-blue-50/70">Transfer Qty.</ResizableTh>
                        <ResizableTh id="minBookNo" width={colWidths.minBookNo} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">MIN BOOK No.</ResizableTh>
                        <ResizableTh id="minNo" width={colWidths.minNo} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">MIN No.</ResizableTh>
                        <ResizableTh id="minDate" width={colWidths.minDate} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">MIN Date</ResizableTh>
                        <ResizableTh id="challanNo" width={colWidths.challanNo} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Challan No.</ResizableTh>
                        <ResizableTh id="challanDate" width={colWidths.challanDate} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Challan Date</ResizableTh>
                        <ResizableTh id="fromStore" width={colWidths.fromStore} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">From</ResizableTh>
                        <ResizableTh id="toStore" width={colWidths.toStore} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">To</ResizableTh>
                        <ResizableTh id="transportName" width={colWidths.transportName} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Transport</ResizableTh>
                        <ResizableTh id="truckNumber" width={colWidths.truckNumber} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Truck No.</ResizableTh>
                        <ResizableTh id="grNumber" width={colWidths.grNumber} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">GR No.</ResizableTh>
                        <ResizableTh id="grDate" width={colWidths.grDate} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">GR Date</ResizableTh>
                        <ResizableTh id="driverName" width={colWidths.driverName} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Driver Name</ResizableTh>
                        <ResizableTh id="driverMobile" width={colWidths.driverMobile} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Mobile No.</ResizableTh>
                        <ResizableTh id="remarks" width={colWidths.remarks} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200">Remark</ResizableTh>
                        <ResizableTh id="status" width={colWidths.status} onResizeStart={handleMouseDown} className="px-4 py-3 border-r border-slate-200 text-center">Status</ResizableTh>
                        <th style={{ width: `${colWidths.actions}px`, minWidth: `${colWidths.actions}px` }} className="px-4 py-3 text-center sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.05)] border-l border-slate-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedData.length === 0 ? (
                        <tr>
                          <td colSpan={24} className="px-6 py-8 text-center text-slate-500">
                            No matching records found.
                          </td>
                        </tr>
                      ) : (
                        paginatedData.map((t: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td style={{ width: `${colWidths.srNo}px` }} className="px-4 py-3 border-r border-slate-100 text-center overflow-hidden text-ellipsis">{t.srNo}</td>
                            <td style={{ width: `${colWidths.date}px` }} className="px-4 py-3 border-r border-slate-100 overflow-hidden text-ellipsis">{formatDate(t.date)}</td>
                            <td style={{ width: `${colWidths.vendorName}px` }} className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800 overflow-hidden text-ellipsis" title={t.vendorName}>{t.vendorName}</td>
                            <td style={{ width: `${colWidths.description}px` }} className="px-4 py-3 border-r border-slate-100 overflow-hidden text-ellipsis" title={t.description}>{t.description}</td>
                            <td style={{ width: `${colWidths.loaSerialNo}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-500 overflow-hidden text-ellipsis">{t.loaSerialNo}</td>
                            <td style={{ width: `${colWidths.loaQty}px` }} className="px-4 py-3 border-r border-slate-100 font-medium text-slate-700 overflow-hidden text-ellipsis">{t.loaQty}</td>
                            <td style={{ width: `${colWidths.unit}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-500 overflow-hidden text-ellipsis">{t.unit}</td>
                            <td style={{ width: `${colWidths.transferQty}px` }} className="px-4 py-3 border-r border-slate-100 font-bold text-blue-700 bg-blue-50/50 overflow-hidden text-ellipsis">{t.transferQty}</td>
                            <td style={{ width: `${colWidths.minBookNo}px` }} className="px-4 py-3 border-r border-slate-100 overflow-hidden text-ellipsis">{t.minBookNo}</td>
                            <td style={{ width: `${colWidths.minNo}px` }} className="px-4 py-3 border-r border-slate-100 font-medium overflow-hidden text-ellipsis">{t.minNo}</td>
                            <td style={{ width: `${colWidths.minDate}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-500 overflow-hidden text-ellipsis">{formatDate(t.minDate)}</td>
                            <td style={{ width: `${colWidths.challanNo}px` }} className="px-4 py-3 border-r border-slate-100 overflow-hidden text-ellipsis" title={t.challanNo}>{t.challanNo}</td>
                            <td style={{ width: `${colWidths.challanDate}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-500 overflow-hidden text-ellipsis">{formatDate(t.challanDate)}</td>
                            <td style={{ width: `${colWidths.fromStore}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-600 overflow-hidden text-ellipsis">{normalizeStoreName(t.fromStore)}</td>
                            <td style={{ width: `${colWidths.toStore}px` }} className="px-4 py-3 border-r border-slate-100 font-medium text-slate-800 overflow-hidden text-ellipsis">{normalizeStoreName(t.toStore)}</td>
                            <td style={{ width: `${colWidths.transportName}px` }} className="px-4 py-3 border-r border-slate-100 overflow-hidden text-ellipsis" title={t.transportName}>{t.transportName}</td>
                            <td style={{ width: `${colWidths.truckNumber}px` }} className="px-4 py-3 border-r border-slate-100 overflow-hidden text-ellipsis" title={t.truckNumber}>{t.truckNumber}</td>
                            <td style={{ width: `${colWidths.grNumber}px` }} className="px-4 py-3 border-r border-slate-100 overflow-hidden text-ellipsis">{t.grNumber}</td>
                            <td style={{ width: `${colWidths.grDate}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-500 overflow-hidden text-ellipsis">{formatDate(t.grDate)}</td>
                            <td style={{ width: `${colWidths.driverName}px` }} className="px-4 py-3 border-r border-slate-100 overflow-hidden text-ellipsis" title={t.driverName}>{t.driverName}</td>
                            <td style={{ width: `${colWidths.driverMobile}px` }} className="px-4 py-3 border-r border-slate-100 overflow-hidden text-ellipsis">{t.driverMobile}</td>
                            <td style={{ width: `${colWidths.remarks}px` }} className="px-4 py-3 border-r border-slate-100 text-slate-500 overflow-hidden text-ellipsis" title={t.remarks}>{t.remarks}</td>
                            <td style={{ width: `${colWidths.status}px` }} className="px-4 py-3 border-r border-slate-100 text-center overflow-hidden text-ellipsis">{getStatusBadge(t.status)}</td>
                            <td style={{ width: `${colWidths.actions}px` }} className="px-4 py-3 text-center sticky right-0 bg-white group-hover:bg-slate-50 transition-colors z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.02)] border-l border-slate-200">
                              <div className="flex items-center justify-center gap-1.5">
                                {t.status === 'Approved' && (
                                  <button 
                                    onClick={() => router.push(`/store/transfers/dispatch/${t.id}`)}
                                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                                    title="Dispatch Material (PD Approved)"
                                  >
                                    <Send className="w-4 h-4" />
                                  </button>
                                )}
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
