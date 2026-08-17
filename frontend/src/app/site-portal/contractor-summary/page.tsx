'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSiteContractorSummary } from '@/features/site-portal/api/siteReports.api';
import { getContractors } from '@/features/contractors/api/contractors.api';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function SiteContractorSummaryPage() {
  const router = useRouter();
  const [contractors, setContractors] = useState<any[]>([]);
  const [filters, setFilters] = useState({ contractorId: '', package: '', circle: '' });
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contractorName, setContractorName] = useState('');

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const cRes = await getContractors(undefined, undefined, 1, 1000);
        setContractors(cRes.items || cRes);
      } catch (err) {
        console.error('Error fetching contractors', err);
      }
    };
    fetchInitial();
  }, []);

  const fetchReport = async () => {
    if (!filters.contractorId) {
      toast.error('Please select a contractor');
      return;
    }
    try {
      setIsLoading(true);
      const res = await getSiteContractorSummary(filters);
      setData(res.data || []);
      const c = contractors.find(c => c._id === filters.contractorId);
      if (c) {
        setContractorName(c.dynamicData?.companyName || c.dynamicData?.displayName || c.name || '');
      }
    } catch (err) {
      toast.error('Failed to fetch summary report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionChange = (action: string, row: any) => {
    if (action === 'demand-issue') {
      router.push(`/site-portal/demand-notes/new?tempCode=${row.tempCode}`);
    } else if (action === 'demand-return') {
      router.push(`/store/contractor-return/new?tempCode=${row.tempCode}`);
    }
  };

  const exportCsv = () => {
    const headers = [
      'Temp Code', 'Item Name', 'JMC Done', 'WIP Consumed', 'WIP To Be Required',
      'Total WIP', 'Total IWIP+JMC Qty', 'Total Issued from Store', 'Return',
      'Today Total Balance', 'Final Bal Qty as per BOM'
    ];
    const rows = data.map(r => [
      r.tempCode || '', r.itemName || '', r.jmcDone || 0, r.wipConsumed || 0, r.wipRequired || 0,
      r.totalWip || 0, r.totalIwipJmc || 0, r.totalIssued || 0, r.totalReturned || 0,
      r.todayTotalBalance || 0, r.finalBalQty || 0
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Site_Contractor_Summary_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Site Contractor Summary</h1>
        <Button onClick={exportCsv} disabled={!data.length} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
        <div className="w-64">
          <label className="block text-sm font-medium text-slate-700 mb-1">Contractor</label>
          <select 
            value={filters.contractorId} 
            onChange={(e) => setFilters(f => ({ ...f, contractorId: e.target.value }))}
            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select Contractor</option>
            {contractors.map(c => (
              <option key={c._id} value={c._id}>{c.dynamicData?.companyName || c.dynamicData?.displayName || c.name || c._id}</option>
            ))}
          </select>
        </div>
        <div className="w-64">
          <label className="block text-sm font-medium text-slate-700 mb-1">Package</label>
          <input 
            value={filters.package} 
            onChange={(e) => setFilters(f => ({ ...f, package: e.target.value }))}
            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Package 1 (S/N)"
          />
        </div>
        <div className="w-64">
          <label className="block text-sm font-medium text-slate-700 mb-1">Circle</label>
          <input 
            value={filters.circle} 
            onChange={(e) => setFilters(f => ({ ...f, circle: e.target.value }))}
            className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Nahan"
          />
        </div>
        <Button onClick={fetchReport} disabled={isLoading} className="h-10 px-6 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Generate
        </Button>
      </div>

      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
            <thead className="bg-amber-100 text-slate-800">
              <tr>
                <th colSpan={2} className="border border-slate-300 p-2 font-semibold">Nahan Site Contractor Summary</th>
                <th colSpan={3} className="border border-slate-300 p-2 font-semibold">Contractor Name: {contractorName}</th>
                <th colSpan={7} className="border border-slate-300 p-2"></th>
              </tr>
              <tr>
                <th colSpan={2} className="border border-slate-300 p-2 font-semibold">Package: {filters.package || '-'}</th>
                <th colSpan={3} className="border border-slate-300 p-2 font-semibold">Circle: {filters.circle || '-'}</th>
                <th colSpan={7} className="border border-slate-300 p-2 font-semibold">Sub Div: - | Feeder: -</th>
              </tr>
              <tr className="bg-amber-200 font-semibold align-bottom">
                <th className="border border-slate-300 p-2 whitespace-nowrap">Temp Code</th>
                <th className="border border-slate-300 p-2 w-64">Item Name</th>
                <th className="border border-slate-300 p-2 whitespace-nowrap text-center">JMC Done</th>
                <th className="border border-slate-300 p-2 whitespace-nowrap text-center">WIP Consumed</th>
                <th className="border border-slate-300 p-2 whitespace-nowrap text-center">WIP To Be Required</th>
                <th className="border border-slate-300 p-2 whitespace-nowrap text-center">Total WIP</th>
                <th className="border border-slate-300 p-2 whitespace-nowrap text-center">Total IWIP+JMC Qty</th>
                <th className="border border-slate-300 p-2 bg-slate-200 whitespace-nowrap text-center">Total Issued from Store</th>
                <th className="border border-slate-300 p-2 bg-slate-200 whitespace-nowrap text-center">Return</th>
                <th className="border border-slate-300 p-2 bg-slate-200 whitespace-nowrap text-center">Today Total Balance</th>
                <th className="border border-slate-300 p-2 whitespace-nowrap text-center">Final Bal Qty as per BOM</th>
                <th className="border border-slate-300 p-2 whitespace-nowrap">Action Required</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-amber-50">
                  <td className="border border-slate-300 p-2 font-medium">{row.tempCode}</td>
                  <td className="border border-slate-300 p-2">{row.itemName}</td>
                  <td className="border border-slate-300 p-2 text-center">{row.jmcDone || 0}</td>
                  <td className="border border-slate-300 p-2 text-center">{row.wipConsumed || 0}</td>
                  <td className="border border-slate-300 p-2 text-center">{row.wipRequired || 0}</td>
                  <td className="border border-slate-300 p-2 text-center">{row.totalWip || 0}</td>
                  <td className="border border-slate-300 p-2 text-center font-semibold">{row.totalIwipJmc || 0}</td>
                  <td className="border border-slate-300 p-2 bg-slate-100 text-center">{row.totalIssued || 0}</td>
                  <td className="border border-slate-300 p-2 bg-slate-100 text-center">{row.totalReturned || 0}</td>
                  <td className="border border-slate-300 p-2 bg-slate-100 text-center font-semibold">{row.todayTotalBalance || 0}</td>
                  <td className={`border border-slate-300 p-2 text-center font-semibold ${row.finalBalQty < 0 ? 'text-red-600' : 'text-slate-800'}`}>{row.finalBalQty || 0}</td>
                  <td className="border border-slate-300 p-1">
                    <select
                      className="w-full text-xs p-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onChange={(e) => handleActionChange(e.target.value, row)}
                      defaultValue=""
                    >
                      <option value="" disabled>Select Action</option>
                      <option value="demand-issue">1. Demand for Issue Qty</option>
                      <option value="demand-return">2. Demand to Return Qty</option>
                      <option value="nil">3. NO Balance-NIL</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
