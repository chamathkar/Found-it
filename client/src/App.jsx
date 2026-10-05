import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ReportModal from './components/ReportModal';
import ItemDetailModal from './components/ItemDetailModal';
import AuthModal from './components/AuthModal';

// Pages
import UserDashboard from './pages/UserDashboard';
import MyReports from './pages/MyReports';
import MyClaims from './pages/MyClaims';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminItems from './pages/AdminItems';
import AdminClaims from './pages/AdminClaims';

import { CheckCircle2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAuthenticated } = useAuth();

  // Modals state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState('lost');
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');

  // Global Toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleOpenReport = (type = 'lost') => {
    if (!isAuthenticated) {
      showToast('Please sign in or create an account to report an item.');
      setAuthModalTab('login');
      setAuthModalOpen(true);
      return;
    }
    setReportModalType(type);
    setReportModalOpen(true);
  };

  const handleViewItem = (item) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Navigation */}
      <Navbar
        onOpenReport={handleOpenReport}
        onOpenAuth={(tab = 'login') => {
          setAuthModalTab(tab);
          setAuthModalOpen(true);
        }}
      />

      {/* Main Content Area with Routing */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 p-3.5 rounded-lg bg-gray-900 text-white font-medium text-xs sm:text-sm shadow-lg flex items-center gap-2 animate-bounce-short">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <Routes>
          {/* User Routes */}
          <Route
            path="/"
            element={
              <UserDashboard
                onOpenReport={handleOpenReport}
                onViewItem={handleViewItem}
                onOpenAuth={(tab) => {
                  setAuthModalTab(tab);
                  setAuthModalOpen(true);
                }}
              />
            }
          />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          <Route
            path="/my-reports"
            element={
              <ProtectedRoute>
                <MyReports
                  onOpenReport={handleOpenReport}
                  onViewItem={handleViewItem}
                />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-claims"
            element={
              <ProtectedRoute>
                <MyClaims onViewItem={handleViewItem} />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/items"
            element={
              <ProtectedRoute adminOnly>
                <AdminItems onViewItem={handleViewItem} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/claims"
            element={
              <ProtectedRoute adminOnly>
                <AdminClaims onViewItem={handleViewItem} />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-6 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-gray-700">Found It</span> &copy; 2026. Campus Lost &amp; Found Portal.
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <span>Holding Offices</span>
            <span>Security Desk</span>
            <span>Privacy Policy</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <ReportModal
        isOpen={reportModalOpen}
        initialType={reportModalType}
        onClose={() => setReportModalOpen(false)}
        onSuccess={() => {
          showToast('Report submitted successfully.');
        }}
      />

      <ItemDetailModal
        item={selectedItem}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onSelectItem={(item) => setSelectedItem(item)}
        onOpenAuth={(tab = 'login') => {
          setAuthModalTab(tab);
          setAuthModalOpen(true);
        }}
        onRefresh={() => {
          showToast('Item updated.');
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
        }}
      />
    </div>
  );
}
