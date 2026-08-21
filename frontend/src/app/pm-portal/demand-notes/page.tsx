"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  ChevronRight, 
  MapPin, 
  Package, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Search, 
  ArrowUpRight,
  User,
  Calendar,
  AlertCircle
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
  const [statusFilter, setStatusFilter] = useState('All Statuses');
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
    return demandNotes.filter(
      (dn) => dn.status === 'Pending PM Approval' || dn.status === 'Pending Approval'
    );
  }, [demandNotes]);

  const historyList = useMemo(() => {
    return demandNotes.filter(
      (dn) => dn.status !== 'Pending PM Approval' && dn.status !== 'Pending Approval' && dn.status !== 'Draft'
    );
  }, [demandNotes]);

  const filteredList = useMemo(() => {
    let list = demandNotes;
    if (activeTab === 'pending') list = pendingList;
    else if (activeTab === 'history') list = historyList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (dn) =>
          dn.demandNoteNumber?.toLowerCase().includes(q) ||
          dn.contractorName?.toLowerCase().includes(q) ||
          dn.package?.toLowerCase().includes(q) ||
          dn.circle?.toLowerCase().includes(q) ||
          `${dn.createdBy?.firstName} ${dn.createdBy?.lastName}`.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'All Statuses') {
      list = list.filter(dn => dn.status === statusFilter);
    }

    return list;
  }, [demandNotes, activeTab, pendingList, historyList, searchQuery, statusFilter]);

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
      {/* Header with Assigned Package & Circle Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Demand Notes (PM Portal)
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Review, approve, and track material requisition workflow for your jurisdiction.
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Package & Circle Badges */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200/80 p-2 rounded-xl">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs text-xs font-medium text-slate-700">
            <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-400 font-normal">Package:</span>
            <span className="text-indigo-900 font-bold">{user?.assignedPackage || 'All Packages'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs text-xs font-medium text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-400 font-normal">Circle:</span>
            <span className="text-emerald-900 font-bold">{user?.assignedCircle || 'All Circles'}</span>
          </div>

          {user && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 rounded-lg border border-indigo-100/80 text-xs font-medium text-indigo-700">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{user.firstName} {user.lastName}</span>
            </div>
          )}
        </div>
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
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Pending PM Approval</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'pending'
                  ? 'bg-amber-100 text-amber-800'
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

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search DN#, contractor, creator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs sm:text-sm font-medium text-slate-600 whitespace-nowrap">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="animate-pulse flex flex-col items-center gap-2 text-slate-400 text-sm">
            <Clock className="w-6 h-6 animate-spin text-indigo-600" />
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
                  <th className="px-6 py-4">Approval Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Created By</th>
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
                            ? `All demand notes for ${user?.assignedPackage || 'your package'} / ${user?.assignedCircle || 'your circle'} have been reviewed.`
                            : activeTab === 'history'
                            ? 'Demand notes that you approve will appear here in your history log.'
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
                          href={`/pm-portal/demand-notes/${dn._id}`}
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

                      {/* Approver History Details */}
                      <td className="px-6 py-4 text-xs">
                        {dn.pmApprovedBy ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              PM: {dn.pmApprovedBy.firstName} {dn.pmApprovedBy.lastName}
                            </span>
                            {dn.pmApprovedAt && (
                              <span className="text-slate-400 text-[11px]">
                                on {new Date(dn.pmApprovedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            Awaiting PM Review
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(dn.createdAt).toLocaleDateString()}
                      </td>

                      {/* Created By */}
                      <td className="px-6 py-4 text-slate-700 text-xs font-medium">
                        {dn.createdBy ? (
                          <span>{dn.createdBy.firstName} {dn.createdBy.lastName}</span>
                        ) : (
                          <span className="text-slate-400">System</span>
                        )}
                      </td>

                      {/* Action Links */}
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/pm-portal/demand-notes/${dn._id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            dn.status === 'Pending PM Approval' || dn.status === 'Pending Approval'
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{dn.status === 'Pending PM Approval' || dn.status === 'Pending Approval' ? 'Review & Approve' : 'View Details'}</span>
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


