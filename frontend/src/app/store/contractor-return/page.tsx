"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Download, Edit, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { getContractorReturns, deleteContractorReturn } from "@/features/contractors/api/contractors.api";
import { toast } from "sonner";
import { useClientTable } from "@/shared/hooks/useClientTable";
import { DataTableTopControls, DataTableBottomControls } from "@/shared/components/DataTableControls";
import { BulkImportContractorReturnModal } from "./BulkImportContractorReturnModal";

export default function StoreContractorReturnPage() {
  const router = useRouter();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const fetchReturns = () => {
    setLoading(true);
    getContractorReturns()
      .then(res => setReturns(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this return?")) {
      try {
        await deleteContractorReturn(id);
        toast.success("Return deleted successfully");
        fetchReturns();
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete return");
      }
    }
  };

  const handleExport = () => {
    if (!returns || returns.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData: any[] = [];

    returns.forEach(r => {
      const baseRow = {
        'Return Challan No': r.returnChallanNo || '',
        'Return Challan Date': r.returnChallanDate ? new Date(r.returnChallanDate).toLocaleDateString() : '',
        'Contractor Farm Name': r.contractorFarmName || r.contractorId?.companyName || '',
        'Location': r.location || '',
        'Circle': r.circle || '',
        'Supervisor Engineer': r.supervisorEngineer || '',
        'Division': r.division || '',
        'Sub Division': r.subDivision || '',
        'Sub Station': r.subStation || '',
        'Feeder': r.feeder || '',
        'Book No': r.bookNo || '',
        'Issued TFS Sr No': r.issuedTfsSrNo || '',
        'Remarks': r.remarks || '',
        'Status': r.status || ''
      };

      if (r.lineItems && r.lineItems.length > 0) {
        r.lineItems.forEach((item: any) => {
          exportData.push({
            ...baseRow,
            'Item Name': item.itemName || '',
            'Temp Code': item.tempCode || '',
            'Unit': item.unit || '',
            'HSN Code': item.hsnCode || '',
            'Return Qty': item.quantity || 0
          });
        });
      } else {
        // If no line items, just push the base row
        exportData.push(baseRow);
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contractor_Returns");
    XLSX.writeFile(wb, `Contractor_Returns_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  useEffect(() => {
    fetchReturns();
  }, []);

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
  } = useClientTable(returns);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Contractor Returns</h1>
            <p className="text-sm text-slate-500 mt-1">View and record items returned by contractors</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="text-slate-600 border-green-200 hover:bg-green-50"
              onClick={handleExport}
            >
              <Download className="w-4 h-4 mr-2" />
              Bulk Export
            </Button>
            <Button 
              variant="outline" 
              className="text-slate-600 border-blue-200 hover:bg-blue-50"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
            <Link href="/store/contractor-return/new">
              <Button className="bg-[#0076f2] hover:bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                New Return
              </Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : returns.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Returns Found</h3>
              <p className="text-slate-500 mb-6">Create a new return to record stock received from a contractor.</p>
              <Link href="/store/contractor-return/new">
                <Button variant="outline">Create your first Return</Button>
              </Link>
            </div>
          ) : (
            <>
              <DataTableTopControls
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                pageSize={pageSize}
                setPageSize={setPageSize}
                totalItems={totalItems}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-y border-slate-200">
                    <tr>
                      <th className="px-6 py-3">CHALLAN NO.</th>
                      <th className="px-6 py-3">CHALLAN DATE</th>
                      <th className="px-6 py-3">CONTRACTOR</th>
                      <th className="px-6 py-3">STATUS</th>
                      <th className="px-6 py-3 text-right">TOTAL ITEMS</th>
                      <th className="px-6 py-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          No matching records found.
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map(a => {
                        const totalItems = a.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0;
                        return (
                          <tr 
                            key={a._id} 
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => router.push(`/store/contractor-return/${a._id}`)}
                          >
                            <td className="px-6 py-4 font-medium text-blue-600">{a.returnChallanNo}</td>
                            <td className="px-6 py-4">{new Date(a.returnChallanDate).toLocaleDateString()}</td>
                            <td className="px-6 py-4">{a.contractorId?.name || a.contractorId?.dynamicData?.displayName || 'Unknown'}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                a.status === 'Submitted' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {a.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-medium">{totalItems}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/store/contractor-return/${a._id}/edit`);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-slate-400 hover:text-red-600"
                                  onClick={(e) => handleDelete(a._id, e)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <DataTableBottomControls
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                setPageSize={setPageSize}
                totalItems={totalItems}
              />
            </>
          )}
        </div>
      </div>
      
      <BulkImportContractorReturnModal 
        open={isImportModalOpen} 
        onOpenChange={setIsImportModalOpen}
        onSuccess={() => {
          fetchReturns();
        }}
      />
    </div>
  );
}
