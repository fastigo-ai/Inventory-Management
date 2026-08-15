"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createMhrov, queryInwardEntries, getInwardFilterOptions } from "@/features/store/api/store.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, ShoppingCart, Trash2, Search, ChevronLeft, ChevronRight, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function NewMhrovPage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      mhrovNumber: "",
      mhrovDate: new Date().toISOString().split("T")[0],
      status: "pending",
      document: null as File | null
    }
  });

  const [inwardEntries, setInwardEntries] = useState<any[]>([]);
  // selectedIds is used just for checkboxes in the current search view
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // selectedCartItems is the actual list of items attached to the MHROV with their mhrovDoneQty
  const [selectedCartItems, setSelectedCartItems] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    diNo: "all",
    vendor: "all",
    invoiceNo: "all",
    dateFrom: "",
    dateTo: "",
    itemName: ""
  });

  const [filterOptions, setFilterOptions] = useState({ diNos: [], vendors: [], invoiceNos: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalPages: 1, total: 0 });

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchInwardEntries();
  }, [filters, pagination.page]);

  const fetchFilterOptions = async () => {
    try {
      const res = await getInwardFilterOptions();
      if (res.data) setFilterOptions(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchInwardEntries = async () => {
    try {
      setLoading(true);
      const res = await queryInwardEntries({
        page: pagination.page,
        limit: pagination.limit,
        diNo: filters.diNo,
        vendor: filters.vendor,
        invoiceNo: filters.invoiceNo,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        itemName: filters.itemName
      });
      
      const data = res.data;
      if (data) {
        setInwardEntries(data.entries || []);
        setPagination(prev => ({
          ...prev,
          totalPages: data.totalPages,
          total: data.total
        }));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load Inward Registrations");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    let newSelection = [...selectedIds];
    if (newSelection.includes(id)) {
      newSelection = newSelection.filter(e => e !== id);
    } else {
      newSelection.push(id);
    }
    setSelectedIds(newSelection);
  };

  // Select all items on current page that are not already in cart
  const availableEntriesOnPage = inwardEntries.filter(e => !selectedCartItems.some(c => c._id === e._id));
  const isAllSelected = availableEntriesOnPage.length > 0 && availableEntriesOnPage.every(e => selectedIds.includes(e._id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const pageIds = new Set(availableEntriesOnPage.map(e => e._id));
      setSelectedIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = availableEntriesOnPage.map(e => e._id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleAddSelected = () => {
    const itemsToAdd = inwardEntries.filter(entry => selectedIds.includes(entry._id));
    const newItems = itemsToAdd
      .filter(newItem => !selectedCartItems.find(item => item._id === newItem._id))
      .map(item => ({
        ...item,
        mhrovDoneQty: item.remainingQty !== undefined ? item.remainingQty : item.totalQty
      }));
    
    if (newItems.length > 0) {
      setSelectedCartItems(prev => [...prev, ...newItems]);
      setSelectedIds([]);
      toast.success(`${newItems.length} items added to MHROV`);
    } else {
      toast.error("Items are already added or no items selected");
    }
  };

  const handleQtyChange = (id: string, val: string) => {
    const num = parseFloat(val);
    setSelectedCartItems(prev => prev.map(item => {
      if (item._id === id) {
        const maxQty = item.remainingQty !== undefined ? item.remainingQty : (item.totalQty || item.invoiceQty || 0);
        return {
          ...item,
          mhrovDoneQty: isNaN(num) ? '' : Math.min(maxQty, Math.max(0, num))
        };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (id: string) => {
    setSelectedCartItems(prev => prev.filter(item => item._id !== id));
  };

  const onSubmit = async (data: any) => {
    if (selectedCartItems.length === 0) {
      toast.error("Please add at least one item to the MHROV.");
      return;
    }

    // Validate that all items have valid mhrovDoneQty > 0
    for (const item of selectedCartItems) {
      const qty = Number(item.mhrovDoneQty);
      if (isNaN(qty) || qty <= 0) {
        toast.error(`Please enter a valid MHROV Done Quantity greater than 0 for item "${item.itemName}".`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("mhrovNumber", data.mhrovNumber);
      formData.append("mhrovDate", data.mhrovDate);
      formData.append("status", data.status);
      formData.append("inwardEntries", JSON.stringify(selectedCartItems.map(i => ({
        inwardEntryId: i._id,
        mhrovDoneQty: Number(i.mhrovDoneQty)
      }))));
      
      if (data.document) {
        formData.append("document", data.document);
      }

      await createMhrov(formData);
      toast.success("MHROV created successfully");
      router.push("/site-portal/mhrov");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to create MHROV");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex-1 p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-slate-200 rounded-full"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">New MHROV</h1>
            <p className="text-sm text-slate-500 mt-1">Create a Material Handover Receipt Voucher</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="h-9 border-slate-200"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save MHROV"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-medium text-slate-800">
              MHROV Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] text-slate-600">MHROV Number *</Label>
                <Input
                  className="h-9 text-[13px] bg-white border-slate-200 focus-visible:ring-indigo-500"
                  {...register("mhrovNumber", { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-slate-600">MHROV Date *</Label>
                <Input
                  type="date"
                  className="h-9 text-[13px] bg-white border-slate-200 focus-visible:ring-indigo-500"
                  {...register("mhrovDate", { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-slate-600">Status *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-[13px] shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                  {...register("status")}
                >
                  <option value="pending">Pending</option>
                  <option value="MHROV done but not signed">MHROV done but not signed</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] text-slate-600">Document Upload</Label>
                <div className="relative">
                  <Input
                    type="file"
                    className="h-9 text-[13px] bg-white border-slate-200 focus-visible:ring-indigo-500 cursor-pointer file:text-slate-600 file:text-[13px] file:bg-slate-50 file:border-0 file:mr-4 file:px-4 file:py-1 file:rounded-md hover:file:bg-slate-100"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setValue("document", e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Items Cart */}
        <Card className="border-indigo-200 shadow-sm overflow-hidden bg-indigo-50/10">
          <CardHeader className="border-b border-indigo-100 bg-indigo-50/50 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium text-indigo-900 flex items-center">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Selected Items for MHROV
            </CardTitle>
            <span className="text-[13px] text-indigo-600 font-bold bg-indigo-100 px-3 py-1 rounded-full">
              {selectedCartItems.length} items
            </span>
          </CardHeader>
          <div className="overflow-x-auto max-h-[350px]">
            <table className="w-full text-sm text-left">
              <thead className="text-[13px] text-indigo-600 font-medium bg-indigo-50/80 border-b border-indigo-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">DI No</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Invoice No</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3 text-right">Available Qty</th>
                  <th className="px-4 py-3 text-right w-40 bg-indigo-100/60 font-bold">MHROV Done Qty</th>
                  <th className="px-4 py-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50 bg-white/60 text-[13px] text-slate-700">
                {selectedCartItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-indigo-400">
                      No items added yet. Search below and click "Add Selected".
                    </td>
                  </tr>
                ) : (
                  selectedCartItems.map((entry) => {
                    const maxQty = entry.remainingQty !== undefined ? entry.remainingQty : (entry.totalQty || entry.invoiceQty || 0);
                    return (
                      <tr key={entry._id} className="hover:bg-indigo-50/40">
                        <td className="px-4 py-3">{entry.diId?.diNumber || entry.diRefNo || "N/A"}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{entry.vendorName}</td>
                        <td className="px-4 py-3">{entry.invoiceNumber}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={entry.itemName}>
                          {entry.itemName}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-600">{maxQty}</td>
                        <td className="px-4 py-2 text-right bg-indigo-50/30">
                          <Input
                            type="number"
                            step="any"
                            min="0.0001"
                            max={maxQty}
                            value={entry.mhrovDoneQty ?? ''}
                            onChange={(e) => handleQtyChange(entry._id, e.target.value)}
                            className="h-8 text-xs font-bold text-slate-900 bg-white border-indigo-300 text-right focus-visible:ring-indigo-500"
                            placeholder="Qty..."
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromCart(entry._id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 rounded-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Search and Add Inward Items */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium text-slate-800 flex items-center">
              <Search className="w-4 h-4 mr-2 text-slate-500" />
              Search Inward Items
            </CardTitle>
            <div className="flex items-center space-x-4">
              <span className="text-[13px] text-slate-500 font-medium">
                {selectedIds.length} checked on this page
              </span>
              <Button
                type="button"
                onClick={handleAddSelected}
                disabled={selectedIds.length === 0}
                className="h-8 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold"
              >
                Add Selected Items
              </Button>
            </div>
          </CardHeader>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead className="text-[13px] text-slate-500 font-medium bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-12 text-center align-top pt-4">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">All</span>
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        disabled={availableEntriesOnPage.length === 0}
                        className="border-slate-400 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        title="Select All on this page"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 align-top min-w-[120px]">
                    <div className="mb-2">DI No</div>
                    <select
                      className="w-full h-8 px-2 py-1 text-xs font-normal border rounded bg-white"
                      value={filters.diNo}
                      onChange={(e) => handleFilterChange("diNo", e.target.value)}
                    >
                      <option value="all">All</option>
                      {filterOptions.diNos.map((di, i) => (
                        <option key={i} value={di}>{di}</option>
                      ))}
                    </select>
                  </th>
                  <th className="px-4 py-3 align-top min-w-[150px]">
                    <div className="mb-2">Vendor</div>
                    <select
                      className="w-full h-8 px-2 py-1 text-xs font-normal border rounded bg-white"
                      value={filters.vendor}
                      onChange={(e) => handleFilterChange("vendor", e.target.value)}
                    >
                      <option value="all">All</option>
                      {filterOptions.vendors.map((vendor, i) => (
                        <option key={i} value={vendor}>{vendor}</option>
                      ))}
                    </select>
                  </th>
                  <th className="px-4 py-3 align-top min-w-[120px]">
                    <div className="mb-2">Invoice No</div>
                    <select
                      className="w-full h-8 px-2 py-1 text-xs font-normal border rounded bg-white"
                      value={filters.invoiceNo}
                      onChange={(e) => handleFilterChange("invoiceNo", e.target.value)}
                    >
                      <option value="all">All</option>
                      {filterOptions.invoiceNos.map((inv, i) => (
                        <option key={i} value={inv}>{inv}</option>
                      ))}
                    </select>
                  </th>
                  <th className="px-4 py-3 align-top min-w-[200px]">
                    <div className="mb-2">Invoice Date</div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        placeholder="From"
                        value={filters.dateFrom}
                        onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                        className="h-8 text-[11px] px-2 font-normal"
                      />
                      <span className="text-xs">-</span>
                      <Input
                        type="date"
                        placeholder="To"
                        value={filters.dateTo}
                        onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                        className="h-8 text-[11px] px-2 font-normal"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-3 align-top min-w-[150px]">
                    <div className="mb-2">Item Name</div>
                    <Input
                      placeholder="Search..."
                      value={filters.itemName}
                      onChange={(e) => handleFilterChange("itemName", e.target.value)}
                      className="h-8 text-xs font-normal"
                    />
                  </th>
                  <th className="px-4 py-3 text-right align-top pt-5">Available Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-[13px] text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                      Loading items...
                    </td>
                  </tr>
                ) : inwardEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No matching items found.
                    </td>
                  </tr>
                ) : (
                  inwardEntries.map((entry) => {
                    const isAlreadyInCart = selectedCartItems.some(i => i._id === entry._id);
                    const availableQty = entry.remainingQty !== undefined ? entry.remainingQty : (entry.totalQty || entry.invoiceQty || 0);

                    return (
                      <tr
                        key={entry._id}
                        className={`hover:bg-slate-50 transition-colors ${
                          selectedIds.includes(entry._id) ? "bg-indigo-50/30" : ""
                        } ${isAlreadyInCart ? "opacity-50 bg-slate-50" : "cursor-pointer"}`}
                        onClick={() => !isAlreadyInCart && toggleSelection(entry._id)}
                      >
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(entry._id) || isAlreadyInCart}
                            disabled={isAlreadyInCart}
                            onCheckedChange={() => !isAlreadyInCart && toggleSelection(entry._id)}
                            className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                          />
                        </td>
                        <td className="px-4 py-3">{entry.diId?.diNumber || entry.diRefNo || "N/A"}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{entry.vendorName}</td>
                        <td className="px-4 py-3">{entry.invoiceNumber}</td>
                        <td className="px-4 py-3">{entry.invoiceDate ? new Date(entry.invoiceDate).toLocaleDateString() : ""}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={entry.itemName}>
                          {entry.itemName}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          {availableQty}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium ml-4">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total items)
            </span>
            <div className="flex space-x-2 mr-4">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8 px-2 text-xs"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-8 px-2 text-xs"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}
