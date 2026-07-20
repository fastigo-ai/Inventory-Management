"use client";

import React, { useEffect, useState } from 'react';
import { getAuditLogs, GetAuditLogsParams } from '@/features/audit/api/audit.api';
import { Loader2, User, Clock, FileText, CheckCircle, AlertCircle, Edit, Plus, Trash, RotateCcw } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';

interface AuditTimelineProps {
  entityType: string;
  entityId: string;
}

export function AuditTimeline({ entityType, entityId }: AuditTimelineProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadInitialLogs();
  }, [entityType, entityId]);

  const loadInitialLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs({ entityType, entityId, page: 1, limit: 20 });
      setLogs(data.logs);
      setHasMore(data.pagination.page < data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await getAuditLogs({ entityType, entityId, page: nextPage, limit: 20 });
      setLogs(prev => [...prev, ...data.logs]);
      setPage(nextPage);
      setHasMore(data.pagination.page < data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <Plus className="w-4 h-4 text-emerald-500" />;
      case 'UPDATE': return <Edit className="w-4 h-4 text-blue-500" />;
      case 'DELETE': return <Trash className="w-4 h-4 text-red-500" />;
      case 'RESTORE': return <RotateCcw className="w-4 h-4 text-purple-500" />;
      case 'APPROVE': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'REJECT': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-100 text-emerald-700';
      case 'UPDATE': return 'bg-blue-100 text-blue-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      case 'RESTORE': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const groupLogsByDate = () => {
    const groups: { [key: string]: any[] } = {};
    
    logs.forEach(log => {
      const date = new Date(log.createdAt);
      let label = '';
      
      if (isToday(date)) label = 'Today';
      else if (isYesterday(date)) label = 'Yesterday';
      else if (isThisWeek(date)) label = 'This Week';
      else label = format(date, 'MMM dd, yyyy');
      
      if (!groups[label]) groups[label] = [];
      groups[label].push(log);
    });
    
    return groups;
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic">empty</span>;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading history...
      </div>
    );
  }

  const groupedLogs = groupLogsByDate();
  
  if (logs.length === 0) {
    return (
      <div className="text-center p-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
        <p>No history available for this record yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pl-4">
      {Object.entries(groupedLogs).map(([dateLabel, dayLogs], groupIdx) => (
        <div key={dateLabel} className="relative">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 ml-6">
            {dateLabel}
          </h4>
          
          <div className="space-y-6">
            {dayLogs.map((log, i) => {
              const isLast = groupIdx === Object.keys(groupedLogs).length - 1 && i === dayLogs.length - 1;
              const userName = log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System';
              
              return (
                <div key={log._id} className="relative pl-6">
                  {/* Timeline connecting line */}
                  {!isLast && (
                    <div className="absolute left-[-15px] top-6 bottom-[-24px] w-[2px] bg-slate-200"></div>
                  )}
                  
                  {/* Timeline node */}
                  <div className="absolute left-[-23px] top-1 w-4 h-4 rounded-full border-2 border-white bg-slate-300 shadow-sm flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  </div>
                  
                  {/* Content Box */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">{userName}</span>
                        <span className="text-slate-400 text-sm">
                          {log.action === 'CREATE' ? 'created this record' : 
                           log.action === 'UPDATE' ? 'updated this record' : 
                           log.action === 'DELETE' ? 'deleted this record' : 
                           `performed ${log.action}`}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {format(new Date(log.createdAt), 'hh:mm a')}
                      </span>
                    </div>
                    
                    {log.changes && log.changes.length > 0 && (
                      <div className="mt-3 pl-8 space-y-2">
                        {log.changes.map((change: any, idx: number) => (
                          <div key={idx} className="text-sm">
                            {change.message ? (
                              <p className="text-slate-600">{change.message}</p>
                            ) : (
                              <div className="flex items-baseline gap-2">
                                <span className="font-medium text-slate-700 capitalize">{change.field.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                {change.oldValue !== undefined && (
                                  <>
                                    <span className="line-through text-slate-400">{formatValue(change.oldValue)}</span>
                                    <span className="text-slate-300">→</span>
                                  </>
                                )}
                                <span className="text-slate-800 bg-yellow-50 px-1 rounded">{formatValue(change.newValue)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {hasMore && (
        <div className="pt-4 pl-6">
          <button 
            onClick={loadMore}
            disabled={loadingMore}
            className="text-sm text-[#0076f2] hover:underline font-medium focus:outline-none flex items-center"
          >
            {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            {loadingMore ? 'Loading...' : 'Load older history'}
          </button>
        </div>
      )}
    </div>
  );
}
