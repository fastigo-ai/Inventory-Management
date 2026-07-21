"use client";

import { useEffect, useState } from "react";
import { getAdminInwardEntries, updateInwardEntry, getAdminStockSummary } from "@/features/store/api/store.api";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Search, Filter, AlertTriangle, CheckCircle, ListChecks, Package } from "lucide-react";
import { StockSummaryTable } from "@/features/store/components/StockSummaryTable";

export default function StoreManagerDataPage() {
  const [activeTab, setActiveTab] = useState<'inward' | 'summary'>('inward');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    circle: '',
    package: '',
    status: '',
    vendorName: '',
    poNumber: ''
  });

  useEffect(() => {
    if (activeTab === 'inward') {
      fetchEntries();
    } else {
      fetchStockSummary();
    }
  }, [filters, activeTab]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await getAdminInwardEntries(filters);
      setEntries(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await getAdminStockSummary({ circle: filters.circle, package: filters.package });
      setSummaryData(res.data || []);
    } catch (error) {
      console.error("Failed to fetch stock summary:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    if (!confirm("Are you sure you want to verify and accept this inward entry?")) return;
    try {
      await updateInwardEntry(id, { status: 'VERIFIED' });
      fetchEntries();
    } catch (error) {
      console.error(error);
      alert("Failed to accept entry.");
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      
      {/* Header */}
      <div className="flex-none h-16 border-b border-slate-200 flex items-center px-6 bg-white shadow-sm z-10 shrink-0 justify-between">
        <h1 className="text-xl text-slate-800 font-bold">Store Manager Data (GRNs) & Stock Summary</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-[1400px] mx-auto space-y-4">

          <div className="flex space-x-1 border-b border-slate-200 mb-2">
            <button
              onClick={() => setActiveTab('inward')}
              className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'inward'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>Inward Data</span>
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center space-x-2 py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'summary'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Stock Summary</span>
            </button>
          </div>
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
            <div className="flex items-center text-slate-500 font-medium mr-2">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </div>

            <select 
              className="w-40 h-9 rounded-md text-sm border border-slate-300 px-3 bg-white focus:outline-none focus:border-blue-500"
              value={filters.circle}
              onChange={e => handleFilterChange('circle', e.target.value)}
            >
              <option value="">All Circles</option>
              <option value="Solan">Solan</option>
              <option value="Nahan">Nahan</option>
              <option value="Rampur">Rampur</option>
              <option value="Rohru">Rohru</option>
              <option value="Mumbai">Mumbai</option>
            </select>

            <select 
              className="w-40 h-9 rounded-md text-sm border border-slate-300 px-3 bg-white focus:outline-none focus:border-blue-500"
              value={filters.package}
              onChange={e => handleFilterChange('package', e.target.value)}
            >
              <option value="">All Packages</option>
              <option value="Hardware Pack 1">Hardware Pack 1</option>
              <option value="Package 2">Package 2</option>
            </select>
            
            {activeTab === 'inward' && (
              <>
                <Input 
                  placeholder="Search PO Number..." 
                  className="w-48 h-9 text-sm"
                  value={filters.poNumber}
                  onChange={e => handleFilterChange('poNumber', e.target.value)}
                />
                
                <Input 
                  placeholder="Search Vendor..." 
                  className="w-48 h-9 text-sm"
                  value={filters.vendorName}
                  onChange={e => handleFilterChange('vendorName', e.target.value)}
                />

                <select 
                  className="w-40 h-9 rounded-md text-sm border border-slate-300 px-3 bg-white focus:outline-none focus:border-blue-500"
                  value={filters.status}
                  onChange={e => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Status (Non-Draft)</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="VERIFIED">Verified/Accepted</option>
                  <option value="NEEDS_CORRECTION">Needs Correction</option>
                </select>
              </>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'inward' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="px-6 py-4">Inward ID</th>
                      <th className="px-6 py-4">Vendor</th>
                      <th className="px-6 py-4">PO No.</th>
                      <th className="px-6 py-4">Circle / Pkg</th>
                      <th className="px-6 py-4">Challan / Invoice</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading entries...</td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                          No store inward data found.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry: any) => (
                        <tr key={entry._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">
                            {entry._id.substring(entry._id.length - 6)}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-800">{entry.vendorName || '-'}</td>
                          <td className="px-6 py-4">{entry.poNumber || '-'}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">{entry.circle || '-'}</span>
                              <span className="text-xs text-slate-500">{entry.package || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {entry.challanNumber || entry.invoiceNumber || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              entry.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                              entry.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {entry.status === 'SUBMITTED' ? (
                              <Button 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white shadow-sm h-8 px-3"
                                onClick={() => handleAccept(entry._id)}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                Accept
                              </Button>
                            ) : (
                              <span className="text-slate-400 text-xs italic">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-slate-800">Global Stock Summary</h2>
                 <p className="text-sm text-slate-500">
                   {filters.circle ? `Filtered by ${filters.circle}` : 'All Circles'} 
                   {filters.package ? ` / ${filters.package}` : ''}
                 </p>
              </div>
              <StockSummaryTable data={summaryData} isLoading={summaryLoading} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
