"use client";

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Loader2, ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { regularizeExtraDemand } from '@/features/contractors/api/contractors.api';
import { toast } from 'sonner';

interface RegularizeExtraDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  onSuccess: () => void;
}

export default function RegularizeExtraDemandModal({
  isOpen,
  onClose,
  assignment,
  onSuccess
}: RegularizeExtraDemandModalProps) {
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !assignment) return null;

  const minNo = assignment.minNo || assignment.assignmentNumber || 'MIN';
  const contractorName = assignment.contractorId?.name || assignment.contractorId?.dynamicData?.displayName || assignment.contractorFarmName || 'Contractor';
  
  // Filter line items with extra quantities or un-demanded items
  const extraItems = (assignment.lineItems || []).filter((item: any) => 
    item.isExtra || (Number(item.quantity) > Number(item.demandQty || 0))
  );

  const totalExtraUnits = extraItems.reduce((acc: number, item: any) => {
    const extra = item.extraQty !== undefined 
      ? Number(item.extraQty) 
      : Math.max(0, Number(item.quantity) - Number(item.demandQty || 0));
    return acc + extra;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await regularizeExtraDemand(assignment._id, {
        remarks: remarks || `Site demand regularizing extra issued items under MIN ${minNo}`
      });

      if (res.success) {
        toast.success(res.message || `Extra demand regularized and merged with ${minNo}`);
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to regularize extra demand');
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Error occurred while regularizing demand');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Regularize Extra Issued Materials
              </h2>
              <p className="text-xs text-slate-500">
                MIN: <span className="font-semibold text-slate-700">{minNo}</span> &bull; Contractor: <span className="font-semibold text-slate-700">{contractorName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Informational callout */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 text-amber-900 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-800">
                Store Over-Issue Discrepancy
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                The Store issued extra materials on this MIN that were either not in the original Demand Note or exceeded the approved quantity.
                Clicking regularize will automatically create an approved Demand Note and merge the demand into this MIN, bringing the issuance records into balance.
              </p>
            </div>
          </div>

          {/* MIN Summary Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Issue Date</span>
              <span className="text-slate-700 font-semibold mt-0.5 block">
                {new Date(assignment.minDate || assignment.date).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Original Demand No</span>
              <span className="text-slate-700 font-semibold mt-0.5 block">
                {assignment.demandNo || 'None (Direct Issue)'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Circle / Division</span>
              <span className="text-slate-700 font-semibold mt-0.5 block">
                {assignment.circle || '-'} {assignment.division ? `(${assignment.division})` : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Extra Items / Qty</span>
              <span className="text-amber-600 font-bold mt-0.5 block">
                {extraItems.length} items ({totalExtraUnits} units)
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Materials to Demand & Merge
              </span>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                {extraItems.length} over-issued lines
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white border-b border-slate-200 text-slate-500 font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5">S.No</th>
                    <th className="px-3 py-2.5">Item Description</th>
                    <th className="px-3 py-2.5">LOA Sr No</th>
                    <th className="px-3 py-2.5">Unit</th>
                    <th className="px-3 py-2.5 text-right">Demanded</th>
                    <th className="px-3 py-2.5 text-right">Issued</th>
                    <th className="px-3 py-2.5 text-right text-amber-700 font-bold">Extra Qty to Demand</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {extraItems.map((item: any, idx: number) => {
                    const extra = item.extraQty !== undefined 
                      ? Number(item.extraQty) 
                      : Math.max(0, Number(item.quantity) - Number(item.demandQty || 0));
                    const isNewItem = Number(item.demandQty || 0) === 0;

                    return (
                      <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-3 py-2.5 text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          {item.itemName}
                          {item.tempCode && (
                            <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                              ({item.tempCode})
                            </span>
                          )}
                          {isNewItem && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                              NEW ITEM
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">
                          {item.loaSrNo || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">{item.unit || 'Nos'}</td>
                        <td className="px-3 py-2.5 text-right text-slate-500">
                          {item.demandQty || 0}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-700">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-amber-600 bg-amber-50/50">
                          +{extra}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Regularization Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={`e.g. Regularizing extra items issued under MIN ${minNo} for site execution`}
              className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            A regularizing Demand Note will be linked to MIN <span className="font-semibold text-slate-700">{minNo}</span>
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-9 font-semibold gap-1.5 shadow-sm shadow-amber-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating Demand...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Demand Extra Qty & Merge
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
