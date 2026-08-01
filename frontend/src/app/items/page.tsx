"use client";

import React, { useEffect, useState, useRef } from "react";
import { getEntityMetadata, getItems, bulkDeleteItems, getItemMetrics } from "@/features/items/api/items.api";
import { exportItemsToCsv } from "@/features/items/api/items.api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DynamicTable } from "@/shared/components/dynamic/DynamicTable";
import { FieldMetadata } from "@/shared/components/dynamic/DynamicForm";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Settings, Download, Upload, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportModal } from "@/features/items/components/ImportModal";

export default function ItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const page = parseInt(searchParams.get('page') || '1');
  const sortBy = searchParams.get('sortBy') || null;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';
  const limit = parseInt(searchParams.get('limit') || '50');
  const isDeleted = searchParams.get('isDeleted') === 'true';

  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [selectedItemsData, setSelectedItemsData] = useState<Record<string, any>>({});
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(() => {
    const filters: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        filters[key.replace('filter_', '')] = value;
      }
    });
    return filters;
  });

const handleColumnFilterChange = (columnName: string, value: string) => {
    setColumnFilters(prev => {
      const next = { ...prev, [columnName]: value };
      
      if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
      
      filterTimeoutRef.current = setTimeout(() => {
        const updates: Record<string, string | null> = { page: '1' };
        Object.entries(next).forEach(([key, val]) => {
          updates[`filter_${key}`] = val || null;
        });
        updateUrl(updates);
      }, 500);
      
      return next;
    });
  };
  const fetchItemsData = async () => {
    setIsLoading(true);
    try {
      const urlFilters: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        if (key.startsWith('filter_')) {
          urlFilters[key.replace('filter_', '')] = value;
        }
      });
      const [metaRes, itemsRes, metricsRes] = await Promise.all([
        getEntityMetadata('Item'),
        getItems({ page, limit, sortBy: sortBy || undefined, sortOrder, isDeleted, filters: urlFilters }),
        getItemMetrics()
      ]);
      const allActivities = metricsRes.activityStats
        .map((s: any) => s._id)
        .filter((id: any) => typeof id === 'string' && id.trim() !== '');
      
      const modifiedFields = metaRes.fields.map((f: any) => {
        if (f.name === 'activity') {
          return { ...f, type: 'dropdown', options: allActivities };
        }
        return f;
      });
      setFields(modifiedFields);
      setItems(itemsRes.items || itemsRes);
      setPagination(itemsRes.pagination || null);
      setMetrics(metricsRes);
    } catch (error) {
      console.error("Failed to load items data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsData();
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    updateUrl({ page: newPage.toString() });
  };

  const handleLimitChange = (newLimit: number) => {
    updateUrl({ limit: newLimit.toString(), page: '1' });
  };

  const handleSortChange = (column: string, order: 'asc' | 'desc') => {
    updateUrl({ sortBy: column, sortOrder: order, page: '1' }); // reset to page 1 on sort
  };

  const handleRowClick = (row: any) => {
    const queryString = searchParams.toString();
    const targetUrl = `/items/${row._id}${queryString ? `?${queryString}` : ''}`;
    router.push(targetUrl);
  };

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

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} items? This cannot be undone.`)) {
      return;
    }
    
    setIsDeletingBulk(true);
    try {
      await bulkDeleteItems(selectedIds);
      toast.success(`${selectedIds.length} items deleted successfully.`);
      setSelectedIds([]);
      fetchItemsData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete items');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleSelectionChange = (newIds: string[]) => {
    setSelectedIds(newIds);
    setSelectedItemsData(prev => {
      const next = { ...prev };
      items.forEach(item => {
        if (newIds.includes(item._id)) next[item._id] = item;
      });
      Object.keys(next).forEach(id => {
        if (!newIds.includes(id)) delete next[id];
      });
      return next;
    });
  };

  const totalSelectedQty = Object.values(selectedItemsData).reduce((sum: number, item: any) => sum + (Number(item?.dynamicData?.stock) || 0), 0);


  if (isLoading && fields.length === 0) {
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
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Items</h1>
            {isLoading && fields.length > 0 && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </div>
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

      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-md w-fit">
        <button
          onClick={() => updateUrl({ isDeleted: null, page: '1' })}
          className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${!isDeleted ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
        >
          Active
        </button>
        <button
          onClick={() => updateUrl({ isDeleted: 'true', page: '1' })}
          className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${isDeleted ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}
        >
          Trash
        </button>
      </div>

      {/* Metrics Dashboard */}
      {metrics && !isDeleted && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-2">
          {/* Total Items in Solan/Nahan */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <h3 className="text-[13px] font-semibold text-slate-700 mb-4 uppercase tracking-wider flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
              Items per Circle
            </h3>
            <div style={{ height: 250, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.circleStats.filter((d: any) => d._id)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {(() => {
            const processedStats = metrics.activityStats.map((d: any) => ({
              ...d,
              _id: (!d._id || (typeof d._id === 'string' && d._id.trim() === '')) ? 'Unbillable' : d._id
            }));
            
            const sortedActivities = [...processedStats].sort((a: any, b: any) => b.count - a.count);
            
            // For the data table (Activity per Circle)
            const circleNames = Array.from(new Set(metrics.circleActivityStats.map((s: any) => s._id?.circle).filter(Boolean))) as string[];
            const activityTableData = sortedActivities.map((act: any) => {
              const row: any = { activity: act._id, total: act.count };
              const originalId = act._id === 'Unbillable' ? '' : act._id;
              
              circleNames.forEach(c => {
                const stat = metrics.circleActivityStats.find((s: any) => s._id?.circle === c && (s._id?.activity === originalId || (!s._id?.activity && originalId === '')));
                row[c] = stat ? stat.count : 0;
              });
              return row;
            });

            return (
              <>
                {/* Total Activity Items per Activity */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                  <h3 className="text-[13px] font-semibold text-slate-700 mb-4 uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
                      Items per Activity
                    </div>
                    <span className="text-xs text-slate-500 font-normal normal-case">{sortedActivities.length} total activities</span>
                  </h3>
                  <div style={{ height: 250, overflowY: 'auto', overflowX: 'hidden', paddingRight: '5px' }} className="custom-scrollbar">
                    <div style={{ height: Math.max(250, sortedActivities.length * 35), width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={sortedActivities} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                          <YAxis type="category" dataKey="_id" axisLine={false} tickLine={false} width={150} interval={0} tick={{ fontSize: 10, fill: '#64748b' }} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Activity Breakdown Table */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                  <h3 className="text-[13px] font-semibold text-slate-700 mb-4 uppercase tracking-wider flex items-center">
                    <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
                    Activity Breakdown by Circle
                  </h3>
                  <div style={{ height: 250, overflowY: 'auto' }} className="custom-scrollbar relative border border-slate-100 rounded-md">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="sticky top-0 bg-slate-50 text-slate-700 shadow-sm">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Activity</th>
                          {circleNames.map(c => <th key={c} className="px-3 py-2 font-semibold text-center">{c}</th>)}
                          <th className="px-3 py-2 font-semibold text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityTableData.map((row, i) => (
                          <tr key={row.activity} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2 font-medium max-w-[120px] truncate" title={row.activity}>{row.activity}</td>
                            {circleNames.map(c => (
                              <td key={c} className="px-3 py-2 text-center">{row[c] || '-'}</td>
                            ))}
                            <td className="px-3 py-2 text-center font-semibold text-slate-700">{row.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col">
            <span className="text-sm text-indigo-800 font-medium">
              {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected
            </span>
            <span className="text-xs text-indigo-600 mt-0.5 font-medium">
              Total Stock Quantity: {totalSelectedQty}
            </span>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setSelectedIds([]); setSelectedItemsData({}); }}
              className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleDeleteSelected}
              disabled={isDeletingBulk}
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
            >
              {isDeletingBulk ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <DynamicTable 
        fields={fields} 
        data={items} 
        pagination={pagination}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSortChange={handleSortChange}
        onRowClick={handleRowClick}
        sortColumn={sortBy}
        sortDirection={sortOrder}
        enableSelection={true}
        onSelectionChange={handleSelectionChange}
        selectedIds={selectedIds}
        columnFilters={columnFilters}
        onColumnFilterChange={handleColumnFilterChange}
      />

      {isImportModalOpen && (
        <ImportModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={fetchItemsData}
          fields={fields}
        />
      )}
    </div>
  );
}
