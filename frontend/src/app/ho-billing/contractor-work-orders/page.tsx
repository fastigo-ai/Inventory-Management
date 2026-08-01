"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Upload, Download, Loader2 } from 'lucide-react';
import { getContractorWorkOrders } from '@/features/contractors/api/contractorWorkOrder.api';
import { ImportWOModal } from '@/features/contractors/components/ImportWOModal';
import { toast } from 'sonner';
import Papa from 'papaparse';

export default function ContractorWorkOrdersPage() {
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const fetchWorkOrders = async () => {
    try {
      setIsLoading(true);
      const res = await getContractorWorkOrders({ search });
      if (res.success) {
        setWorkOrders(res.data?.data || []);
      }
    } catch (error) {
      toast.error('Failed to load work orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [search]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await getContractorWorkOrders({ limit: 10000 });
      if (res.success && res.data?.data) {
        const workOrders = res.data.data;
        const flatData: any[] = [];
        
        workOrders.forEach((wo: any) => {
          wo.items?.forEach((item: any) => {
            flatData.push({
              workOrderNumber: wo.workOrderNumber,
              package: wo.package,
              circle: wo.circle,
              contractorCompanyName: wo.contractorId?.dynamicData?.companyName || wo.contractorId?.dynamicData?.contractorName || '',
              division: wo.division,
              subDivision: wo.subDivision,
              location: wo.location,
              remarks: wo.remarks,
              status: wo.status,
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
      }
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
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search WO Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <button className="flex items-center space-x-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
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
                      {wo.workOrderNumber}
                    </td>
                    <td className="px-6 py-4">
                      {wo.contractorId?.dynamicData?.companyName || wo.contractorId?.dynamicData?.displayName || 'Unknown Contractor'}
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
