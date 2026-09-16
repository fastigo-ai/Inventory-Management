"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, Search, RefreshCw, FileText, ChevronDown, ChevronRight, Activity, Layers } from 'lucide-react';
import { getSiteContractorSummary } from '@/features/site-portal/api/siteReports.api';
import { getContractors } from '@/features/contractors/api/contractors.api';
import debounce from 'lodash/debounce';
import { useAuthStore } from '@/shared/store/auth.store';
import { utils, writeFile } from 'xlsx';
import Link from 'next/link';

// Round to 2 decimal places, strip trailing zeros
const fmt = (val: number | undefined | null): string => {
  if (val === undefined || val === null) return '0';
  const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
};

export default function ActivityContractorSummaryPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [contractorsList, setContractorsList] = useState<any[]>([]);

  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  // Filters state
  const [filters, setFilters] = useState({
    contractorId: 'ALL',
    circle: 'All Circles',
    store: 'All Stores',
    pkg: 'All Packages',
    search: ''
  });

  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  // Debounce filter changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 500);
    return () => clearTimeout(handler);
  }, [filters]);

  const setFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const { contractorId, circle, store, pkg, search } = filters;

  const setContractorId = (val: string) => setFilter('contractorId', val);
  const setCircle = (val: string) => setFilter('circle', val);
  const setStore = (val: string) => setFilter('store', val);
  const setPkg = (val: string) => setFilter('pkg', val);
  const setSearch = (val: string) => setFilter('search', val);

  // Fetch contractors list
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const cRes = await getContractors(undefined, undefined, 1, 1000);
        const list = cRes?.data?.contractors || cRes?.contractors || [];
        setContractorsList(list);
      } catch (err) {
        console.error('Error fetching contractors', err);
      }
    };
    fetchContractors();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getSiteContractorSummary({
        contractorId: debouncedFilters.contractorId,
        circle: debouncedFilters.circle === 'All Circles' ? undefined : debouncedFilters.circle,
        store: debouncedFilters.store === 'All Stores' ? undefined : debouncedFilters.store,
        package: debouncedFilters.pkg === 'All Packages' ? undefined : debouncedFilters.pkg,
        search: debouncedFilters.search || undefined
      });

      if (res.success && res.data) {
        setData(res.data.items || res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [debouncedFilters]);

  const displayData = useMemo(() => {
    const activityMap = new Map<string, any>();
    
    data.forEach(row => {
      const act = (row.activity || 'Uncategorized').trim();
      if (!activityMap.has(act)) {
        activityMap.set(act, {
          activity: act,
          jmcDone: 0,
          wipConsumed: 0,
          wipRequired: 0,
          totalWip: 0,
          totalIwipJmc: 0,
          totalIssued: 0,
          totalReturned: 0,
          todayTotalBalance: 0,
          finalBalQty: 0,
          items: []
        });
      }
      const agg = activityMap.get(act);
      agg.jmcDone += (row.jmcDone || 0);
      agg.wipConsumed += (row.wipConsumed || 0);
      agg.wipRequired += (row.wipRequired || 0);
      agg.totalWip += (row.totalWip || 0);
      agg.totalIwipJmc += (row.totalIwipJmc || 0);
      agg.totalIssued += (row.totalIssued || 0);
      agg.totalReturned += (row.totalReturned || 0);
      agg.todayTotalBalance += (row.todayTotalBalance || 0);
      agg.finalBalQty += (row.finalBalQty || 0);
      agg.items.push(row);
    });

    return Array.from(activityMap.values()).sort((a, b) => a.activity.localeCompare(b.activity));
  }, [data]);

  const toggleActivity = (activity: string) => {
    setExpandedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activity)) newSet.delete(activity);
      else newSet.add(activity);
      return newSet;
    });
  };

  const toggleAll = () => {
    if (expandedActivities.size === displayData.length) {
      setExpandedActivities(new Set());
    } else {
      setExpandedActivities(new Set(displayData.map(d => d.activity)));
    }
  };

  const totals = useMemo(() => {
    return displayData.reduce((acc, r) => {
      acc.jmcDone += r.jmcDone || 0;
      acc.wipConsumed += r.wipConsumed || 0;
      acc.wipRequired += r.wipRequired || 0;
      acc.totalWip += r.totalWip || 0;
      acc.totalIwipJmc += r.totalIwipJmc || 0;
      acc.totalIssued += r.totalIssued || 0;
      acc.totalReturned += r.totalReturned || 0;
      acc.todayTotalBalance += r.todayTotalBalance || 0;
      acc.finalBalQty += r.finalBalQty || 0;
      return acc;
    }, {
      jmcDone: 0, wipConsumed: 0, wipRequired: 0, totalWip: 0,
      totalIwipJmc: 0, totalIssued: 0, totalReturned: 0, todayTotalBalance: 0, finalBalQty: 0
    });
  }, [displayData]);

  const handleExportExcel = () => {
    const exportRows: any[] = [];
    displayData.forEach(act => {
      // Add Activity summary row
      exportRows.push({
        'Activity / Item': `[ACTIVITY] ${act.activity}`,
        'JMC Done': act.jmcDone,
        'WIP Consumed': act.wipConsumed,
        'WIP To Be Req': act.wipRequired,
        'Total WIP': act.totalWip,
        'WIP + JMC': act.totalIwipJmc,
        'Total Issued': act.totalIssued,
        'Total Returned': act.totalReturned,
        'Store Balance': act.todayTotalBalance,
        'Final Bal (BOM)': act.finalBalQty
      });
      // Add item rows
      act.items.forEach((item: any) => {
        exportRows.push({
          'Activity / Item': `    ${item.tempCode ? `[${item.tempCode}] ` : ''}${item.itemName}`,
          'JMC Done': item.jmcDone || 0,
          'WIP Consumed': item.wipConsumed || 0,
          'WIP To Be Req': item.wipRequired || 0,
          'Total WIP': item.totalWip || 0,
          'WIP + JMC': item.totalIwipJmc || 0,
          'Total Issued': item.totalIssued || 0,
          'Total Returned': item.totalReturned || 0,
          'Store Balance': item.todayTotalBalance || 0,
          'Final Bal (BOM)': item.finalBalQty || 0
        });
      });
    });

    const worksheet = utils.json_to_sheet(exportRows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Activity Summary');
    writeFile(workbook, `Activity_Contractor_Summary_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto min-h-screen flex flex-col bg-slate-50/50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/60">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mr-2">
            <ChevronRight className="w-5 h-5 rotate-180" />
            <span className="text-sm font-semibold uppercase tracking-wider">Reports</span>
          </Link>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase mb-0.5">
              <span>Activity Grouped</span>
              <span className="text-slate-300">•</span>
              <span>Site Overview</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Activity Wise Contractor Summary</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold shadow-sm text-sm flex-1 sm:flex-none justify-center group"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors ${loading ? 'animate-spin text-indigo-500' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-semibold shadow-sm shadow-emerald-600/20 text-sm flex-1 sm:flex-none justify-center"
          >
            <FileText className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden mb-6 flex flex-col flex-1">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Activity className="w-3.5 h-3.5" />
                Contractor Name:
              </label>
              <select
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
                className="w-full text-sm py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all appearance-none cursor-pointer"
              >
                <option value="ALL">All Contractors</option>
                {contractorsList.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.dynamicData?.companyName || c.dynamicData?.displayName || c.name || c._id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Circle:
              </label>
              <select
                value={circle}
                onChange={(e) => setCircle(e.target.value)}
                className="w-full text-sm py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all appearance-none cursor-pointer"
              >
                <option value="All Circles">All Circles</option>
                <option value="Nahan">Nahan</option>
                <option value="Solan">Solan</option>
                <option value="Rampur">Rampur</option>
                <option value="Rohru">Rohru</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Search Items/Activities:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-sm py-2.5 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/30">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-white shadow-sm">
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-xs">
                <th className="p-3 border-r border-slate-200/60 w-10">
                  <button onClick={toggleAll} className="p-1 hover:bg-slate-200 rounded">
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedActivities.size === displayData.length ? 'rotate-180' : ''}`} />
                  </button>
                </th>
                <th className="p-3 border-r border-slate-200/60 min-w-[300px]">Activity / Item</th>
                <th className="p-3 border-r border-slate-200/60 text-right w-24 text-emerald-700 bg-emerald-50/50">JMC Done</th>
                <th className="p-3 border-r border-slate-200/60 text-right w-24 text-blue-700 bg-blue-50/50">WIP Consumed</th>
                <th className="p-3 border-r border-slate-200/60 text-right w-24 text-orange-700 bg-orange-50/50">WIP Req</th>
                <th className="p-3 border-r border-slate-200/60 text-right w-24 text-violet-700 bg-violet-50/50">Total WIP</th>
                <th className="p-3 border-r border-slate-200/60 text-right w-28 font-bold bg-slate-200/50">WIP + JMC</th>
                <th className="p-3 border-r border-slate-200/60 text-right w-24">Total Issued</th>
                <th className="p-3 border-r border-slate-200/60 text-right w-24">Total Returned</th>
                <th className="p-3 border-r border-slate-200/60 text-right w-24 text-indigo-900 bg-indigo-100/50 font-bold">Store Bal</th>
                <th className="p-3 border-r border-slate-200/60 text-right w-24 font-bold">Final Bal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span className="text-sm font-medium">Loading summary data...</span>
                  </td>
                </tr>
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 font-medium">
                    No data found for the selected filters.
                  </td>
                </tr>
              ) : (
                displayData.map((act, i) => {
                  const isExpanded = expandedActivities.has(act.activity);
                  return (
                    <React.Fragment key={i}>
                      {/* Parent Activity Row */}
                      <tr 
                        className="bg-white hover:bg-slate-50 transition-colors cursor-pointer group border-l-4 border-l-indigo-500"
                        onClick={() => toggleActivity(act.activity)}
                      >
                        <td className="p-3 border-r border-slate-200/50 text-center">
                          <ChevronRight className={`w-4 h-4 inline-block text-slate-400 group-hover:text-indigo-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </td>
                        <td className="p-3 border-r border-slate-200/50 font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 w-5 h-5 rounded flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          {act.activity} <span className="text-xs text-slate-400 font-normal ml-2">({act.items.length} items)</span>
                        </td>
                        <td className="p-3 border-r border-slate-200/50 text-right font-bold text-emerald-700 bg-emerald-50/20">{fmt(act.jmcDone)}</td>
                        <td className="p-3 border-r border-slate-200/50 text-right font-bold text-blue-700 bg-blue-50/20">{fmt(act.wipConsumed)}</td>
                        <td className="p-3 border-r border-slate-200/50 text-right font-bold text-orange-700 bg-orange-50/20">{fmt(act.wipRequired)}</td>
                        <td className="p-3 border-r border-slate-200/50 text-right font-bold text-violet-700 bg-violet-50/20">{fmt(act.totalWip)}</td>
                        <td className="p-3 border-r border-slate-200/50 text-right font-black text-slate-900 bg-slate-100/50">{fmt(act.totalIwipJmc)}</td>
                        <td className="p-3 border-r border-slate-200/50 text-right font-bold">{fmt(act.totalIssued)}</td>
                        <td className="p-3 border-r border-slate-200/50 text-right font-bold">{fmt(act.totalReturned)}</td>
                        <td className="p-3 border-r border-slate-200/50 text-right font-black text-indigo-900 bg-indigo-50/30">{fmt(act.todayTotalBalance)}</td>
                        <td className="p-3 border-r border-slate-200/50 text-right font-bold">{fmt(act.finalBalQty)}</td>
                      </tr>
                      
                      {/* Child Item Rows */}
                      {isExpanded && act.items.map((item: any, j: number) => (
                        <tr key={`${i}-${j}`} className="bg-slate-50/80 hover:bg-slate-100/60 transition-colors text-xs border-l-4 border-l-transparent">
                          <td className="p-2 border-r border-slate-200/30"></td>
                          <td className="p-2 border-r border-slate-200/30 pl-6 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                            {item.tempCode && <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">{item.tempCode}</span>}
                            <span className="font-medium text-slate-700 truncate max-w-[300px]">{item.itemName || '-'}</span>
                          </td>
                          <td className="p-2 border-r border-slate-200/30 text-right font-medium text-slate-600">{fmt(item.jmcDone)}</td>
                          <td className="p-2 border-r border-slate-200/30 text-right font-medium text-slate-600">{fmt(item.wipConsumed)}</td>
                          <td className="p-2 border-r border-slate-200/30 text-right font-medium text-slate-600">{fmt(item.wipRequired)}</td>
                          <td className="p-2 border-r border-slate-200/30 text-right font-medium text-slate-600">{fmt(item.totalWip)}</td>
                          <td className="p-2 border-r border-slate-200/30 text-right font-semibold text-slate-700">{fmt(item.totalIwipJmc)}</td>
                          <td className="p-2 border-r border-slate-200/30 text-right text-slate-600">{fmt(item.totalIssued)}</td>
                          <td className="p-2 border-r border-slate-200/30 text-right text-slate-600">{fmt(item.totalReturned)}</td>
                          <td className="p-2 border-r border-slate-200/30 text-right font-semibold text-indigo-700">{fmt(item.todayTotalBalance)}</td>
                          <td className="p-2 border-r border-slate-200/30 text-right text-slate-600">{fmt(item.finalBalQty)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
                <td colSpan={2} className="p-3.5 uppercase tracking-wider text-slate-200 text-right">
                  Grand Total
                </td>
                <td className="p-3.5 text-right font-mono text-emerald-300">{fmt(totals.jmcDone)}</td>
                <td className="p-3.5 text-right font-mono text-blue-300">{fmt(totals.wipConsumed)}</td>
                <td className="p-3.5 text-right font-mono text-orange-300">{fmt(totals.wipRequired)}</td>
                <td className="p-3.5 text-right font-mono text-violet-300">{fmt(totals.totalWip)}</td>
                <td className="p-3.5 text-right font-mono text-white">{fmt(totals.totalIwipJmc)}</td>
                <td className="p-3.5 text-right font-mono text-slate-300">{fmt(totals.totalIssued)}</td>
                <td className="p-3.5 text-right font-mono text-slate-300">{fmt(totals.totalReturned)}</td>
                <td className="p-3.5 text-right font-mono text-indigo-300">{fmt(totals.todayTotalBalance)}</td>
                <td className="p-3.5 text-right font-mono text-slate-300">{fmt(totals.finalBalQty)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
