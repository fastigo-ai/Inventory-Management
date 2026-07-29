"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, ChevronRight } from 'lucide-react';
import { getDemandNotes } from '@/features/site-portal/api/demand-notes.api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function DemandNotesList() {
  const [demandNotes, setDemandNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    switch (status) {
      case 'Draft': return <Badge variant="outline" className="bg-slate-100 text-slate-700">{status}</Badge>;
      case 'Pending Approval': return <Badge variant="outline" className="bg-amber-100 text-amber-700">{status}</Badge>;
      case 'Approved': return <Badge variant="outline" className="bg-emerald-100 text-emerald-700">{status}</Badge>;
      case 'Rejected': return <Badge variant="outline" className="bg-red-100 text-red-700">{status}</Badge>;
      case 'Fulfilled': return <Badge variant="outline" className="bg-blue-100 text-blue-700">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
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
        <Link
          href="/site-portal/demand-notes/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Demand Note
        </Link>
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
    </div>
  );
}
