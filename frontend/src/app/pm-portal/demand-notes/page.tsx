"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ChevronRight, MapPin, Package, UserCheck, ShieldAlert } from 'lucide-react';
import { getDemandNotes } from '@/features/site-portal/api/demand-notes.api';
import { useAuthStore } from '@/shared/store/auth.store';
import { toast } from 'sonner';
import ImportDNModal from './ImportDNModal';

export default function DemandNotesList() {
  const { user } = useAuthStore();
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
      {/* Header with Assigned Package & Circle Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-500" /> Demand Notes (PM Portal)
            </h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">Review and approve material requisitions for your assigned jurisdiction.</p>
        </div>

        {/* Assigned Package & Circle Badges */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-xs text-xs font-semibold text-slate-700">
            <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-400 font-normal">Package:</span>
            <span className="text-indigo-900 font-bold">{user?.assignedPackage || 'Not Assigned (All)'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-xs text-xs font-semibold text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-400 font-normal">Circle:</span>
            <span className="text-emerald-900 font-bold">{user?.assignedCircle || 'Not Assigned (All)'}</span>
          </div>

          {user && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/70 rounded-lg border border-indigo-100 text-xs font-medium text-indigo-700">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{user.firstName} {user.lastName}</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          <div className="animate-pulse">Loading demand notes...</div>
        </div>
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
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <FileText className="w-10 h-10 text-slate-300" />
                      <p className="font-semibold text-slate-700">No pending demand notes found</p>
                      <p className="text-xs text-slate-400">
                        There are currently no demand notes pending PM approval for <span className="font-semibold text-slate-600">{user?.assignedPackage || 'All Packages'}</span> / <span className="font-semibold text-slate-600">{user?.assignedCircle || 'All Circles'}</span>.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                demandNotes.map((dn) => (
                  <tr key={dn._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">
                      <Link href={`/pm-portal/demand-notes/${dn._id}`}>
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
                        href={`/pm-portal/demand-notes/${dn._id}`}
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

