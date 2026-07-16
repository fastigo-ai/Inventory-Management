"use client";

import { useEffect, useState } from "react";
import { getEntityMetadata, getItems } from "@/features/items/api/items.api";
import { exportItemsToCsv } from "@/features/items/api/items.api";
import { DynamicTable } from "@/shared/components/dynamic/DynamicTable";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Settings, Download, Upload, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportModal } from "@/features/items/components/ImportModal";

export default function ItemsPage() {
  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchItemsData = async () => {
    setIsLoading(true);
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

  useEffect(() => {
    fetchItemsData();
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportItemsToCsv();
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsExporting(false);
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Items</h1>
          <p className="text-sm text-slate-500 mt-1">Metadata-driven inventory management</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/settings/preferences/items">
            <Button variant="outline" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Customize Fields</span>
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 h-9 px-2">
              <MoreHorizontal className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-[13px]">
              <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-slate-500" />
                Import Items
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport} className="cursor-pointer" disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-slate-500" /> : <Download className="w-4 h-4 mr-2 text-slate-500" />}
                Export Items
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/items/new">
            <Button className="flex items-center space-x-2 bg-[#0076f2] hover:bg-[#0060c5] text-white">
              <Plus className="w-4 h-4" />
              <span>New Item</span>
            </Button>
          </Link>
        </div>
      </div>

      <DynamicTable fields={fields} data={items} />

      {isImportModalOpen && (
        <ImportModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={() => {
            fetchItemsData();
          }} 
        />
      )}
    </div>
  );
}
