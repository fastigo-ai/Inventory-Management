"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Upload } from "lucide-react";
import { getDIs } from "@/features/di/api/di.api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DIImportModal } from "@/features/di/components/DIImportModal";

export default function DIPage() {
  const router = useRouter();
  const [dis, setDis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [search, setSearch] = useState("");
  const [diNumber, setDiNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchDIs = () => {
    setLoading(true);
    getDIs({ 
      page, 
      limit,
      search: search || undefined,
      diNumber: diNumber || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })
      .then(res => {
        if (res.success && res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
          setDis(res.data.dis || []);
          setTotalPages(res.data.pagination?.totalPages || 1);
          setTotalItems(res.data.pagination?.total || 0);
        } else {
          setDis(Array.isArray(res.data) ? res.data : []);
          setTotalPages(1);
          setTotalItems(Array.isArray(res.data) ? res.data.length : 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDIs();
  }, [page, limit, search, diNumber, startDate, endDate]);

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
          <div className="w-[180px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">DI Number</label>
            <input
              type="text"
              placeholder="DI Number..."
              value={diNumber}
              onChange={(e) => { setPage(1); setDiNumber(e.target.value); }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-[150px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setPage(1); setStartDate(e.target.value); }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-[150px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setPage(1); setEndDate(e.target.value); }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(search || diNumber || startDate || endDate) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setDiNumber("");
                setStartDate("");
                setEndDate("");
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
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 whitespace-nowrap">DI NUMBER</th>
                      <th className="px-6 py-3 whitespace-nowrap">PO NUMBER</th>
                      <th className="px-6 py-3 whitespace-nowrap">VENDOR</th>
                      <th className="px-6 py-3 whitespace-nowrap">DATE</th>
                      <th className="px-6 py-3 whitespace-nowrap">STATUS</th>
                      <th className="px-6 py-3 whitespace-nowrap text-right">ITEMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dis.map(di => (
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
                        <td className="px-6 py-4 whitespace-nowrap">{new Date(di.date).toLocaleDateString()}</td>
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
                        <td className="px-6 py-4 text-right whitespace-nowrap">{di.lineItems?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} entries (Page {page} of {totalPages})
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
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
