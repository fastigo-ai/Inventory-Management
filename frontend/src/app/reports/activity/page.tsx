'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Activity, Clock, User, Search, RefreshCw, Filter,
  Eye, MousePointer, Navigation, Download, Upload, FileText,
  CheckCircle, XCircle, AlertTriangle, LogIn, LogOut,
  ArrowRight, ArrowLeft, ChevronRight, ChevronLeft, Database,
} from 'lucide-react';
import { getAuditLogs } from '@/features/audit/api/audit.api';
import { Button } from '@/components/ui/button';

const ACTION_CATEGORIES: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  CREATE: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <Database className="w-3 h-3" />, label: 'Created' },
  UPDATE: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Database className="w-3 h-3" />, label: 'Updated' },
  DELETE: { color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" />, label: 'Deleted' },
  RESTORE: { color: 'bg-teal-100 text-teal-700 border-teal-200', icon: <RefreshCw className="w-3 h-3" />, label: 'Restored' },
  APPROVE: { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <CheckCircle className="w-3 h-3" />, label: 'Approved' },
  REJECT: { color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" />, label: 'Rejected' },
  SUBMIT: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <FileText className="w-3 h-3" />, label: 'Submitted' },
  CANCEL: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <XCircle className="w-3 h-3" />, label: 'Cancelled' },
  FULFILL: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <CheckCircle className="w-3 h-3" />, label: 'Fulfilled' },
  VERIFY: { color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: <CheckCircle className="w-3 h-3" />, label: 'Verified' },
  PRINT: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <FileText className="w-3 h-3" />, label: 'Printed' },
  DOWNLOAD_PDF: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Download className="w-3 h-3" />, label: 'Downloaded PDF' },
  EXPORT: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Download className="w-3 h-3" />, label: 'Exported' },
  DOWNLOAD: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Download className="w-3 h-3" />, label: 'Downloaded' },
  IMPORT: { color: 'bg-violet-100 text-violet-700 border-violet-200', icon: <Upload className="w-3 h-3" />, label: 'Imported' },
  UPLOAD: { color: 'bg-violet-100 text-violet-700 border-violet-200', icon: <Upload className="w-3 h-3" />, label: 'Uploaded' },
  EMAIL: { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <FileText className="w-3 h-3" />, label: 'Emailed' },
  LOGIN: { color: 'bg-green-100 text-green-700 border-green-200', icon: <LogIn className="w-3 h-3" />, label: 'Login' },
  LOGOUT: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <LogOut className="w-3 h-3" />, label: 'Logout' },
  LOGIN_FAILED: { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="w-3 h-3" />, label: 'Login Failed' },
  BULK_UPDATE: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Database className="w-3 h-3" />, label: 'Bulk Update' },
  BULK_DELETE: { color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" />, label: 'Bulk Delete' },
  VIEW: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Eye className="w-3 h-3" />, label: 'Viewed' },
  CLICK: { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <MousePointer className="w-3 h-3" />, label: 'Clicked' },
  NAVIGATE: { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: <Navigation className="w-3 h-3" />, label: 'Navigated' },
  SEARCH: { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <Search className="w-3 h-3" />, label: 'Searched' },
  FILTER: { color: 'bg-sky-100 text-sky-700 border-sky-200', icon: <Filter className="w-3 h-3" />, label: 'Filtered' },
  FORM_SUBMIT: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <FileText className="w-3 h-3" />, label: 'Form Submit' },
  FORM_ERROR: { color: 'bg-red-100 text-red-600 border-red-200', icon: <AlertTriangle className="w-3 h-3" />, label: 'Form Error' },
  API_ERROR: { color: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="w-3 h-3" />, label: 'API Error' },
};

const ACTION_GROUPS = {
  'All Actions': '',
  'Data Changes': 'CREATE,UPDATE,DELETE,RESTORE,BULK_UPDATE,BULK_DELETE',
  'Workflow': 'APPROVE,REJECT,SUBMIT,CANCEL,FULFILL,VERIFY',
  'Documents': 'PRINT,DOWNLOAD_PDF,EXPORT,IMPORT,DOWNLOAD,UPLOAD,EMAIL',
  'Authentication': 'LOGIN,LOGOUT,LOGIN_FAILED',
  'UI Activity': 'VIEW,CLICK,NAVIGATE,SEARCH,FILTER,FORM_SUBMIT,FORM_ERROR,API_ERROR',
};

