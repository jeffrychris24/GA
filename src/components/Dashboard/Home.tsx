import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, MapPin, Users, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Item } from '../../types';

export default function DashboardHome() {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalLocations: 0,
    totalUsers: 0,
    totalStock: 0,
  });
  const [recentItems, setRecentItems] = useState<Item[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [itemsRes, profilesRes] = await Promise.all([
          supabase.from('items').select('*'),
          supabase.from('profiles').select('count'),
        ]);

        if (itemsRes.data) {
          const totalStock = itemsRes.data.reduce((acc, item) => acc + (item.jumlah_barang || 0), 0);
          
          // Unique locations from items
          const uniqueLocations = new Set(itemsRes.data.map(item => item.lokasi).filter(Boolean));

          setStats({
            totalItems: itemsRes.data.length,
            totalLocations: uniqueLocations.size,
            totalUsers: profilesRes.count || 0,
            totalStock,
          });

          // Recent items
          const sorted = [...itemsRes.data].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 5);
          setRecentItems(sorted);

          // Chart data: Items per location
          const locationMap: Record<string, number> = {};
          itemsRes.data.forEach(item => {
            const locName = item.lokasi || 'Unknown';
            locationMap[locName] = (locationMap[locName] || 0) + 1;
          });
          setChartData(Object.entries(locationMap).map(([name, value]) => ({ name, value })));
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Barang" value={stats.totalItems} icon={<Package className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Total Lokasi" value={stats.totalLocations} icon={<MapPin className="text-emerald-600" />} color="bg-emerald-50" />
        <StatCard title="Total User" value={stats.totalUsers} icon={<Users className="text-amber-600" />} color="bg-amber-50" />
        <StatCard title="Total Stok" value={stats.totalStock} icon={<TrendingUp className="text-rose-600" />} color="bg-rose-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <TrendingUp className="mr-2 text-blue-600" size={20} />
            Barang per Lokasi
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Items */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Clock className="mr-2 text-blue-600" size={20} />
            Barang Terbaru
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3">Barang</th>
                  <th className="pb-3">Kode</th>
                  <th className="pb-3">Lokasi</th>
                  <th className="pb-3 text-right">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentItems.map((item) => (
                  <tr key={item.id} className="text-sm hover:bg-gray-50 transition-colors">
                    <td className="py-4 font-medium text-gray-900">{item.nama_barang}</td>
                    <td className="py-4 text-gray-500">{item.kode_barang}</td>
                    <td className="py-4 text-gray-500">{item.lokasi || '-'}</td>
                    <td className="py-4 text-right font-semibold text-blue-600">{item.jumlah_barang}</td>
                  </tr>
                ))}
                {recentItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 italic">Belum ada data barang</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
