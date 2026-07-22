import React from 'react';
import { Activity, ArrowRight, PackageCheck, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';

export function RecentActivity({ activities = [] }: { activities?: any[] }) {
  return (
    <Card className="flex flex-col h-[320px] border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-500" />
          Recent GRNs
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="flex-1 flex h-full items-center justify-center p-6 text-sm text-slate-500">
            No recent activity found.
          </div>
        ) : (
          <div className="flex flex-col">
            {activities.map((act, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className={`mt-1 p-2 rounded-full ${act.status === 'VERIFIED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {act.status === 'VERIFIED' ? <PackageCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{act.reference}</p>
                    <span className="text-xs text-slate-400 font-medium">{format(new Date(act.date), 'MMM d, p')}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {act.status === 'VERIFIED' ? 'Verified by' : 'Created by'} <span className="font-medium text-slate-700">{act.user}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
