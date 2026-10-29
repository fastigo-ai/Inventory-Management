"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, FileText, CheckCircle, Printer, Edit, AlertTriangle } from 'lucide-react';
import { getAssignmentById } from '@/features/contractors/api/contractors.api';
import { toast } from 'sonner';
import { useAuthStore } from '@/shared/store/auth.store';
import Link from 'next/link';

export default function ContractorIssueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { id } = params;
  const { user } = useAuthStore();
  const isStoreManager = user?.role?.name === 'Store Manager';
  
  const [issue, setIssue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        setIsLoading(true);
        const res = await getAssignmentById(id as string);
        if (res.success && res.data) {
          setIssue(res.data);
          if (searchParams.get('print') === 'true') {
            setTimeout(() => window.print(), 500);
          }
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
  }, [id, searchParams]);

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
  const minNumber = issue.minNo || issue.assignmentNumber || '-';
  const minDateFormatted = issue.minDate || issue.date ? new Date(issue.minDate || issue.date).toLocaleDateString() : '-';

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#0076f2] hidden sm:block" /> 
                {minNumber}
              </h1>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${
                issue.status === 'Sent' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {issue.status === 'Sent' && <CheckCircle className="w-3 h-3"/>} {issue.status}
              </span>
              {issue.extraRegularizationStatus === 'Pending Regularization' && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Extra Issued (Pending Site Regularization)
                </span>
              )}
              {issue.extraRegularizationStatus === 'Regularized' && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Extra Regularized
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              Issued on <span className="font-medium text-slate-700">{minDateFormatted}</span>
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          {!isStoreManager && issue.status !== 'Cancelled' && (
            <Link href={`/store/contractor-issue/${issue._id}/edit`}>
              <button className="flex items-center px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                <Edit className="w-4 h-4 mr-2" /> Edit MIN
              </button>
            </Link>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 mr-2" /> Download / Print PDF
          </button>
        </div>
      </div>

      <div className="space-y-6 p-1 bg-slate-50 print:bg-white print:p-0">
        {/* Print-Only Header */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="text-3xl font-bold font-serif tracking-tighter">A</div>
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold tracking-wide uppercase text-slate-900">AIREF-HOLISTIC JV</h1>
              <p className="text-xs text-slate-600 mt-0.5">Registered Office: D-94, Sector 26, Noida 201301</p>
              <h2 className="text-lg font-bold mt-1 uppercase text-slate-800">Material Issue Note (MIN)</h2>
            </div>
            <div className="text-3xl font-serif italic font-bold">H</div>
          </div>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-300 text-sm">
            <div>
              <span className="font-bold text-slate-800">MIN No.: </span>
              <span className="font-mono font-bold text-base text-slate-900">{minNumber}</span>
              {issue.minBookNo && <span className="ml-2 text-xs text-slate-600">(Book No: {issue.minBookNo})</span>}
            </div>
            <div>
              <span className="font-bold text-slate-800">MIN Date: </span>
              <span className="font-semibold text-slate-900">{minDateFormatted}</span>
            </div>
          </div>
          <div className="flex items-center mt-2.5 text-sm">
            <span className="font-bold text-slate-800 whitespace-nowrap mr-2">Receiving Address: </span>
            <span className="flex-1 border-b border-black h-4"></span>
          </div>
        </div>

        {issue.extraRegularizationStatus === 'Pending Regularization' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900">Over-Issued Materials Pending Site Regularization</p>
                <p className="text-xs text-amber-700 mt-0.5">This MIN contains extra items or quantities issued beyond the original demand note. A notification is active in the Site Portal for the site team to review and demand these materials.</p>
              </div>
            </div>
          </div>
        )}
        {issue.extraRegularizationStatus === 'Regularized' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 print:hidden">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Extra Quantities Regularized</p>
              <p className="text-xs text-emerald-700 mt-0.5">The extra materials issued under this MIN were demanded and successfully merged with regularizing Demand Note(s).</p>
            </div>
          </div>
        )}

        {/* Basic Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 print:bg-slate-100 print:py-2">
            <h2 className="text-base font-semibold text-slate-800 print:text-sm">Issue Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-3 print:p-3 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">MIN No.</p>
              <p className="text-sm font-bold text-[#0076f2] print:text-black">{minNumber}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">MIN Date</p>
              <p className="text-sm font-semibold text-slate-800">{minDateFormatted}</p>
            </div>
            {issue.minBookNo && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">MIN Book No.</p>
                <p className="text-sm font-semibold text-slate-800">{issue.minBookNo}</p>
              </div>
            )}
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
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Division / Circle</p>
              <p className="text-sm font-semibold text-slate-800">{issue.division || issue.circle || '-'}</p>
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
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Receiving Address</p>
              <p className="text-sm font-semibold text-slate-800 border-b border-dashed border-slate-300 print:border-black min-h-[22px]"></p>
            </div>
            
            <div className="lg:col-span-4 print:col-span-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Remarks</p>
              <p className="text-sm font-medium text-slate-700">{issue.remarks || '-'}</p>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:overflow-visible">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center print:py-2">
            <h2 className="text-base font-semibold text-slate-800 print:text-sm">Issued Materials</h2>
            <span className="text-sm font-medium text-[#0076f2] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full print:text-black print:border-none">
              {issue.lineItems?.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0) || 0} Total Qty
            </span>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm text-left whitespace-nowrap print:whitespace-normal print:text-xs">
              <thead className="bg-white border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider print:text-[10px]">
                <tr>
                  <th className="px-6 py-4 print:px-2 print:py-2">S.No</th>
                  <th className="px-6 py-4 min-w-[250px] print:min-w-0 print:px-2 print:py-2">Item Description</th>
                  <th className="px-6 py-4 print:px-2 print:py-2">LOA Sr No</th>
                  <th className="px-6 py-4 print:px-2 print:py-2">HSN Code</th>
                  <th className="px-6 py-4 print:px-2 print:py-2">Unit</th>
                  <th className="px-6 py-4 text-right print:px-2 print:py-2">Demand Qty</th>
                  <th className="px-6 py-4 text-right print:px-2 print:py-2">Issued Qty</th>
                  <th className="px-6 py-4 text-right print:px-2 print:py-2">Extra Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                {(!issue.lineItems || issue.lineItems.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                      No items found in this issue note.
                    </td>
                  </tr>
                ) : (
                  Object.entries(
                    issue.lineItems.reduce((acc: Record<string, any[]>, item: any, index: number) => {
                      const act = item.activity || 'N/A';
                      if (!acc[act]) acc[act] = [];
                      acc[act].push({ ...item, originalIndex: index });
                      return acc;
                    }, {})
                  ).map(([activity, items]) => (
                    <React.Fragment key={activity}>
                      {/* Activity Group Header */}
                      <tr className="bg-slate-50 print:bg-slate-100">
                        <td colSpan={8} className="px-6 py-2 text-xs font-semibold text-slate-800 border-y border-slate-200">
                          {activity}
                        </td>
                      </tr>
                      {(items as any[]).map((item: any, localIdx: number) => (
                        <tr key={item.originalIndex} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 print:px-2 print:py-2 font-medium text-slate-600">
                            {localIdx + 1}
                          </td>
                          <td className="px-6 py-4 print:px-2 print:py-2">
                            <p className="font-semibold text-slate-800">{item.itemName}</p>
                            {item.tempCode && <p className="text-xs font-mono text-slate-500 mt-1">{item.tempCode}</p>}
                          </td>
                          <td className="px-6 py-4 print:px-2 print:py-2 font-mono text-xs text-slate-600">
                            {item.loaSrNo || '-'}
                          </td>
                          <td className="px-6 py-4 print:px-2 print:py-2 text-slate-600 font-mono text-xs">
                            {item.hsnCode || '-'}
                          </td>
                          <td className="px-6 py-4 print:px-2 print:py-2 text-slate-600">
                            {item.unit || '-'}
                          </td>
                          <td className="px-6 py-4 print:px-2 print:py-2 text-right font-medium text-slate-600">
                            {item.demandQty !== undefined ? item.demandQty : '-'}
                          </td>
                          <td className="px-6 py-4 print:px-2 print:py-2 text-right font-bold text-[#0076f2] print:text-black">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 print:px-2 print:py-2 text-right">
                            {item.isExtra || item.extraQty > 0 || Number(item.quantity) > Number(item.demandQty || 0) ? (
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                  +{item.extraQty || Math.max(0, Number(item.quantity) - Number(item.demandQty || 0))}
                                </span>
                                {item.demandRegularizedQty > 0 && (
                                  <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                    ✓ Regularized ({item.demandRegularizedQty})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Print-Only Signatures Section */}
        <div className="hidden print:block mt-12 pt-8">
          <div className="grid grid-cols-3 gap-8 text-center text-xs">
            <div>
              <div className="border-b border-black mb-2 h-14"></div>
              <p className="font-semibold text-slate-900">Contractor / Receiver</p>
              <p className="text-slate-500 text-[11px] mt-0.5">{contractorName}</p>
            </div>
            <div>
              <div className="border-b border-black mb-2 h-14"></div>
              <p className="font-semibold text-slate-900">Site Supervisor / Engineer</p>
              <p className="text-slate-500 text-[11px] mt-0.5">{issue.supervisorEngineer || '-'}</p>
            </div>
            <div>
              <div className="border-b border-black mb-2 h-14"></div>
              <p className="font-semibold text-slate-900">Store In-Charge / Authorized</p>
              <p className="text-slate-500 text-[11px] mt-0.5">AIREF-HOLISTIC JV</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
