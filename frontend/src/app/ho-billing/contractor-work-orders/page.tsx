"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter, Upload, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getContractorWorkOrders, getContractorWorkOrderFilters } from '@/features/contractors/api/contractorWorkOrder.api';
import { ImportWOModal } from '@/features/contractors/components/ImportWOModal';
import { toast } from 'sonner';
import Papa from 'papaparse';

export default function ContractorWorkOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const search = searchParams.get('search') || '';
  const packageFilter = searchParams.get('package') || '';
  const circleFilter = searchParams.get('circle') || '';
  const activityFilter = searchParams.get('activity') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [availableFilters, setAvailableFilters] = useState<{packages: string[], circles: string[], activities: string[]}>({ packages: [], circles: [], activities: [] });

  const [localFilters, setLocalFilters] = useState({
    search, package: packageFilter, circle: circleFilter, activity: activityFilter, dateFrom, dateTo
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchFilters = async () => {
    try {
      const res = await getContractorWorkOrderFilters({ package: localFilters.package, circle: localFilters.circle });
      if (res.success) {
        setAvailableFilters(res.data || { packages: [], circles: [], activities: [] });
      }
    } catch (error) {
      console.error('Failed to load filters', error);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, [localFilters.package, localFilters.circle]);

  const fetchWorkOrders = async () => {
    try {
      setIsLoading(true);
      const res = await getContractorWorkOrders({ 
        search, 
        package: packageFilter, 
        circle: circleFilter, 
        activity: activityFilter, 
        dateFrom, 
        dateTo, 
        page, 
        limit 
      });
      if (res.success) {
        setWorkOrders(res.data?.data || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalItems(res.data?.pagination?.totalItems || 0);
      }
    } catch (error) {
      toast.error('Failed to load work orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    setLocalFilters({ search, package: packageFilter, circle: circleFilter, activity: activityFilter, dateFrom, dateTo });
  }, [search, packageFilter, circleFilter, activityFilter, dateFrom, dateTo, page, limit]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(localFilters).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, String(value));
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      if (!workOrders || workOrders.length === 0) {
        toast.info("No data to export");
        return;
      }

      const flatData: any[] = [];
      
      workOrders.forEach((wo: any) => {
        wo.items?.forEach((item: any) => {
          flatData.push({
            workOrderNumber: wo.workOrderNumber,
            package: wo.package,
            circle: wo.circle,
            subcircle: wo.subcircle || '',
            contractorCompanyName: wo.contractorId?.dynamicData?.companyName || wo.contractorId?.dynamicData?.contractorName || '',
            division: wo.division,
            subDivision: wo.subDivision,
            location: wo.location,
            remarks: wo.remarks,
            status: wo.status,
            "drawing no": item.drawingNumber || '',
            itemTempCode: item.tempCode || '',
            itemActivity: item.activity || '',
            loaSrNo: item.loaSrNo || '',
            description: item.description || '',
            unit: item.unit || '',
            circleLoaQty: item.circleLoaQty,
            circleBomQty: item.circleBomQty,
            totalPackageLoaQty: item.totalPackageLoaQty || 0,
            alreadyIssuedQty: item.alreadyIssuedQty,
            woQty: item.woQty,
            contractorErectionRate: item.contractorErectionRate,
            amount: item.amount || 0,
            gstType: item.gstType,
            gstAmount: item.gstAmount || 0,
            totalAmount: item.totalAmount || 0
          });
        });
        
        if (!wo.items || wo.items.length === 0) {
          flatData.push({
            workOrderNumber: wo.workOrderNumber,
            package: wo.package,
            circle: wo.circle,
            subcircle: wo.subcircle || '',
            contractorCompanyName: wo.contractorId?.dynamicData?.companyName || wo.contractorId?.dynamicData?.contractorName || '',
            division: wo.division,
            subDivision: wo.subDivision,
            location: wo.location,
            remarks: wo.remarks,
            status: wo.status
          });
        }
      });

      if (flatData.length === 0) {
        toast.info("No data to export");
        return;
      }


      const csvContent = Papa.unparse(flatData);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "contractor_workorders_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${workOrders.length} work order(s) successfully`);
    } catch (error) {
      toast.error('Failed to export work orders');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Contractor Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track work orders assigned to contractors</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export</span>
          </button>
          <button
            onClick={() => router.push('/ho-billing/contractor-work-orders/new')}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Work Order</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50">
          <div className="flex justify-between items-center w-full">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search WO Number..."
                value={localFilters.search}
                onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={applyFilters} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                Search / Apply
              </button>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 text-sm bg-white"
              >
                <Filter className="w-4 h-4" />
                <span>Filters {showFilters ? '▲' : '▼'}</span>
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-slate-200">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Package</label>
                <select
                  value={localFilters.package}
                  onChange={(e) => setLocalFilters({ ...localFilters, package: e.target.value, circle: '', activity: '' })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  <option value="">All Packages</option>
                  {availableFilters.packages.map((pkg: string) => (
                    <option key={pkg} value={pkg}>{pkg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Circle</label>
                <select
                  value={localFilters.circle}
                  onChange={(e) => setLocalFilters({ ...localFilters, circle: e.target.value, activity: '' })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  <option value="">All Circles</option>
                  {availableFilters.circles.map((circ: string) => (
                    <option key={circ} value={circ}>{circ}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Activity</label>
                <select
                  value={localFilters.activity}
                  onChange={(e) => setLocalFilters({ ...localFilters, activity: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  <option value="">All Activities</option>
                  {availableFilters.activities.map((act: string) => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={localFilters.dateFrom}
                  onChange={(e) => setLocalFilters({ ...localFilters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={localFilters.dateTo}
                  onChange={(e) => setLocalFilters({ ...localFilters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left font-medium">WO Number</th>
                <th className="px-6 py-3 text-left font-medium">Contractor</th>
                <th className="px-6 py-3 text-left font-medium">Package / Circle</th>
                <th className="px-6 py-3 text-left font-medium">Activity</th>
                <th className="px-6 py-3 text-left font-medium">Total Amount</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Loading work orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No work orders found. Create one to get started.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">
                      <Link href={`/ho-billing/contractor-work-orders/${wo._id}`} className="hover:underline">
                        {wo.workOrderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {wo.contractorId?.dynamicData?.companyName || wo.contractorId?.dynamicData?.displayName || wo.contractorId?.dynamicData?.contractorName || 'Unknown Contractor'}
                    </td>
                    <td className="px-6 py-4">
                      {wo.package} <br />
                      <span className="text-xs text-slate-500">{wo.circle}</span>
                    </td>
                    <td className="px-6 py-4">
                      {wo.activities && wo.activities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {wo.activities.map((act: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs truncate max-w-[150px]" title={act}>
                              {act}
                            </span>
                          ))}
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      ₹{wo.totalWoAmount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        wo.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        wo.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(wo.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white rounded-b-xl">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900">{workOrders.length > 0 ? (page - 1) * limit + 1 : 0}</span> to <span className="font-medium text-slate-900">{Math.min(page * limit, totalItems)}</span> of <span className="font-medium text-slate-900">{totalItems}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages || 1}</span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      </div>
      <ImportWOModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={fetchWorkOrders} 
      />
    </div>
  );
}
