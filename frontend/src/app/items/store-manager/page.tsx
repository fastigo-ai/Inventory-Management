"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminInwardEntries, updateInwardEntry, getAdminStockSummary } from "@/features/store/api/store.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, AlertTriangle, CheckCircle, ListChecks, Package } from "lucide-react";
import { StockSummaryTable } from "@/features/store/components/StockSummaryTable";

export default function StoreManagerDataPage() {
  const router = useRouter();
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

  const handleAccept = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to verify and accept this inward entry?")) return;
    try {
      await updateInwardEntry(id, { status: 'VERIFIED' });
      fetchEntries();
    } catch (error) {
      console.error(error);
      alert("Failed to accept entry.");
    }
  };

  const handleVerifyAll = async () => {
    const pendingEntries = entries.filter(e => e.status === 'SUBMITTED');
    if (pendingEntries.length === 0) {
      alert("No pending entries to verify.");
      return;
    }
    if (!confirm(`Are you sure you want to verify all ${pendingEntries.length} pending entries?`)) return;

    try {
      setLoading(true);
      await Promise.all(pendingEntries.map(entry => updateInwardEntry(entry._id, { status: 'VERIFIED' })));
      fetchEntries();
    } catch (error) {
      console.error(error);
      alert("Failed to verify some entries.");
      fetchEntries(); // Refresh to show which ones succeeded
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRowClick = (entry: any) => {
    if (entry.purchaseInvoiceId) {
      router.push(`/store/inventory/inward/${entry.purchaseInvoiceId}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      
      {/* Header */}
      <div className="flex-none h-16 border-b border-slate-200 flex items-center px-6 bg-white shadow-sm z-10 shrink-0 justify-between">
        <h1 className="text-xl text-slate-800 font-bold">Store Manager Data (GRNs) & Stock Summary</h1>
        {activeTab === 'inward' && (
          <Button 
            onClick={handleVerifyAll}
            disabled={loading || entries.filter(e => e.status === 'SUBMITTED').length === 0}
            className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Verify All Pending
          </Button>
        )}
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
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="px-4 py-4">Circle</th>
                      <th className="px-4 py-4">PO Number</th>
                      <th className="px-4 py-4">Vendor</th>
                      <th className="px-4 py-4">Invoice No</th>
                      <th className="px-4 py-4">DI Ref No</th>
                      <th className="px-4 py-4 text-center">Total Packages</th>
                      <th className="px-4 py-4">Transport/Challan</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading data...</td></tr>
                    ) : entries.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No inward entries found matching your criteria.</td></tr>
                    ) : (
                      entries.map(entry => {
                        const totalPackages = entry.packingList?.reduce((acc: number, p: any) => acc + (p.quantity || 0), 0) || 0;
                        
                        const calculatedAmount = (entry.rate || 0) * (entry.invoiceQty || 0);
                        const isMismatch = entry.amount && Math.abs(entry.amount - calculatedAmount) > 0.1;

                        return (
                          <tr 
                            key={entry._id} 
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => handleRowClick(entry)}
                          >
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {entry.circle || '-'}
                              {isMismatch && (
                                <div className="inline-flex items-center ml-2 text-amber-500" title={`Amount mismatch! Expected ₹${calculatedAmount.toFixed(2)}, got ₹${entry.amount}`}>
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{entry.poNumber || '-'}</td>
                            <td className="px-4 py-3 font-medium text-slate-800">{entry.vendorName || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.invoiceNumber || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.diId ? 'Linked' : '-'}</td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-700">{totalPackages}</td>
                            <td className="px-4 py-3 text-slate-600">{entry.transportDetails?.transportName || entry.challanNumber || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                entry.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                entry.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                entry.status === 'NEEDS_CORRECTION' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {entry.status === 'VERIFIED' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {entry.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                              {entry.status === 'SUBMITTED' ? (
                                <Button 
                                  onClick={(e) => handleAccept(entry._id, e)}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-3 shadow-sm"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                  Verify
                                </Button>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Done</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
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
