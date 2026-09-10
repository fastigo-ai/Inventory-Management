"use client";

import { useEffect, useState } from "react";
import { getWips, deleteWip, exportWipTemplate } from "@/features/site-portal/api/wip.api";
import { getContractors } from "@/features/contractors/api/contractors.api";
import { FileText, Plus, Trash2, Download, Edit, Eye, Users, IndianRupee } from "lucide-react";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WipBulkUploadModal } from "@/features/site-portal/components/WipBulkUploadModal";

export default function WipRegisterPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [aggregates, setAggregates] = useState({ totalClaimed: 0, totalApproved: 0 });
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<string>('All');
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const router = useRouter();

  // Server-side Pagination & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchContractors();
  }, []);

  useEffect(() => {
    fetchWips();
  }, [selectedContractor, startDate, endDate, currentPage, pageSize, debouncedSearchTerm]);

  const fetchContractors = async () => {
    try {
      const res = await getContractors();
      setContractorsList(res?.data || res || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchWips = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (selectedContractor !== 'All') params.contractorId = selectedContractor;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getWips(params);
      const payload = res.data?.data || {};
      setEntries(payload.data || []);
      setTotalItems(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
      setAggregates(payload.aggregates || { totalClaimed: 0, totalApproved: 0 });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const params: any = { limit: 'all' };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (selectedContractor !== 'All') params.contractorId = selectedContractor;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const blob = await exportWipTemplate(params);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Wip_Export.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to export data.');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteWip(id);
        fetchWips();
      } catch (error) {
        console.error(error);
        alert('Failed to delete.');
      }
    }
  };

  // Replace useClientTable paginatedData with actual entries
  const paginatedData = entries;

  // Business Insights Computations from Server Aggregates
  const totalWips = totalItems;
  const totalClaimedValue = aggregates.totalClaimed || 0;
  const totalApprovedValue = aggregates.totalApproved || 0;
  const activeContractorsCount = selectedContractor === 'All' ? contractorsList.length : 1;

  return (
    <div className="flex-1 bg-[#f8fafc] min-h-screen p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Breadcrumb */}
        <div className="mb-1">
          <span className="text-xs text-slate-400 font-medium">Site Portal &gt; WIP Consumed</span>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">WIP Consumed</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track and manage WIP consumed entries with contractor details, claims and approvals.</p>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">From</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">To</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          {contractorsList.length > 0 && (
            <select 
              className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm min-w-[180px]"
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
            >
              <option value="All">All Contractors</option>
              {contractorsList.map((contractor: any) => (
                <option key={contractor._id} value={contractor._id}>
                  {contractor.name || contractor.vendorName || contractor.dynamicData?.companyName || 'Unknown'}
                </option>
              ))}
            </select>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={exportData} className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 rounded-lg shadow-sm whitespace-nowrap font-semibold">
            <Download className="mr-2 h-4 w-4" /> Export Data
          </Button>
          <Button variant="outline" onClick={() => setUploadModalOpen(true)} className="rounded-lg shadow-sm whitespace-nowrap">
            <FileText className="mr-2 h-4 w-4" /> Bulk Upload WIP
          </Button>
        </div>

        {/* New Entry Button */}
        <div className="mb-5">
          <Button 
            onClick={() => router.push('/site-portal/wip-consumed/new')}
            className="bg-[#0076f2] hover:bg-[#005fc4] text-white rounded-lg shadow-sm whitespace-nowrap px-5"
          >
            <Plus className="mr-2 h-4 w-4" /> New WIP Entry
          </Button>
        </div>

        {/* Business Insights Dashboard */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">Total WIPs</p>
                <p className="text-2xl font-bold text-slate-800">{totalWips}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">Active Contractors</p>
                <p className="text-2xl font-bold text-slate-800">{activeContractorsCount}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">Total Claimed Value</p>
                <p className="text-2xl font-bold text-slate-800">₹{totalClaimedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">Total Approved Value</p>
                <p className="text-2xl font-bold text-slate-800">₹{totalApprovedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <DataTableTopControls
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalItems={totalItems}
          />
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-6 py-4">WIP Number</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Contractor</th>
                    <th className="px-6 py-4">Package</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Circle</th>
                    <th className="px-6 py-4">Claimed (₹)</th>
                    <th className="px-6 py-4">Approved (₹)</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-8 h-8 border-4 border-[#0076f2] border-t-transparent rounded-full animate-spin"></div>
                          <p className="mt-3 text-sm font-medium text-slate-500">Loading data...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No WIP entries found.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((entry: any) => (
                      <tr 
                        key={entry._id} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/site-portal/wip-consumed/${entry._id}`)}
                      >
                        <td className="px-6 py-4 font-medium text-blue-600">{entry.wipNumber}</td>
                        <td className="px-6 py-4 text-slate-600">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-slate-700">{entry.contractorId?.name || entry.contractorId?.vendorName || entry.contractorId?.dynamicData?.companyName || entry.contractorId?.dynamicData?.name || '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{entry.package || '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{entry.location || '-'}</td>
                        <td className="px-6 py-4 text-slate-600">{entry.circle || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{(entry.claimedAmount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 font-semibold text-green-700">{(entry.approvedAmount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${entry.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : entry.status === 'Submitted' ? 'bg-blue-100 text-blue-700' : entry.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); router.push(`/site-portal/wip-consumed/${entry._id}`); }} 
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {entry.status !== 'Approved' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/site-portal/wip-consumed/${entry._id}`);
                                }} 
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={(e) => handleDelete(e, entry._id)} 
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <DataTableBottomControls
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              totalItems={totalItems}
            />
        </div>
      </div>

      <WipBulkUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onSuccess={fetchWips}
      />
    </div>
  );
}
