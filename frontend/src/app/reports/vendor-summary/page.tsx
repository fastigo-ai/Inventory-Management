"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/shared/api/axios';
import { Building2, ArrowLeft, Search, FileDown, Download } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VendorSummary() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<string[]>([]);
  
  const [selectedVendor, setSelectedVendor] = useState('All Vendors');
  const [selectedPackage, setSelectedPackage] = useState('All Packages');
  const [selectedCircle, setSelectedCircle] = useState('');
  const [selectedSubCircle, setSelectedSubCircle] = useState('All Sub-Circles');
  const [tempCodeSearch, setTempCodeSearch] = useState('');
  const [itemNameSearch, setItemNameSearch] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch list of vendors for the dropdown
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await api.get('/reports/vendor-summary');
        const vendorList = (res.data.data.items || res.data.data || [])
          .map((v: any) => v.vendorName)
          .filter((name: string) => name && name !== 'Unknown')
          .sort();
        setVendors(Array.from(new Set(vendorList))); // Ensure unique
      } catch (err) {
        console.error('Failed to fetch vendors', err);
      }
    };
    fetchVendors();
  }, []);

  // Fetch the itemised summary when filters change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        query.append('vendorName', selectedVendor);
        
        if (selectedPackage && selectedPackage !== 'All Packages') {
          query.append('pkg', selectedPackage);
        }

        if (selectedCircle && selectedCircle !== 'All Circles') {
          query.append('circles', selectedCircle);
          
          if (selectedCircle === 'Solan' && selectedSubCircle && selectedSubCircle !== 'All Sub-Circles') {
            query.append('subcircle', selectedSubCircle);
          }
        }
        
        if (tempCodeSearch) query.append('search', tempCodeSearch);
        else if (itemNameSearch) query.append('search', itemNameSearch);
        
        query.append('page', page.toString());
        query.append('limit', limit.toString());

        const res = await api.get(`/reports/vendor-itemised-summary?${query.toString()}`);
        
        setData(res.data.data.items || []);
        setTotalItems(res.data.data.pagination?.totalItems || 0);
        setTotalPages(res.data.data.pagination?.totalPages || 1);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [selectedVendor, selectedPackage, selectedCircle, selectedSubCircle, tempCodeSearch, itemNameSearch, page, limit]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedVendor, selectedPackage, selectedCircle, selectedSubCircle, tempCodeSearch, itemNameSearch]);


  // Helper function to fetch all data for exports
  const fetchAllForExport = async () => {
    const query = new URLSearchParams();
    query.append('vendorName', selectedVendor);
    if (selectedPackage && selectedPackage !== 'All Packages') query.append('pkg', selectedPackage);
    if (selectedCircle && selectedCircle !== 'All Circles') {
      query.append('circles', selectedCircle);
      if (selectedCircle === 'Solan' && selectedSubCircle && selectedSubCircle !== 'All Sub-Circles') {
        query.append('subcircle', selectedSubCircle);
      }
    }
    if (tempCodeSearch) query.append('search', tempCodeSearch);
    else if (itemNameSearch) query.append('search', itemNameSearch);
    
    // Pass a huge limit to get everything
    query.append('page', '1');
    query.append('limit', '100000');

    const res = await api.get(`/reports/vendor-itemised-summary?${query.toString()}`);
    return res.data.data.items || [];
  };

  const handleExportPDF = async () => {
    const exportData = await fetchAllForExport();
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text(`Vendor Summary: ${selectedVendor}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 28,
      head: [['TEMP CODE', 'LOA SERIAL NO.', 'ITEM NAME', 'ITEM DESCRIPTION', 'TOTAL INV QTY', 'TOTAL LOA QTY']],
      body: exportData.map((row: any) => [
        row.tempCode || '-',
        row.loaSerialNo || '-',
        row.itemName || '-',
        row.description || '-',
        row.totalInvQty?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00',
        row.totalLoaQty?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'
      ]),
      headStyles: { fillColor: [226, 239, 217], textColor: [51, 65, 85], fontStyle: 'bold' },
      didParseCell: function(data) {
        if (data.section === 'head') {
          if (data.column.index === 0) data.cell.styles.fillColor = [248, 203, 173]; // #f8cbad
          if (data.column.index === 1) data.cell.styles.fillColor = [255, 230, 153]; // #ffe699
          if (data.column.index === 2) data.cell.styles.fillColor = [189, 215, 238]; // #bdd7ee
          if (data.column.index === 3 || data.column.index === 4 || data.column.index === 5) data.cell.styles.fillColor = [221, 235, 247]; // #ddebf7
        }
      }
    });

    doc.save(`Vendor_Summary_${selectedVendor.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportExcel = async () => {
    const exportData = await fetchAllForExport();
    const wsData = exportData.map((row: any) => ({
      'TEMP CODE': row.tempCode || '-',
      'LOA SERIAL NO.': row.loaSerialNo || '-',
      'ITEM NAME': row.itemName || '-',
      'ITEM DESCRIPTION': row.description || '-',
      'TOTAL INV QTY': row.totalInvQty || 0,
      'TOTAL LOA QTY': row.totalLoaQty || 0
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `Vendor_Summary_${selectedVendor.replace(/\s+/g, '_')}.xlsx`);
  };


  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto">
          <Link href="/reports" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Reports
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vendor Summary</h1>
                <p className="text-slate-500 mt-1 text-sm font-medium">Itemized overview of invoice vs LOA quantities per vendor.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportExcel}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export Excel
              </button>
              <button 
                onClick={handleExportPDF}
                className="inline-flex items-center px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full p-8 flex flex-col gap-6">
        
        {/* Filters Section */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Vendor Dropdown */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Vendor Name</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
              >
                <option value="All Vendors">All Vendors</option>
                {vendors.map((v, idx) => (
                  <option key={idx} value={v}>{v}</option>
                ))}
              </select>
            </div>
            
            {/* Package Dropdown */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Package</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
              >
                <option value="All Packages">All Packages</option>
                <option value="Package 1 (S/N)">Package 1 (S/N)</option>
                <option value="Package 2 (R/R)">Package 2 (R/R)</option>
              </select>
            </div>

            {/* Circle Dropdown */}
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Filter by Circle</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                value={selectedCircle}
                onChange={(e) => setSelectedCircle(e.target.value)}
              >
                <option value="">All Circles</option>
                {(selectedPackage === 'All Packages' || selectedPackage === 'Package 1 (S/N)') && (
                  <>
                    <option value="Solan">Solan</option>
                    <option value="Nahan">Nahan</option>
                  </>
                )}
                {(selectedPackage === 'All Packages' || selectedPackage === 'Package 2 (R/R)') && (
                  <>
                    <option value="Rampur">Rampur</option>
                    <option value="Rohru">Rohru</option>
                  </>
                )}
              </select>
            </div>

            {/* Sub-Circle Dropdown (Conditional) */}
            <div className="md:col-span-1">
              {selectedCircle === 'Solan' && (
                <>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Sub-Circle</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                    value={selectedSubCircle}
                    onChange={(e) => setSelectedSubCircle(e.target.value)}
                  >
                    <option value="All Sub-Circles">All Sub-Circles</option>
                    <option value="Kumarhatti">Kumarhatti</option>
                    <option value="Nalagarh">Nalagarh</option>
                  </select>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-bold text-slate-700 mb-2">Search by Temp Code</label>
              <div className="absolute inset-y-0 left-0 top-7 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                className="w-full pl-10 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                placeholder="Enter exact temp code..."
                value={tempCodeSearch}
                onChange={(e) => { setTempCodeSearch(e.target.value); setItemNameSearch(''); }}
              />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-bold text-slate-700 mb-2">Search by Item Name</label>
              <div className="absolute inset-y-0 left-0 top-7 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                className="w-full pl-10 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5"
                placeholder="Enter item name..."
                value={itemNameSearch}
                onChange={(e) => { setItemNameSearch(e.target.value); setTempCodeSearch(''); }}
              />
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#e2efd9] text-slate-700 font-bold border-b border-[#c5e0b4] tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap border-r border-[#c5e0b4] bg-[#f8cbad]">TEMP CODE</th>
                  <th className="px-6 py-4 whitespace-nowrap border-r border-[#c5e0b4] bg-[#ffe699]">LOA SERIAL NO.</th>
                  <th className="px-6 py-4 whitespace-nowrap border-r border-[#c5e0b4] bg-[#bdd7ee]">ITEM NAME</th>
                  <th className="px-6 py-4 whitespace-nowrap border-r border-[#c5e0b4] bg-[#ddebf7]">ITEM DESCRIPTION</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap border-r border-[#c5e0b4] bg-[#ddebf7]">TOTAL INV QTY</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap bg-[#ddebf7]">TOTAL LOA QTY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5e0b4]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                        Fetching Summary...
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium bg-slate-50/50">
                      No records found for this vendor.
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 border-r border-[#c5e0b4] bg-amber-50/10">{row.tempCode || '-'}</td>
                      <td className="px-6 py-4 font-medium text-slate-600 border-r border-[#c5e0b4]">{row.loaSerialNo || '-'}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 border-r border-[#c5e0b4]">{row.itemName || '-'}</td>
                      <td className="px-6 py-4 text-slate-500 border-r border-[#c5e0b4] text-xs">{row.description || '-'}</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-600 border-r border-[#c5e0b4]">
                        {(row.totalInvQty || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-amber-600">
                        {(row.totalLoaQty || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {!loading && data.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 font-medium">Rows per page:</span>
                <select 
                  className="bg-white border border-slate-300 text-slate-800 text-sm rounded-md focus:ring-amber-500 focus:border-amber-500 p-1"
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                >
                  {[10, 30, 50, 70, 100, 200, 400, 800, 1000].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <span className="text-sm text-slate-500 ml-4">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} entries
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-slate-700 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
