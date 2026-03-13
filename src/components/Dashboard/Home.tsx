import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, MapPin, Users, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        const [itemsRes, profilesRes, locationsRes, stockOutRes] = await Promise.all([
          supabase.from('items').select('*, master_lokasi(nama_lokasi)'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('master_lokasi').select('*', { count: 'exact', head: true }),
          supabase.from('stock_keluar_history').select('tanggal_keluar, created_at, jumlah_barang')
        ]);

        if (itemsRes.data) {
          const totalStock = itemsRes.data.reduce((acc, item) => acc + (item.jumlah_barang || 0), 0);
          
          setStats({
            totalItems: itemsRes.data.length,
            totalLocations: locationsRes.count || 0,
            totalUsers: profilesRes.count || 0,
            totalStock,
          });

          // Recent items
          const sorted = [...itemsRes.data].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 20);
          setRecentItems(sorted);

          // Chart data: Monthly stats (last 6 months)
          const months: any[] = [];
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
              name: d.toLocaleString('id-ID', { month: 'short' }),
              monthNum: d.getMonth(),
              year: d.getFullYear(),
              Baru: 0,
              Keluar: 0,
              Diedit: 0
            });
          }

          itemsRes.data.forEach(item => {
            const createdDate = new Date(item.created_at);
            const updatedDate = item.updated_at ? new Date(item.updated_at) : null;
            
            months.forEach(m => {
              if (createdDate.getMonth() === m.monthNum && createdDate.getFullYear() === m.year) {
                m.Baru += 1;
              }
              // If updated_at exists and is different from created_at (by at least 1 second)
              if (updatedDate && updatedDate.getTime() - createdDate.getTime() > 1000) {
                if (updatedDate.getMonth() === m.monthNum && updatedDate.getFullYear() === m.year) {
                  m.Diedit += 1;
                }
              }
            });
          });

          if (stockOutRes.data) {
            stockOutRes.data.forEach(out => {
              const outDate = new Date(out.tanggal_keluar || out.created_at);
              months.forEach(m => {
                if (outDate.getMonth() === m.monthNum && outDate.getFullYear() === m.year) {
                  m.Keluar += out.jumlah_barang || 1;
                }
              });
            });
          }

          setChartData(months);
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
            Statistik Bulanan (6 Bulan Terakhir)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                    padding: '12px 16px',
                    fontWeight: 500
                  }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Baru" name="Barang Baru" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Keluar" name="Barang Keluar" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Diedit" name="Barang Diedit" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Items */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[420px]">
          <h3 className="text-lg font-semibold mb-6 flex items-center shrink-0">
            <Clock className="mr-2 text-blue-600" size={20} />
            Barang Terbaru
          </h3>
          <div className="overflow-y-auto flex-1 pr-2">
            <table className="w-full text-left relative">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 bg-white">Barang</th>
                  <th className="pb-3 bg-white">Kode</th>
                  <th className="pb-3 bg-white">Lokasi</th>
                  <th className="pb-3 bg-white text-right">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentItems.map((item, index) => (
                  <tr key={item.id} className={`text-sm hover:bg-gray-50 transition-colors ${index < 5 ? 'bg-blue-50/30' : ''}`}>
                    <td className="py-4 font-medium text-gray-900">
                      <div className="flex items-center space-x-2">
                        {index < 5 && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Top 5 Terbaru"></span>}
                        <span className={index < 5 ? 'text-blue-700' : ''}>{item.nama_barang}</span>
                      </div>
                    </td>
                    <td className="py-4 text-gray-500">{item.kode_barang}</td>
                    <td className="py-4 text-gray-500">{(item as any).master_lokasi?.nama_lokasi || item.kode_lokasi || '-'}</td>
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
