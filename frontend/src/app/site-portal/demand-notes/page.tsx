"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, ChevronRight, ChevronLeft, Upload, Download, Search, Calendar, User } from 'lucide-react';
import { getDemandNotes } from '@/features/site-portal/api/demand-notes.api';
import { toast } from 'sonner';
import ImportDNModal from './ImportDNModal';
import { useAuditTracker } from '@/shared/hooks/useAuditTracker';

export default function DemandNotesList() {
  const [demandNotes, setDemandNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const { trackClick, trackExport, trackAction } = useAuditTracker();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchDemandNotes();
  }, []);

  const fetchDemandNotes = async () => {
    try {
      const res = await getDemandNotes();
      if (res.success) {
        setDemandNotes(res.data.demandNotes || []);
      }
    } catch (error) {
      toast.error('Failed to fetch Demand Notes');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (demandNotes.length === 0) {
      toast.info('No data to export');
      return;
    }

    const headers = [
      'Demand Note Number', 'Status', 'Package', 'Circle', 'Division', 'Sub Division', 'Contractor Name', 'Location', 'Remarks', 'Created At',
      'Item Name', 'Item Description', 'Temp Code', 'LOA Sr No', 'Unit', 'Total Package LOA Qty', 'Circle LOA Qty', 'Circle BOM Qty',
      'LOA Qty', 'WO Qty', 'BOM Qty', 'Already Issued Qty', 'Stock Bal', 'JMC Qty', 'WIP Qty', 'WIP Required Qty', 'Miscellaneous Qty', 'Demand Qty', 'Bal BOM Qty'
    ];

    const rows: any[] = [];
    
    demandNotes.forEach(dn => {
      const baseInfo = {
        'Demand Note Number': dn.demandNoteNumber || '',
        'Status': dn.status || '',
        'Package': dn.package || '',
        'Circle': dn.circle || '',
        'Division': dn.division || '',
        'Sub Division': dn.subDivision || '',
        'Contractor Name': dn.contractorName || '',
        'Location': dn.location || '',
        'Remarks': dn.remarks || '',
        'Created At': dn.createdAt ? new Date(dn.createdAt).toLocaleDateString() : ''
      };

      if (!dn.items || dn.items.length === 0) {
        rows.push({ ...baseInfo });
      } else {
        dn.items.forEach((item: any) => {
          rows.push({
            ...baseInfo,
            'Item Name': item.itemName || '',
            'Item Description': item.itemDescription || '',
            'Temp Code': item.tempCode || '',
            'LOA Sr No': item.loaSrNo || '',
            'Unit': item.unit || '',
            'Total Package LOA Qty': item.totalPackageLoaQty || 0,
            'Circle LOA Qty': item.circleLoaQty || 0,
            'Circle BOM Qty': item.circleBomQty || 0,
            'LOA Qty': item.loaQty || 0,
            'WO Qty': item.woQty || 0,
            'BOM Qty': item.bomQty || 0,
            'Already Issued Qty': item.alreadyIssuedQty || 0,
            'Stock Bal': item.stockBal || 0,
            'JMC Qty': item.jmcQty || 0,
            'WIP Qty': item.wipQty || 0,
            'WIP Required Qty': item.wipRequiredQty || 0,
            'Miscellaneous Qty': item.miscellaneousQty || 0,
            'Demand Qty': item.demandQty || 0,
            'Bal BOM Qty': item.balBomQty || 0
          });
        });
      }
    });

    const escapeCSV = (val: any) => `"${String(val).replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => headers.map(header => escapeCSV(row[header] !== undefined ? row[header] : '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Demand_Notes_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    trackExport('CSV', 'Demand Notes (Site Portal)', { count: demandNotes.length });
  };

  const pendingList = demandNotes.filter(
    (dn) => dn.status === 'Draft' || dn.status === 'Pending PM Approval' || dn.status === 'Pending PD Approval' || dn.status === 'Pending Approval'
  );

  const historyList = demandNotes.filter(
    (dn) => dn.status === 'Approved' || dn.status === 'Rejected' || dn.status === 'Fulfilled'
  );

  const pendingCount = pendingList.length;
  const historyCount = historyList.length;
  const allCount = demandNotes.length;

  let filteredList = demandNotes;
  if (activeTab === 'pending') filteredList = pendingList;
  else if (activeTab === 'history') filteredList = historyList;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredList = filteredList.filter(
      (dn) =>
        dn.demandNoteNumber?.toLowerCase().includes(q) ||
        dn.contractorName?.toLowerCase().includes(q) ||
        dn.package?.toLowerCase().includes(q) ||
        dn.circle?.toLowerCase().includes(q)
    );
  }

  if (statusFilter !== 'All Statuses') {
    filteredList = filteredList.filter(dn => dn.status === statusFilter);
  }

  // Pagination logic
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Ensure current page is valid
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const currentData = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: string) => {
    const baseStyle = "px-3 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case 'Draft': return <span className={`${baseStyle} bg-slate-100 text-slate-700`}>{status}</span>;
      case 'Pending Approval':
      case 'Pending PM Approval': 
      case 'Pending PD Approval': return <span className={`${baseStyle} bg-amber-100 text-amber-700`}>{status}</span>;
      case 'Approved': return <span className={`${baseStyle} bg-emerald-100 text-emerald-700`}>{status}</span>;
      case 'Rejected': return <span className={`${baseStyle} bg-red-100 text-red-700`}>{status}</span>;
      case 'Fulfilled': return <span className={`${baseStyle} bg-blue-100 text-blue-700`}>{status}</span>;
      default: return <span className={`${baseStyle} bg-slate-100 text-slate-700`}>{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 bg-[#FAFAFA] min-h-screen">
      
      {/* Top Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0 border border-indigo-100">
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Demand Notes (Site Portal)</h1>
            <p className="text-slate-500 text-sm mt-1.5">Manage and track material requisitions for your<br/>assigned package and circle.</p>
          </div>
        </div>

        {/* Middle: Stats / Tabs */}
        <div className="flex-1 max-w-sm w-full mx-auto xl:mx-0 xl:ml-8">
          <div className="bg-[#FCFCFD] rounded-xl border border-slate-200 p-1.5 flex flex-col gap-1 w-full shadow-inner">
            <button 
              onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
              className={`flex justify-between items-center px-4 py-2 rounded-lg transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-slate-100/50'}`}
            >
              <span className={`text-sm font-semibold ${activeTab === 'pending' ? 'text-slate-800' : 'text-slate-600'}`}>Pending</span>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold">{pendingCount}</span>
            </button>
            <button 
              onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
              className={`flex justify-between items-center px-4 py-2 rounded-lg transition-all ${activeTab === 'history' ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-slate-100/50'}`}
            >
              <span className={`text-sm font-semibold ${activeTab === 'history' ? 'text-slate-800' : 'text-slate-600'}`}>History</span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">{historyCount}</span>
            </button>
            <button 
              onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
              className={`flex justify-between items-center px-4 py-2 rounded-lg transition-all ${activeTab === 'all' ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-slate-100/50'}`}
            >
              <span className={`text-sm font-semibold ${activeTab === 'all' ? 'text-slate-800' : 'text-slate-600'}`}>All</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">{allCount}</span>
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <div className="flex gap-3">
            <button onClick={handleExportCSV} className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl flex justify-center items-center gap-2 text-sm font-bold shadow-sm transition-all whitespace-nowrap">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl flex justify-center items-center gap-2 text-sm font-bold shadow-sm transition-all whitespace-nowrap">
              <Upload className="w-4 h-4" /> Import CSV
            </button>
          </div>
          <Link href="/site-portal/demand-notes/new" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl flex justify-center items-center gap-2 text-sm font-bold shadow-sm shadow-indigo-200 transition-all whitespace-nowrap">
            <Plus className="w-5 h-5" /> Create Demand Note
          </Link>
        </div>
      </div>

      {/* Search and Filter Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm max-w-md w-full focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by DN number, package..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-none focus:outline-none text-sm w-full text-slate-700 placeholder-slate-400 font-medium"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-bold text-slate-700">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer"
          >
            <option value="All Statuses">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Pending PM Approval">Pending PM Approval</option>
            <option value="Pending PD Approval">Pending PD Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Fulfilled">Fulfilled</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-medium flex flex-col items-center justify-center">
             <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
             Loading demand notes...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-xs font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-5">DN NUMBER</th>
                    <th className="px-6 py-5">PACKAGE / CIRCLE</th>
                    <th className="px-6 py-5">STATUS</th>
                    <th className="px-6 py-5">CREATED DATE</th>
                    <th className="px-6 py-5">CREATED BY</th>
                    <th className="px-6 py-5 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">No demand notes found.</td>
                    </tr>
                  ) : (
                    currentData.map((dn) => (
                      <tr key={dn._id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4.5 font-bold text-indigo-600">
                          <Link href={`/site-portal/demand-notes/${dn._id}`} className="hover:underline">
                            {dn.demandNoteNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4.5 text-slate-700 font-semibold">
                          {dn.package} <span className="text-slate-300 font-normal mx-1">/</span> {dn.circle}
                        </td>
                        <td className="px-6 py-4.5">
                          {getStatusBadge(dn.status)}
                        </td>
                        <td className="px-6 py-4.5 text-slate-600 font-medium flex items-center gap-2 mt-0.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(dn.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-6 py-4.5 text-slate-600 font-medium">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            {dn.createdBy?.firstName} {dn.createdBy?.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4.5 text-center">
                          <Link
                            href={`/site-portal/demand-notes/${dn._id}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all bg-white shadow-sm"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalItems > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-white rounded-b-2xl gap-4">
                <span className="text-sm text-slate-500 font-medium">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-indigo-200">
                    {currentPage}
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="ml-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 font-medium focus:outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ImportDNModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={() => {
          setIsImportModalOpen(false);
          fetchDemandNotes();
        }}
      />
    </div>
  );
}
