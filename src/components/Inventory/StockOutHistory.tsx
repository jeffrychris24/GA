import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, Filter, Calendar, Package, MapPin, 
  ChevronLeft, ChevronRight, Loader2, Info, X, ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StockOutEntry {
  id: string;
  original_item_id: string;
  kode_barang: string;
  nama_barang: string;
  jumlah_barang: number;
  lokasi: string;
  foto_urls: string[];
  deskripsi: string;
  created_at: string;
  updated_at: string;
  tanggal_keluar: string;
  keterangan_alasan: string;
  user_name: string;
}

export default function StockOutHistory() {
  const [history, setHistory] = useState<StockOutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('tanggal_keluar');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedEntry, setSelectedEntry] = useState<StockOutEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [page, search, startDate, endDate, sortColumn, sortOrder]);

  async function fetchHistory() {
    setLoading(true);
    try {
      let query = supabase
        .from('stock_keluar_history')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(`nama_barang.ilike.%${search}%,kode_barang.ilike.%${search}%,lokasi.ilike.%${search}%`);
      }

      if (startDate) {
        query = query.gte('tanggal_keluar', `${startDate}T00:00:00`);
      }

      if (endDate) {
        query = query.lte('tanggal_keluar', `${endDate}T23:59:59`);
      }

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, count, error } = await query
        .order(sortColumn, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) throw error;
      setHistory(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching stock out history:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Riwayat Stock Keluar</h2>
          <p className="text-gray-500">Daftar barang yang telah dikeluarkan dari inventaris</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama, kode, atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {(startDate || endDate || search) && (
            <button 
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearch('');
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium px-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors group"
                  onClick={() => handleSort('tanggal_keluar')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Tanggal Keluar</span>
                    {sortColumn === 'tanggal_keluar' ? (
                      sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Barang</th>
                <th className="px-6 py-4">Lokasi</th>
                <th className="px-6 py-4">Jumlah</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={32} />
                    <p className="text-gray-500">Memuat riwayat...</p>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Package className="mx-auto text-gray-300 mb-2" size={48} />
                    <p className="text-gray-500">Tidak ada riwayat ditemukan</p>
                  </td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(entry.tanggal_keluar).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{entry.kode_barang}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{entry.nama_barang}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {entry.lokasi}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{entry.jumlah_barang}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{entry.keterangan_alasan}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedEntry(entry);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Info size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Halaman <span className="font-medium">{page}</span> dari <span className="font-medium">{totalPages}</span>
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Detail Barang Keluar</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Item Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informasi Barang</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Kode Barang</span>
                        <span className="text-sm font-mono font-medium text-gray-900">{selectedEntry.kode_barang}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Nama Barang</span>
                        <span className="text-sm font-medium text-gray-900">{selectedEntry.nama_barang}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Lokasi Terakhir</span>
                        <span className="text-sm font-medium text-gray-900">{selectedEntry.lokasi}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Jumlah</span>
                        <span className="text-sm font-bold text-gray-900">{selectedEntry.jumlah_barang}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail Pengeluaran</label>
                    <div className="mt-2 space-y-2">
                      <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Tanggal Keluar</span>
                        <span className="text-sm font-medium text-gray-900">{new Date(selectedEntry.tanggal_keluar).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Oleh</span>
                        <span className="text-sm font-medium text-gray-900">{selectedEntry.user_name}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alasan / Keterangan</label>
                    <p className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                      "{selectedEntry.keterangan_alasan}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Photos */}
              {selectedEntry.foto_urls && selectedEntry.foto_urls.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Foto Snapshot</label>
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {selectedEntry.foto_urls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-blue-500 transition-all">
                        <img src={url} alt="Snapshot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEntry.deskripsi && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi Barang</label>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {selectedEntry.deskripsi}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
