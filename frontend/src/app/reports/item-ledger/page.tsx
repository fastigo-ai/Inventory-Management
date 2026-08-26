"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getItemLedger } from "@/features/reports/api/itemLedger.api";
import { toast } from "sonner";
import { Search, Download, Loader2 } from "lucide-react";

import { useDebounce } from "@/shared/hooks/useDebounce";
import { useUrlFilters } from "@/shared/hooks/useUrlFilters";

export default function ItemLedgerPage() {
  const { filters, setFilter, debouncedFilters } = useUrlFilters({ tempCode: "", itemName: "", circle: "", pkg: "" }, 800);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ item: any; ledger: any[]; totalBalance: number } | null>(null);

  useEffect(() => {
    const fetchLedger = async () => {
      const safeTempCode = (debouncedFilters.tempCode || "").trim();
      const safeItemName = (debouncedFilters.itemName || "").trim();

      if (!safeTempCode && !safeItemName) {
        setData(null);
        return;
      }
      
      setLoading(true);
      try {
        const result = await getItemLedger({ 
          tempCode: safeTempCode || undefined, 
          itemName: safeItemName || undefined,
          circle: debouncedFilters.circle, 
          package: debouncedFilters.pkg 
        });
        setData(result);
        if (result.ledger.length === 0) {
          toast.info("No ledger entries found for this criteria", { id: 'ledger-empty' });
        }
      } catch (error: any) {
        console.error(error);
        toast.error(error.response?.data?.message || "Failed to fetch item ledger");
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [debouncedFilters]);

  const exportToCsv = () => {
    if (!data || data.ledger.length === 0) return;

    const headers = ["Date", "Transaction Type", "Reference", "Vendor / Contractor", "Circle", "Package", "Qty IN (+)", "Qty OUT (-)", "Balance"];
    const rows = data.ledger.map(row => [
      new Date(row.date).toLocaleDateString(),
      row.type,
      `"${row.reference || ''}"`,
      `"${row.entityName || ''}"`,
      `"${row.circle || ''}"`,
      `"${row.package || ''}"`,
      row.type === 'IN' ? row.quantity : '',
      row.type === 'OUT' ? row.quantity : '',
      row.balance
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Item_Ledger_${debouncedFilters.tempCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Item Ledger</h1>
          <p className="text-muted-foreground">View chronologically sorted stock additions and issuances per item.</p>
        </div>
        <Button onClick={exportToCsv} disabled={!data || data.ledger.length === 0} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-end bg-slate-50 p-4 rounded-lg border relative">
        <div className="space-y-1">
          <label className="text-sm font-medium">Temp Code</label>
          <div className="relative w-48">
            <Input 
              placeholder="e.g. 69" 
              value={filters.tempCode || ""} 
              onChange={(e) => setFilter('tempCode', e.target.value)}
              className="w-full bg-white pr-8"
            />
            {loading && !filters.itemName && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Item Name</label>
          <div className="relative w-64">
            <Input 
              placeholder="e.g. Cement" 
              value={filters.itemName || ""} 
              onChange={(e) => setFilter('itemName', e.target.value)}
              className="w-full bg-white pr-8"
            />
            {loading && filters.itemName && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Circle</label>
          <select 
            value={filters.circle || ""}
            onChange={(e) => setFilter('circle', e.target.value)}
            className="flex h-10 w-48 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">All Circles</option>
            <option value="Nahan">Nahan</option>
            <option value="Solan">Solan</option>
            <option value="Rampur">Rampur</option>
            <option value="Rohru">Rohru</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Package</label>
          <select 
            value={filters.pkg || ""}
            onChange={(e) => setFilter('pkg', e.target.value)}
            className="flex h-10 w-48 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background"
          >
            <option value="">All Packages</option>
            <option value="Package 1 (S/N)">Package 1 (S/N)</option>
            <option value="Package 2 (R/R)">Package 2 (R/R)</option>
          </select>
        </div>
      </div>

      {data && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            {data.item ? (
              <>
                <h2 className="text-lg font-semibold">{data.item.tempCode} - {data.item.itemName || 'Unknown Item'}</h2>
                <p className="text-sm text-slate-500">Unit: {data.item.unit || 'N/A'} | Total Current Balance: <span className="font-bold text-indigo-600">{data.totalBalance}</span></p>
              </>
            ) : (
              <h2 className="text-lg font-semibold text-red-500">Item not found</h2>
            )}
          </div>

          <div className="rounded-md border bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-700 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium border-r">Date</th>
                    <th className="px-4 py-3 font-medium border-r">Transaction</th>
                    <th className="px-4 py-3 font-medium border-r">Reference</th>
                    <th className="px-4 py-3 font-medium border-r">Vendor / Contractor</th>
                    <th className="px-4 py-3 font-medium border-r">Circle</th>
                    <th className="px-4 py-3 font-medium border-r bg-emerald-50 text-emerald-700">IN (+)</th>
                    <th className="px-4 py-3 font-medium border-r bg-rose-50 text-rose-700">OUT (-)</th>
                    <th className="px-4 py-3 font-medium bg-slate-100">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    data.ledger.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 border-r whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 border-r">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            row.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.type === 'IN' ? 'Receipt' : 'Issue'}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r text-slate-600">{row.reference || '-'}</td>
                        <td className="px-4 py-3 border-r font-medium text-slate-900">{row.entityName || '-'}</td>
                        <td className="px-4 py-3 border-r text-slate-600">{row.circle || '-'}</td>
                        <td className="px-4 py-3 border-r font-semibold text-emerald-600 bg-emerald-50/30">
                          {row.type === 'IN' ? `+${row.quantity}` : ''}
                        </td>
                        <td className="px-4 py-3 border-r font-semibold text-rose-600 bg-rose-50/30">
                          {row.type === 'OUT' ? `-${row.quantity}` : ''}
                        </td>
                        <td className="px-4 py-3 font-bold bg-slate-50">
                          {row.balance}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
