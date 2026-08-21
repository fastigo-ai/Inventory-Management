import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { PackageOpen, Send, MapPin, TrendingDown } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface Props {
  data: any[];
}

export function OutwardTransferStatistics({ data }: Props) {
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalDispatched: 0,
        totalTransfers: 0,
        topDestinations: [],
        topItems: []
      };
    }

    const uniqueTransfers = new Set(data.map(d => d.id));
    const totalTransfers = uniqueTransfers.size;
    const totalDispatched = data.reduce((acc, curr) => acc + (Number(curr.transferQty) || 0), 0);

    // Group by To Store (Destination)
    const destinationMap = new Map();
    data.forEach(d => {
      const v = d.toStore || 'Unknown';
      destinationMap.set(v, (destinationMap.get(v) || 0) + (Number(d.transferQty) || 0));
    });
    const topDestinations = Array.from(destinationMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Group by Item Description
    const itemMap = new Map();
    data.forEach(d => {
      const i = d.description || 'Unknown Item';
      itemMap.set(i, (itemMap.get(i) || 0) + (Number(d.transferQty) || 0));
    });
    const topItems = Array.from(itemMap.entries())
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      totalDispatched,
      totalTransfers,
      topDestinations,
      topItems
    };
  }, [data]);

  return (
    <div className="space-y-6 mb-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <PackageOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Items Dispatched</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.totalDispatched.toLocaleString()}</h3>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Outward Transfers (Docs)</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.totalTransfers.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Top Destination</p>
            <h3 className="text-lg font-bold text-slate-900 truncate max-w-[150px]" title={stats.topDestinations[0]?.name || 'N/A'}>
              {stats.topDestinations[0]?.name || 'N/A'}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Highest Volume Item</p>
            <h3 className="text-lg font-bold text-slate-900 truncate max-w-[150px]" title={stats.topItems[0]?.name || 'N/A'}>
              {stats.topItems[0]?.name || 'N/A'}
            </h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-6">Quantity Dispatched by Destination</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.topDestinations}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent = 0 }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.topDestinations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [Number(value).toLocaleString(), 'Qty']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-6">Top Dispatched Materials</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topItems} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: any) => [Number(value).toLocaleString(), 'Qty']} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
