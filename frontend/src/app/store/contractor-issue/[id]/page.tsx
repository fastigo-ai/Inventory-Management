"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, FileText, CheckCircle, Printer } from 'lucide-react';
import { getAssignmentById } from '@/features/contractors/api/contractors.api';
import { toast } from 'sonner';

export default function ContractorIssueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  
  const [issue, setIssue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        setIsLoading(true);
        const res = await getAssignmentById(id as string);
        if (res.success && res.data) {
          setIssue(res.data);
        } else {
          toast.error('Failed to fetch Material Issue Note details');
        }
      } catch (error) {
        toast.error('Failed to fetch Material Issue Note details');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchIssue();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="p-6 text-center text-slate-500">
        Material Issue Note not found.
      </div>
    );
  }

  const contractorName = issue.contractorId?.name || issue.contractorId?.dynamicData?.displayName || issue.contractorId?.dynamicData?.companyName || 'Unknown';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#0076f2] hidden sm:block" /> 
                {issue.minNo || issue.assignmentNumber}
              </h1>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${
                issue.status === 'Sent' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {issue.status === 'Sent' && <CheckCircle className="w-3 h-3"/>} {issue.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              Issued on <span className="font-medium text-slate-700">{new Date(issue.minDate || issue.date).toLocaleDateString()}</span>
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </button>
        </div>
      </div>

      {/* Basic Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Issue Details</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Contractor</p>
            <p className="text-sm font-semibold text-slate-800">{contractorName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Demand No.</p>
            <p className="text-sm font-semibold text-slate-800">{issue.demandNo || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Demand Date</p>
            <p className="text-sm font-semibold text-slate-800">{issue.demandDate ? new Date(issue.demandDate).toLocaleDateString() : '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Vehicle No.</p>
            <p className="text-sm font-semibold text-slate-800">{issue.vehicleNo || '-'}</p>
          </div>
          
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Division</p>
            <p className="text-sm font-semibold text-slate-800">{issue.division || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Sub-Division</p>
            <p className="text-sm font-semibold text-slate-800">{issue.subDivision || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Sub-Station</p>
            <p className="text-sm font-semibold text-slate-800">{issue.subStation || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Supervisor/Engineer</p>
            <p className="text-sm font-semibold text-slate-800">{issue.supervisorEngineer || '-'}</p>
          </div>
          
          <div className="lg:col-span-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Remarks</p>
            <p className="text-sm font-medium text-slate-700">{issue.remarks || '-'}</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-base font-semibold text-slate-800">Issued Materials</h2>
          <span className="text-sm font-medium text-[#0076f2] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
            {issue.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0} Total Qty
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">S.No</th>
                <th className="px-6 py-4 min-w-[250px]">Item Description</th>
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4">HSN Code</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4 text-right">Demand Qty</th>
                <th className="px-6 py-4 text-right">Issued Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!issue.lineItems || issue.lineItems.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    No items found in this issue note.
                  </td>
                </tr>
              ) : (
                issue.lineItems.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{item.itemName}</p>
                      {item.tempCode && <p className="text-xs font-mono text-slate-500 mt-1">{item.tempCode}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                        {item.activity || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {item.hsnCode || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.unit || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">
                      {item.demandQty || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#0076f2]">
                      {item.quantity}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
