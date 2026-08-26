"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Eye, Edit, Trash2, Box, PackageOpen, FileText, Users, Calculator, Download } from "lucide-react";
import { getAssignments, cancelAssignment, getAssignmentSummary, getContractors, exportAssignments } from "@/features/contractors/api/contractors.api";
import { ContractorIssueImportModal } from "@/features/store/components/ContractorIssueImportModal";
import { toast } from "sonner";
import { DataTableBottomControls } from "@/shared/components/DataTableControls";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { Search } from "lucide-react";

export default function StoreContractorIssuePage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Server-side pagination & filter state
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [contractorId, setContractorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    getContractors().then(res => setContractorsList(res.data || res)).catch(console.error);
  }, []);

  const handleExport = async () => {
    try {
      const blob = await exportAssignments({
        search: debouncedSearch,
        contractorId: contractorId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contractor_issues.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export data');
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        contractorId: contractorId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
      
      const [assignmentsRes, summaryRes] = await Promise.all([
        getAssignments(params),
        getAssignmentSummary({ 
          search: debouncedSearch,
          contractorId: contractorId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        })
      ]);
      
      if (assignmentsRes.data?.assignments) {
        setAssignments(assignmentsRes.data.assignments);
        setTotalItems(assignmentsRes.data.total);
        setTotalPages(assignmentsRes.data.totalPages);
      } else {
        setAssignments(assignmentsRes.data || []);
        setTotalItems((assignmentsRes.data || []).length);
        setTotalPages(1);
      }

      setSummary(summaryRes.data);
    } catch (error) {
      console.error("Failed to fetch assignments", error);
      toast.error("Failed to load MINs");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, contractorId, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, contractorId, startDate, endDate]);

  const handleCancel = async (id: string, minNo: string) => {
    if (confirm(`Are you sure you want to cancel MIN ${minNo}? This will restore the stock.`)) {
      try {
        await cancelAssignment(id);
        toast.success(`MIN ${minNo} cancelled successfully.`);
        fetchData();
      } catch (error) {
        toast.error(`Failed to cancel MIN ${minNo}`);
      }
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6 max-w-screen-2xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">MIN (Material Issue Notes)</h1>
            <p className="text-sm text-slate-500 mt-1">Issue stock to contractors from your local inventory</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport} className="text-green-700 border-green-200 hover:bg-green-50">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Link href="/store/contractor-issue/new">
              <Button className="bg-[#0076f2] hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                New Issue
              </Button>
            </Link>
          </div>
        </div>

        {/* Business Insights Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total MINs</p>
              <h3 className="text-2xl font-bold text-slate-900">{summary?.totalMins || 0}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
              <PackageOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Items Issued</p>
              <h3 className="text-2xl font-bold text-slate-900">{summary?.totalItemsIssued || 0}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Value (₹)</p>
              <h3 className="text-2xl font-bold text-slate-900">{summary?.totalValue?.toLocaleString('en-IN') || 0}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Contractors</p>
              <h3 className="text-2xl font-bold text-slate-900">{summary?.activeContractors || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          <div className="flex flex-col lg:flex-row items-center justify-between p-4 bg-white border-b border-slate-200 gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2 outline-none"
                  placeholder="Search by MIN No..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="w-full sm:w-64">
                <select
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 outline-none"
                  value={contractorId}
                  onChange={(e) => setContractorId(e.target.value)}
                >
                  <option value="">All Contractors</option>
                  {contractorsList.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {c.name || c.dynamicData?.displayName || c.dynamicData?.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                  type="date"
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-y border-slate-200">
                <tr>
                  <th className="px-6 py-4">MIN NO.</th>
                  <th className="px-6 py-4">MIN DATE</th>
                  <th className="px-6 py-4">CONTRACTOR</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4 text-right">TOTAL ITEMS</th>
                  <th className="px-6 py-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Loading assignments...
                    </td>
                  </tr>
                ) : assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Box className="w-12 h-12 text-slate-300 mb-3" />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No MINs Found</h3>
                        <p className="text-slate-500">Create a new issue to assign stock to a contractor.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  assignments.map(a => {
                    const totalItems = a.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
                    return (
                      <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-blue-600">
                          <Link href={`/store/contractor-issue/${a._id}`} className="hover:underline">
                            {a.minNo || a.assignmentNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{new Date(a.minDate || a.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{a.contractorId?.name || a.contractorId?.dynamicData?.displayName || 'Unknown'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            a.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            a.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700">{totalItems}</td>
                        <td className="px-6 py-4 flex items-center justify-center gap-2">
                          <Link href={`/store/contractor-issue/${a._id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="View Details">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {a.status !== 'Cancelled' && (
                            <>
                              <Link href={`/store/contractor-issue/${a._id}/edit`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100" title="Edit MIN">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                onClick={() => handleCancel(a._id, a.minNo || a.assignmentNumber)}
                                title="Cancel MIN"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {!loading && assignments.length > 0 && (
            <DataTableBottomControls
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              setPageSize={setPageSize}
              totalItems={totalItems}
            />
          )}
        </div>
      </div>
      <ContractorIssueImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
