"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getEntityMetadata, createItem } from "@/features/items/api/items.api";
import { DynamicForm, FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewItemPage() {
  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const metaRes = await getEntityMetadata('Item');
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
      await createItem(data);
      router.push('/items');
    } catch (error) {
      console.error("Failed to create item", error);
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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/items">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Item</h1>
          <p className="text-sm text-slate-500 mt-1">This entire form is generated dynamically from the database configuration.</p>
        </div>
      </div>

      <div className="bg-slate-50/50 p-6 md:p-8 rounded-xl border border-slate-200">
        <DynamicForm fields={fields} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
