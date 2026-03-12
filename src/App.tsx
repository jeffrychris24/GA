import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './components/Auth/Login';
import Layout from './components/Dashboard/Layout';
import DashboardHome from './components/Dashboard/Home';
import MasterBarang from './components/Inventory/MasterBarang';
import MasterLokasi from './components/Inventory/MasterLokasi';
import TakeItemHistory from './components/Inventory/TakeItemHistory';
import LogItemChange from './components/Inventory/LogItemChange';
import StockOutHistory from './components/Inventory/StockOutHistory';
import LoginSettings from './components/Admin/LoginSettings';
import ManageUsers from './components/Admin/ManageUsers';
import { Loader2 } from 'lucide-react';
import { ToastProvider } from './components/UI/Toast';

export default function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [historySearch, setHistorySearch] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF9E3] via-[#FFDAB9] to-[#FFB08E]">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600 font-medium">Menyiapkan Aplikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      {!user ? (
        <Login />
      ) : (
        <Layout activeTab={activeTab} setActiveTab={(tab) => {
          setActiveTab(tab);
          setHistorySearch('');
        }}>
          {activeTab === 'dashboard' && <DashboardHome />}
          {activeTab === 'barang' && <MasterBarang setActiveTab={setActiveTab} setHistorySearch={setHistorySearch} />}
          {activeTab === 'lokasi' && <MasterLokasi setActiveTab={setActiveTab} setHistorySearch={setHistorySearch} />}
          {activeTab === 'take-item-history' && <TakeItemHistory initialSearch={historySearch} />}
          {activeTab === 'log-item-change' && <LogItemChange initialSearch={historySearch} />}
          {activeTab === 'stock-out-history' && <StockOutHistory />}
          {activeTab === 'login-settings' && <LoginSettings />}
          {activeTab === 'manage-users' && <ManageUsers />}
        </Layout>
      )}
    </ToastProvider>
  );
}
