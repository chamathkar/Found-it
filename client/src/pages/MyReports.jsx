import React, { useState, useEffect } from 'react';
import { Package, HelpCircle, Plus, MapPin, Calendar, CheckCircle, Trash2, ExternalLink } from 'lucide-react';
import { getMyItems, closeItem, deleteItem } from '../services/api';

export default function MyReports({ onOpenReport, onViewItem }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getMyItems();
      if (res?.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch my reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleClose = async (id) => {
    if (!confirm('Has the item been successfully handed over to the rightful owner? This will mark the case as Closed.')) {
      return;
    }
    setActionLoading(id);
    try {
      await closeItem(id);
      await fetchItems();
    } catch (err) {
      alert('Error closing item: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    setActionLoading(id);
    try {
      await deleteItem(id);
      await fetchItems();
    } catch (err) {
      alert('Error deleting item: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterType === 'lost') return item.type === 'lost';
    if (filterType === 'found') return item.type === 'found';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Open Listing</span>;
      case 'pending_claim':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Claim Pending Review</span>;
      case 'claimed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Claim Approved</span>;
      case 'closed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Closed (Handed Over)</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Reported Items</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track and manage lost and found items you have listed on campus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenReport?.('lost')}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Report Lost
          </button>
          <button
            onClick={() => onOpenReport?.('found')}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Report Found
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 my-6">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-gray-900 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Reports ({items.length})
        </button>
        <button
          onClick={() => setFilterType('lost')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'lost'
              ? 'bg-rose-600 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          My Lost Items ({items.filter((i) => i.type === 'lost').length})
        </button>
        <button
          onClick={() => setFilterType('found')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterType === 'found'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          My Found Items ({items.filter((i) => i.type === 'found').length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading your reports...</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400 mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 text-base">No items found</h3>
          <p className="text-gray-500 text-xs mt-1">You have not reported any items matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-gray-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.target.style.display = 'none')}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No Photo
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-semibold text-white shadow-xs ${
                        item.type === 'found' ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {item.type === 'found' ? 'Found' : 'Lost'}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    {item.category}
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mt-0.5 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>

                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(item.dateFoundOrLost || item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-gray-100 mt-3">
                <button
                  onClick={() => onViewItem?.(item)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Details
                </button>

                <div className="flex items-center gap-1.5">
                  {item.status === 'claimed' && (
                    <button
                      type="button"
                      disabled={actionLoading === item._id}
                      onClick={() => handleClose(item._id)}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirm Handover
                    </button>
                  )}

                  {item.status === 'open' && (
                    <button
                      type="button"
                      disabled={actionLoading === item._id}
                      onClick={() => handleDelete(item._id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
