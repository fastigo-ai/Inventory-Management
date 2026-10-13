"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, FileText, ChevronRight, ChevronLeft, Upload, Download, Search, Calendar, User, AlertTriangle, PackagePlus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getDemandNotes } from '@/features/site-portal/api/demand-notes.api';
import { getUnregularizedExtraIssues } from '@/features/contractors/api/contractors.api';
import RegularizeExtraDemandModal from '@/features/site-portal/components/RegularizeExtraDemandModal';
import { toast } from 'sonner';
import ImportDNModal from './ImportDNModal';
import { useAuditTracker } from '@/shared/hooks/useAuditTracker';

export default function DemandNotesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const [demandNotes, setDemandNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Pending' | 'history' | 'all'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const { trackClick, trackExport, trackAction } = useAuditTracker();

  // Over-issue / Extra items state
  const [unregularizedExtras, setUnregularizedExtras] = useState<any[]>([]);
  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [selectedAssignmentForRegularize, setSelectedAssignmentForRegularize] = useState<any>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchDemandNotes();
    fetchUnregularizedExtras();
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

  const fetchUnregularizedExtras = async () => {
    try {
      const res = await getUnregularizedExtraIssues();
      if (res && res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.unregularizedIssues || []);
        setUnregularizedExtras(list);
        const targetId = searchParams.get('openExtraModal');
        if (targetId) {
          const match = list.find((a: any) => a._id === targetId);
          if (match) {
            setSelectedAssignmentForRegularize(match);
            setIsExtraModalOpen(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch unregularized extras', err);
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
            'Total Package LOA Qty': Number(Number(item.totalPackageLoaQty || 0).toFixed(3)),
            'Circle LOA Qty': Number(Number(item.circleLoaQty || 0).toFixed(3)),
            'Circle BOM Qty': Number(Number(item.circleBomQty || 0).toFixed(3)),
            'LOA Qty': Number(Number(item.loaQty || 0).toFixed(3)),
            'WO Qty': Number(Number(item.woQty || 0).toFixed(3)),
            'BOM Qty': Number(Number(item.bomQty || 0).toFixed(3)),
            'Already Issued Qty': Number(Number(item.alreadyIssuedQty || 0).toFixed(3)),
            'Stock Bal': Number(Number(item.stockBal || 0).toFixed(3)),
            'JMC Qty': Number(Number(item.jmcQty || 0).toFixed(3)),
            'WIP Qty': Number(Number(item.wipQty || 0).toFixed(3)),
            'WIP Required Qty': Number(Number(item.wipRequiredQty || 0).toFixed(3)),
            'Miscellaneous Qty': Number(Number(item.miscellaneousQty || 0).toFixed(3)),
            'Demand Qty': Number(Number(item.demandQty || 0).toFixed(3)),
            'Bal BOM Qty': Number(Number(item.balBomQty || 0).toFixed(3))
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
  if (activeTab === 'Pending') filteredList = pendingList;
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
              onClick={() => { setActiveTab('Pending'); setCurrentPage(1); }}
              className={`flex justify-between items-center px-4 py-2 rounded-lg transition-all ${activeTab === 'Pending' ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-slate-100/50'}`}
            >
              <span className={`text-sm font-semibold ${activeTab === 'Pending' ? 'text-slate-800' : 'text-slate-600'}`}>Pending</span>
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
            <button onClick={handleExportCSV} disabled={isExporting} className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl flex justify-center items-center gap-2 text-sm font-bold shadow-sm transition-all whitespace-nowrap">
            {isExporting ? 'Exporting...' : <><Download className="w-4 h-4" /> Export CSV
            </>}
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

      {/* Over-Issue Alert Banner for Site Portal */}
      {unregularizedExtras.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-50 border-2 border-amber-300/80 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-300/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
                  Store Over-Issue Notifications
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs">
                    {unregularizedExtras.length} Pending
                  </span>
                </h2>
                <p className="text-xs text-amber-800">
                  Store has issued extra quantities or un-demanded items. Click below to demand those extra materials and regularize the MIN.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {unregularizedExtras.map((assignment: any) => {
              const extraItems = (assignment.lineItems || []).filter((item: any) => 
                item.isExtra || (Number(item.quantity) > Number(item.demandQty || 0))
              );
              const contractor = assignment.contractorId?.name || assignment.contractorId?.dynamicData?.displayName || assignment.contractorFarmName || 'Contractor';
              const minNumber = assignment.minNo || assignment.assignmentNumber;

              return (
                <div 
                  key={assignment._id}
                  className="bg-white/90 backdrop-blur-sm border border-amber-200 rounded-xl p-4 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <PackagePlus className="w-4 h-4 text-amber-600" />
                        {minNumber}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {new Date(assignment.minDate || assignment.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Contractor: </span>
                      {contractor}
                    </div>

                    <div className="space-y-1 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100/70 text-xs">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                        Over-Issued Items:
                      </span>
                      <ul className="space-y-1 text-slate-700">
                        {extraItems.map((item: any, i: number) => {
                          const extraQty = item.extraQty !== undefined 
                            ? Number(item.extraQty) 
                            : Math.max(0, Number(item.quantity) - Number(item.demandQty || 0));
                          return (
                            <li key={i} className="flex items-center justify-between text-xs">
                              <span className="truncate pr-2 font-medium">
                                • {item.itemName} {item.loaSrNo ? `(LOA: ${item.loaSrNo})` : ''}
                              </span>
                              <span className="font-bold text-amber-700 whitespace-nowrap">
                                +{extraQty} {item.unit || 'Nos'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssignmentForRegularize(assignment);
                        setIsExtraModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow"
                    >
                      <span>Demand Extra Qty & Merge</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                    <th className="px-6 py-5">CONTRACTOR</th>
                    <th className="px-6 py-5">STATUS</th>
                    <th className="px-6 py-5">CREATED DATE</th>
                    <th className="px-6 py-5">CREATED BY</th>
                    <th className="px-6 py-5 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">No demand notes found.</td>
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
                        <td className="px-6 py-4.5 text-slate-600 font-medium truncate max-w-[200px]" title={dn.contractor?.name || dn.contractorName}>
                          {dn.contractor?.name || dn.contractorName || '-'}
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

      <RegularizeExtraDemandModal
        isOpen={isExtraModalOpen}
        onClose={() => {
          setIsExtraModalOpen(false);
          setSelectedAssignmentForRegularize(null);
        }}
        assignment={selectedAssignmentForRegularize}
        onSuccess={() => {
          fetchDemandNotes();
          fetchUnregularizedExtras();
        }}
      />
    </div>
  );
}
