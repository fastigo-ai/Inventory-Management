"use client";

import { useEffect, useState } from "react";
import { getEntityMetadata, getItems } from "@/features/items/api/items.api";
import { DynamicTable } from "@/shared/components/dynamic/DynamicTable";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";

export default function ItemsPage() {
  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metaRes, itemsRes] = await Promise.all([
          getEntityMetadata('Item'),
          getItems()
        ]);
        setFields(metaRes.fields);
        setItems(itemsRes);
      } catch (error) {
        console.error("Failed to load items data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Items</h1>
          <p className="text-sm text-slate-500 mt-1">Metadata-driven inventory management</p>
        </div>
        <Link href="/items/new">
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>New Item</span>
          </Button>
        </Link>
      </div>

      <DynamicTable fields={fields} data={items} />
    </div>
  );
}
