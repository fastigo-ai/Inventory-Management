"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getEntityMetadata, createVendor } from "@/features/vendors/api/vendors.api";
import { DynamicForm, FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewVendorPage() {
  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [initialData, setInitialData] = useState<any>({});
  const searchParams = useSearchParams();
  const cloneId = searchParams.get('cloneId');

  useEffect(() => {
    const fetchMetadataAndCloneData = async () => {
      try {
        const metaRes = await getEntityMetadata('Vendor');
        setFields(metaRes.fields);

        if (cloneId) {
          const { getVendor } = await import('@/features/vendors/api/vendors.api');
          const vendorToClone = await getVendor(cloneId);
          if (vendorToClone && vendorToClone.dynamicData) {
            // Remove unique fields or fields that shouldn't be cloned directly
            const clonedData = { ...vendorToClone.dynamicData };
            delete clonedData.displayName; // Must be unique usually
            delete clonedData.companyName;
            setInitialData(clonedData);
          }
        }
      } catch (error) {
        console.error("Failed to load metadata or clone data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetadataAndCloneData();
  }, [cloneId]);

  const handleSubmit = async (data: any) => {
    try {
      await createVendor(data);
      router.push('/purchases/vendors');
    } catch (error) {
      console.error("Failed to create vendor", error);
    }
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
        <h1 className="text-xl text-slate-800 font-normal">New Vendor</h1>
        <Link href="/purchases/vendors">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </Button>
        </Link>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="w-full bg-white p-6 shadow-sm border border-slate-200 rounded-lg">
          <DynamicForm 
            fields={fields} 
            onSubmit={handleSubmit} 
            layoutStyle="tabs"
            initialData={initialData}
            
          />
        </div>
      </div>
    </div>
  );
}
