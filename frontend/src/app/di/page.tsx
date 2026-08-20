"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Upload } from "lucide-react";
import { getDIs, getDIInsights } from "@/features/di/api/di.api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DIImportModal } from "@/features/di/components/DIImportModal";
import { Download } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Filter, PieChart as PieChartIcon, Activity, CheckCircle, Clock } from "lucide-react";

export default function DIPage() {
  const router = useRouter();
  const [dis, setDis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [search, setSearch] = useState("");
  const [diNumber, setDiNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [globalStatusCounts, setGlobalStatusCounts] = useState<Record<string, number>>({});
  const [globalProgress, setGlobalProgress] = useState(0);
  const [globalBarData, setGlobalBarData] = useState<any[]>([]);
  const [globalTotalActiveDIs, setGlobalTotalActiveDIs] = useState(0);

  const fetchDIs = () => {
    setLoading(true);
    const listPromise = getDIs({ 
      page, 
      limit,
      search: search || undefined,
      diNumber: diNumber || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: statusFilter || undefined
    });
    
    const insightsPromise = getDIInsights();

    Promise.allSettled([listPromise, insightsPromise])
      .then(([listResult, insightsResult]) => {
        // Handle List Data
        if (listResult.status === 'fulfilled') {
          const res = listResult.value;
          if (res.success && res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
            setDis(res.data.dis || []);
            setTotalPages(res.data.pagination?.totalPages || 1);
            setTotalItems(res.data.pagination?.total || 0);
          } else {
            setDis(Array.isArray(res.data) ? res.data : []);
            setTotalPages(1);
            setTotalItems(Array.isArray(res.data) ? res.data.length : 0);
          }
        } else {
          console.error("Failed to fetch DI list:", listResult.reason);
        }

        // Handle Insights Data
        if (insightsResult.status === 'fulfilled') {
          const res = insightsResult.value;
          if (res.success && res.data?.insights) {
            if (res.data.insights.statusCounts) setGlobalStatusCounts(res.data.insights.statusCounts);
            if (res.data.insights.overallProgress !== undefined) setGlobalProgress(res.data.insights.overallProgress);
            if (res.data.insights.barData) setGlobalBarData(res.data.insights.barData);
            if (res.data.insights.totalActiveDIs !== undefined) setGlobalTotalActiveDIs(res.data.insights.totalActiveDIs);
          }
        } else {
          console.error("Failed to fetch DI insights:", insightsResult.reason);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDIs();
  }, [page, limit, search, diNumber, startDate, endDate, statusFilter]);

  // Insights rely on global state from backend
  const overallProgress = globalProgress;
  
  const pieData = Object.keys(globalStatusCounts).map(status => ({
    name: status,
    value: globalStatusCounts[status]
  }));
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#64748b'];

  const barData = globalBarData;

  const exportToCSV = async () => {
    try {
      const res = await getDIs({ 
        page: 1, 
        limit: 10000,
        search: search || undefined,
        diNumber: diNumber || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter || undefined
      });
      
      const data = res.data?.dis || res.data || [];
      if (!Array.isArray(data) || data.length === 0) {
        alert("No DIs to export");
        return;
      }
      
      const headers = ['DINumber', 'PurchaseOrderNumber', 'VendorName', 'Date', 'Circle', 'Package', 'Notes', 'ItemName', 'TempCode', 'LoaSerialNo', 'Unit', 'Quantity'];
      
      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows: any[] = [];
      
      data.forEach((di: any) => {
        const baseInfo = {
          'DINumber': di.diNumber || '',
          'PurchaseOrderNumber': di.poNumber || di.purchaseOrderId?.purchaseOrderNumber || '',
          'VendorName': di.vendorName || di.purchaseOrderId?.vendorName || '',
          'Date': di.date ? new Date(di.date).toISOString().split('T')[0] : '',
          'Circle': di.circle || '',
          'Package': di.package || '',
          'Notes': di.notes || ''
        };
        
        if (di.lineItems && di.lineItems.length > 0) {
          di.lineItems.forEach((li: any) => {
            rows.push({
              ...baseInfo,
              'ItemName': li.itemName || '',
              'TempCode': li.tempCode || '',
              'LoaSerialNo': li.loaSerialNo || '',
              'Unit': li.unit || '',
              'Quantity': li.quantity || 0
            });
          });
        } else {
          rows.push({
            ...baseInfo,
            'ItemName': '',
            'TempCode': '',
            'LoaSerialNo': '',
            'Unit': '',
            'Quantity': ''
          });
        }
      });
      
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `DI_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export DIs");
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 min-h-screen">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">DI Registrations</h1>
            <p className="text-sm text-slate-500 mt-1">Manage dispatch instructions and line items</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/di/new">
              <Button className="bg-[#0076f2] hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                New DI Registration
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-center text-slate-500 hover:bg-slate-100 p-2 rounded-md border border-slate-200 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-[13px]">
                <DropdownMenuItem onClick={() => setIsImportModalOpen(true)} className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2 text-slate-500" />
                  Import DI Registrations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
                  <Download className="w-4 h-4 mr-2 text-slate-500" />
                  Export DI Registrations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <DIImportModal 
          isOpen={isImportModalOpen} 
          onClose={() => setIsImportModalOpen(false)} 
          onSuccess={() => {
            setIsImportModalOpen(false);
            fetchDIs();
          }} 
        />

        {/* Business Insights Dashboard */}
        {showInsights && !loading && dis.length > 0 && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* KPI Cards */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Active DIs</p>
                  <p className="text-2xl font-black text-slate-800">{globalTotalActiveDIs || totalItems}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Overall Fulfillment</p>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-black text-slate-800">{overallProgress}%</p>
                    <p className="text-xs font-medium text-slate-500 mb-1">Items Invoiced</p>
                  </div>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Status Breakdown Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" /> Status Breakdown
              </h3>
              <div className="flex-1 min-h-[150px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} DIs`, 'Count']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available</div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-2">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    {entry.name}: {entry.value}
                  </div>
                ))}
              </div>
            </div>

            {/* Top DIs Fulfillment Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Fulfillment by DI
              </h3>
              <div className="flex-1 min-h-[150px]">
                {barData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="Fulfillment" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No data available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by DI No, PO, Vendor..."
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-[140px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Received">Received</option>
              <option value="Draft">Draft</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="w-[140px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setPage(1); setStartDate(e.target.value); }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-[140px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setPage(1); setEndDate(e.target.value); }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(search || diNumber || startDate || endDate || statusFilter) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setDiNumber("");
                setStartDate("");
                setEndDate("");
                setStatusFilter("");
                setPage(1);
              }}
              className="h-9 text-slate-500 hover:text-slate-700"
            >
              Reset
            </Button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : dis.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No DIs found</h3>
              {search || diNumber || startDate || endDate ? (
                <>
                  <p className="text-slate-500 mb-6">No DI registrations match your active filters.</p>
                  <Button variant="outline" onClick={() => {
                    setSearch("");
                    setDiNumber("");
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}>Clear Filters</Button>
                </>
              ) : (
                <>
                  <p className="text-slate-500 mb-6">Create a DI registration after a Purchase Order is inspected.</p>
                  <Link href="/di/new">
                    <Button variant="outline">Create your first DI</Button>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">DI NUMBER</th>
                      <th className="px-6 py-3 whitespace-nowrap">PO NUMBER</th>
                      <th className="px-6 py-3 whitespace-nowrap">VENDOR</th>
                      <th className="px-6 py-3 whitespace-nowrap">DATE</th>
                      <th className="px-6 py-3 whitespace-nowrap">STATUS</th>
                      <th className="px-6 py-3 whitespace-nowrap">PROGRESS</th>
                      <th className="px-6 py-3 whitespace-nowrap text-right">INVOICES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dis.map(di => {
                      const percent = di.progressPercent || 0;
                      return (
                        <tr 
                          key={di._id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => {
                            router.push(`/di/${di._id}`);
                          }}
                        >
                          <td className="px-6 py-4 font-medium text-blue-600 whitespace-nowrap">{di.diNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{di.poNumber || di.purchaseOrderId?.purchaseOrderNumber || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{di.vendorName || di.purchaseOrderId?.vendorName || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{new Date(di.date).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              di.status === 'Active' ? 'bg-green-100 text-green-700' :
                              di.status === 'Received' ? 'bg-green-100 text-green-700' :
                              di.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {di.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3 w-36">
                              <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden shadow-inner">
                                <div 
                                  className="h-full rounded-full transition-all duration-500" 
                                  style={{ 
                                    width: `${Math.max(0, Number(percent) || 0)}%`,
                                    background: Number(percent) >= 100 ? 'linear-gradient(to right, #34d399, #10b981)' : 'linear-gradient(to right, #60a5fa, #3b82f6)'
                                  }}
                                ></div>
                              </div>
                              <span className="text-[11px] font-bold text-slate-600 w-9">{percent}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            {di.childInvoices && di.childInvoices.length > 0 ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-bold text-slate-700">{di.childInvoices.length} Invoices</span>
                                <div className="flex flex-wrap gap-1 justify-end max-w-[150px]">
                                  {di.childInvoices.slice(0, 2).map((pi: any, idx: number) => (
                                    <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded">
                                      {pi.invoiceNumber}
                                    </span>
                                  ))}
                                  {di.childInvoices.length > 2 && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 rounded">
                                      +{di.childInvoices.length - 2} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalItems > 0 && (
                <div className="bg-white border-t border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-[13px] text-slate-500 font-medium">
                    Showing {Math.min(limit, totalItems - (page - 1) * limit)} out of {totalItems}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))} 
                      disabled={page === 1} 
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                    >
                      <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 1L1 5L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    
                    {(() => {
                      const pages = [];
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        if (page <= 4) {
                          pages.push(1, 2, 3, 4, 5, '...', totalPages);
                        } else if (page >= totalPages - 3) {
                          pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                        } else {
                          pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
                        }
                      }
                      
                      return pages.map((p, i) => (
                        <button 
                          key={i} 
                          onClick={() => typeof p === 'number' && setPage(p)}
                          disabled={p === '...'}
                          className={`w-8 h-8 flex items-center justify-center rounded text-[13px] font-medium transition-colors ${
                            p === page 
                              ? 'border border-[#009b9f] text-[#009b9f] bg-white' 
                              : p === '...' 
                                ? 'text-slate-400 cursor-default' 
                                : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      ));
                    })()}
                    
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                      disabled={page === totalPages} 
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                    >
                      <svg width="6" height="10" viewBox="0 0 6 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 9L5 5L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[13px] text-slate-500 font-medium">
                    <span>Rows per page</span>
                    <select 
                      value={limit} 
                      onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} 
                      className="border border-slate-200 rounded px-2 py-1 text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#009b9f] cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
