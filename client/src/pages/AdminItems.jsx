import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, ArrowLeft, Trash2, CheckCircle, ExternalLink, MapPin } from 'lucide-react';
import { getAdminItems, closeItemAdmin, deleteItemAdmin } from '../services/api';

export default function AdminItems({ onViewItem }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getAdminItems({
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search,
      });
      if (res?.data) setItems(res.data);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [typeFilter, statusFilter, search]);

  const handleClose = async (item) => {
    if (item.status !== 'claimed') {
      alert(`Cannot close item with status '${item.status}'. Only 'claimed' items can be closed via admin override.`);
      return;
    }
    if (!confirm(`Perform Admin Override: Mark "${item.title}" as Closed? This will record closureMethod = admin_override.`)) return;
    setActionLoading(item._id);
    try {
      await closeItemAdmin(item._id);
      await fetchItems();
    } catch (err) {
      alert('Error closing item: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this item and its claims?')) return;
    setActionLoading(id);
    try {
      await deleteItemAdmin(id);
      await fetchItems();
    } catch (err) {
      alert('Error deleting item: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (item) => {
    const status = typeof item === 'string' ? item : item.status;
    const closureMethod = typeof item === 'object' ? item.closureMethod : null;
    switch (status) {
      case 'open':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">Open</span>;
      case 'pending_claim':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 uppercase">Claim Pending</span>;
      case 'claimed':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 uppercase">Claimed</span>;
      case 'closed':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 uppercase inline-flex items-center gap-1">
            <span>Closed</span>
            {closureMethod && (
              <span className="text-[9px] font-normal text-gray-500 normal-case">
                ({closureMethod === 'otp_verified' ? 'OTP' : 'Override'})
              </span>
            )}
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <Link
          to="/admin"
          className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Admin Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campus Items Management</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Review, filter, close, or remove lost and found posts across campus.
            </p>
          </div>
          <div className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">
            Total Items: <span className="font-bold text-gray-900">{items.length}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, reporters..."
            className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                typeFilter === 'all' ? 'bg-white text-gray-900 shadow-xs font-semibold' : 'text-gray-600'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('lost')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                typeFilter === 'lost' ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-gray-600'
              }`}
            >
              Lost
            </button>
            <button
              onClick={() => setTypeFilter('found')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                typeFilter === 'found' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-gray-600'
              }`}
            >
              Found
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="pending_claim">Claim Pending</option>
            <option value="claimed">Claimed</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Items Table */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-xs">Loading items...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Reporter</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                      No items match the active filters.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0 border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center shrink-0 border border-gray-200">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-gray-900 block truncate max-w-xs">{item.title}</span>
                            <span className="text-gray-400 text-[11px]">{item.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold text-white uppercase ${
                            item.type === 'found' ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(item)}</td>
                      <td className="py-3 px-4 truncate max-w-[150px]">{item.location}</td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-medium text-gray-900 block">{item.contactName}</span>
                          <span className="text-gray-400 text-[11px]">{item.contactEmail}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-gray-500">
                        {new Date(item.dateFoundOrLost || item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewItem?.(item)}
                            title="View post"
                            className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {item.status === 'claimed' && (
                            <button
                              disabled={actionLoading === item._id}
                              onClick={() => handleClose(item)}
                              title="Admin Override: Manually close claimed item without OTP"
                              className="p-1.5 rounded text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            disabled={actionLoading === item._id}
                            onClick={() => handleDelete(item._id)}
                            title="Delete item"
                            className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
