import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { IndianRupee, Package, Users, FileText } from 'lucide-react';

interface InwardStatisticsProps {
  entries: any[];
}

export function InwardStatistics({ entries }: InwardStatisticsProps) {
  const stats = useMemo(() => {
    let totalAmount = 0;
    let totalQty = 0;
    const vendorMap = new Map<string, { name: string; amount: number; qty: number }>();
    const circleMap = new Map<string, { name: string; value: number }>();
    const dateMap = new Map<string, { date: string; amount: number; qty: number }>();

    entries.forEach(entry => {
      const amt = Number(entry.amount) || 0;
      const qty = Number(entry.invoiceQty) || 0;
      const vendor = entry.vendorName || 'Unknown Vendor';
      const circle = entry.circle || 'Unassigned';
      const dateStr = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-GB') : 'Unknown';

      totalAmount += amt;
      totalQty += qty;

      // Vendor aggregation
      const v = vendorMap.get(vendor) || { name: vendor, amount: 0, qty: 0 };
      v.amount += amt;
      v.qty += qty;
      vendorMap.set(vendor, v);

      // Circle aggregation
      const c = circleMap.get(circle) || { name: circle, value: 0 };
      c.value += qty;
      circleMap.set(circle, c);

      // Date aggregation
      const d = dateMap.get(dateStr) || { date: dateStr, amount: 0, qty: 0 };
      d.amount += amt;
      d.qty += qty;
      dateMap.set(dateStr, d);
    });

    const topVendors = Array.from(vendorMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Top 5 vendors

    const circleData = Array.from(circleMap.values())
      .sort((a, b) => b.value - a.value);

    // Sort dates properly
    const timelineData = Array.from(dateMap.values()).sort((a, b) => {
      const partsA = a.date.split('/');
      const partsB = b.date.split('/');
      if (partsA.length !== 3 || partsB.length !== 3) return 0;
      const dateA = new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`).getTime();
      const dateB = new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`).getTime();
      return dateA - dateB;
    });

    return {
      totalAmount,
      totalQty,
      uniqueVendors: vendorMap.size,
      topVendors,
      circleData,
      timelineData
    };
  }, [entries]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Amount</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(stats.totalAmount)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Items Received</p>
            <p className="text-xl font-bold text-slate-800">{stats.totalQty.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Active Vendors</p>
            <p className="text-xl font-bold text-slate-800">{stats.uniqueVendors}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total GRNs</p>
            <p className="text-xl font-bold text-slate-800">{entries.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vendors Bar Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Top 5 Vendors (by Amount)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topVendors} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quantity by Circle Pie Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Received Quantity by Circle</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.circleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {stats.circleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString('en-IN')}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Inward Trend (Amount)</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.timelineData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
