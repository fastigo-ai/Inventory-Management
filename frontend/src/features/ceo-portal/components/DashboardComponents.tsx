import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin, Activity, ArrowUp, ArrowDown, TrendingUp, Clock, AlertTriangle, Truck, AlertCircle, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts';

export const KpiCard = ({ title, value, change, changeType, icon: Icon }: any) => (
  <Card className="rounded-xl shadow-sm border border-gray-100 flex items-center p-4">
    <div className={`p-3 rounded-full mr-4 ${changeType === 'positive' ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-medium text-gray-500">{title}</span>
      <span className="text-2xl font-bold text-gray-900 mt-1">{value}</span>
      <div className={`flex items-center mt-1 text-xs font-medium ${changeType === 'positive' ? 'text-teal-600' : 'text-red-600'}`}>
        {changeType === 'positive' ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
        {change}
      </div>
    </div>
  </Card>
);

export const ProjectStructure = () => (
  <Card className="rounded-xl shadow-sm border border-gray-100 h-full">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-bold text-gray-700">Project Structure</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-4 text-xs font-medium text-gray-600">
      <div className="flex flex-col items-center">
        <div className="bg-teal-600 text-white px-6 py-1.5 rounded-full mb-2">Package 1 (S/N)</div>
        <div className="flex flex-col items-center border-l-2 border-gray-200">
          <div className="flex items-center mt-2 mb-2">
            <div className="w-4 border-t-2 border-gray-200"></div>
            <div className="bg-teal-50 text-teal-700 px-3 py-1 rounded border border-teal-100 ml-2 flex items-center"><MapPin className="w-3 h-3 mr-1" /> Solan</div>
          </div>
          <div className="flex space-x-6 border-t-2 border-gray-200 pt-2">
            <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-teal-500 mr-1" /> Nalagarh</div>
            <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-teal-500 mr-1" /> Kumarhatti</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center mt-2">
        <div className="bg-indigo-500 text-white px-6 py-1.5 rounded-full mb-2">Package 2 (R/R)</div>
        <div className="flex space-x-6">
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-indigo-500 mr-1" /> Rampur</div>
          <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-indigo-500 mr-1" /> Rohru</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const PhysicalStockChart = ({ data }: { data: any[] }) => {
  return (
    <Card className="rounded-xl shadow-sm border border-gray-100">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-bold text-gray-800">Physical Stock Progress (Qty)</CardTitle>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center"><div className="w-3 h-3 bg-blue-200 rounded-sm mr-1"></div> Total</div>
            <div className="flex items-center"><div className="w-3 h-3 bg-blue-500 rounded-sm mr-1"></div> Completed</div>
            <div className="flex items-center"><div className="w-3 h-3 bg-emerald-500 rounded-sm mr-1"></div> Balance</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => `${val/1000}k`} />
            <Tooltip cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="total" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="balance" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const FinancialProgressChart = ({ data }: { data: any[] }) => {
  return (
    <Card className="rounded-xl shadow-sm border border-gray-100">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-bold text-gray-800">Financial Progress (₹ Cr)</CardTitle>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center"><div className="w-3 h-3 bg-blue-600 rounded-sm mr-1"></div> Billed</div>
            <div className="flex items-center"><div className="w-3 h-3 bg-gray-200 rounded-sm mr-1"></div> Pending</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 20 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <Tooltip cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="billed" stackId="a" fill="#2563eb" radius={[0, 0, 4, 4]}>
              <LabelList dataKey="billed" position="top" fill="#4b5563" fontSize={11} formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
            <Bar dataKey="pending" stackId="a" fill="#e5e7eb" radius={[4, 4, 0, 0]}>
               <LabelList dataKey="pending" position="top" fill="#4b5563" fontSize={11} formatter={(val: number) => val > 0 ? val : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const PackageSummary = ({ packages }: { packages: any[] }) => (
  <Card className="rounded-xl shadow-sm border border-gray-100 h-full">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-bold text-gray-800">Package-wise Physical & Financial</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-6 mt-2">
      {packages.map((pkg, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className={`text-sm font-bold ${i === 0 ? 'text-teal-600' : 'text-indigo-600'}`}>{pkg.name}</div>
          <div className="flex items-center gap-6">
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                <span>Physical</span>
                <span>{pkg.physical}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${i === 0 ? 'bg-teal-500' : 'bg-indigo-400'}`} style={{ width: `${pkg.physical}%` }}></div>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mt-1">
                <span>Financial</span>
                <span>{pkg.financial}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${i === 0 ? 'bg-teal-600' : 'bg-indigo-500'}`} style={{ width: `${pkg.financial}%` }}></div>
              </div>
            </div>
            <div className="flex flex-col pl-4 border-l border-gray-100 w-24">
              <span className="text-base font-bold text-gray-800">₹{pkg.billedValue} Cr</span>
              <span className="text-[10px] text-gray-500">Billed Value</span>
            </div>
            <div className="flex flex-col pl-4 border-l border-gray-100 w-24">
              <span className="text-base font-bold text-gray-800">₹{pkg.pendingValue} Cr</span>
              <span className="text-[10px] text-gray-500">Pending</span>
            </div>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

export const CirclePerformance = ({ circles }: { circles: any[] }) => (
  <Card className="rounded-xl shadow-sm border border-gray-100 h-full">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-bold text-gray-800">Circle-wise Performance (Physical)</CardTitle>
    </CardHeader>
    <CardContent>
      <table className="w-full text-xs text-left">
        <thead className="text-gray-500 font-medium border-b border-gray-100">
          <tr>
            <th className="py-2 font-medium">Circle</th>
            <th className="py-2 font-medium">Total Qty</th>
            <th className="py-2 font-medium">Issued Qty</th>
            <th className="py-2 font-medium text-right pr-2">Progress</th>
          </tr>
        </thead>
        <tbody className="text-gray-700 font-medium">
          {circles.map((c, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0">
              <td className="py-2 flex items-center">
                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${['Solan', 'Nalagarh', 'Kumarhatti'].includes(c.circle) ? 'bg-teal-500' : 'bg-indigo-500'}`} />
                {c.circle}
              </td>
              <td className="py-2">{c.totalQty.toLocaleString()}</td>
              <td className="py-2">{c.issuedQty.toLocaleString()}</td>
              <td className="py-2 flex items-center justify-end">
                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden mr-2">
                  <div className={`h-full rounded-full ${['Solan', 'Nalagarh', 'Kumarhatti'].includes(c.circle) ? 'bg-teal-500' : 'bg-indigo-500'}`} style={{ width: `${c.progress}%` }}></div>
                </div>
                {c.progress}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent>
  </Card>
);

