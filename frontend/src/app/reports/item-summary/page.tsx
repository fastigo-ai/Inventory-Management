"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/shared/api/axios';
import { PackageOpen, ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function ItemSummary() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/reports/summary/item-summary');
        setData(res.data.data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = data.filter(item => 
    (item.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.tempCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm flex-shrink-0 z-10">
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-4">
          <Link href="/reports" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Reports
          </Link>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <PackageOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Item Summary</h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">Track the lifecycle of each item across LOA, BOM, DI, and Invoices.</p>
              </div>
            </div>
            
            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Search items by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-screen-2xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-full">
              <div className="overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap border-r border-slate-100 bg-slate-50">Item Name</th>
                      <th className="px-4 py-3 whitespace-nowrap border-r border-slate-100 bg-slate-50">Package</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap border-r border-slate-100 bg-slate-50">LOA Qty</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap border-r border-slate-100 bg-slate-50">BOM Qty</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap border-r border-slate-100 bg-slate-50">DI Qty</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap border-r border-slate-100 bg-emerald-50 text-emerald-700">Inv Qty</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap border-r border-slate-100 bg-slate-50">Act Qty</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap border-r border-slate-100 bg-blue-50 text-blue-700">Billed Qty</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-amber-50 text-amber-700">Pending Inv</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => window.location.href = `/reports/item-summary/${row.itemId}`}>
                        <td className="px-4 py-3 font-medium text-slate-800 border-r border-slate-100 min-w-[200px] hover:underline">
                          <div>{row.itemName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{row.tempCode || 'No Code'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-100">
                          <div>{row.package || '-'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{row.circle || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 border-r border-slate-100">{row.loaQty || 0}</td>
                        <td className="px-4 py-3 text-right text-slate-600 border-r border-slate-100">{row.bomQty || 0}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800 border-r border-slate-100">{row.diQty || 0}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 border-r border-slate-100">{row.invQty || 0}</td>
                        <td className="px-4 py-3 text-right text-slate-600 border-r border-slate-100">{row.actQty || 0}</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600 border-r border-slate-100">{row.billedQty || 0}</td>
                        <td className="px-4 py-3 text-right font-bold text-amber-600">{row.pendingInvoice || 0}</td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-8 text-center text-slate-500">No item data found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
