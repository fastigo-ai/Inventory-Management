"use client";

import { useEffect, useState } from "react";
import { getJmcs } from "@/features/site-portal/api/jmc.api";
import { FileText, Plus } from "lucide-react";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function JmcRegisterPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchJmcs();
  }, []);

  const fetchJmcs = async () => {
    try {
      setLoading(true);
      const res = await getJmcs();
      setEntries(res.data?.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  return (
    <div className="flex-1 bg-white min-h-screen p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">JMC Register</h1>
          
          <Button 
            onClick={() => router.push('/site-portal/jmc-register/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New JMC Entry
          </Button>
        </div>
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
                    <th className="px-6 py-4">JMC Number</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Contractor</th>
                    <th className="px-6 py-4">Package</th>
                    <th className="px-6 py-4">Circle</th>
                    <th className="px-6 py-4">Claimed (₹)</th>
                    <th className="px-6 py-4">Approved (₹)</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No JMC entries found.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((entry: any) => (
                      <tr 
                        key={entry._id} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/site-portal/jmc-register/${entry._id}`)}
                      >
                        <td className="px-6 py-4 font-medium text-blue-600">{entry.jmcNumber}</td>
                        <td className="px-6 py-4">{new Date(entry.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">{entry.contractorId?.name || entry.contractorId?.vendorName || '-'}</td>
                        <td className="px-6 py-4">{entry.package || '-'}</td>
                        <td className="px-6 py-4">{entry.circle || '-'}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{(entry.claimedAmount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4 font-medium text-green-700">{(entry.approvedAmount || 0).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${
                            entry.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                            entry.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                            entry.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {entry.status}
                          </span>
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
    </div>
  );
}