const iconMap: Record<string, any> = {
  'trending-up': TrendingUp,
  'clock': Clock,
  'alert': AlertTriangle,
  'truck': Truck,
  'alert-circle': AlertCircle
};

export const KeyInsights = ({ alerts }: { alerts: any[] }) => (
  <Card className="rounded-xl shadow-sm border border-gray-100 h-full">
    <CardHeader className="pb-2 flex flex-row justify-between items-center">
      <CardTitle className="text-base font-bold text-gray-800">Key Insights & Alerts</CardTitle>
      <span className="text-xs font-medium text-blue-600 cursor-pointer">View All &rarr;</span>
    </CardHeader>
    <CardContent className="flex flex-col gap-4 mt-2">
      {alerts.map((alert, i) => {
        const Icon = iconMap[alert.icon] || AlertCircle;
        let iconColor = 'text-blue-500 bg-blue-50';
        if (alert.severity === 'high') iconColor = 'text-red-500 bg-red-50';
        if (alert.severity === 'medium') iconColor = 'text-orange-500 bg-orange-50';
        if (alert.icon === 'trending-up') iconColor = 'text-teal-500 bg-teal-50';

        return (
          <div key={i} className="flex gap-3 items-start">
            <div className={`p-1.5 rounded-full ${iconColor} mt-0.5`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-800">{alert.title}</span>
              <span className="text-[11px] font-medium text-gray-500">{alert.subtitle}</span>
            </div>
          </div>
        )
      })}
    </CardContent>
  </Card>
);

const stages = [
  { id: 'po', label: 'PO' },
  { id: 'di', label: 'DI Reg.' },
  { id: 'pi', label: 'Purchase Invoice' },
  { id: 'inward', label: 'Inward' },
  { id: 'mhrov', label: 'MHROV' },
  { id: 'wo', label: 'WO' },
  { id: 'dn', label: 'DN' },
  { id: 'min', label: 'MIN' },
  { id: 'jmc', label: 'JMC/WIP' },
  { id: 'billing', label: 'Billing' },
  { id: 'handover', label: 'Handover' },
];

export const WorkflowTimeline = ({ data }: { data: any }) => {
  const overallProgress = 68; // Based on design
  
  return (
    <Card className="rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
        <h3 className="text-sm font-bold text-gray-800">Project Flow <span className="text-gray-500 font-medium">(Overall Status)</span></h3>
      </div>
      <div className="p-6 flex items-center gap-8">
        {/* Overall Progress Circle */}
        <div className="flex items-center flex-shrink-0 border-r border-gray-100 pr-8">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="#f3f4f6" strokeWidth="6" fill="none" />
              <circle cx="32" cy="32" r="28" stroke="#10b981" strokeWidth="6" fill="none" strokeDasharray="175" strokeDashoffset={175 - (175 * overallProgress) / 100} className="transition-all duration-1000" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-teal-600">{overallProgress}%</span>
            </div>
          </div>
          <span className="text-[10px] font-medium text-gray-500 w-12 ml-2 leading-tight">Overall Progress</span>
        </div>
        
        {/* Stages Stepper */}
        <div className="flex-1 flex justify-between items-start relative">
          {/* Connecting line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100 -z-10"></div>
          
          {stages.map((stage, i) => {
            const stats = data[stage.id] || { completed: 0, total: 0 };
            const isCompleted = stats.completed === stats.total && stats.total > 0;
            const isCritical = i >= stages.length - 2; // Simulating red/orange zones from design
            const isWarning = i >= stages.length - 5 && i < stages.length - 2;
            
            let colorClass = 'text-teal-500 bg-teal-50 border-teal-200';
            let iconColor = 'text-teal-500';
            
            if (isCritical) {
              colorClass = 'text-red-500 bg-red-50 border-red-200';
              iconColor = 'text-red-500';
            } else if (isWarning) {
              colorClass = 'text-amber-500 bg-amber-50 border-amber-200';
              iconColor = 'text-amber-500';
            } else if (!isCompleted) {
              colorClass = 'text-teal-500 bg-teal-50 border-teal-200'; // Using teal as primary progress color
              iconColor = 'text-teal-500';
            }

            return (
              <div key={i} className="flex flex-col items-center group">
                <div className={`w-8 h-8 rounded-lg border bg-white flex items-center justify-center z-10 ${colorClass}`}>
                  <FileText className={`w-4 h-4 ${iconColor}`} />
                </div>
                <div className="text-[11px] font-bold text-gray-700 mt-2 text-center leading-tight h-6 flex items-center">{stage.label}</div>
                <div className={`text-[10px] font-bold mt-1 ${iconColor}`}>
                  {stats.completed}/{stats.total}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
