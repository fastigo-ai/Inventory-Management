"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Edit, MoreHorizontal, Mail, FileText, Plus, X, ChevronDown, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { getDIById, getDIs, deleteDI, updateDIStatus } from '@/features/di/api/di.api';
import { toast } from 'sonner';
import { AuditTimeline } from '@/shared/components/audit/AuditTimeline';
import { API_BASE_URL } from '@/shared/api/axios';
import { PdfPreview } from '@/shared/components/PdfPreview';

export default function DIDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [di, setDi] = useState<any>(null);
  const [dis, setDis] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  // UI States
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPdfView, setIsPdfView] = useState(true);

  useEffect(() => {
    fetchDIsList();
  }, []);

  useEffect(() => {
    if (id) {
      fetchDIDetails();
    }
  }, [id]);

  const fetchDIsList = async () => {
    try {
      const res = await getDIs();
      if (res.success || Array.isArray(res.data)) {
        setDis(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch DI list:', err);
    }
  };

  const fetchDIDetails = async () => {
    try {
      setIsLoading(true);
      const diData = await getDIById(id);
      if (diData) {
        setDi(diData);
      }
    } catch (err) {
      console.error('Failed to fetch DI:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !di) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 bg-white border-b border-slate-200 gap-4 shrink-0 shadow-sm animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
            <div>
              <div className="w-48 h-6 bg-slate-200 rounded mb-2"></div>
              <div className="w-32 h-4 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full space-y-6 animate-pulse">
          <div className="bg-white border border-slate-200 rounded-xl p-6 h-64"></div>
        </div>
      </div>
    );
  }

  if (!di) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-800">DI Registration Not Found</h2>
          <p className="text-slate-500">The DI Registration you're looking for doesn't exist.</p>
          <button onClick={() => router.push('/di')} className="text-blue-500 hover:underline font-medium">
            Go back to DI Registrations
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (di.isLocked) {
      toast.error('Cannot delete: This DI Registration has already been Received or Invoiced.');
      setIsMoreMenuOpen(false);
      return;
    }
    if (!confirm('Are you sure you want to delete this DI Registration?')) return;
    try {
      await deleteDI(id);
      toast.success('DI Registration deleted');
      router.push('/di');
    } catch (err) {
      toast.error('Failed to delete DI Registration');
    }
  };

  const handleUpdateStatus = async (status: string, successMessage: string) => {
    try {
      await updateDIStatus(id, status);
      toast.success(successMessage);
      fetchDIDetails();
      fetchDIsList();
      setIsMoreMenuOpen(false);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const poNumber = di.purchaseOrderId?.purchaseOrderNumber || di.purchaseOrderNumber || '--';

  return (
    <div className="flex h-screen bg-slate-50 print:bg-white print:h-auto print:block">
      {/* Left Sidebar List */}
      <div className="w-[340px] shrink-0 border-r border-slate-200 bg-white flex flex-col hidden md:flex h-screen sticky top-0 print:hidden">
        <div className="p-3 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-1 cursor-pointer">
            All DI Registrations <span className="text-[10px] text-slate-400 ml-1">▼</span>
          </h2>
          <div className="flex gap-2">
            <button onClick={() => router.push('/di/new')} className="bg-blue-500 text-white rounded p-1.5 hover:bg-blue-600 transition shadow-sm">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {dis.map(d => (
            <Link key={d._id} href={`/di/${d._id}`} className={`block border-b border-slate-100 p-4 hover:bg-slate-50/80 transition-colors ${d._id === id ? 'bg-blue-50/30 relative' : ''}`}>
               {d._id === id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
               <div className="flex items-start gap-3">
                 <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-blue-500 w-3.5 h-3.5 cursor-pointer" onClick={(e) => e.stopPropagation()} />
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start mb-1.5">
                     <p className="text-[13px] font-semibold text-slate-700 truncate pr-2" title={d.diNumber}>{d.diNumber}</p>
                     <p className="text-[13px] font-bold text-slate-800 whitespace-nowrap">{d.lineItems?.length || 0} Items</p>
                   </div>
                   <div className="flex justify-between items-center text-[11px] text-slate-500 mb-2">
                     <p>PO: {d.purchaseOrderId?.purchaseOrderNumber || '-'} &nbsp;•&nbsp; {new Date(d.date).toLocaleDateString('en-GB')}</p>
                   </div>
                   <div>
                     <span className={`text-[10px] font-bold uppercase ${d.status === 'Active' || d.status === 'Received' ? 'text-blue-500' : 'text-slate-400'}`}>
                       {d.status}
                     </span>
                   </div>
                 </div>
               </div>
            </Link>
          ))}
          {dis.length === 0 && (
             <div className="p-4 text-center text-sm text-slate-500">No DI registrations found.</div>
          )}
        </div>
      </div>

      {/* Right Detail Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100/50 h-screen overflow-hidden print:bg-white print:overflow-visible print:h-auto print:block">
        {/* Top Header / Actions */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-sm print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/di')} className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 md:hidden">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">DI REGISTRATION</p>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">{di.diNumber}</h1>
            </div>
            <div className="ml-8 flex space-x-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'details' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                History
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => !di.isLocked && router.push(`/di/edit/${di._id}`)} 
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white transition-colors rounded border ${di.isLocked ? 'text-slate-400 border-slate-200 cursor-not-allowed opacity-60' : 'text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-200'}`}
              title={di.isLocked ? 'Cannot edit this DI because it has already been Received or Invoiced.' : ''}
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-200">
              <FileText className="w-3.5 h-3.5" /> PDF/Print <span className="text-[9px] ml-1">▼</span>
            </button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            
            <div className="relative">
              <button onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} className={`flex items-center justify-center p-1.5 text-slate-500 rounded transition-colors border border-transparent ${isMoreMenuOpen ? 'bg-slate-100' : 'hover:bg-slate-100'}`}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {isMoreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 z-50 text-xs font-medium text-slate-700">
                    <button onClick={handleDelete} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors text-slate-700">
                      Delete
                    </button>
                    {di.status === 'Draft' ? (
                      <button onClick={() => handleUpdateStatus('Active', 'DI marked as Active')} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors text-slate-700">
                        Mark as Active
                      </button>
                    ) : (
                      <button onClick={() => handleUpdateStatus('Draft', 'DI marked as Draft')} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors text-slate-700">
                        Mark as Draft
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button onClick={() => router.push('/di')} className="flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto pb-20 scrollbar-thin scrollbar-thumb-slate-300 print:overflow-visible print:pb-0 print:block">
          
          {activeTab === 'history' ? (
            <div className="p-8 max-w-4xl mx-auto mt-6">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800 mb-8 border-b border-slate-100 pb-4">Audit History</h2>
                <AuditTimeline entityType="DI" entityId={id} />
              </div>
            </div>
          ) : (
            <>
              <div className="max-w-[850px] mx-auto mt-6 px-4 flex items-center justify-between print:hidden">
                  <div className="text-[11px] font-bold text-slate-400">
                    Status: <span className={`${di.status === 'Active' || di.status === 'Received' ? 'text-blue-500' : 'text-amber-500'} font-semibold uppercase`}>{di.status}</span> 
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer" onClick={() => setIsPdfView(!isPdfView)}>
                    Show PDF View
                    <div className={`w-8 h-4 rounded-full relative shadow-inner transition-colors ${isPdfView ? 'bg-blue-500' : 'bg-slate-300'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow transition-all ${isPdfView ? 'right-0.5' : 'left-0.5'}`}></div>
                    </div>
                  </div>
              </div>

              {/* Conditional View Rendering */}
              {isPdfView ? (
                <>
                <div className="max-w-[800px] mx-auto bg-white shadow-[0_0_15px_rgba(0,0,0,0.05)] rounded-sm min-h-[1056px] mt-4 mb-12 relative overflow-hidden border border-slate-200 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-full print:overflow-visible print:min-h-0">
                
                {/* Draft/Active Ribbon */}
                <div className="absolute top-0 left-0 w-24 h-24 overflow-hidden z-10 pointer-events-none">
                  <div className={`absolute top-5 -left-9 w-36 text-white text-[10px] font-bold text-center py-1 -rotate-45 shadow-md uppercase tracking-wider ${di.status === 'Active' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                    {di.status === 'Active' ? 'ACTIVE' : 'DRAFT'}
                  </div>
                </div>

                <div className="px-6 py-12 md:px-8">
                  {/* Header Section */}
                  <div className="flex justify-between items-start mb-6 border-b-2 border-teal-600 pb-4">
                    <div>
                      <h1 className="text-3xl font-black text-indigo-900 tracking-wider mb-2 uppercase break-words pr-4">{di.purchaseOrderId?.billingCompany?.name || "FASTIGO TECHNOLOGY PVT LTD"}</h1>
                      <div className="bg-teal-600 text-white font-bold py-1.5 px-4 rounded-sm inline-block mb-3 text-sm">
                        DI REGISTRATION
                      </div>
                      <p className="text-slate-800 mb-0.5 whitespace-pre-wrap">{di.purchaseOrderId?.billingCompany?.address || 'Address Details'}</p>
                      {di.purchaseOrderId?.billingCompany?.gstin && <p className="text-slate-800 font-semibold mb-0.5">GSTIN: {di.purchaseOrderId.billingCompany.gstin}</p>}
                    </div>
                    <div className="text-right flex flex-col items-end pt-2">
                      {di.purchaseOrderId?.billingCompany?.logoUrl ? (
                        <img src={di.purchaseOrderId.billingCompany.logoUrl.startsWith('http') ? di.purchaseOrderId.billingCompany.logoUrl : `${API_BASE_URL}${di.purchaseOrderId.billingCompany.logoUrl}`} alt="Logo" className="w-32 object-contain mb-3" />
                      ) : (
                        <div className="w-24 h-24 bg-slate-100 rounded-sm mb-3 flex items-center justify-center border border-slate-200">
                          <span className="text-indigo-900 font-bold text-xl">LOGO</span>
                        </div>
                      )}
                      {di.purchaseOrderId?.billingCompany?.phone && <p className="text-slate-800 font-semibold mb-0.5">Tel : {di.purchaseOrderId.billingCompany.phone}</p>}
                      {di.purchaseOrderId?.billingCompany?.email && <p className="text-slate-800">Email : {di.purchaseOrderId.billingCompany.email}</p>}
                    </div>
                  </div>

                  {/* Title & Meta */}
                  <div className="flex items-center justify-center border border-black p-1 bg-slate-50 mb-4 font-bold">
                    <div className="text-xl tracking-widest">DI REGISTRATION</div>
                  </div>

                  {/* Dual Column Info */}
                  <div className="flex border border-black mb-6">
                    {/* Left Column: Vendor / Reference Detail */}
                    <div className="w-[45%] border-r border-black">
                      <div className="font-bold text-center border-b border-black py-1 bg-slate-100">Reference Detail</div>
                      <div className="p-3">
                        <table className="w-full text-xs">
                          <tbody>
                            <tr>
                              <td className="w-24 font-bold align-top py-1">Vendor</td>
                              <td className="align-top py-1 font-semibold">{di.purchaseOrderId?.vendorName || '-'}</td>
                            </tr>
                            <tr>
                              <td className="font-bold align-top py-1">Reference PO</td>
                              <td className="align-top py-1 font-bold text-blue-600">{poNumber}</td>
                            </tr>
                            {di.package && (
                              <tr>
                                <td className="font-bold align-top py-1">Package</td>
                                <td className="align-top py-1">{di.package}</td>
                              </tr>
                            )}
                            {di.circle && (
                              <tr>
                                <td className="font-bold align-top py-1">Circle</td>
                                <td className="align-top py-1">{di.circle}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {/* Right Column: DI Detail */}
                    <div className="w-[55%] p-3">
                      <table className="w-full h-full text-xs sm:text-[13px]">
                        <tbody>
                          <tr>
                            <td className="font-bold py-1 w-32">DI No.</td>
                            <td className="py-1">: <span className="font-semibold">{di.diNumber}</span></td>
                          </tr>
                          <tr>
                            <td className="font-bold py-1">DI Date</td>
                            <td className="py-1">: {new Date(di.date).toLocaleDateString('en-GB')}</td>
                          </tr>
                          <tr>
                            <td className="font-bold py-1">Status</td>
                            <td className="py-1">: <span className="uppercase font-semibold">{di.status}</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table className="w-full text-[11px] mb-6 border border-slate-200">
                    <thead className="bg-[#fcfdff] border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-center font-bold text-[#5e7790] uppercase w-10 border-r border-slate-200">SR.NO</th>
                        <th className="px-3 py-2 text-left font-bold text-[#5e7790] uppercase border-r border-slate-200">TEMP CODE</th>
                        <th className="px-3 py-2 text-left font-bold text-[#5e7790] uppercase border-r border-slate-200">ITEM NAME</th>
                        <th className="px-3 py-2 text-left font-bold text-[#5e7790] uppercase border-r border-slate-200">PACKAGE</th>
                        <th className="px-3 py-2 text-left font-bold text-[#5e7790] uppercase border-r border-slate-200">CIRCLE</th>
                        <th className="px-3 py-2 text-right font-bold text-[#5e7790] uppercase w-20">QTY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {di.lineItems?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                          <td className="px-3 py-3 text-center text-slate-600 align-top border-r border-slate-200">{idx + 1}</td>
                          <td className="px-3 py-3 text-slate-600 align-top border-r border-slate-200">{item.tempCode || '--'}</td>
                          <td className="px-3 py-3 font-medium text-slate-800 align-top border-r border-slate-200">{item.itemName}</td>
                          <td className="px-3 py-3 text-slate-600 align-top border-r border-slate-200">{item.package || '--'}</td>
                          <td className="px-3 py-3 text-slate-600 align-top border-r border-slate-200">{item.circle || '--'}</td>
                          <td className="px-3 py-3 text-right text-slate-800 align-top">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Notes */}
                  {di.notes && (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                      <h3 className="text-[10px] font-bold text-slate-800 mb-2 uppercase tracking-wider">Notes</h3>
                      <p className="text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed">{di.notes}</p>
                    </div>
                  )}

                </div>
                </div>
                </>
              ) : (
                /* Normal Dashboard View */
                <div className="max-w-5xl mx-auto space-y-6 mt-4 mb-12 px-4 print:hidden">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-8 justify-between">
                    <div className="space-y-4 flex-1">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">PO Reference</p>
                        <p className="text-sm font-semibold text-blue-600">{poNumber}</p>
                        {di.package && <p className="text-xs text-slate-600 mt-1">Package: {di.package}</p>}
                        {di.circle && <p className="text-xs text-slate-600">Circle: {di.circle}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-12 gap-y-6 flex-1">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                        <p className="text-sm font-medium text-slate-800">{new Date(di.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${di.status === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {di.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                      <h3 className="font-semibold text-slate-800 text-sm">Line Items ({di.lineItems?.length || 0})</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 text-xs uppercase">
                          <tr>
                            <th className="px-6 py-3 whitespace-nowrap">Item Details</th>
                            <th className="px-6 py-3 whitespace-nowrap">Package</th>
                            <th className="px-6 py-3 whitespace-nowrap">Circle</th>
                            <th className="px-6 py-3 text-right whitespace-nowrap">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {di.lineItems?.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-medium text-slate-800">{item.itemName}</p>
                                {item.tempCode && <p className="text-xs text-slate-500 mt-0.5">Code: {item.tempCode}</p>}
                              </td>
                              <td className="px-6 py-4 text-slate-600">{item.package || '--'}</td>
                              <td className="px-6 py-4 text-slate-600">{item.circle || '--'}</td>
                              <td className="px-6 py-4 text-right font-medium text-slate-800">{item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {di.notes && (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                        <h3 className="font-semibold text-slate-800 text-sm">Notes</h3>
                      </div>
                      <div className="p-6">
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{di.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments Section */}
              {di.attachments && di.attachments.length > 0 && (
                <div className="max-w-[800px] mx-auto bg-white shadow-[0_0_15px_rgba(0,0,0,0.05)] rounded-sm mt-4 mb-12 px-6 py-12 md:px-8 border border-slate-200 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-full print:break-before-page">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-wider border-b border-slate-200 pb-2">Attachments</h3>
                  <div className="flex flex-col gap-8">
                    {di.attachments.map((attachment: any, idx: number) => {
                      const fileUrl = attachment.url.startsWith('http') ? attachment.url : `${API_BASE_URL}${attachment.url}`;
                      const isImage = (attachment.url && attachment.url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) != null) || (attachment.name && attachment.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null);
                      const isPdf = (attachment.url && attachment.url.match(/\.pdf(\?.*)?$/i) != null) || (attachment.name && attachment.name.match(/\.pdf$/i) != null);
                      return (
                        <div key={idx} className="flex flex-col gap-4 print:break-inside-avoid print:break-before-page">
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-2">
                            <Paperclip className="w-4 h-4" /> {attachment.name}
                          </a>
                          {isImage ? (
                            <img src={fileUrl} alt={attachment.name} className="max-w-full max-h-[1000px] object-contain border border-slate-200 rounded p-1 print:max-h-none print:border-none" />
                          ) : isPdf ? (
                            <PdfPreview fileUrl={fileUrl} />
                          ) : (
                            <div className="w-full h-24 bg-slate-50 border border-slate-200 rounded flex flex-col items-center justify-center p-4 text-center text-slate-400">
                              <span className="text-xs">Document Preview not available. Please click the link above to view/download.</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
