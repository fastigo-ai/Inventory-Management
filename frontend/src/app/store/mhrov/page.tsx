"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMhrovs, getMhrovDashboardData } from "@/features/store/api/store.api";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileText, BarChart3, ListTodo, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function MhrovPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "vouchers">("dashboard");

  // Vouchers State
  const [mhrovs, setMhrovs] = useState<any[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dashboard State
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [itemSearch, setItemSearch] = useState("");

  useEffect(() => {
    if (activeTab === "vouchers") {
      fetchMhrovs();
    } else {
      fetchDashboard();
    }
  }, [activeTab]);

  const fetchMhrovs = async () => {
    try {
      setLoadingVouchers(true);
      const res = await getMhrovs();
      setMhrovs(res.data || res || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingVouchers(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const res = await getMhrovDashboardData();
      setDashboardData(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const filteredMhrovs = mhrovs.filter((m) =>
    m.mhrovNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredItems = dashboardData?.items?.filter((item: any) => 
    item.itemName?.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.invoiceNumber?.toLowerCase().includes(itemSearch.toLowerCase())
  ) || [];

  const chartData = dashboardData ? [
    { name: 'Completed', value: dashboardData.metrics.doneCount, color: '#10b981' }, // emerald-500
    { name: 'Pending', value: dashboardData.metrics.pendingCount + dashboardData.metrics.doneNotSignedCount, color: '#f59e0b' }, // amber-500
    { name: 'Not Started', value: dashboardData.metrics.notStartedCount, color: '#ef4444' }, // red-500
  ].filter(d => d.value > 0) : [];

  return (
    <div className="flex-1 p-8 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">MHROV Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track inward items and manage Material Handover Receipt Vouchers
          </p>
        </div>
        <Button
          onClick={() => router.push("/store/mhrov/new")}
          className="bg-indigo-600 hover:bg-indigo-700 h-9 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New MHROV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-lg w-max mb-6">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "dashboard"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
          }`}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics Dashboard
        </button>
        <button
          onClick={() => setActiveTab("vouchers")}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === "vouchers"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
          }`}
        >
          <ListTodo className="w-4 h-4 mr-2" />
          MHROV Vouchers
        </button>
      </div>

      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {loadingDashboard ? (
            <div className="flex justify-center p-12 text-slate-500">Loading Dashboard...</div>
          ) : (
            <>
              {/* Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <p className="text-sm font-medium text-slate-500">Total Inward Items</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{dashboardData?.metrics.totalItems || 0}</p>
                </div>
                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <p className="text-sm font-medium text-emerald-700">MHROV Completed</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-2">{dashboardData?.metrics.doneCount || 0}</p>
                </div>
                <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 shadow-sm flex flex-col justify-between">
                  <p className="text-sm font-medium text-amber-700">MHROV Pending</p>
                  <p className="text-3xl font-bold text-amber-700 mt-2">{
                    (dashboardData?.metrics.pendingCount || 0) + (dashboardData?.metrics.doneNotSignedCount || 0)
                  }</p>
                </div>
                <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm flex flex-col justify-between">
                  <p className="text-sm font-medium text-red-700">Not Started</p>
                  <p className="text-3xl font-bold text-red-700 mt-2">{dashboardData?.metrics.notStartedCount || 0}</p>
                </div>
              </div>

              {/* Chart & Table Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:col-span-1 flex flex-col items-center justify-center">
                  <h3 className="text-base font-semibold text-slate-800 w-full mb-4">Completion Status</h3>
                  {chartData.length > 0 ? (
                    <div className="w-full h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
                      No data to visualize
                    </div>
                  )}
                </div>

                {/* Master Items Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-base font-semibold text-slate-800">Item Tracking</h3>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        className="pl-9 h-8 text-[13px] bg-white border-slate-200 focus-visible:ring-indigo-500"
                        placeholder="Search items or invoices..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="overflow-y-auto max-h-[400px]">
                    <table className="w-full text-sm text-left relative">
                      <thead className="text-[12px] text-slate-500 font-medium bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-5 py-3">Item Name</th>
                          <th className="px-5 py-3">Invoice No</th>
                          <th className="px-5 py-3">MHROV Status</th>
                          <th className="px-5 py-3">MHROV No</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-[13px] text-slate-700">
                        {filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                              No items found
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((item: any) => (
                            <tr key={item._id} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="px-5 py-3 font-medium text-slate-900 max-w-[200px] truncate" title={item.itemName}>
                                {item.itemName}
                              </td>
                              <td className="px-5 py-3 text-slate-500">{item.invoiceNumber}</td>
                              <td className="px-5 py-3">
                                {item.mhrovData.status === 'NOT STARTED' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 shadow-sm animate-pulse">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Not Started
                                  </span>
                                ) : item.mhrovData.status === 'done' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Done
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 font-medium text-indigo-600">
                                {item.mhrovData.mhrovNumber || "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "vouchers" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-base font-semibold text-slate-800">Voucher Registry</h3>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9 h-9 text-[13px] bg-white border-slate-200 focus-visible:ring-indigo-500"
                placeholder="Search by MHROV Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[13px] text-slate-500 font-medium bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-medium">MHROV No</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">PI Numbers</th>
                  <th className="px-6 py-3 font-medium">Items Linked</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-[13px] text-slate-700">
                {loadingVouchers ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Loading MHROVs...
                    </td>
                  </tr>
                ) : filteredMhrovs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <FileText className="w-8 h-8 text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-900 mb-1">
                          No MHROVs Found
                        </p>
                        <p className="text-[13px]">
                          Create a new MHROV to get started.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMhrovs.map((mhrov) => (
                    <tr
                      key={mhrov._id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/store/mhrov/${mhrov._id}`)}
                    >
                      <td className="px-6 py-3 font-medium text-indigo-600">
                        {mhrov.mhrovNumber}
                      </td>
                      <td className="px-6 py-3">
                        {new Date(mhrov.mhrovDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium uppercase tracking-wider ${
                            mhrov.status === "done"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : mhrov.status === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {mhrov.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 max-w-[200px] truncate" title={Array.from(new Set(mhrov.inwardEntries?.map((e: any) => e.invoiceNumber).filter(Boolean))).join(", ")}>
                        {Array.from(new Set(mhrov.inwardEntries?.map((e: any) => e.invoiceNumber).filter(Boolean))).join(", ") || "-"}
                      </td>
                      <td className="px-6 py-3">
                        {mhrov.inwardEntries?.length || 0} Items
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-slate-500 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/store/mhrov/${mhrov._id}`);
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
