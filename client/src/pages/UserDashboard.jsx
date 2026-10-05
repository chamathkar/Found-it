import React, { useState, useEffect } from 'react';
import StatsBanner from '../components/StatsBanner';
import ItemCard from '../components/ItemCard';
import { getItems, getStats } from '../services/api';
import {
  SlidersHorizontal,
  RefreshCw,
  Inbox,
  AlertCircle,
  HelpCircle,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

export default function UserDashboard({ onOpenReport, onViewItem, onOpenAuth }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, activeLost: 0, activeFound: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Search
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'lost', 'found'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const { isAuthenticated } = useAuth();

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
        // Exclude claimed and handed-over (closed) items from student dashboard
        setItems(itemsRes.data.filter((item) => item.status !== 'closed' && item.status !== 'claimed'));
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

  const handleReportClick = (type) => {
    if (!isAuthenticated) {
      onOpenAuth?.('login');
      return;
    }
    onOpenReport?.(type);
  };

  return (
    <div className="space-y-6">
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
              onClick={() => handleReportClick('lost')}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4" />
              <span>I Lost an Item</span>
            </button>
            <button
              onClick={() => handleReportClick('found')}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>I Found an Item</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <StatsBanner stats={stats} />

      {/* Filters & Tabs */}
      <section className="space-y-3">
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

          {/* Search bar & Sort Dropdown */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-300 text-xs text-gray-800 rounded-md px-2.5 py-1 focus:outline-none focus:border-blue-500 w-36 sm:w-48"
            />

            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-300 text-xs text-gray-700 rounded-md px-2 py-1 focus:outline-none focus:border-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="date">Incident Date</option>
              </select>
            </div>

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
                onClick={() => onViewItem?.(item)}
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
    </div>
  );
}
