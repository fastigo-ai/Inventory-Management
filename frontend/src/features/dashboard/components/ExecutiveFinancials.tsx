import React from 'react';
import { IndianRupee, TrendingUp, AlertCircle } from 'lucide-react';

interface ExecutiveFinancialsProps {
  summary: any;
}

export const ExecutiveFinancials: React.FC<ExecutiveFinancialsProps> = ({ summary }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Executive Financials
        </h3>
      </div>
      
      <div className="p-6 flex-1 flex flex-col gap-6">
        <div className="bg-blue-50/50 rounded-lg p-5 border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <IndianRupee className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-blue-900">Total Procurement Spend</p>
          </div>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(summary?.totalProcurementSpend)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Aggregate value of all active Purchase Orders</p>
        </div>

        <div className="bg-rose-50/50 rounded-lg p-5 border border-rose-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-rose-900">Total Contractor Liabilities</p>
          </div>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(summary?.totalContractorLiabilities)}
          </p>
          <p className="text-xs text-slate-500 mt-2">Value of unpaid approved/submitted bills</p>
        </div>
      </div>
    </div>
  );
};
