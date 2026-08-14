"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicTable } from '@/shared/components/dynamic/DynamicTable';
import { getItemSummaries } from '@/features/reports/api/reports.api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ItemSummaryReportPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [circleFilter, setCircleFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [itemNameFilter, setItemNameFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [loaSerialNoFilter, setLoaSerialNoFilter] = useState('');
  const [tempCodeFilter, setTempCodeFilter] = useState('');
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await getItemSummaries({
        circle: circleFilter || undefined,
        package: packageFilter || undefined,
        itemName: itemNameFilter || undefined,
        description: descriptionFilter || undefined,
        loaSerialNo: loaSerialNoFilter || undefined,
        tempCode: tempCodeFilter || undefined,
        page,
        limit,
        sortField: sortColumn || undefined,
        sortOrder: sortDirection
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
  }, [circleFilter, packageFilter, itemNameFilter, descriptionFilter, loaSerialNoFilter, tempCodeFilter, page, limit, sortColumn, sortDirection]);

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

  const chartData = useMemo(() => {
    return [
      { name: 'LOA', value: metrics.totalLoa },
      { name: 'BOM', value: metrics.totalBom },
      { name: 'DI', value: metrics.totalDi },
      { name: 'INVQ', value: metrics.totalInv },
      { name: 'ACT', value: metrics.totalAct },
      { name: 'Billed', value: metrics.totalBilled },
    ];
  }, [metrics]);

  const fields = [
    { name: 'itemName', label: 'Item Name', type: 'text', order: 1, active: true, visible: true },
    { name: 'circle', label: 'Circle', type: 'text', order: 2, active: true, visible: true },
    { name: 'package', label: 'Package', type: 'text', order: 3, active: true, visible: true },
    { name: 'loaSerialNo', label: 'LOA Serial No', type: 'text', order: 4, active: true, visible: true },
    { name: 'tempCode', label: 'Temp Code', type: 'text', order: 5, active: true, visible: true },
    { name: 'loaQty', label: '1. LOA Qty', type: 'number', order: 6, active: true, visible: true },
    { name: 'bomQty', label: '2. BOM Qty', type: 'number', order: 7, active: true, visible: true },
    { name: 'diQty', label: '3. DI Qty', type: 'number', order: 8, active: true, visible: true },
    { name: 'billedQty', label: '4. Billed Qty', type: 'number', order: 9, active: true, visible: true },
    { name: 'balLoaBilled', label: '5. Bal. (LOA - Billed)', type: 'number', order: 10, active: true, visible: true },
    { name: 'balBomBilled', label: '6. Bal. (BOM - Billed)', type: 'number', order: 11, active: true, visible: true },
    { name: 'goodDispatch', label: '7. Dispatch', type: 'number', order: 12, active: true, visible: true },
    { name: 'balDispatchVsDi', label: '8. Bal. Dispatch (DI - Dispatch)', type: 'number', order: 13, active: true, visible: true },
    { name: 'diBalAsPerLoa', label: '9. Bal. Dispatch (as per LOA)', type: 'number', order: 14, active: true, visible: true },
    { name: 'diBalAsPerBom', label: '10. Bal. Dispatch (as per BOM)', type: 'number', order: 15, active: true, visible: true },
    { name: 'balDiIssuedAsPerLoa', label: '11. Bal. DI to Issue (as per LOA)', type: 'number', order: 16, active: true, visible: true },
    { name: 'balDiIssuedAsPerBom', label: '12. Bal. DI to Issue (as per BOM)', type: 'number', order: 17, active: true, visible: true }
  ];

  const handleExport = () => {
    // Simple CSV export for current data
    if (data.length === 0) return;
    const headers = fields.map(c => c.label).join(',');
    const rows = data.map(row => fields.map(c => {
      const val = row[c.name];
      if (val === undefined || val === null) {
        return c.type === 'number' ? 0 : '';
      }
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(','));
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

      <div className="bg-white p-6 rounded-lg shadow border border-gray-100 mb-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Volume Overview</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                cursor={{fill: '#f9fafb'}}
                formatter={(value: any) => [value, 'Volume']}
              />
              <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
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
            <label className="text-sm font-medium text-gray-700">Item Name</label>
            <input 
              type="text"
              placeholder="Search..."
              value={itemNameFilter}
              onChange={e => setItemNameFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <input 
              type="text"
              placeholder="Search..."
              value={descriptionFilter}
              onChange={e => setDescriptionFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">LOA Serial No</label>
            <input 
              type="text"
              placeholder="Search..."
              value={loaSerialNoFilter}
              onChange={e => setLoaSerialNoFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Temp Code</label>
            <input 
              type="text"
              placeholder="Search..."
              value={tempCodeFilter}
              onChange={e => setTempCodeFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading report data...</div>
        ) : (
          <DynamicTable

          
            fields={fields as any}
            data={data}
            onRowClick={(row) => {
              if (row.itemId) {
                router.push(`/items/${row.itemId}`);
              }
            }}
            pagination={{
              totalItems,
              currentPage: page,
              limit,
              totalPages: Math.ceil(totalItems / limit) || 1
            }}
            onPageChange={setPage}
            onLimitChange={setLimit}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSortChange={(col, dir) => {
              setSortColumn(col);
              setSortDirection(dir);
            }}
            enableSelection={false}
          />
        )}
      </div>
    </div>
  );
}
