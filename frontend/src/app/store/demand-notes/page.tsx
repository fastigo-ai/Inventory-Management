"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { FileText, ChevronRight, Clock, CheckCircle2, UserCheck, MapPin, CheckCircle } from 'lucide-react';
import { getDemandNotes } from '@/features/site-portal/api/demand-notes.api';
import { useAuthStore } from '@/shared/store/auth.store';
import { toast } from 'sonner';

export default function StoreDemandNotesList() {
  const [demandNotes, setDemandNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('approved'); // 'approved' or 'fulfilled'

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
      case 'Approved': return <span className={`${baseStyle} bg-emerald-100 text-emerald-700 border-emerald-200`}>{status}</span>;
      case 'Fulfilled': return <span className={`${baseStyle} bg-blue-100 text-blue-700 border-blue-200`}>{status}</span>;
      default: return <span className={`${baseStyle} bg-slate-100 text-slate-700 border-slate-200`}>{status}</span>;
    }
  };

  const filteredList = useMemo(() => {
    return demandNotes.filter(dn => {
      if (activeTab === 'approved') return dn.status === 'Approved';
      if (activeTab === 'fulfilled') return dn.status === 'Fulfilled';
      return false;
    });
  }, [demandNotes, activeTab]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" /> Demand Notes (Store Portal)
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review approved requisitions and fulfill them by creating Material Issue Notes (MIN).</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'approved' 
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Ready to Fulfill
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'approved' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                {demandNotes.filter(d => d.status === 'Approved').length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('fulfilled')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'fulfilled' 
                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Fulfilled
            </div>
          </button>
        </div>
      </div>

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
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4">Created By</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2.5 max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="font-semibold text-slate-800 text-base">
                          {activeTab === 'approved'
                            ? 'No Demand Notes Ready to Fulfill'
                            : 'No Fulfilled Demand Notes'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((dn) => (
                    <tr key={dn._id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 font-semibold text-indigo-600">
                        {dn.demandNoteNumber}
                      </td>

                      <td className="px-6 py-4 text-slate-700 font-medium">
                        <span>{dn.package}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-500 text-xs">{dn.circle}</span>
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {dn.contractorName ? (
                          <span className="font-medium text-slate-800">{dn.contractorName}</span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">N/A</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {getStatusBadge(dn.status)}
                      </td>

                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(dn.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-slate-700 text-xs font-medium">
                        {dn.createdBy ? (
                          <span>{dn.createdBy.firstName} {dn.createdBy.lastName}</span>
                        ) : (
                          <span className="text-slate-400">System</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {dn.status === 'Approved' ? (
                          <Link
                            href={`/store/contractor-issue/new?demandNoteId=${dn._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                          >
                            <span>Create MIN</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <Link
                            href={`/store/contractor-issue`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-slate-100 text-slate-700 hover:bg-slate-200"
                          >
                            <span>View MINs</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
