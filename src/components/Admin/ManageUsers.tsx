import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../UI/Toast';
import { 
  User as UserIcon, Mail, Shield, Key, Camera, 
  Loader2, Save, AlertCircle, CheckCircle2, UserPlus,
  Trash2, Edit2, X
} from 'lucide-react';
import { Profile } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ManageUsers() {
  const { profile, user } = useAuth();
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user' as 'admin' | 'user'
  });

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchProfiles();
    } else if (profile) {
      setEditingProfile(profile);
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setLoading(false);
    }
  }, [profile]);

  async function fetchProfiles() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengambil data user', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (error) throw error;
      showToast('Profil berhasil diperbarui', 'success');
      if (profile?.role === 'admin') fetchProfiles();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui profil', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserForm.password.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(newUserForm)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal membuat user');

      showToast('User berhasil dibuat', 'success');
      setIsAddUserModalOpen(false);
      setNewUserForm({ email: '', password: '', full_name: '', role: 'user' });
      fetchProfiles();
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Password tidak cocok', 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      showToast('Password berhasil diubah', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah password', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('item-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('item-photos')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      // Auto update profile with new avatar
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      showToast('Foto profil berhasil diunggah', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunggah foto', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleUserRole = async (targetProfile: Profile) => {
    // The UI is already guarded by profile?.role === 'admin' check
    // but we can keep a simple check for safety.
    if (!profile || profile.role !== 'admin') {
      showToast('Hanya admin yang dapat mengubah role', 'error');
      return;
    }
    
    const newRole = targetProfile.role === 'admin' ? 'user' : 'admin';
    const confirmMessage = `Apakah Anda yakin ingin mengubah role ${targetProfile.full_name || 'User'} menjadi ${newRole === 'admin' ? 'Admin' : 'User'}?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    // Optimistic UI update using functional state to avoid stale closures
    const previousProfiles = [...profiles];
    setProfiles(prev => prev.map(p => p.id === targetProfile.id ? { ...p, role: newRole } : p));
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetProfile.id);

      if (error) throw error;
      
      showToast(`Role ${targetProfile.full_name || 'user'} berhasil diubah menjadi ${newRole}`, 'success');
      // Refresh data to ensure sync with server
      fetchProfiles();
    } catch (err: any) {
      // Rollback on error
      setProfiles(previousProfiles);
      showToast(err.message || 'Gagal mengubah role', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (targetProfile: Profile) => {
    if (profile?.role !== 'admin') return;
    if (targetProfile.id === user?.id) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri', 'error');
      return;
    }

    const confirmMessage = `Apakah Anda yakin ingin menghapus ${targetProfile.full_name || 'User'}? Tindakan ini tidak dapat dibatalkan.`;
    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(`/api/admin/delete-user/${targetProfile.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal menghapus user');

      showToast('User berhasil dihapus', 'success');
      fetchProfiles();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users & Profile</h1>
          <p className="text-gray-500">
            {profile?.role === 'admin' 
              ? 'Kelola hak akses dan profil seluruh pengguna aplikasi' 
              : 'Kelola informasi profil dan keamanan akun Anda'}
          </p>
        </div>
        {profile?.role === 'admin' && (
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all font-bold"
          >
            <UserPlus size={20} />
            <span>Tambah User Baru</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center">
                <UserIcon size={18} className="mr-2 text-blue-600" />
                Profil Saya
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon size={40} className="text-gray-300" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors group-hover:scale-110 transform duration-200">
                    {uploadingAvatar ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>
                <div className="mt-4 text-center">
                  <p className="font-bold text-gray-900">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded",
                      profile?.role === 'admin' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                    )}>
                      {profile?.role}
                    </span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="text"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-100 bg-gray-50 rounded-xl text-gray-400 text-sm cursor-not-allowed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>Simpan Profil</span>
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center">
                <Key size={18} className="mr-2 text-orange-600" />
                Ganti Password
              </h3>
            </div>
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Konfirmasi Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {passwordLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </div>

        {/* User List Section (Admin Only) */}
        <div className="lg:col-span-2">
          {profile?.role === 'admin' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 flex items-center">
                  <Shield size={18} className="mr-2 text-emerald-600" />
                  Daftar Seluruh Pengguna
                </h3>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                  {profiles.length} Users
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase tracking-wider font-bold text-gray-400 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Bergabung</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {profiles.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
                              {p.avatar_url ? (
                                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <UserIcon size={14} className="text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{p.full_name || 'No Name'}</p>
                              <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                            p.role === 'admin' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                          )}>
                            {p.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(p.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {p.id !== user?.id && (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleUserRole(p);
                                }}
                                disabled={actionLoading}
                                className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                Ubah ke {p.role === 'admin' ? 'User' : 'Admin'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteUser(p);
                                }}
                                disabled={actionLoading}
                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Hapus User"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Shield size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Akses Terbatas</h3>
                <p className="text-sm text-gray-600 max-w-sm mt-2">
                  Sebagai pengguna dengan role <strong>User</strong>, Anda hanya dapat mengelola profil dan keamanan akun Anda sendiri.
                </p>
              </div>
              <div className="pt-4 grid grid-cols-2 gap-4 w-full max-w-xs">
                <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Inventory</p>
                  <p className="text-xs font-bold text-blue-600">View Only</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Profile</p>
                  <p className="text-xs font-bold text-blue-600">Full Access</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <UserPlus size={20} className="mr-2 text-blue-600" />
                Tambah User Baru
              </h3>
              <button onClick={() => setIsAddUserModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={newUserForm.full_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Nama Lengkap"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Min 6 karakter"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                >
                  <option value="user">User (View Only)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  <span>Daftarkan User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
