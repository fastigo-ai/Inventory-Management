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
import { Download, Upload, Pencil, Trash2, Lock, Search, FileText, XCircle } from "lucide-react";
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
    <div className="flex-1 bg-slate-50 min-h-screen font-sans">
      <div className="px-6 py-6 lg:px-10 lg:py-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Store Receipts</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and approve incoming items from Purchase Invoices</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              className="h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md font-medium text-sm transition-colors"
            >
              <Download className="w-4 h-4 mr-2 text-slate-400" />
              Export CSV
            </Button>
            <Button 
              className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-colors shadow-sm"
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import CSV
            </Button>
            <input
              type="file"
              id="csv-upload"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Filter Section - Enterprise Style */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-4 items-end bg-slate-50/30">
            {isAdmin && (
              <>
                <div className="flex flex-col gap-1.5 w-[160px]">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Package</label>
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
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Circle</label>
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor</label>
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice / PO</label>
              <input
                type="text"
                placeholder="Search..."
                className={inputClass}
                value={filters.invoicePo}
                onChange={(e) => { setFilters((p) => ({ ...p, invoicePo: e.target.value })); setCurrentPage(1); }}
              />
            </div>

            <div className="flex flex-col gap-1.5 w-[140px]">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Range</label>
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Item / Temp</label>
              <input
                type="text"
                placeholder="Search..."
                className={inputClass}
                value={filters.itemTemp}
                onChange={(e) => { setFilters((p) => ({ ...p, itemTemp: e.target.value })); setCurrentPage(1); }}
              />
            </div>

            <div className="ml-auto flex items-end">
              <Button
                variant="ghost"
                className="h-9 px-3 text-slate-500 hover:text-slate-900 font-medium text-sm"
                onClick={() => {
                  setFilters({ package: "All", circle: "All", status: "All", vendor: "All", invoicePo: "", dateRange: "All", itemTemp: "", discrepancy: "All" });
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
          
          {/* Tabs for Status */}
          <div className="flex px-5 pt-3 gap-6 border-b border-slate-100 bg-white">
            <button
              onClick={() => { setFilters((p) => ({ ...p, status: 'All' })); setCurrentPage(1); }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                filters.status === 'All'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              All Receipts
            </button>
            <button
              onClick={() => { setFilters((p) => ({ ...p, status: 'PENDING_RECEIPT' })); setCurrentPage(1); }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                filters.status === 'PENDING_RECEIPT'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => { setFilters((p) => ({ ...p, status: 'APPROVED' })); setCurrentPage(1); }}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                filters.status === 'APPROVED'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Approved
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-5 py-3 bg-white flex items-center border-b border-slate-100">
            <Search className="w-4 h-4 text-slate-400 mr-3" />
            <input
              type="text"
              placeholder="Search by ID, Invoice No, Vendor..."
              className="w-full text-sm border-none focus:ring-0 p-0 text-slate-700 placeholder:text-slate-400 bg-transparent outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
                  <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Invoice & PO</th>
                  <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Item Details</th>
                  <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Received Qty</th>
                  <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">SRT</th>
                  <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">ACT</th>
                  <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Package</th>
                  <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Location</th>
                  <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Status</th>
                  <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-sm">Loading receipts...</p>
                      </div>
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                          <Search className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-base font-medium text-slate-700">No receipts found</p>
                        <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr 
                      key={entry._id} 
                      className={`hover:bg-slate-50/50 transition-colors group ${entry.status === 'VOIDED' ? 'opacity-60 bg-red-50/20' : ''}`}
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="font-medium text-slate-900">{entry.invoiceNumber || "-"}</div>
                        {entry.poNumber && <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><FileText className="w-3 h-3"/> PO: {entry.poNumber}</div>}
                        <div className="text-xs text-slate-400 mt-1">{entry.vendorName || "-"}</div>
                      </td>
                      <td className="px-5 py-4 align-top max-w-[250px] whitespace-normal">
                        <div className="font-medium text-slate-800 text-sm leading-tight line-clamp-2" title={entry.itemName || entry.itemDescription || ""}>
                          {entry.itemName || entry.itemDescription || "-"}
                        </div>
                        {entry.tempCode && (
                          <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-mono mt-2 border border-blue-100">
                            Code: {entry.tempCode}
                          </div>
                        )}
                        {entry.serialNumber && (
                          <div className="text-[11px] font-mono text-slate-500 mt-1">S/N: {entry.serialNumber}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-semibold text-slate-800 text-base">{entry.totalQty ?? entry.invoiceQty ?? 0}</span>
                          <span className="text-slate-500 text-xs font-medium">{entry.unit || ""}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top text-sm font-medium text-slate-700">
                        {entry.srt ?? "-"}
                      </td>
                      <td className="px-5 py-4 align-top text-sm font-medium text-slate-700">
                        {entry.act ?? "-"}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className="inline-flex items-center text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                          {entry.package || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="font-medium text-slate-700 text-sm">{entry.circle || "-"}</div>
                        {entry.subcircle && <div className="text-xs text-slate-500 mt-1">{entry.subcircle}</div>}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            entry.status === "APPROVED" || entry.status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                              : entry.status === "VOIDED"
                              ? "bg-red-50 text-red-700 border-red-200/60"
                              : "bg-amber-50 text-amber-700 border-amber-200/60"
                          }`}
                        >
                          {entry.status === "APPROVED" ? "Approved" : 
                           entry.status === "VERIFIED" ? "Verified" :
                           entry.status === "VOIDED" ? "Voided" : "Pending Receipt"}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <div className="flex justify-end items-center gap-2">
                          {entry.status === "PENDING_RECEIPT" && (
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleApprove(entry._id); }}
                              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs rounded-md transition-colors"
                            >
                              Approve
                            </Button>
                          )}
                          
                          {entry.status !== "VOIDED" ? (
                            <Button
                              onClick={(e) => { e.stopPropagation(); router.push(`/store/inventory/inward/entry/${entry._id}`); }}
                              className={`h-8 px-3 text-xs rounded-md transition-colors ${
                                entry.status === 'APPROVED' || entry.status === 'VERIFIED'
                                  ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm' 
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                              }`}
                            >
                              {entry.status === 'APPROVED' || entry.status === 'VERIFIED' ? 'View Details' : 'Register GRN'}
                            </Button>
                          ) : null}
                          
                          {/* Actions Menu */}
                          {entry.status !== "VOIDED" && (
                            <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                              {(entry.status === "APPROVED" || entry.status === "VERIFIED") && !isAdmin ? (
                                <div title="Approved entries require Admin override" className="p-1">
                                  <Lock className="w-3.5 h-3.5 text-slate-300" />
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVoidTargetId(entry._id);
                                    setIsVoidModalOpen(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                  title="Void Entry"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
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
