"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getEntityMetadata, getVendor, updateVendor } from "@/features/vendors/api/vendors.api";
import { DynamicForm, FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const vendorId = resolvedParams.id;
  const router = useRouter();

  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metaRes, vendorRes] = await Promise.all([
          getEntityMetadata('Vendor'),
          getVendor(vendorId)
        ]);
        setFields(metaRes.fields);
        setInitialData(vendorRes.dynamicData);
      } catch (error) {
        console.error("Failed to load vendor for editing", error);
        alert("Failed to load vendor data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [vendorId]);

  const handleSubmit = async (data: any) => {
    try {
      setIsSaving(true);
      await updateVendor(vendorId, data);
      router.push("/purchases/vendors");
      router.refresh();
    } catch (error) {
      console.error("Failed to update vendor", error);
      alert("Failed to update vendor.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative">
      {/* Header */}
      <div className="flex-none h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <h1 className="text-xl text-slate-800 font-normal">Edit Vendor</h1>
        <Button variant="ghost" size="icon" onClick={handleCancel} className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-full">
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="w-full bg-white p-6 shadow-sm border border-slate-200 rounded-lg">
          <DynamicForm 
            fields={fields} 
            initialData={initialData}
            onSubmit={handleSubmit} 
            onCancel={handleCancel}
            isLoading={isSaving}
            submitLabel="Save Changes"
            layoutStyle="tabs"
          />
        </div>
      </div>
    </div>
  );
}
