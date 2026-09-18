import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsBanner from './components/StatsBanner';
import ItemCard from './components/ItemCard';
import ReportModal from './components/ReportModal';
import ItemDetailModal from './components/ItemDetailModal';
import AuthModal from './components/AuthModal';
import { getItems, getStats } from './services/api';
import {
  SlidersHorizontal,
  RefreshCw,
  Inbox,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from './context/AuthContext';

const CATEGORIES = [
  'All',
  'Electronics',
  'Cards & IDs',
  'Keys',
  'Bags & Wallets',
  'Books & Stationery',
  'Clothing & Apparel',
  'Jewelry & Accessories',
  'Other',
];

export default function App() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, activeLost: 0, activeFound: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'lost', 'found'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState('lost');
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login');

  // Toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsRes, statsRes] = await Promise.all([
        getItems({
          search: searchQuery,
          type: activeTab === 'all' ? undefined : activeTab,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          sortBy,
        }),
        getStats(),
      ]);

      if (itemsRes?.data) {
        setItems(itemsRes.data);
      }
      if (statsRes?.stats) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.warn('API error:', err.message);
      setError('Could not connect to the API. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, selectedCategory, searchQuery, sortBy]);

  const { isAuthenticated } = useAuth();

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

  const handleCardClick = (item) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Navigation */}
      <Navbar
        onOpenReport={handleOpenReport}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAuth={(tab = 'login') => {
          setAuthModalTab(tab);
          setAuthModalOpen(true);
        }}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 p-3.5 rounded-lg bg-gray-900 text-white font-medium text-xs sm:text-sm shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Hero Section */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Found It
            </h1>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              The centralized lost and found board for our campus. Report missing possessions or list items you found to help return them to their owners.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={() => handleOpenReport('lost')}
                className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                I Lost an Item
              </button>
              <button
                onClick={() => handleOpenReport('found')}
                className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
              >
                I Found an Item
              </button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <StatsBanner stats={stats} />

        {/* Filters & Tabs */}
        <section className="my-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-gray-900 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({stats.total || 0})
              </button>

              <button
                onClick={() => setActiveTab('lost')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'lost'
                    ? 'bg-white text-rose-700 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Lost ({stats.activeLost || 0})
              </button>

              <button
                onClick={() => setActiveTab('found')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'found'
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Found ({stats.activeFound || 0})
              </button>

            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs text-gray-500 self-end sm:self-auto">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
              <span>Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-300 text-xs text-gray-700 rounded-md px-2.5 py-1 focus:outline-none focus:border-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="date">Incident Date</option>
              </select>

              <button
                onClick={fetchData}
                title="Refresh"
                className="p-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Grid of Items */}
        <section className="my-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchData}
                className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="h-72 rounded-xl bg-white border border-gray-200 p-4 space-y-3 animate-pulse">
                  <div className="h-36 bg-gray-100 rounded-lg" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                  onClick={() => handleCardClick(item)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-xl bg-white border border-gray-200 my-6 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">No items found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                There are no reports matching your active filters.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setActiveTab('all');
                }}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>
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

      {/* Modals */}
      <ReportModal
        isOpen={reportModalOpen}
        initialType={reportModalType}
        onClose={() => setReportModalOpen(false)}
        onSuccess={() => {
          showToast('Report submitted successfully.');
          fetchData();
        }}
      />

      <ItemDetailModal
        item={selectedItem}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onOpenAuth={(tab = 'login') => {
          setAuthModalTab(tab);
          setAuthModalOpen(true);
        }}
        onRefresh={() => {
          showToast('Updated item details.');
          fetchData();
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(msg) => {
          showToast(msg);
          fetchData();
        }}
      />
    </div>
  );
}
