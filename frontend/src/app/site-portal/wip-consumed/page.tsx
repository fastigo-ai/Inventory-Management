"use client";

import { useEffect, useState } from "react";
import { getWips, deleteWip } from "@/features/site-portal/api/wip.api";
import { getContractors } from "@/features/contractors/api/contractors.api";
import { FileText, Plus, Trash2, Download, Edit } from "lucide-react";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { WipBulkUploadModal } from "@/features/site-portal/components/WipBulkUploadModal";

export default function WipRegisterPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<string>('All');
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchContractors();
  }, []);

  useEffect(() => {
    fetchWips();
  }, [selectedContractor, startDate, endDate]);

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
      const params: any = {};
      if (selectedContractor !== 'All') params.contractorId = selectedContractor;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getWips(params);
      setEntries(res.data?.data || res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  
  const exportData = () => {
    const headers = ['Number', 'Date', 'Contractor', 'Package', 'Circle', 'Activity', 'LOA Sr No', 'Temp Code', 'Claimed Qty', 'Approved Qty', 'Rate', 'Amount', 'Status'];
    const rows: any[] = [];
    entries.forEach((entry: any) => {
      const contractor = entry.contractorId?.name || entry.contractorId?.vendorName || entry.contractorId?.dynamicData?.companyName || 'Unknown';
      const date = new Date(entry.date).toLocaleDateString();
      if (entry.items && entry.items.length > 0) {
        entry.items.forEach((item: any) => {
          rows.push([
            entry.jmcNumber || entry.wipNumber || '',
            date,
            contractor,
            entry.package || '',
            entry.circle || '',
            item.activity || '',
            item.loaSrNo || item.loaSerialNo || '',
            item.tempCode || '',
            item.claimedQty || 0,
            item.approvedQty || 0,
            item.rate || 0,
            item.amount || 0,
            entry.status || ''
          ]);
        });
      } else {
          rows.push([
            entry.jmcNumber || entry.wipNumber || '',
            date,
            contractor,
            entry.package || '',
            entry.circle || '',
            '', '', '', 0, 0, 0, 0, entry.status || ''
          ]);
      }
    });

    const csvContent = headers.join(",") + "\n" + rows.map(e => e.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Wip_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems
  } = useClientTable(entries);

  const totalWips = entries.length;
  const totalClaimedValue = entries.reduce((acc, curr) => acc + (Number(curr.claimedAmount) || 0), 0);
  const totalApprovedValue = entries.reduce((acc, curr) => acc + (Number(curr.approvedAmount) || 0), 0);
  const activeContractorsCount = selectedContractor === 'All' ? contractorsList.length : 1;

  return (
    <div className="flex-1 bg-white min-h-screen p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-slate-800 whitespace-nowrap">WIP Consumed</h1>
          
          <div className="flex flex-wrap items-center gap-3">
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
                className="h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm max-w-[200px]"
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
            <Button variant="outline" onClick={exportData} className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 rounded-lg shadow-sm whitespace-nowrap">
              <Download className="mr-2 h-4 w-4" /> Export Data
            </Button>
            <Button variant="outline" onClick={() => setUploadModalOpen(true)} className="rounded-lg shadow-sm whitespace-nowrap">
              <FileText className="mr-2 h-4 w-4" /> Bulk Upload WIP
            </Button>
            <Button 
              onClick={() => router.push('/site-portal/wip-consumed/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm whitespace-nowrap"
            >
              <Plus className="mr-2 h-4 w-4" /> New WIP Entry
            </Button>
          </div>
        </div>

        {/* Business Insights Dashboard */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-sm font-medium text-slate-500 mb-1">Total WIPs</span>
              <span className="text-2xl font-bold text-slate-800">{totalWips}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-sm font-medium text-slate-500 mb-1">Active Contractors</span>
              <span className="text-2xl font-bold text-slate-800">{activeContractorsCount}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-sm font-medium text-slate-500 mb-1">Total Claimed Value</span>
              <span className="text-2xl font-bold text-blue-600">₹{totalClaimedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <span className="text-sm font-medium text-slate-500 mb-1">Total Approved Value</span>
              <span className="text-2xl font-bold text-emerald-600">₹{totalApprovedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
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
                      <td colSpan={9} className="px-6 py-8 text-center text-slate-500">Loading...</td>
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
                        <td className="px-6 py-4">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{entry.contractorId?.name || entry.contractorId?.vendorName || entry.contractorId?.dynamicData?.companyName || entry.contractorId?.dynamicData?.name || '-'}</td>
                        <td className="px-6 py-4">{entry.package || '-'}</td>
                        <td className="px-6 py-4">{entry.circle || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{(entry.claimedAmount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 font-medium text-green-700">{(entry.approvedAmount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${entry.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : entry.status === 'Submitted' ? 'bg-blue-100 text-blue-700' : entry.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                            {entry.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          {entry.status !== 'Approved' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/site-portal/wip-consumed/${entry._id}`);
                              }} 
                              className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={(e) => handleDelete(e, entry._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
