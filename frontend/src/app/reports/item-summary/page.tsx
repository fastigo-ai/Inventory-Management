"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { DynamicTable } from '@/shared/components/dynamic/DynamicTable';
import { getItemSummaries } from '@/features/reports/api/reports.api';

export default function ItemSummaryReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [circleFilter, setCircleFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await getItemSummaries({
        circle: circleFilter || undefined,
        package: packageFilter || undefined,
        page,
        limit
      });
      if (res.success && res.data) {
        setData(res.data.items);
        setTotalItems(res.data.pagination.totalItems);
      }
    } catch (err) {
      console.error('Failed to fetch summary report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [circleFilter, packageFilter, page, limit]);

  // Derived Dashboard Metrics from current page data (for demo purposes)
  // In a real app, these might be computed on the backend across the entire dataset
  const metrics = useMemo(() => {
    return data.reduce((acc, curr) => {
      acc.totalLoa += (curr.loaQty || 0);
      acc.totalBom += (curr.bomQty || 0);
      acc.totalDi += (curr.diQty || 0);
      acc.totalInv += (curr.invQty || 0);
      acc.totalAct += (curr.actQty || 0);
      acc.totalBilled += (curr.billedQty || 0);
      return acc;
    }, { totalLoa: 0, totalBom: 0, totalDi: 0, totalInv: 0, totalAct: 0, totalBilled: 0 });
  }, [data]);

  const fields = [
    { name: 'itemName', label: 'Item Name', type: 'text', order: 1, active: true, visible: true },
    { name: 'circle', label: 'Circle', type: 'text', order: 2, active: true, visible: true },
    { name: 'package', label: 'Package', type: 'text', order: 3, active: true, visible: true },
    { name: 'loaQty', label: 'LOA Qty', type: 'number', order: 4, active: true, visible: true },
    { name: 'bomQty', label: 'BOM Qty', type: 'number', order: 5, active: true, visible: true },
    { name: 'diQty', label: 'DI Qty', type: 'number', order: 6, active: true, visible: true },
    { name: 'invQty', label: 'INVQ', type: 'number', order: 7, active: true, visible: true },
    { name: 'actQty', label: 'ACT Qty', type: 'number', order: 8, active: true, visible: true },
    { name: 'srtQty', label: 'SRT Qty', type: 'number', order: 9, active: true, visible: true },
    { name: 'billedQty', label: 'Billed Qty', type: 'number', order: 10, active: true, visible: true },
    { name: 'remainingLoa', label: 'Rem. LOA', type: 'number', order: 11, active: true, visible: true },
    { name: 'remainingBom', label: 'Rem. BOM', type: 'number', order: 12, active: true, visible: true },
    { name: 'variance', label: 'Variance', type: 'number', order: 13, active: true, visible: true },
    { name: 'pendingInvoice', label: 'Pending Inv.', type: 'number', order: 14, active: true, visible: true },
    { name: 'completionPercent', label: 'Comp. %', type: 'number', order: 15, active: true, visible: true },
  ];

  const handleExport = () => {
    // Simple CSV export for current data
    if (data.length === 0) return;
    const headers = fields.map(c => c.label).join(',');
    const rows = data.map(row => fields.map(c => row[c.name] || 0).join(','));
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Item_Summary_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Item Summary Report</h1>
        <button onClick={handleExport} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 text-gray-700">Export to CSV</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-white shadow-sm border border-gray-100 rounded-lg">
          <div className="text-sm text-gray-500">Total LOA</div>
          <div className="text-xl font-bold text-gray-900">{metrics.totalLoa}</div>
        </div>
        <div className="p-4 bg-white shadow-sm border border-gray-100 rounded-lg">
          <div className="text-sm text-gray-500">Total BOM</div>
          <div className="text-xl font-bold text-gray-900">{metrics.totalBom}</div>
        </div>
        <div className="p-4 bg-white shadow-sm border border-gray-100 rounded-lg">
          <div className="text-sm text-gray-500">Total DI</div>
          <div className="text-xl font-bold text-indigo-600">{metrics.totalDi}</div>
        </div>
        <div className="p-4 bg-white shadow-sm border border-gray-100 rounded-lg">
          <div className="text-sm text-gray-500">Total INVQ</div>
          <div className="text-xl font-bold text-emerald-600">{metrics.totalInv}</div>
        </div>
        <div className="p-4 bg-white shadow-sm border border-gray-100 rounded-lg">
          <div className="text-sm text-gray-500">Total ACT</div>
          <div className="text-xl font-bold text-blue-600">{metrics.totalAct}</div>
        </div>
        <div className="p-4 bg-white shadow-sm border border-gray-100 rounded-lg">
          <div className="text-sm text-gray-500">Total Billed</div>
          <div className="text-xl font-bold text-purple-600">{metrics.totalBilled}</div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow border border-gray-100">
        <div className="flex gap-4 mb-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Circle</label>
            <select 
              value={circleFilter}
              onChange={e => setCircleFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white"
            >
              <option value="">All Circles</option>
              <option value="Solan">Solan</option>
              <option value="Nahan">Nahan</option>
              <option value="Rampur">Rampur</option>
              <option value="Rohru">Rohru</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Package</label>
            <select 
              value={packageFilter}
              onChange={e => setPackageFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white"
            >
              <option value="">All Packages</option>
              <option value="Package 1(S/N)">Package 1(S/N)</option>
              <option value="Package 2(R/R)">Package 2(R/R)</option>
             
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading report data...</div>
        ) : (
          <DynamicTable

          
            fields={fields}
            data={data}
            pagination={{
              totalItems,
              currentPage: page,
              limit,
              totalPages: Math.ceil(totalItems / limit) || 1
            }}
            onPageChange={setPage}
            onLimitChange={setLimit}
            enableSelection={false}
          />
        )}
      </div>
    </div>
  );
}
