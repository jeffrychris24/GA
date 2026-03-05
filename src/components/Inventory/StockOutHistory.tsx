import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, Filter, Calendar, Package, MapPin, 
  ChevronLeft, ChevronRight, Loader2, Info, X, ArrowUpDown, ChevronUp, ChevronDown, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';
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
  kode_lokasi: string;
  nama_lokasi: string;
  foto_urls: string[];
  deskripsi: string;
  created_at: string;
  updated_at: string;
  tanggal_keluar: string;
  keterangan_alasan: string;
  user_name: string;
  master_lokasi: {
    nama_lokasi: string;
  } | null;
}

export default function StockOutHistory() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<StockOutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('tanggal_keluar');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [selectedEntry, setSelectedEntry] = useState<StockOutEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Export state
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, [page, search, startDate, endDate, sortColumn, sortOrder, itemsPerPage]);

  async function fetchHistory() {
    setLoading(true);
    try {
      let query = supabase
        .from('stock_keluar_history')
        .select('*, master_lokasi(nama_lokasi)', { count: 'exact' });

      if (search) {
        // Search in the history table's own columns for reliability
        query = query.or(`nama_barang.ilike.%${search}%,kode_barang.ilike.%${search}%,nama_lokasi.ilike.%${search}%,user_name.ilike.%${search}%`);
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

  const handlePrepareExport = () => {
    const dataToExport = history.map(entry => ({
      'Tanggal Keluar': new Date(entry.tanggal_keluar).toLocaleString('id-ID'),
      'Kode Barang': entry.kode_barang,
      'Nama Barang': entry.nama_barang,
      'Lokasi Terakhir': entry.master_lokasi?.nama_lokasi || entry.kode_lokasi || '-',
      'Jumlah': entry.jumlah_barang,
      'Oleh': entry.user_name,
      'Alasan': entry.keterangan_alasan || '-'
    }));
    setExportData(dataToExport);
    setIsExportPreviewOpen(true);
  };

  const handleConfirmExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Out History");
    XLSX.writeFile(workbook, `Stock_Out_History_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportPreviewOpen(false);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Riwayat Stock Keluar</h2>
          <p className="text-gray-500">Daftar barang yang telah dikeluarkan dari inventaris</p>
        </div>
        {profile?.role === 'admin' && (
          <button
            onClick={handlePrepareExport}
            disabled={history.length === 0}
            className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg transition-all shadow-sm font-medium disabled:opacity-50"
          >
            <Download size={20} />
            <span>Export Excel</span>
          </button>
        )}
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
                  <tr 
                    key={entry.id} 
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedEntry(entry);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(entry.tanggal_keluar).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{entry.kode_barang}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{entry.nama_barang}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {entry.nama_lokasi || entry.master_lokasi?.nama_lokasi || entry.kode_lokasi || '-'}
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
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-500">
              Menampilkan <span className="font-medium text-gray-900">{(page - 1) * itemsPerPage + 1}</span> sampai <span className="font-medium text-gray-900">{Math.min(page * itemsPerPage, totalCount)}</span> dari <span className="font-medium text-gray-900">{totalCount}</span> riwayat
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Baris:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                {[5, 10, 20, 50].map(size => (
                  <option key={size} value={size}>{size} per halaman</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-white shadow-sm"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center -space-x-px">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                // Show first, last, current, and neighbors
                if (
                  p === 1 || 
                  p === totalPages || 
                  (p >= page - 1 && p <= page + 1)
                ) {
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-9 h-9 flex items-center justify-center text-sm font-medium border transition-all",
                        page === p 
                          ? "z-10 bg-blue-600 text-white border-blue-600 shadow-sm" 
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {p}
                    </button>
                  );
                }
                // Show ellipses
                if (p === 2 || p === totalPages - 1) {
                  return (
                    <span key={p} className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 text-gray-400 text-xs">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-white shadow-sm"
              title="Halaman Berikutnya"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedEntry && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">Detail Barang Keluar</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-hide">
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
                        <span className="text-sm font-medium text-gray-900">{selectedEntry.nama_lokasi || selectedEntry.master_lokasi?.nama_lokasi || selectedEntry.kode_lokasi || '-'}</span>
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

      {/* Export Preview Modal */}
      {isExportPreviewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Preview Export ({exportData.length} baris)</h3>
              <button onClick={() => setIsExportPreviewOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 font-semibold">
                    {exportData.length > 0 && Object.keys(exportData[0]).map(key => (
                      <th key={key} className="pb-3 px-2">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {exportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((val: any, i) => (
                        <td key={i} className="py-2 px-2 text-gray-600">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/50">
              <button
                onClick={() => setIsExportPreviewOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmExport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
              >
                <Download size={18} />
                <span>Konfirmasi Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
