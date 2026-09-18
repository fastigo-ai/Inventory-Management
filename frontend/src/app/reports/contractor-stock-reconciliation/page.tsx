"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/shared/api/axios';
import { ArrowLeft, Package, TrendingDown, TrendingUp, CheckCircle, AlertTriangle, Search, ChevronDown, ChevronRight, Download } from 'lucide-react';
import Link from 'next/link';

interface ContractorItemRow {
  contractorId: string;
  contractorName: string;
  tempCode: string;
  itemName: string;
  unit: string;
  issuedQty: number;
  jmcConsumedQty: number;
  wipConsumedQty: number;
  returnedQty: number;
  balance: number;
  status: 'balanced' | 'holding' | 'over-consumed';
}

interface ReconciliationData {
  rows: ContractorItemRow[];
  summary: {
    totalContractors: number;
    totalItems: number;
    totalIssued: number;
    totalJmcConsumed: number;
    totalWipConsumed: number;
    totalReturned: number;
    totalBalance: number;
    balancedCount: number;
    holdingCount: number;
    overConsumedCount: number;
  };
}

const CIRCLES = ['Nahan', 'Solan', 'Rohru', 'Rampur'];

export default function ContractorStockReconciliation() {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [circle, setCircle] = useState('Nahan');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedContractors, setExpandedContractors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (circle) query.append('circle', circle);
        const res = await api.get(`/reports/contractor-stock-reconciliation?${query.toString()}`);
        setData(res.data.data || null);
        // Auto-expand all contractors
        const contractors = new Set<string>();
        for (const row of (res.data.data?.rows || [])) {
          contractors.add(row.contractorId);
        }
        setExpandedContractors(contractors);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [circle]);

  // Group rows by contractor
  const contractorGroups = useMemo(() => {
    if (!data?.rows) return [];
    const groups: Record<string, { name: string; rows: ContractorItemRow[]; totalIssued: number; totalConsumed: number; totalBalance: number }> = {};
    
    for (const row of data.rows) {
      if (!groups[row.contractorId]) {
        groups[row.contractorId] = { name: row.contractorName, rows: [], totalIssued: 0, totalConsumed: 0, totalBalance: 0 };
      }
      // Apply filters
      const matchesSearch = !searchTerm || 
        row.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        row.tempCode.includes(searchTerm) ||
        row.contractorName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      
      if (matchesSearch && matchesStatus) {
        groups[row.contractorId].rows.push(row);
        groups[row.contractorId].totalIssued += row.issuedQty;
        groups[row.contractorId].totalConsumed += row.jmcConsumedQty + row.wipConsumedQty;
        groups[row.contractorId].totalBalance += row.balance;
      }
    }
    
    return Object.entries(groups)
      .filter(([, g]) => g.rows.length > 0)
      .sort(([, a], [, b]) => a.name.localeCompare(b.name));
  }, [data, searchTerm, statusFilter]);

  const toggleContractor = (cid: string) => {
    setExpandedContractors(prev => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid); else next.add(cid);
      return next;
    });
  };

  const collapseAll = () => setExpandedContractors(new Set());
  const expandAll = () => {
    const all = new Set<string>();
    contractorGroups.forEach(([cid]) => all.add(cid));
    setExpandedContractors(all);
  };

  const exportCSV = () => {
    if (!data?.rows) return;
    const headers = ['Contractor', 'TempCode', 'Item Name', 'Unit', 'MIN Issued', 'JMC Consumed', 'WIP Consumed', 'Returns', 'Balance', 'Status'];
    const csvRows = [headers.join(',')];
    for (const row of data.rows) {
      csvRows.push([
        `"${row.contractorName}"`, row.tempCode, `"${row.itemName}"`, row.unit,
        row.issuedQty.toFixed(2), row.jmcConsumedQty.toFixed(2), row.wipConsumedQty.toFixed(2),
        row.returnedQty.toFixed(2), row.balance.toFixed(2), row.status
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contractor-stock-reconciliation-${circle}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-20">
        <div className="max-w-full mx-auto">
          <Link href="/reports" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Reports
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Contractor Stock Reconciliation</h1>
              <p className="text-sm text-slate-500 mt-1">Real-time stock position: MIN Issued vs JMC/WIP Consumed vs Returns</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={circle}
                onChange={e => setCircle(e.target.value)}
              >
                {CIRCLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-full mx-auto w-full">
        {/* KPI Cards */}
        {data?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contractors</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.summary.totalContractors}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Issued</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(data.summary.totalIssued)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">JMC Consumed</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{fmt(data.summary.totalJmcConsumed)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Balanced
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{data.summary.balancedCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-500" /> Holding Stock
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{data.summary.holdingCount}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Over-consumed
              </p>
              <p className="text-2xl font-bold text-red-600 mt-1">{data.summary.overConsumedCount}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by contractor, item name, or temp code..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="balanced">✅ Balanced</option>
              <option value="holding">🟡 Holding Stock</option>
              <option value="over-consumed">🔴 Over-consumed</option>
            </select>
            <button onClick={expandAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1">Expand All</button>
            <button onClick={collapseAll} className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1">Collapse All</button>
          </div>
        </div>

        {/* Main Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-slate-500">Loading reconciliation data...</span>
          </div>
        ) : contractorGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No Data Found</h3>
            <p className="text-slate-500 mt-1">No contractor stock data available for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contractorGroups.map(([cid, group]) => {
              const isExpanded = expandedContractors.has(cid);
              const overCount = group.rows.filter(r => r.status === 'over-consumed').length;
              const holdCount = group.rows.filter(r => r.status === 'holding').length;
              
              return (
                <div key={cid} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Contractor Header */}
                  <button
                    onClick={() => toggleContractor(cid)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <div className="text-left">
                        <h3 className="text-sm font-semibold text-slate-900">{group.name}</h3>
                        <p className="text-xs text-slate-500">{group.rows.length} items</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-blue-600 font-medium">Issued: {fmt(group.totalIssued)}</span>
                      <span className="text-indigo-600 font-medium">Consumed: {fmt(group.totalConsumed)}</span>
                      <span className={`font-bold ${group.totalBalance < 0 ? 'text-red-600' : group.totalBalance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        Balance: {fmt(group.totalBalance)}
                      </span>
                      {overCount > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{overCount} over</span>}
                      {holdCount > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{holdCount} holding</span>}
                    </div>
                  </button>

                  {/* Items Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">TempCode</th>
                            <th className="px-4 py-3 text-left font-medium">Item Name</th>
                            <th className="px-4 py-3 text-left font-medium">Unit</th>
                            <th className="px-4 py-3 text-right font-medium">MIN Issued</th>
                            <th className="px-4 py-3 text-right font-medium">JMC Consumed</th>
                            <th className="px-4 py-3 text-right font-medium">WIP Consumed</th>
                            <th className="px-4 py-3 text-right font-medium">Returns</th>
                            <th className="px-4 py-3 text-right font-medium">Balance</th>
                            <th className="px-4 py-3 text-center font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.rows.map((row, idx) => (
                            <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.status === 'over-consumed' ? 'bg-red-50/40' : ''}`}>
                              <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{row.tempCode}</td>
                              <td className="px-4 py-3 text-slate-900 max-w-[300px] truncate" title={row.itemName}>{row.itemName}</td>
                              <td className="px-4 py-3 text-slate-500">{row.unit}</td>
                              <td className="px-4 py-3 text-right font-medium text-blue-700">{fmt(row.issuedQty)}</td>
                              <td className="px-4 py-3 text-right font-medium text-indigo-700">{fmt(row.jmcConsumedQty)}</td>
                              <td className="px-4 py-3 text-right font-medium text-purple-700">{fmt(row.wipConsumedQty)}</td>
                              <td className="px-4 py-3 text-right font-medium text-orange-700">{fmt(row.returnedQty)}</td>
                              <td className={`px-4 py-3 text-right font-bold ${
                                row.balance < -0.01 ? 'text-red-600' : row.balance > 0.01 ? 'text-amber-600' : 'text-emerald-600'
                              }`}>
                                {fmt(row.balance)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {row.status === 'balanced' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">✅ OK</span>}
                                {row.status === 'holding' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">🟡 Stock</span>}
                                {row.status === 'over-consumed' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">🔴 Over</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
