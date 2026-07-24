"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { updateMhrov, queryInwardEntries, getMhrovById } from "@/features/store/api/store.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export default function EditMhrovPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      mhrovNumber: "",
      mhrovDate: new Date().toISOString().split("T")[0],
      status: "pending",
      document: null as File | null
    }
  });

  const [inwardEntries, setInwardEntries] = useState<any[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInwardEntries();
    if (id) {
      fetchMhrovDetails();
    }
  }, [id]);

  const fetchMhrovDetails = async () => {
    try {
      setLoading(true);
      const res = await getMhrovById(id);
      const data = res.data;
      setValue("mhrovNumber", data.mhrovNumber);
      setValue("mhrovDate", data.mhrovDate ? new Date(data.mhrovDate).toISOString().split("T")[0] : "");
      setValue("status", data.status);
      setSelectedEntries(data.inwardEntries?.map((e: any) => e._id || e) || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load MHROV details");
    } finally {
      setLoading(false);
    }
  };

  const fetchInwardEntries = async () => {
    try {
      setLoading(true);
      // Fetch inward registrations (removed status: "VERIFIED" filter to ensure data shows up)
      const res = await queryInwardEntries({ limit: 1000 });
      setInwardEntries(Array.isArray(res.data) ? res.data : (res.data?.entries || []));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load Inward Registrations");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    let newSelection = [...selectedEntries];
    if (newSelection.includes(id)) {
      newSelection = newSelection.filter(e => e !== id);
    } else {
      newSelection.push(id);
    }
    setSelectedEntries(newSelection);
  };

  const onSubmit = async (data: any) => {
    if (selectedEntries.length === 0) {
      toast.error("Please select at least one item for the MHROV.");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("mhrovNumber", data.mhrovNumber);
      formData.append("mhrovDate", data.mhrovDate);
      formData.append("status", data.status);
      formData.append("inwardEntries", JSON.stringify(selectedEntries));
      
      if (data.document) {
        formData.append("document", data.document);
      }

      await updateMhrov(id, formData);
      toast.success("MHROV updated successfully");
      router.push("/store/mhrov");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to create MHROV");
    } finally {
      setIsSubmitting(false);
    }
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
            <h1 className="text-2xl font-semibold text-slate-900">Edit MHROV</h1>
            <p className="text-sm text-slate-500 mt-1">Edit an existing Material Handover Receipt Voucher</p>
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

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium text-slate-800">
              Select Inward Items
            </CardTitle>
            <span className="text-[13px] text-slate-500 font-medium">
              {selectedEntries.length} items selected
            </span>
          </CardHeader>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead className="text-[13px] text-slate-500 font-medium bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-12 text-center"></th>
                  <th className="px-4 py-3">DI No</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Invoice No</th>
                  <th className="px-4 py-3">Invoice Date</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3 text-right">Qty</th>
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
                      No Inward Registrations found for this store.
                    </td>
                  </tr>
                ) : (
                  inwardEntries.map((entry) => (
                    <tr
                      key={entry._id}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedEntries.includes(entry._id) ? "bg-indigo-50/50" : ""
                      }`}
                      onClick={() => toggleSelection(entry._id)}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedEntries.includes(entry._id)}
                          onCheckedChange={() => toggleSelection(entry._id)}
                          className="border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">{entry.diId?.diNumber || "N/A"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{entry.vendorName}</td>
                      <td className="px-4 py-3">{entry.invoiceNumber}</td>
                      <td className="px-4 py-3">{entry.invoiceDate ? new Date(entry.invoiceDate).toLocaleDateString() : ""}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={entry.itemName}>
                        {entry.itemName}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{entry.totalQty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </form>
  );
}
