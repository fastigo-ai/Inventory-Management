"use client";

import React, { useEffect, useState } from 'react';
import CeoDashboardPage from '@/app/ceo-portal/dashboard/page';
import { api } from '@/shared/api/axios';
import { FileText, CheckCircle, Clock, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';

export default function PDPortalDashboard() {
  const [pendingApprovals, setPendingApprovals] = useState<{
    demandNotes: number;
    jmcs: number;
    invoices: number;
    transfers?: number;
  } | null>(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const response = await api.get('/dashboard/pd-portal-summary');
        if (response.data?.success && response.data?.data?.pendingApprovals) {
          setPendingApprovals(response.data.data.pendingApprovals);
        }
      } catch (error) {
        // Quiet fallback - dashboard still renders CEO view
      }
    };
    fetchPending();
  }, []);

  const hasPending = pendingApprovals && (
    (pendingApprovals.demandNotes || 0) > 0 ||
    (pendingApprovals.jmcs || 0) > 0 ||
    (pendingApprovals.invoices || 0) > 0 ||
    (pendingApprovals.transfers || 0) > 0
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* PD Action Required Notification Bar */}
      {hasPending && (
        <aside aria-label="PD Action Required" className="bg-slate-900 border-b border-slate-800 text-white px-6 py-3 shrink-0 shadow-sm">
          <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Action Required (Pending Approvals)
              </span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {(pendingApprovals?.transfers || 0) > 0 && (
                <Link
                  href="/pd-portal/transfers?tab=pending"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300">Store Transfers:</span>
                  <span className="font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded text-[11px]">
                    {pendingApprovals?.transfers}
                  </span>
                </Link>
              )}
              {(pendingApprovals?.demandNotes || 0) > 0 && (
                <Link
                  href="/pd-portal/demand-notes?tab=pending"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-slate-300">Demand Notes:</span>
                  <span className="font-bold text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded text-[11px]">
                    {pendingApprovals?.demandNotes}
                  </span>
                </Link>
              )}
              {(pendingApprovals?.jmcs || 0) > 0 && (
                <Link
                  href="/site-portal/jmc-register"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-slate-300">JMCs:</span>
                  <span className="font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded text-[11px]">
                    {pendingApprovals?.jmcs}
                  </span>
                </Link>
              )}
              {(pendingApprovals?.invoices || 0) > 0 && (
                <Link
                  href="/billing/approvals"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-300">Billing Approvals:</span>
                  <span className="font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded text-[11px]">
                    {pendingApprovals?.invoices}
                  </span>
                </Link>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* CEO Portal Dashboard */}
      <div className="flex-1">
        <CeoDashboardPage />
      </div>
    </div>
  );
}
