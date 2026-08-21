import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';
import { Package, Truck, Store, FileText } from 'lucide-react';

interface TransferStatisticsProps {
  transfers: any[];
  type: 'incoming' | 'outgoing';
}

export function TransferStatistics({ transfers, type }: TransferStatisticsProps) {
  const stats = useMemo(() => {
    let totalItemsQty = 0;
    let inTransitCount = 0;
    
    const storeMap = new Map<string, { name: string; requests: number; qty: number }>();
    const statusMap = new Map<string, { name: string; value: number }>();
    const dateMap = new Map<string, { date: string; requests: number; qty: number }>();

    transfers.forEach(transfer => {
      const isIncoming = type === 'incoming';
      const storeName = isIncoming ? transfer.fromStore : transfer.toStore;
      const status = transfer.status || 'UNKNOWN';
      const dateStr = transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString('en-GB') : 'Unknown';

      if (status === 'IN_TRANSIT') {
        inTransitCount++;
      }

      let transferQty = 0;
      if (transfer.items && Array.isArray(transfer.items)) {
        transfer.items.forEach((item: any) => {
          transferQty += (Number(item.requestedQty) || 0);
        });
      }
      
      totalItemsQty += transferQty;

      // Store aggregation
      const storeKey = storeName || 'Unknown Store';
      const s = storeMap.get(storeKey) || { name: storeKey, requests: 0, qty: 0 };
      s.requests += 1;
      s.qty += transferQty;
      storeMap.set(storeKey, s);

      // Status aggregation
      const st = statusMap.get(status) || { name: status, value: 0 };
      st.value += 1;
      statusMap.set(status, st);

      // Date aggregation
      const d = dateMap.get(dateStr) || { date: dateStr, requests: 0, qty: 0 };
      d.requests += 1;
      d.qty += transferQty;
      dateMap.set(dateStr, d);
    });

    const topStores = Array.from(storeMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const statusData = Array.from(statusMap.values());

    const timelineData = Array.from(dateMap.values()).sort((a, b) => {
      const partsA = a.date.split('/');
      const partsB = b.date.split('/');
      if (partsA.length !== 3 || partsB.length !== 3) return 0;
      const dateA = new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`).getTime();
      const dateB = new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`).getTime();
      return dateA - dateB;
    });

    return {
      totalTransfers: transfers.length,
      totalItemsQty,
      inTransitCount,
      uniqueStores: storeMap.size,
      topStores,
      statusData,
      timelineData
    };
  }, [transfers, type]);

  const COLORS = {
    PENDING: '#f59e0b',
    APPROVED: '#3b82f6',
    IN_TRANSIT: '#a855f7',
    RECEIVED: '#10b981',
    REJECTED: '#ef4444',
    UNKNOWN: '#94a3b8'
  };

  const getStatusColor = (status: string) => {
    return COLORS[status as keyof typeof COLORS] || COLORS.UNKNOWN;
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Transfers</p>
            <p className="text-xl font-bold text-slate-800">{stats.totalTransfers}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Items (Qty)</p>
            <p className="text-xl font-bold text-slate-800">{stats.totalItemsQty.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">In Transit</p>
            <p className="text-xl font-bold text-slate-800">{stats.inTransitCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">
              {type === 'incoming' ? 'Source Stores' : 'Dest Stores'}
            </p>
            <p className="text-xl font-bold text-slate-800">{stats.uniqueStores}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stores Composed Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">
            Top 5 {type === 'incoming' ? 'Source' : 'Destination'} Stores
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.topStores} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
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
                  yAxisId="left"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="left" name="Item Quantity" dataKey="qty" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line yAxisId="right" name="Transfer Requests" type="monotone" dataKey="requests" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Pie Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Transfer Status</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => Number(value).toLocaleString('en-IN')}
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
        <h3 className="text-sm font-bold text-slate-700 uppercase mb-4">Transfer Trend</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.timelineData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar yAxisId="left" name="Item Quantity" dataKey="qty" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Line yAxisId="right" name="Transfer Requests" type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