const formatChangeValue = (val: any): string => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') {
    try { return JSON.stringify(val).slice(0, 80); } catch { return '[Object]'; }
  }
  return String(val).slice(0, 80);
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  const [filters, setFilters] = useState({
    search: '',
    entityType: '',
    actionGroup: 'All Actions',
    startDate: '',
    endDate: '',
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const actionGroup = filters.actionGroup !== 'All Actions' ? ACTION_GROUPS[filters.actionGroup as keyof typeof ACTION_GROUPS] : '';

      const data = await getAuditLogs({
        entityType: filters.entityType || undefined,
        action: actionGroup || undefined,
        search: filters.search || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        page,
        limit,
      });
      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setFilters({ search: '', entityType: '', actionGroup: 'All Actions', startDate: '', endDate: '' });
    setPage(1);
  };

  const getActionMeta = (action: string) => {
    return ACTION_CATEGORIES[action] || { color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Activity className="w-3 h-3" />, label: action };
  };

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-5 bg-[#FAFAFA] min-h-screen">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
            <Activity className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Audit Activity Log</h1>
            <p className="text-sm text-slate-500 mt-0.5">Every action by every user — complete ERP audit trail</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 font-medium">{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total events</span>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all min-w-[220px] flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by user, module, description..."
            value={filters.search}
            onChange={e => { setPage(1); setFilters(f => ({ ...f, search: e.target.value })); }}
            className="bg-transparent border-none text-sm text-slate-700 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        {/* Action Group */}
        <select
          value={filters.actionGroup}
          onChange={e => { setPage(1); setFilters(f => ({ ...f, actionGroup: e.target.value })); }}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer shadow-sm font-medium"
        >
          {Object.keys(ACTION_GROUPS).map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        {/* Module */}
        <select
          value={filters.entityType}
          onChange={e => { setPage(1); setFilters(f => ({ ...f, entityType: e.target.value })); }}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 cursor-pointer shadow-sm font-medium"
        >
          <option value="">All Modules</option>
          <option value="DemandNote">Demand Notes</option>
          <option value="ContractorWorkOrder">Work Orders</option>
          <option value="JmcRegister">JMC Register</option>
          <option value="WipRegister">WIP Consumed</option>
          <option value="WipRequiredRegister">WIP Required</option>
          <option value="ContractorAssignment">Store Issue (MIN)</option>
          <option value="StoreInwardEntry">Store Inward (GRN)</option>
          <option value="DI">Dispatch Instructions</option>
          <option value="PurchaseOrder">Purchase Orders</option>
          <option value="PurchaseInvoice">Purchase Invoices</option>
          <option value="Item">Item Master</option>
          <option value="Page">Page / Navigation</option>
          <option value="UI">UI Actions</option>
          <option value="User">Users</option>
        </select>

        {/* Date Range */}
        <input
          type="date"
          value={filters.startDate}
          onChange={e => { setPage(1); setFilters(f => ({ ...f, startDate: e.target.value })); }}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 shadow-sm font-medium"
        />
        <span className="text-slate-400 text-sm">to</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={e => { setPage(1); setFilters(f => ({ ...f, endDate: e.target.value })); }}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 shadow-sm font-medium"
        />

        <button
          onClick={resetFilters}
          className="text-sm text-slate-500 hover:text-slate-800 font-medium px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 font-medium gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Activity className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No activity logs found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-4 w-44">DATE & TIME</th>
                    <th className="px-4 py-4 w-40">USER</th>
                    <th className="px-4 py-4 w-36">ACTION</th>
                    <th className="px-4 py-4 w-40">MODULE</th>
                    <th className="px-4 py-4">DESCRIPTION / CHANGES</th>
                    <th className="px-4 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log: any) => {
                    const meta = getActionMeta(log.action);
                    const isExpanded = expandedRows.has(log._id);
                    const hasChanges = log.changes && log.changes.length > 0;
                    const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                    const canExpand = hasChanges || hasMetadata;

                    return (
                      <React.Fragment key={log._id}>
                        <tr
                          className={`hover:bg-slate-50/80 transition-colors ${canExpand ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-indigo-50/40' : ''}`}
                          onClick={() => canExpand && toggleRow(log._id)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {format(new Date(log.createdAt), 'dd MMM yyyy')}
                            </div>
                            <div className="text-xs text-slate-400 ml-5 mt-0.5">
                              {format(new Date(log.createdAt), 'HH:mm:ss')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System'}
                            </div>
                            {log.performedBy?.role?.name && (
                              <span className="ml-5 mt-0.5 inline-block text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                {log.performedBy.role.name}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold border ${meta.color}`}>
                              {meta.icon}
                              {meta.label}
                            </span>
                            {log.status === 'failed' && (
                              <span className="ml-1 text-[10px] bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded font-semibold">FAILED</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
                              <span>{log.module || log.entityType}</span>
                            </div>
                            {log.entityId && (
                              <span className="text-[10px] text-slate-400 font-mono">...{String(log.entityId).slice(-6)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-normal max-w-sm">
                            {log.description ? (
                              <p className="text-xs text-slate-600 font-medium leading-relaxed">{log.description}</p>
                            ) : null}
                            {log.label && !log.description && (
                              <p className="text-xs text-slate-600">{log.label}</p>
                            )}
                            {log.page && (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{log.page}</p>
                            )}
                            {!log.description && !log.label && hasChanges && (
                              <p className="text-xs text-slate-400 italic">{log.changes.length} field change{log.changes.length > 1 ? 's' : ''}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {canExpand && (
                              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            )}
                          </td>
                        </tr>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <tr className="bg-indigo-50/30">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="space-y-3">
                                {/* Field Changes */}
                                {hasChanges && (
                                  <div>
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Field Changes</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                      {log.changes.map((change: any, idx: number) => (
                                        <div key={idx} className="bg-white rounded-lg border border-slate-200 p-2.5 text-xs">
                                          <p className="font-bold text-slate-700 mb-1 truncate" title={change.field}>{change.field}</p>
                                          {change.message ? (
                                            <p className="text-slate-600">{change.message}</p>
                                          ) : log.action === 'UPDATE' && change.oldValue !== undefined ? (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded line-through max-w-[120px] truncate" title={formatChangeValue(change.oldValue)}>
                                                {formatChangeValue(change.oldValue)}
                                              </span>
                                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded max-w-[120px] truncate" title={formatChangeValue(change.newValue)}>
                                                {formatChangeValue(change.newValue)}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-600 truncate block" title={formatChangeValue(change.newValue)}>
                                              {formatChangeValue(change.newValue)}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Metadata */}
                                {hasMetadata && (
                                  <div>
                                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Additional Details</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                                      {Object.entries(log.metadata).map(([key, val]) => (
                                        <div key={key} className="bg-white rounded-lg border border-slate-200 p-2.5 text-xs">
                                          <p className="font-bold text-slate-500 mb-0.5 capitalize">{key}</p>
                                          <p className="text-slate-700 truncate" title={formatChangeValue(val)}>{formatChangeValue(val)}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Technical Details */}
                                <div className="flex gap-4 text-[10px] text-slate-400 font-mono flex-wrap">
                                  {log.ip && <span>IP: {log.ip}</span>}
                                  {log.route && <span>Route: {log.route}</span>}
                                  {log.method && <span>Method: {log.method}</span>}
                                  {log.requestId && <span>Request ID: {log.requestId}</span>}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between bg-white gap-3">
              <span className="text-sm text-slate-500 font-medium">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString('en-IN', { maximumFractionDigits: 0 })} events
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm shadow-indigo-200 min-w-[2.5rem] text-center">
                  {page}
                </span>
                <span className="text-sm text-slate-400">of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
