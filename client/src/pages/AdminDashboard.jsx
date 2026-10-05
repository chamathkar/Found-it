import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  HelpCircle,
  PlusCircle,
  Clock,
  CheckCircle,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { getAdminStats } from '../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState({ items: [], claims: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await getAdminStats();
        if (res?.stats) setStats(res.stats);
        if (res?.recentActivity) setRecent(res.recentActivity);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-700',
      link: '/admin/users',
      sub: 'Registered campus members',
    },
    {
      title: 'Lost Items',
      value: stats?.lostItems ?? 0,
      icon: HelpCircle,
      color: 'bg-rose-50 text-rose-700',
      link: '/admin/items',
      sub: 'Items reported missing',
    },
    {
      title: 'Found Items',
      value: stats?.foundItems ?? 0,
      icon: PlusCircle,
      color: 'bg-emerald-50 text-emerald-700',
      link: '/admin/items',
      sub: 'Items awaiting recovery',
    },
    {
      title: 'Pending Claims',
      value: stats?.pendingClaims ?? 0,
      icon: Clock,
      color: 'bg-amber-50 text-amber-700',
      link: '/admin/claims',
      sub: 'Requiring verification',
    },
    {
      title: 'Closed Cases',
      value: stats?.closedItems ?? 0,
      icon: CheckCircle,
      color: 'bg-indigo-50 text-indigo-700',
      link: '/admin/items',
      sub: 'Successfully resolved',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-600 text-white uppercase tracking-wider">
              Admin Portal
            </span>
            <span className="text-xs text-gray-500">Live Campus System Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">Administrative Dashboard</h1>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/claims"
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Review Claims ({stats?.pendingClaims ?? 0})
          </Link>
          <Link
            to="/admin/items"
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Package className="w-4 h-4" />
            Manage Items
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-400">Loading campus metrics...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((c, idx) => {
            const Icon = c.icon;
            return (
              <Link
                key={idx}
                to={c.link}
                className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500">{c.title}</span>
                    <div className={`w-8 h-8 rounded-lg ${c.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{c.value}</div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>{c.sub}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Quick Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/users"
          className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-blue-400 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">User Directory</h3>
            <p className="text-xs text-gray-500 mt-0.5">Browse and manage registered students and staff.</p>
          </div>
        </Link>

        <Link
          to="/admin/items"
          className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-blue-400 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Item Catalog</h3>
            <p className="text-xs text-gray-500 mt-0.5">Audit lost/found items, update statuses, or close cases.</p>
          </div>
        </Link>

        <Link
          to="/admin/claims"
          className="p-5 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-blue-400 transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Claim Verification</h3>
            <p className="text-xs text-gray-500 mt-0.5">Inspect proofs and approve or reject ownership claims.</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              Recently Reported Items
            </h3>
            <Link to="/admin/items" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 mt-2">
            {recent.items?.length === 0 ? (
              <p className="py-6 text-center text-gray-400 text-xs">No recent reports</p>
            ) : (
              recent.items?.map((item) => (
                <div key={item._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-gray-900 block truncate max-w-xs">{item.title}</span>
                    <span className="text-gray-400 text-[11px]">
                      {item.type.toUpperCase()} &bull; Reported by {item.userId?.name || 'Unknown'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      item.status === 'open'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'pending_claim'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Claims */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-400" />
              Recent Claims Submitted
            </h3>
            <Link to="/admin/claims" className="text-xs text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 mt-2">
            {recent.claims?.length === 0 ? (
              <p className="py-6 text-center text-gray-400 text-xs">No recent claims</p>
            ) : (
              recent.claims?.map((claim) => (
                <div key={claim._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-gray-900 block truncate max-w-xs">
                      {claim.itemId?.title || 'Unknown Item'}
                    </span>
                    <span className="text-gray-400 text-[11px]">
                      Claimant: {claim.claimantId?.name || claim.claimantName} &bull; {new Date(claim.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      claim.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : claim.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {claim.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
