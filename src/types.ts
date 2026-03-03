export interface Profile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface Item {
  id: string;
  kode_barang: string;
  nama_barang: string;
  jumlah_barang: number;
  lokasi: string | null;
  foto_urls: string[];
  deskripsi: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id?: number;
  login_title: string;
  login_footer: string;
  login_bg_url: string;
  updated_at?: string;
}
