"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Search, 
  UserCheck, 
  AlertCircle,
  Building
} from 'lucide-react';
import { getDemandNotes } from '@/features/site-portal/api/demand-notes.api';
import { useAuthStore } from '@/shared/store/auth.store';
import { toast } from 'sonner';
import ImportDNModal from './ImportDNModal';

type TabType = 'pending' | 'history' | 'all';

export default function DemandNotesList() {
  const { user } = useAuthStore();
  const [demandNotes, setDemandNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  useEffect(() => {
    fetchDemandNotes();
  }, []);

  const fetchDemandNotes = async () => {
    try {
      setLoading(true);
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

  const pendingList = useMemo(() => {
    return demandNotes.filter((dn) => dn.status === 'Pending PD Approval');
  }, [demandNotes]);

  const historyList = useMemo(() => {
    return demandNotes.filter(
      (dn) => dn.status === 'Approved' || dn.status === 'Fulfilled' || dn.status === 'Rejected'
    );
  }, [demandNotes]);

  const filteredList = useMemo(() => {
    let list = demandNotes;
    if (activeTab === 'pending') list = pendingList;
    else if (activeTab === 'history') list = historyList;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (dn) =>
        dn.demandNoteNumber?.toLowerCase().includes(q) ||
        dn.contractorName?.toLowerCase().includes(q) ||
        dn.package?.toLowerCase().includes(q) ||
        dn.circle?.toLowerCase().includes(q) ||
        `${dn.createdBy?.firstName} ${dn.createdBy?.lastName}`.toLowerCase().includes(q) ||
        `${dn.pmApprovedBy?.firstName} ${dn.pmApprovedBy?.lastName}`.toLowerCase().includes(q) ||
        `${dn.pdApprovedBy?.firstName} ${dn.pdApprovedBy?.lastName}`.toLowerCase().includes(q)
    );
  }, [demandNotes, activeTab, pendingList, historyList, searchQuery]);

  const getStatusBadge = (status: string) => {
    const baseStyle = "px-2.5 py-1 text-xs font-semibold rounded-full border inline-flex items-center gap-1.5";
    switch (status) {
      case 'Draft': 
        return <span className={`${baseStyle} bg-slate-100 text-slate-700 border-slate-200`}><AlertCircle className="w-3 h-3" /> {status}</span>;
      case 'Pending Approval':
      case 'Pending PM Approval': 
        return <span className={`${baseStyle} bg-amber-50 text-amber-700 border-amber-200/80`}><Clock className="w-3 h-3 text-amber-600" /> Pending PM</span>;
      case 'Pending PD Approval': 
        return <span className={`${baseStyle} bg-purple-50 text-purple-700 border-purple-200/80`}><Clock className="w-3 h-3 text-purple-600" /> Pending PD</span>;
      case 'Approved': 
        return <span className={`${baseStyle} bg-emerald-50 text-emerald-700 border-emerald-200/80`}><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved</span>;
      case 'Rejected': 
        return <span className={`${baseStyle} bg-red-50 text-red-700 border-red-200/80`}><AlertCircle className="w-3 h-3 text-red-600" /> Rejected</span>;
      case 'Fulfilled': 
        return <span className={`${baseStyle} bg-blue-50 text-blue-700 border-blue-200/80`}><CheckCircle2 className="w-3 h-3 text-blue-600" /> Fulfilled</span>;
      default: 
        return <span className={`${baseStyle} bg-slate-100 text-slate-700 border-slate-200`}>{status}</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Demand Notes (PD Portal)
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Executive review, final sign-off, and organizational approval history across all circles.
              </p>
            </div>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50/80 rounded-xl border border-purple-100 text-xs font-medium text-purple-800">
            <UserCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Project Director: <strong className="font-semibold">{user.firstName} {user.lastName}</strong></span>
          </div>
        )}
      </div>

      {/* Tabs & Search Filter Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 w-fit">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-purple-500" />
            <span>Pending Final Approval</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'pending'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {pendingList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Approval History</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'history'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {historyList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>All Demand Notes</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'all'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {demandNotes.length}
            </span>
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search DN#, contractor, PM, PD..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="animate-pulse flex flex-col items-center gap-2 text-slate-400 text-sm">
            <Clock className="w-6 h-6 animate-spin text-purple-600" />
            <span>Loading demand notes...</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">DN Number</th>
                  <th className="px-6 py-4">Package / Circle</th>
                  <th className="px-6 py-4">Contractor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">PM Approval</th>
                  <th className="px-6 py-4">PD Approval</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="font-semibold text-slate-800 text-base">
                          {activeTab === 'pending'
                            ? 'No Pending Demand Notes'
                            : activeTab === 'history'
                            ? 'No Approval History Yet'
                            : 'No Demand Notes Found'}
                        </p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {activeTab === 'pending'
                            ? 'All demand notes requiring Project Director approval have been processed.'
                            : activeTab === 'history'
                            ? 'Demand notes that receive final approval will appear here in your director log.'
                            : 'No demand notes match your current search or filter criteria.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((dn) => (
                    <tr key={dn._id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Demand Note Number */}
                      <td className="px-6 py-4 font-semibold text-indigo-600">
                        <Link 
                          href={`/pd-portal/demand-notes/${dn._id}`}
                          className="hover:underline flex items-center gap-1"
                        >
                          {dn.demandNoteNumber}
                        </Link>
                      </td>

                      {/* Package & Circle */}
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        <span>{dn.package}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-500 text-xs">{dn.circle}</span>
                      </td>

                      {/* Contractor Name */}
                      <td className="px-6 py-4 text-slate-700">
                        {dn.contractorName ? (
                          <span className="font-medium text-slate-800">{dn.contractorName}</span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">N/A</span>
                        )}
                      </td>

                      {/* Overall Status Badge */}
                      <td className="px-6 py-4">
                        {getStatusBadge(dn.status)}
                      </td>

                      {/* PM Approver Details */}
                      <td className="px-6 py-4 text-xs">
                        {dn.pmApprovedBy ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {dn.pmApprovedBy.firstName} {dn.pmApprovedBy.lastName}
                            </span>
                            {dn.pmApprovedAt && (
                              <span className="text-slate-400 text-[11px]">
                                on {new Date(dn.pmApprovedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pending PM</span>
                        )}
                      </td>

                      {/* PD Approver Details */}
                      <td className="px-6 py-4 text-xs">
                        {dn.pdApprovedBy ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {dn.pdApprovedBy.firstName} {dn.pdApprovedBy.lastName}
                            </span>
                            {dn.pdApprovedAt && (
                              <span className="text-slate-400 text-[11px]">
                                on {new Date(dn.pdApprovedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : dn.status === 'Pending PD Approval' ? (
                          <span className="text-purple-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-500" />
                            Awaiting Your Sign-Off
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(dn.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action Links */}
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/pd-portal/demand-notes/${dn._id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            dn.status === 'Pending PD Approval'
                              ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{dn.status === 'Pending PD Approval' ? 'Review & Sign-Off' : 'View Details'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

