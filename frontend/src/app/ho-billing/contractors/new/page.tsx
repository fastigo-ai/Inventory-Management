"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEntityMetadata } from "@/features/vendors/api/vendors.api";
import { createContractor } from "@/features/contractors/api/contractors.api";
import { DynamicForm, FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewContractorPage() {
  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metaRes = await getEntityMetadata('Contractor');
        setFields(metaRes.fields);
      } catch (error) {
        console.error("Failed to load metadata", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      await createContractor({
        location: undefined,
        dynamicData: data
      });
      router.push(`/ho-billing/contractors`);
    } catch (error) {
      console.error("Failed to create contractor", error);
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
        <h1 className="text-xl text-slate-800 font-normal">New Contractor</h1>
        <Link href={`/ho-billing/contractors`}>
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
          />
        </div>
      </div>
    </div>
  );
}
