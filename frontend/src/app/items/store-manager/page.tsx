"use client";

import { useEffect, useState } from "react";
import { getAdminInwardEntries, updateInwardEntry } from "@/features/store/api/store.api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, AlertTriangle, CheckCircle } from "lucide-react";

export default function StoreManagerDataPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    circle: '',
    status: '',
    vendorName: '',
    poNumber: ''
  });

  useEffect(() => {
    fetchEntries();
  }, [filters]);

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
        <h1 className="text-xl text-slate-800 font-bold">Store Manager Data (GRNs)</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-[1400px] mx-auto space-y-4">
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
            <div className="flex items-center text-slate-500 font-medium mr-2">
              <Filter className="w-4 h-4 mr-2" /> Filters
            </div>
            
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
              value={filters.circle}
              onChange={e => handleFilterChange('circle', e.target.value)}
            >
              <option value="">All Circles</option>
              <option value="Solan">Solan</option>
              <option value="Nahan">Nahan</option>
              <option value="Rampur">Rampur</option>
              <option value="Rohru">Rohru</option>
            </select>

            <select 
              className="w-40 h-9 rounded-md text-sm border border-slate-300 px-3 bg-white focus:outline-none focus:border-blue-500"
              value={filters.status}
              onChange={e => handleFilterChange('status', e.target.value)}
            >
              <option value="">Status (Non-Draft)</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="VERIFIED">Verified</option>
              <option value="NEEDS_CORRECTION">Needs Correction</option>
            </select>
          </div>

          {/* Table */}
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
                    <th className="px-4 py-4">Submitted By</th>
                    <th className="px-4 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Loading data...</td></tr>
                  ) : entries.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">No inward entries found matching your criteria.</td></tr>
                  ) : (
                    entries.map(entry => {
                      const totalPackages = entry.packingList?.reduce((acc: number, p: any) => acc + (p.quantity || 0), 0) || 0;
                      
                      // Check for invoice quantity vs PO mismatch (simple logic for display flag)
                      // If amount doesn't equal rate * invoiceQty, flag it. Or if invoiceQty differs from po. (Assuming amount is rate * qty).
                      // The prompt said: "amount should be cross-checked against qty x rate from the fetched PO/invoice line; log (don't silently block) if there's a mismatch, and surface it to the Admin portal as a flag."
                      const calculatedAmount = (entry.rate || 0) * (entry.invoiceQty || 0);
                      const isMismatch = entry.amount && Math.abs(entry.amount - calculatedAmount) > 0.1;

                      return (
                        <tr key={entry._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {entry.circle || '-'}
                            {isMismatch && (
                              <div className="inline-flex items-center ml-2 text-amber-500" title={`Amount mismatch! Expected ₹${calculatedAmount.toFixed(2)}, got ₹${entry.amount}`}>
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-blue-600 font-medium">{entry.poNumber || '-'}</td>
                          <td className="px-4 py-3">{entry.vendorName || '-'}</td>
                          <td className="px-4 py-3">{entry.invoiceNumber || '-'}</td>
                          <td className="px-4 py-3">{entry.diRefNo || '-'}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700">{totalPackages}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs">
                              <span className="text-slate-500">Tr:</span> {entry.transportName || '-'} <br/>
                              <span className="text-slate-500">Ch:</span> {entry.challanNumber || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                              entry.status === 'VERIFIED' ? 'bg-green-50 text-green-700 border-green-200' : 
                              entry.status === 'NEEDS_CORRECTION' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {entry.createdBy?.firstName} {entry.createdBy?.lastName} <br/>
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {entry.status === 'SUBMITTED' ? (
                              <Button 
                                onClick={() => handleAccept(entry._id)}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                              >
                                Accept
                              </Button>
                            ) : entry.status === 'VERIFIED' ? (
                              <div className="flex items-center justify-center text-green-600 text-xs font-semibold">
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                Accepted
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
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

        </div>
      </div>
    </div>
  );
}
