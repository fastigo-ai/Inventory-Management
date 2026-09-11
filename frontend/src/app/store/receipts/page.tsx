"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getPendingStoreReceipts,
  approveStoreReceipt,
  bulkImportInwardEntries,
  getStoreReceiptFilterOptions,
} from "@/features/store/api/store.api";
import Papa from "papaparse";
import { Download, Upload, Lock, Search, FileText, XCircle, ChevronRight, Package, CheckCircle2 } from "lucide-react";
import { DataTableBottomControls } from "@/shared/components/DataTableControls";
import { useAuthStore } from "@/shared/store/auth.store";
import { voidInwardEntry } from "@/features/store/api/store.api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Group flat entries array into invoices
function groupByInvoice(entries: any[]) {
  const map: Record<string, { invoiceKey: string; purchaseInvoiceId: string; invoiceNumber: string; vendorName: string; poNumber: string; circle: string; subcircle: string; package: string; items: any[] }> = {};
  for (const entry of entries) {
    // purchaseInvoiceId may be a populated object or a plain ObjectId string
    const invoiceIdRaw = entry.purchaseInvoiceId;
    const invoiceIdStr = invoiceIdRaw?._id?.toString() || invoiceIdRaw?.toString() || '';
    // Group key = invoice + circle + subcircle + package — ensures each Store Manager sees only their scope
    const key = `${invoiceIdStr}_${entry.circle || ''}_${entry.subcircle || ''}_${entry.package || ''}`;
    if (!map[key]) {
      map[key] = {
        invoiceKey: key,
        purchaseInvoiceId: invoiceIdStr,
        invoiceNumber: entry.invoiceNumber || '-',
        vendorName: entry.vendorName || '-',
        poNumber: entry.poNumber || '-',
        circle: entry.circle || '-',
        subcircle: entry.subcircle || '',
        package: entry.package || '-',
        items: [],
      };
    }
    map[key].items.push(entry);
  }
  return Object.values(map);
}

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
        console.error("fetchReceipts error:", err.config?.url, err.response?.status, err.message);
        setEntries([]);
        setTotalItems(0);
        setTotalPages(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReceipts();
  }, [currentPage, pageSize, searchTerm, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group entries by invoice
  const invoiceGroups = useMemo(() => groupByInvoice(entries), [entries]);

  const handleApproveAll = async (items: any[]) => {
    const pendingItems = items.filter(i => i.status === 'PENDING_RECEIPT');
    if (pendingItems.length === 0) return;
    if (!confirm(`Approve all ${pendingItems.length} item(s) in this invoice?`)) return;
    try {
      await Promise.all(pendingItems.map(i => approveStoreReceipt(i._id)));
      fetchReceipts();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to approve receipts");
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
      if (!allEntries.length) { alert("No entries to export with current filters"); return; }
      const csvData = allEntries.map((entry: any) => ({
        "Entry ID": entry._id,
        "PO Number": entry.poNumber || "",
        "PO Date": entry.poDate ? entry.poDate.split("T")[0] : "",
        "Vendor Name": entry.vendorName || "",
        "Billing From": entry.billingFrom || "",
        "DI Ref No": entry.diRefNo || "",
        "Circle": entry.circle || "",
        "Package": entry.package || "",
        "Invoice Number": entry.invoiceNumber || "",
        "Invoice Date": entry.invoiceDate ? entry.invoiceDate.split("T")[0] : "",
        "Transport Name": entry.transportName || "",
        "Truck Number": entry.truckNumber || "",
        "GR Number": entry.grNumber || "",
        "GR Date": entry.grDate ? entry.grDate.split("T")[0] : "",
        "Bilty Number": entry.biltyNumber || "",
        "Received Date": entry.receivedDate ? entry.receivedDate.split("T")[0] : new Date().toISOString().split("T")[0],
        "Remarks": entry.remarks || "",
        "Material Description": entry.itemName || entry.itemDescription || "",
        "LOA Serial No": entry.serialNumber || "",
        "Temp Code": entry.tempCode || "",
        "HSN Code": entry.hsnCode || "",
        "Unit": entry.unit || "",
        "Challan Qty": entry.challanQty ?? "",
        "Received Qty": entry.totalQty ?? "",
        "Rejected Qty": entry.rejectedQty ?? "",
        "Accepted Qty": entry.invoiceQty ?? "",
        "Pack Type": entry.packingList?.[0]?.packType || "",
        "Pack Unit": entry.packingList?.[0]?.packUnit || "",
        "Pack Qty": entry.packingList?.[0]?.quantity ?? "",
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

  const selectClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400";
  const inputClass = "h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400";

  const getGroupStatus = (items: any[]) => {
    const statuses = new Set(items.map(i => i.status));
    if (statuses.has('PENDING_RECEIPT')) return 'PENDING_RECEIPT';
    if (statuses.has('APPROVED') || statuses.has('VERIFIED')) return 'APPROVED';
    return 'PENDING_RECEIPT';
  };

  const getGroupStatusLabel = (items: any[]) => {
    const pending = items.filter(i => i.status === 'PENDING_RECEIPT').length;
    const approved = items.filter(i => i.status === 'APPROVED' || i.status === 'VERIFIED').length;
    if (pending > 0 && approved > 0) return `${pending} Pending, ${approved} Approved`;
    if (pending > 0) return 'Pending Receipt';
    return 'Approved';
  };

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
            <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-4 items-end bg-slate-50/30">
            {isAdmin && (
              <>
                <div className="flex flex-col gap-1.5 w-[160px]">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Package</label>
                  <select className={selectClass} value={filters.package} onChange={(e) => { setFilters((p) => ({ ...p, package: e.target.value })); setCurrentPage(1); }}>
                    <option value="All">All Packages</option>
                    {packageOptions.map((pkg) => <option key={pkg} value={pkg}>{pkg}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 w-[160px]">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Circle</label>
                  <select className={selectClass} value={filters.circle} onChange={(e) => { setFilters((p) => ({ ...p, circle: e.target.value })); setCurrentPage(1); }}>
                    <option value="All">All Circles</option>
                    {circleOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="flex flex-col gap-1.5 w-[160px]">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendor</label>
              <select className={selectClass} value={filters.vendor} onChange={(e) => { setFilters((p) => ({ ...p, vendor: e.target.value })); setCurrentPage(1); }}>
                <option value="All">All Vendors</option>
                {vendorOptions.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-[160px]">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice / PO</label>
              <input type="text" placeholder="Search..." className={inputClass} value={filters.invoicePo} onChange={(e) => { setFilters((p) => ({ ...p, invoicePo: e.target.value })); setCurrentPage(1); }} />
            </div>
            <div className="flex flex-col gap-1.5 w-[140px]">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Range</label>
              <select className={selectClass} value={filters.dateRange} onChange={(e) => { setFilters((p) => ({ ...p, dateRange: e.target.value })); setCurrentPage(1); }}>
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-[160px]">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Item / Temp</label>
              <input type="text" placeholder="Search..." className={inputClass} value={filters.itemTemp} onChange={(e) => { setFilters((p) => ({ ...p, itemTemp: e.target.value })); setCurrentPage(1); }} />
            </div>
            <div className="ml-auto flex items-end">
              <Button variant="ghost" className="h-9 px-3 text-slate-500 hover:text-slate-900 font-medium text-sm" onClick={() => { setFilters({ package: "All", circle: "All", status: "All", vendor: "All", invoicePo: "", dateRange: "All", itemTemp: "", discrepancy: "All" }); setSearchTerm(""); setCurrentPage(1); }}>
                Reset
              </Button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex px-5 pt-3 gap-6 border-b border-slate-100 bg-white">
            {[
              { label: 'All Receipts', value: 'All', color: 'blue' },
              { label: 'Pending', value: 'PENDING_RECEIPT', color: 'amber' },
              { label: 'Approved', value: 'APPROVED', color: 'emerald' },
            ].map(tab => (
              <button key={tab.value} onClick={() => { setFilters((p) => ({ ...p, status: tab.value })); setCurrentPage(1); }}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${filters.status === tab.value ? `border-${tab.color}-600 text-${tab.color}-600` : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="px-5 py-3 bg-white flex items-center border-b border-slate-100">
            <Search className="w-4 h-4 text-slate-400 mr-3" />
            <input type="text" placeholder="Search by Invoice No, Vendor, Item..." className="w-full text-sm border-none focus:ring-0 p-0 text-slate-700 placeholder:text-slate-400 bg-transparent outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          {/* Invoice Group Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm">Loading receipts...</p>
              </div>
            ) : invoiceGroups.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-base font-medium text-slate-700">No receipts found</p>
                <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
                    <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Invoice & PO</th>
                    <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Vendor</th>
                    <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Circle / Package</th>
                    <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase text-center">Items</th>
                    <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase">Status</th>
                    <th className="px-5 py-3.5 font-medium text-xs tracking-wider uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {invoiceGroups.map((group) => {
                    const pendingCount = group.items.filter(i => i.status === 'PENDING_RECEIPT').length;
                    const approvedCount = group.items.filter(i => i.status === 'APPROVED' || i.status === 'VERIFIED').length;
                    const allApproved = pendingCount === 0;
                    const firstItem = group.items[0];

                    return (
                      <tr key={group.invoiceKey} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => { if (group.purchaseInvoiceId) { const qs = new URLSearchParams({ ...(group.circle !== '-' && { circle: group.circle }), ...(group.subcircle && { subcircle: group.subcircle }), ...(group.package !== '-' && { package: group.package }) }).toString(); router.push(`/store/inventory/inward/invoice/${group.purchaseInvoiceId}${qs ? '?' + qs : ''}`); } }}>
                        <td className="px-5 py-4 align-middle">
                          <div className="font-semibold text-slate-900">{group.invoiceNumber}</div>
                          {group.poNumber !== '-' && (
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> PO: {group.poNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="text-sm text-slate-700 font-medium">{group.vendorName}</div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="text-sm font-medium text-slate-700">{firstItem?.circle || '-'}</div>
                          {firstItem?.subcircle && <div className="text-xs text-slate-500 mt-0.5">{firstItem.subcircle}</div>}
                          {firstItem?.package && (
                            <span className="inline-flex items-center text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-1">
                              {firstItem.package}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 align-middle text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-sm border border-blue-100">
                            {group.items.length}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          {allApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/60">
                              <CheckCircle2 className="w-3 h-3" /> All Approved
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {pendingCount > 0 && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200/60">
                                  {pendingCount} Pending Receipt
                                </span>
                              )}
                              {approvedCount > 0 && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200/60">
                                  {approvedCount} Approved
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 align-middle text-right">
                          <div className="flex justify-end items-center gap-2" onClick={e => e.stopPropagation()}>
                            {pendingCount > 0 && (
                              <Button
                                onClick={() => handleApproveAll(group.items)}
                                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs rounded-md"
                              >
                                Approve All
                              </Button>
                            )}
                            {pendingCount > 0 && (
                              <Button
                                onClick={() => { const qs = new URLSearchParams({ ...(group.circle !== '-' && { circle: group.circle }), ...(group.subcircle && { subcircle: group.subcircle }), ...(group.package !== '-' && { package: group.package }) }).toString(); router.push(`/store/inventory/inward/invoice/${group.purchaseInvoiceId}${qs ? '?' + qs : ''}`); }}
                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-xs rounded-md"
                              >
                                Register GRN
                              </Button>
                            )}
                            {allApproved && (
                              <Button
                                onClick={() => { const qs = new URLSearchParams({ ...(group.circle !== '-' && { circle: group.circle }), ...(group.subcircle && { subcircle: group.subcircle }), ...(group.package !== '-' && { package: group.package }) }).toString(); router.push(`/store/inventory/inward/invoice/${group.purchaseInvoiceId}${qs ? '?' + qs : ''}`); }}
                                className="h-8 px-3 text-xs rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                              >
                                View Details
                              </Button>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
            <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Reason for voiding..." />
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
