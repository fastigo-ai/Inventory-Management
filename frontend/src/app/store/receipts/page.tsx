"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getPendingStoreReceipts,
  approveStoreReceipt,
  bulkImportInwardEntries,
  getStoreReceiptFilterOptions,
} from "@/features/store/api/store.api";
import Papa from "papaparse";
import { Download, Upload, Pencil, Trash2, Lock } from "lucide-react";
import { DataTableBottomControls } from "@/shared/components/DataTableControls";
import { useAuthStore } from "@/shared/store/auth.store";
import { voidInwardEntry } from "@/features/store/api/store.api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function StoreReceiptsPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const permissions = user?.role?.permissions || [];
  const isAdmin =
    user?.role?.name === "Admin" ||
    user?.role?.name === "Super Admin" ||
    permissions.includes("*");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Dropdown options fetched from backend
  const [packageOptions, setPackageOptions] = useState<string[]>([]);
  const [circleOptions, setCircleOptions] = useState<string[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);

  // Void Modal State
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  const [filters, setFilters] = useState({
    package: "All",
    circle: "All",
    status: "All",
    vendor: "All",
    invoicePo: "",
    dateRange: "All",
    itemTemp: "",
    discrepancy: "All",
  });

  // Load dropdown options once on mount
  useEffect(() => {
    getStoreReceiptFilterOptions()
      .then((res) => {
        setPackageOptions(res.data?.packages || []);
        setCircleOptions(res.data?.circles || []);
        setVendorOptions(res.data?.vendors || []);
      })
      .catch((err) => {
        console.error("filter-options 404 URL:", err.config?.url, "Status:", err.response?.status);
      });
  }, []);

  const buildParams = (extraParams?: any) => {
    const params: any = { page: currentPage, limit: pageSize, ...extraParams };
    if (searchTerm) params.search = searchTerm;
    if (isAdmin) {
      if (filters.package && filters.package !== "All") params.package = filters.package;
      if (filters.circle && filters.circle !== "All") params.circle = filters.circle;
    }
    if (filters.status !== "All") params.status = filters.status;
    if (filters.vendor && filters.vendor !== "All") params.vendor = filters.vendor;
    if (filters.invoicePo) params.invoicePo = filters.invoicePo;
    if (filters.itemTemp) params.itemTemp = filters.itemTemp;
    if (filters.discrepancy !== "All") params.discrepancy = filters.discrepancy;
    if (filters.dateRange !== "All") params.dateRange = filters.dateRange;
    return params;
  };

  const fetchReceipts = () => {
    setLoading(true);
    getPendingStoreReceipts(buildParams())
      .then((res) => {
        setEntries(res.data?.entries || []);
        setTotalItems(res.data?.total || 0);
        setTotalPages(res.data?.totalPages || 0);
      })
      .catch((err) => {
        console.error("fetchReceipts 404? URL:", err.config?.url, "Status:", err.response?.status, err.message);
        setEntries([]);
        setTotalItems(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReceipts();
  }, [currentPage, pageSize, searchTerm, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (entryId: string) => {
    if (!confirm("Are you sure you want to approve this item receipt?")) return;
    try {
      await approveStoreReceipt(entryId);
      fetchReceipts();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to approve receipt");
    }
  };

  const handleVoid = async () => {
    if (!voidTargetId) return;
    if (isAdmin && !voidReason) {
      alert("Please provide a reason for voiding.");
      return;
    }
    
    setIsVoiding(true);
    try {
      await voidInwardEntry(voidTargetId, voidReason);
      setVoidTargetId(null);
      setVoidReason("");
      setIsVoidModalOpen(false);
      fetchReceipts();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to void entry");
    } finally {
      setIsVoiding(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const res = await getPendingStoreReceipts(buildParams({ page: undefined, limit: undefined, export: "true" }));
      const allEntries = res.data?.entries || [];
      if (!allEntries.length) {
        alert("No entries to export with current filters");
        return;
      }
      const csvData = allEntries.map((entry: any) => ({
        // --- Identity ---
        "Entry ID": entry._id,

        // --- Auto-filled from Invoice (read-only in GRN form) ---
        "PO Number": entry.poNumber || "",
        "PO Date": entry.poDate ? entry.poDate.split("T")[0] : "",
        "Vendor Name": entry.vendorName || "",
        "Billing From": entry.billingFrom || "",
        "DI Ref No": entry.diRefNo || "",
        "Circle": entry.circle || "",
        "Package": entry.package || "",

        // --- Document & Transport Details ---
        "Invoice Number": entry.invoiceNumber || "",
        "Invoice Date": entry.invoiceDate ? entry.invoiceDate.split("T")[0] : "",
        "Transport Name": entry.transportName || "",
        "Truck Number": entry.truckNumber || "",
        "GR Number": entry.grNumber || "",
        "GR Date": entry.grDate ? entry.grDate.split("T")[0] : "",
        "Bilty Number": entry.biltyNumber || "",
        "Received Date": entry.receivedDate
          ? entry.receivedDate.split("T")[0]
          : new Date().toISOString().split("T")[0],
        "Remarks": entry.remarks || "",

        // --- Material Details (auto-filled from invoice) ---
        "Material Description": entry.itemName || entry.itemDescription || "",
        "LOA Serial No": entry.serialNumber || "",
        "Temp Code": entry.tempCode || "",
        "HSN Code": entry.hsnCode || "",
        "Unit": entry.unit || "",

        // --- Quantities (all user-input, none calculatable) ---
        "Challan Qty": entry.challanQty ?? "",          // original invoice qty
        "Received Qty": entry.totalQty ?? "",           // qty store physically received
        "Rejected Qty": entry.rejectedQty ?? "",        // qty rejected
        "Accepted Qty": entry.invoiceQty ?? "",         // qty accepted (user can override)

        // --- Packing ---
        "Pack Type": entry.packingList?.[0]?.packType || "",
        "Pack Unit": entry.packingList?.[0]?.packUnit || "",
        "Pack Qty": entry.packingList?.[0]?.quantity ?? "",

        // --- Pricing (inputs only — Taxable Amt / CGST / SGST / IGST / Total are calculatable, excluded) ---
        "Rate (₹)": entry.rate ?? "",
        "GST %": entry.gst || "",
      }));
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `store_receipts_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Failed to export to CSV");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await bulkImportInwardEntries(results.data as any[]);
          alert(`Import Completed.\nSuccess: ${res.data?.success || 0}\nFailed: ${res.data?.failed || 0}`);
          fetchReceipts();
        } catch (err: any) {
          alert(err.response?.data?.message || "Failed to bulk import inward entries");
          setLoading(false);
        }
        if (e.target) e.target.value = "";
      },
      error: () => {
        alert("Failed to parse CSV file");
        setLoading(false);
        if (e.target) e.target.value = "";
      },
    });
  };

  const selectClass =
    "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400";
  const inputClass =
    "h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400";

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Store Receipts (Pending Items)</h1>
            <p className="text-sm text-slate-500 mt-1">Approve incoming items from Purchase Invoices</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={exportToCSV} className="h-9 px-4 text-slate-700 bg-white border-slate-200 hover:bg-slate-50">
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Bulk Import CSV"
              />
              <Button className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white pointer-events-none">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6 flex flex-wrap gap-4 items-end shadow-sm">
          {isAdmin && (
            <>
              <div className="flex flex-col gap-1.5 w-[160px]">
                <label className="text-xs font-medium text-slate-600">Package</label>
                <select
                  className={selectClass}
                  value={filters.package}
                  onChange={(e) => { setFilters((p) => ({ ...p, package: e.target.value })); setCurrentPage(1); }}
                >
                  <option value="All">All Packages</option>
                  {packageOptions.map((pkg) => (
                    <option key={pkg} value={pkg}>{pkg}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 w-[160px]">
                <label className="text-xs font-medium text-slate-600">Circle</label>
                <select
                  className={selectClass}
                  value={filters.circle}
                  onChange={(e) => { setFilters((p) => ({ ...p, circle: e.target.value })); setCurrentPage(1); }}
                >
                  <option value="All">All Circles</option>
                  {circleOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5 w-[160px]">
            <label className="text-xs font-medium text-slate-600">Receipt Status</label>
            <select
              className={selectClass}
              value={filters.status}
              onChange={(e) => { setFilters((p) => ({ ...p, status: e.target.value })); setCurrentPage(1); }}
            >
              <option value="All">All Statuses</option>
              <option value="PENDING_RECEIPT">Pending Receipt</option>
              <option value="APPROVED">Approved / Completed</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-[160px]">
            <label className="text-xs font-medium text-slate-600">Vendor</label>
            <select
              className={selectClass}
              value={filters.vendor}
              onChange={(e) => { setFilters((p) => ({ ...p, vendor: e.target.value })); setCurrentPage(1); }}
            >
              <option value="All">All Vendors</option>
              {vendorOptions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-[160px]">
            <label className="text-xs font-medium text-slate-600">Invoice / PO No.</label>
            <input
              type="text"
              placeholder="Search..."
              className={inputClass}
              value={filters.invoicePo}
              onChange={(e) => { setFilters((p) => ({ ...p, invoicePo: e.target.value })); setCurrentPage(1); }}
            />
          </div>

          <div className="flex flex-col gap-1.5 w-[140px]">
            <label className="text-xs font-medium text-slate-600">Date Range</label>
            <select
              className={selectClass}
              value={filters.dateRange}
              onChange={(e) => { setFilters((p) => ({ ...p, dateRange: e.target.value })); setCurrentPage(1); }}
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-[160px]">
            <label className="text-xs font-medium text-slate-600">Item / Temp Code</label>
            <input
              type="text"
              placeholder="Search..."
              className={inputClass}
              value={filters.itemTemp}
              onChange={(e) => { setFilters((p) => ({ ...p, itemTemp: e.target.value })); setCurrentPage(1); }}
            />
          </div>

          <div className="flex flex-col gap-1.5 w-[170px]">
            <label className="text-xs font-medium text-slate-600">Discrepancy</label>
            <select
              className={selectClass}
              value={filters.discrepancy}
              onChange={(e) => { setFilters((p) => ({ ...p, discrepancy: e.target.value })); setCurrentPage(1); }}
            >
              <option value="All">All Quantities</option>
              <option value="Quantity Mismatch">Quantity Mismatch</option>
            </select>
          </div>

          <div className="ml-auto flex items-end">
            <Button
              variant="ghost"
              className="h-9 text-slate-500 hover:text-slate-900"
              onClick={() => {
                setFilters({ package: "All", circle: "All", status: "All", vendor: "All", invoicePo: "", dateRange: "All", itemTemp: "", discrepancy: "All" });
                setSearchTerm("");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm mb-0 flex items-center px-4 py-2 mb-px">
          <svg className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search all columns..."
            className="flex-1 text-sm bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-y border-slate-200">
                    <tr>
                      <th className="px-6 py-3">INVOICE NUMBER</th>
                      <th className="px-6 py-3">ITEM DETAILS</th>
                      <th className="px-6 py-3">LOA SR NO.</th>
                      <th className="px-6 py-3">QTY</th>
                      <th className="px-6 py-3">SRT</th>
                      <th className="px-6 py-3">ACT</th>
                      <th className="px-6 py-3">PACKAGE</th>
                      <th className="px-6 py-3">CIRCLE/SUBCIRCLE</th>
                      <th className="px-6 py-3">STATUS</th>
                      <th className="px-6 py-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <p className="text-lg font-medium text-slate-700 mb-1">No records found</p>
                          <p className="text-sm">Try adjusting your filters or clearing them to see all items.</p>
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900">{entry.invoiceNumber}</td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{entry.itemName || "-"}</div>
                            {entry.itemDescription && (
                              <div className="text-xs text-slate-500 max-w-[250px] truncate" title={entry.itemDescription}>
                                {entry.itemDescription}
                              </div>
                            )}
                            <div className="text-xs font-mono text-slate-400 mt-0.5">Temp: {entry.tempCode || "-"}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{entry.serialNumber || "-"}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-medium text-slate-800">{entry.invoiceQty || 0}</span> <span className="text-slate-500 text-xs">{entry.unit || ""}</span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-700">{entry.srt || "-"}</td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-700">{entry.act || "-"}</td>
                          <td className="px-6 py-4 text-xs">{entry.package || "-"}</td>
                          <td className="px-6 py-4 text-xs">
                            <div className="font-medium text-slate-700">{entry.circle || "-"}</div>
                            {entry.subcircle && <div className="text-slate-500 mt-0.5">{entry.subcircle}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                entry.status === "APPROVED"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {entry.status === "APPROVED" ? "Approved" : "Pending Receipt"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                            {entry.status === "PENDING_RECEIPT" && (
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleApprove(entry._id); }}
                                className="h-8 bg-green-600 hover:bg-green-700 text-white"
                              >
                                Approve
                              </Button>
                            )}
                            {entry.status !== "VOIDED" ? (
                              <Button
                                onClick={(e) => { e.stopPropagation(); router.push(`/store/inventory/inward/entry/${entry._id}`); }}
                                className={`h-8 text-white ${entry.status === 'APPROVED' ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                              >
                                {entry.status === 'APPROVED' ? 'View Details' : 'Register GRN'}
                              </Button>
                            ) : (
                              <span className="text-xs text-red-500 font-medium px-2">VOIDED</span>
                            )}
                            
                            {/* Action Icons */}
                            {entry.status !== "VOIDED" && (
                              <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                                {(entry.status === "APPROVED" || entry.status === "VERIFIED") && !isAdmin ? (
                                  <div title="Approved entries require Admin override">
                                    <Lock className="w-4 h-4 text-slate-300" />
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/store/inventory/inward/${entry._id}/edit`);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                                      title={isAdmin && (entry.status === "APPROVED" || entry.status === "VERIFIED") ? "Admin Edit" : "Edit"}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setVoidTargetId(entry._id);
                                        setIsVoidModalOpen(true);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                      title={isAdmin && (entry.status === "APPROVED" || entry.status === "VERIFIED") ? "Admin Void" : "Void"}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
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
                pageSize={pageSize}
                setPageSize={setPageSize}
                totalItems={totalItems}
              />
            </>
          )}
        </div>
      </div>

      <Dialog open={isVoidModalOpen} onOpenChange={setIsVoidModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void GRN</DialogTitle>
            <DialogDescription>
              Are you sure you want to void this inward register entry? This action will set its status to VOIDED.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Audit Reason <span className="text-red-500">*</span>
            </label>
            <Input 
              value={voidReason} 
              onChange={(e) => setVoidReason(e.target.value)} 
              placeholder="Reason for voiding..." 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVoidModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={isVoiding || !voidReason.trim()}>
              {isVoiding ? "Voiding..." : "Confirm Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
