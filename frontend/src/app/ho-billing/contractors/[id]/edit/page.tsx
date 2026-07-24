"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getEntityMetadata } from "@/features/vendors/api/vendors.api";
import { getContractor, updateContractor } from "@/features/contractors/api/contractors.api";
import { DynamicForm, FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EditContractorPage() {
  const params = useParams();
  const id = params.id as string;
  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metaRes, contractorRes] = await Promise.all([
          getEntityMetadata('Contractor'),
          getContractor(id)
        ]);
        setFields(metaRes.fields);
        setInitialData(contractorRes.data?.dynamicData || {});
      } catch (error) {
        console.error("Failed to load contractor data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSubmit = async (data: any) => {
    try {
      await updateContractor(id, {
        dynamicData: data
      });
      router.push(`/ho-billing/contractors/${id}`);
    } catch (error) {
      console.error("Failed to update contractor", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12 bg-[#f8f9fa] min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative min-h-screen">
      {/* Header */}
      <div className="flex-none h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
        <h1 className="text-xl text-slate-800 font-normal">Edit Contractor</h1>
        <Link href={`/ho-billing/contractors/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-slate-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </Button>
        </Link>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto px-10 py-6">
        <div className="w-full bg-white p-6 shadow-sm border border-slate-200 rounded-lg">
          {initialData && (
            <DynamicForm 
              fields={fields} 
              initialData={initialData}
              onSubmit={handleSubmit} 
              layoutStyle="tabs"
            />
          )}
        </div>
      </div>
    </div>
  );
}
