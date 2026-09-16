'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogs } from '@/features/audit/api/audit.api';
import {
  Activity, Search, RefreshCw, ChevronLeft, ChevronRight,
  Filter, Shield, Database, LogIn, LogOut, Trash2, Edit,
  Plus, Download, Upload, Check, X, Clock, AlertTriangle,
  FileText, ArrowRight, BarChart2
} from 'lucide-react';
import Link from 'next/link';

// ─── Business events = meaningful data mutations ───────
const BUSINESS_ACTIONS = [
  'CREATE','UPDATE','DELETE','RESTORE','BULK_UPDATE','BULK_DELETE',
  'APPROVE','REJECT','SUBMIT','CANCEL','FULFILL','VERIFY',
  'PRINT','DOWNLOAD_PDF','EXPORT','IMPORT','EMAIL',
  'LOGIN','LOGOUT','LOGIN_FAILED',
];

// ─── UI tracking events ────────────────────────────────
const UI_ACTIONS = [
  'VIEW','CLICK','NAVIGATE','SEARCH','FILTER','DOWNLOAD','UPLOAD',
  'FORM_SUBMIT','FORM_ERROR','API_ERROR','TOKEN_REFRESH',
];

const ACTION_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  CREATE:       { color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: <Plus className="w-3 h-3" />, label: 'Created' },
  UPDATE:       { color: 'text-blue-700',    bg: 'bg-blue-100 border-blue-200',       icon: <Edit className="w-3 h-3" />, label: 'Updated' },
  DELETE:       { color: 'text-red-700',     bg: 'bg-red-100 border-red-200',         icon: <Trash2 className="w-3 h-3" />, label: 'Deleted' },
  RESTORE:      { color: 'text-teal-700',    bg: 'bg-teal-100 border-teal-200',       icon: <RefreshCw className="w-3 h-3" />, label: 'Restored' },
  APPROVE:      { color: 'text-green-700',   bg: 'bg-green-100 border-green-200',     icon: <Check className="w-3 h-3" />, label: 'Approved' },
  REJECT:       { color: 'text-orange-700',  bg: 'bg-orange-100 border-orange-200',   icon: <X className="w-3 h-3" />, label: 'Rejected' },
  SUBMIT:       { color: 'text-indigo-700',  bg: 'bg-indigo-100 border-indigo-200',   icon: <FileText className="w-3 h-3" />, label: 'Submitted' },
  CANCEL:       { color: 'text-rose-700',    bg: 'bg-rose-100 border-rose-200',       icon: <X className="w-3 h-3" />, label: 'Cancelled' },
  FULFILL:      { color: 'text-cyan-700',    bg: 'bg-cyan-100 border-cyan-200',       icon: <Check className="w-3 h-3" />, label: 'Fulfilled' },
  VERIFY:       { color: 'text-purple-700',  bg: 'bg-purple-100 border-purple-200',   icon: <Shield className="w-3 h-3" />, label: 'Verified' },
  BULK_UPDATE:  { color: 'text-blue-700',    bg: 'bg-blue-100 border-blue-200',       icon: <Edit className="w-3 h-3" />, label: 'Bulk Updated' },
  BULK_DELETE:  { color: 'text-red-700',     bg: 'bg-red-100 border-red-200',         icon: <Trash2 className="w-3 h-3" />, label: 'Bulk Deleted' },
  LOGIN:        { color: 'text-violet-700',  bg: 'bg-violet-100 border-violet-200',   icon: <LogIn className="w-3 h-3" />, label: 'Logged In' },
  LOGOUT:       { color: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200',     icon: <LogOut className="w-3 h-3" />, label: 'Logged Out' },
  LOGIN_FAILED: { color: 'text-red-600',     bg: 'bg-red-100 border-red-200',         icon: <AlertTriangle className="w-3 h-3" />, label: 'Login Failed' },
  EXPORT:       { color: 'text-amber-700',   bg: 'bg-amber-100 border-amber-200',     icon: <Download className="w-3 h-3" />, label: 'Exported' },
  IMPORT:       { color: 'text-purple-700',  bg: 'bg-purple-100 border-purple-200',   icon: <Upload className="w-3 h-3" />, label: 'Imported' },
  NAVIGATE:     { color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',      icon: <ArrowRight className="w-3 h-3" />, label: 'Navigated' },
  VIEW:         { color: 'text-sky-600',     bg: 'bg-sky-50 border-sky-200',          icon: <BarChart2 className="w-3 h-3" />, label: 'Viewed' },
};

const DEFAULT_CFG = { color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200', icon: <Activity className="w-3 h-3" />, label: '' };

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}
function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type TabType = 'business' | 'activity';

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<TabType>('business');
  const LIMIT = 50;

  const [filters, setFilters] = useState({ search: '', action: '', entityType: '', startDate: '', endDate: '' });
  const [applied, setApplied] = useState(filters);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await getAuditLogs({
        page: p, limit: LIMIT,
        search: applied.search || undefined,
        action: applied.action || (tab === 'business' ? BUSINESS_ACTIONS : UI_ACTIONS),
        entityType: applied.entityType || undefined,
        startDate: applied.startDate || undefined,
        endDate: applied.endDate || undefined,
      });
      setLogs(data.logs || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch system logs', err);
    } finally {
      setLoading(false);
    }
  }, [applied, tab]);

  useEffect(() => { setPage(1); fetchLogs(1); }, [applied, tab]);
  useEffect(() => { fetchLogs(page); }, [page]);

  const applyFilters = () => { setApplied({ ...filters }); setPage(1); };
  const resetFilters = () => {
    const e = { search: '', action: '', entityType: '', startDate: '', endDate: '' };
    setFilters(e); setApplied(e); setPage(1);
  };

  const getUserName = (log: any) => {
    const u = log.performedBy;
    if (!u) return 'System';
    return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Unknown';
  };

  const relevantActions = tab === 'business' ? BUSINESS_ACTIONS : UI_ACTIONS;

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-5 rounded-2xl shadow-sm border border-slate-200/60">
        <div className="flex items-center gap-3">
          <Link href="/settings/users" className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors text-sm font-medium">
            <ChevronLeft className="w-4 h-4" />Settings
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-0.5">Admin Panel</div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Logs</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 font-medium">
            <span className="font-bold text-slate-800">{total.toLocaleString()}</span> total records
          </span>
          <button onClick={() => fetchLogs(page)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm text-sm group">
            <RefreshCw className={`w-4 h-4 text-slate-400 group-hover:text-indigo-500 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Explanation banner ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <span className="font-bold text-amber-800">Enterprise audit logs</span>
          <span className="text-amber-700"> track meaningful business events (data changes, approvals, logins) — not page navigation. Use the tabs below to switch between business events and UI activity tracking.</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setTab('business'); setPage(1); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border ${
            tab === 'business'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Shield className="w-4 h-4" />
          Business Events
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === 'business' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
            Audit Trail
          </span>
        </button>
        <button
          onClick={() => { setTab('activity'); setPage(1); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border ${
            tab === 'activity'
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          UI Activity Tracking
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${tab === 'activity' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
            Page Views
          </span>
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search user, module..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
              className="w-full text-sm py-2 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
            />
          </div>
          <select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
            className="w-full text-sm py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm appearance-none">
            <option value="">All {tab === 'business' ? 'Business' : 'UI'} Actions</option>
            {relevantActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="text" placeholder="Entity type (Item, User...)"
            value={filters.entityType}
            onChange={e => setFilters(f => ({ ...f, entityType: e.target.value }))}
            className="w-full text-sm py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
          />
          <input type="date" value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
            className="w-full text-sm py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm" />
          <input type="date" value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
            className="w-full text-sm py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm" />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={applyFilters} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold text-sm shadow-sm">
            <Filter className="w-3.5 h-3.5" /> Apply
          </button>
          <button onClick={resetFilters} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm">
            <X className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                <th className="px-4 py-3 text-center w-10">#</th>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">On What</th>
                {tab === 'business' && <th className="px-4 py-3 min-w-[320px]">What Changed</th>}
                {tab === 'activity' && <th className="px-4 py-3 min-w-[260px]">Details</th>}
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={7} className="p-12 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  <p className="text-slate-400 text-sm font-medium">Loading logs...</p>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-500 font-semibold">No {tab === 'business' ? 'business events' : 'activity logs'} found.</p>
                  <p className="text-slate-400 text-xs mt-1">Try adjusting your filters or date range.</p>
                </td></tr>
              ) : logs.map((log, i) => {
                const cfg = ACTION_CONFIG[log.action] || DEFAULT_CFG;
                const userName = getUserName(log);
                const rowNum = (page - 1) * LIMIT + i + 1;

                return (
                  <tr key={log._id} className={`transition-colors hover:bg-slate-50/70 ${
                    log.action === 'DELETE' ? 'border-l-4 border-l-red-300' :
                    log.action === 'APPROVE' ? 'border-l-4 border-l-green-300' :
                    log.action === 'LOGIN_FAILED' ? 'border-l-4 border-l-orange-400' :
                    'border-l-4 border-l-transparent'
                  }`}>
                    <td className="px-4 py-3 text-center text-slate-300 text-xs font-mono">{rowNum}</td>

                    {/* When */}
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-semibold text-xs">{formatDate(log.createdAt)}</div>
                      <div className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />{timeAgo(log.createdAt)}
                      </div>
                    </td>

                    {/* Who */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {userName.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{userName}</div>
                          {log.performedBy?.role?.name && (
                            <div className="text-xs text-indigo-500 font-medium">{log.performedBy.role.name}</div>
                          )}
                          {log.performedBy?.email && (
                            <div className="text-xs text-slate-400 truncate max-w-[150px]">{log.performedBy.email}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Event */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label || log.action}
                      </span>
                    </td>

                    {/* On What */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        {log.module || log.entityType || '–'}
                      </div>
                      {log.entityId && (
                        <div className="text-slate-400 text-xs font-mono mt-0.5">
                          …{String(log.entityId).slice(-8)}
                        </div>
                      )}
                    </td>

                    {/* What Changed (business) / Details (activity) */}
                    <td className="px-4 py-3 max-w-xs">
                      {tab === 'business' ? (
                        <>
                          {log.description && (
                            <p className="text-slate-600 text-xs mb-1">{log.description}</p>
                          )}
                          {log.changes && log.changes.length > 0 ? (
                            <div className="space-y-1">
                              {log.changes.slice(0, 4).map((c: any, ci: number) => (
                                <div key={ci} className="flex items-center gap-1.5 text-[11px]">
                                  <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{c.field}</span>
                                  {c.oldValue !== undefined && (
                                    <>
                                      <span className="text-red-500 bg-red-50 px-1.5 py-0.5 rounded line-through max-w-[80px] truncate">{String(c.oldValue)}</span>
                                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded max-w-[80px] truncate">{String(c.newValue)}</span>
                                    </>
                                  )}
                                  {c.message && <span className="text-slate-400">{c.message}</span>}
                                </div>
                              ))}
                              {log.changes.length > 4 && (
                                <span className="text-[11px] text-slate-400 italic">+{log.changes.length - 4} more field(s) changed</span>
                              )}
                            </div>
                          ) : (
                            !log.description && <span className="text-slate-300 text-xs">—</span>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-slate-600 text-xs truncate">{log.description || log.label || '—'}</p>
                          {log.page && <p className="text-slate-400 text-xs mt-0.5">{log.page}</p>}
                        </>
                      )}
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3">
                      <span className="text-slate-400 text-xs font-mono">{log.ip || '—'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm text-slate-500 font-medium">
              Showing page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, k) => {
                const num = Math.max(1, page - 2) + k;
                if (num > totalPages) return null;
                return (
                  <button key={num} onClick={() => setPage(num)}
                    className={`w-8 h-8 text-sm font-bold rounded-lg ${num === page ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {num}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



