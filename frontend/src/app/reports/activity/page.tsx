"use client";

import { useEffect, useState } from "react";
import { getAuditLogs } from "@/features/audit/api/audit.api";
import { format } from "date-fns";
import { Activity, Search, Filter, ArrowRight, Clock, User, Box, Trash2, Edit, PlusCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [filters, setFilters] = useState({
    entityType: '',
    action: ''
  });

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        page,
        limit: 20,
        entityType: filters.entityType || undefined,
        action: filters.action || undefined
      });
      setLogs(res.logs || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <PlusCircle className="w-4 h-4 text-emerald-500" />;
      case 'UPDATE': return <Edit className="w-4 h-4 text-blue-500" />;
      case 'DELETE': return <Trash2 className="w-4 h-4 text-rose-500" />;
      case 'APPROVE': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'REJECT': return <XCircle className="w-4 h-4 text-rose-500" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return "text-emerald-700 bg-emerald-50 border-emerald-200";
      case 'UPDATE': return "text-blue-700 bg-blue-50 border-blue-200";
      case 'DELETE': return "text-rose-700 bg-rose-50 border-rose-200";
      case 'APPROVE': return "text-emerald-700 bg-emerald-50 border-emerald-200";
      default: return "text-slate-700 bg-slate-50 border-slate-200";
    }
  };

  const formatChangeValue = (val: any) => {
    if (val === null || val === undefined) return 'none';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      <div className="flex-none h-16 border-b border-slate-200 flex items-center px-6 bg-white shadow-sm z-10 justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <h1 className="text-xl text-slate-800 font-bold">Activity Logs & Audit Trail</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
            <div className="flex items-center text-slate-500 font-medium mr-2">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </div>
            
            <select 
              className="h-9 rounded-md text-sm border border-slate-300 px-3 bg-white focus:outline-none focus:border-indigo-500"
              value={filters.entityType}
              onChange={e => { setPage(1); setFilters(prev => ({ ...prev, entityType: e.target.value })) }}
            >
              <option value="">All Modules</option>
              <option value="Item">Items</option>
              <option value="PurchaseOrder">Purchase Orders</option>
              <option value="PurchaseInvoice">Purchase Invoices</option>
              <option value="StoreInwardEntry">Store Inward (GRN)</option>
              <option value="DI">Dispatch Instructions (DI)</option>
            </select>

            <select 
              className="h-9 rounded-md text-sm border border-slate-300 px-3 bg-white focus:outline-none focus:border-indigo-500"
              value={filters.action}
              onChange={e => { setPage(1); setFilters(prev => ({ ...prev, action: e.target.value })) }}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
              <option value="APPROVE">Approved</option>
            </select>
            
            {loading && <div className="text-sm text-slate-500 animate-pulse ml-auto">Loading logs...</div>}
          </div>

          {/* Timeline / Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Module (ID)</th>
                    <th className="px-6 py-4 w-full">Changes / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                        No activity logs found.
                      </td>
                    </tr>
                  )}
                  {logs.map((log: any) => (
                    <tr key={log._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-700">
                          <Clock className="w-4 h-4 mr-2 text-slate-400" />
                          {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-700">
                          <User className="w-4 h-4 mr-2 text-slate-400" />
                          {log.performedBy ? (log.performedBy.firstName + ' ' + log.performedBy.lastName) : 'System'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-indigo-400" />
                          <span className="font-medium text-slate-700">{log.entityType}</span>
                          <span className="text-xs text-slate-400 font-mono" title={log.entityId}>
                            ...{log.entityId.slice(-6)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-normal min-w-[300px]">
                        {log.changes && log.changes.length > 0 ? (
                          <div className="space-y-1.5">
                            {log.changes.slice(0, 3).map((change: any, idx: number) => (
                              <div key={idx} className="flex items-start text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                                <span className="font-semibold text-slate-700 w-24 shrink-0 truncate" title={change.field}>{change.field}:</span>
                                {log.action === 'UPDATE' && change.oldValue !== undefined ? (
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <span className="text-rose-600 bg-rose-50 px-1 rounded line-through truncate max-w-[100px]" title={formatChangeValue(change.oldValue)}>
                                      {formatChangeValue(change.oldValue)}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="text-emerald-600 bg-emerald-50 px-1 rounded truncate max-w-[100px]" title={formatChangeValue(change.newValue)}>
                                      {formatChangeValue(change.newValue)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-600 truncate max-w-[200px]" title={formatChangeValue(change.newValue)}>
                                    {formatChangeValue(change.newValue)}
                                  </span>
                                )}
                              </div>
                            ))}
                            {log.changes.length > 3 && (
                              <div className="text-xs text-slate-400 font-medium pl-1">
                                + {log.changes.length - 3} more changes
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm italic">No specific field changes recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
