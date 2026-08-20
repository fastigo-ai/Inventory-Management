"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, ChevronRight, Upload, Download } from 'lucide-react';
import { getDemandNotes } from '@/features/site-portal/api/demand-notes.api';
import { toast } from 'sonner';
import ImportDNModal from './ImportDNModal';

export default function DemandNotesList() {
  const [demandNotes, setDemandNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

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

    // Prepare CSV header based on all fields present while entering a demand note
    const headers = [
      'Demand Note Number', 'Status', 'Package', 'Circle', 'Division', 'Sub Division', 'Contractor Name', 'Location', 'Remarks', 'Created At',
      'Item Name', 'Item Description', 'Temp Code', 'LOA Sr No', 'Unit', 'Total Package LOA Qty', 'Circle LOA Qty', 'Circle BOM Qty',
      'LOA Qty', 'WO Qty', 'BOM Qty', 'Already Issued Qty', 'Stock Bal', 'JMC Qty', 'WIP Qty', 'WIP Required Qty', 'Miscellaneous Qty', 'Demand Qty', 'Bal BOM Qty'
    ];

    const rows: any[] = [];
    
    demandNotes.forEach(dn => {
      // Basic DN Info
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
        // If no items, just push the base info
        rows.push({ ...baseInfo });
      } else {
        // Push a row for each item
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

    // Convert to CSV
    const escapeCSV = (val: any) => `"${String(val).replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => headers.map(header => escapeCSV(row[header] !== undefined ? row[header] : '')).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Demand_Notes_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const baseStyle = "px-2.5 py-0.5 text-xs font-semibold rounded-full border";
    switch (status) {
      case 'Draft': return <span className={`${baseStyle} bg-slate-100 text-slate-700 border-slate-200`}>{status}</span>;
      case 'Pending Approval':
      case 'Pending PM Approval': 
      case 'Pending PD Approval': return <span className={`${baseStyle} bg-amber-100 text-amber-700 border-amber-200`}>{status}</span>;
      case 'Approved': return <span className={`${baseStyle} bg-emerald-100 text-emerald-700 border-emerald-200`}>{status}</span>;
      case 'Rejected': return <span className={`${baseStyle} bg-red-100 text-red-700 border-red-200`}>{status}</span>;
      case 'Fulfilled': return <span className={`${baseStyle} bg-blue-100 text-blue-700 border-blue-200`}>{status}</span>;
      default: return <span className={`${baseStyle} bg-slate-100 text-slate-700 border-slate-200`}>{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" /> Demand Notes (Site Portal)
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track material requisitions for your assigned package and circle.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-slate-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-white hover:bg-slate-50 text-indigo-600 border border-indigo-200 px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <Link
            href="/site-portal/demand-notes/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Demand Note
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Loading demand notes...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-6 py-4">DN Number</th>
                <th className="px-6 py-4">Package / Circle</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4">Created By</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demandNotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No demand notes found.</td>
                </tr>
              ) : (
                demandNotes.map((dn) => (
                  <tr key={dn._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">
                      <Link href={`/site-portal/demand-notes/${dn._id}`}>
                        {dn.demandNoteNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {dn.package} <span className="text-slate-400">/</span> {dn.circle}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(dn.status)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(dn.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-600">{dn.createdBy?.firstName} {dn.createdBy?.lastName}</td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/site-portal/demand-notes/${dn._id}`}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-2"
                      >
                        <ChevronRight className="w-5 h-5 inline" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

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
