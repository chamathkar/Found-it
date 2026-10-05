import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, ArrowLeft, Shield, UserCheck, Mail, Phone, Calendar } from 'lucide-react';
import { getAdminUsers } from '../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await getAdminUsers();
        if (res?.data) setUsers(res.data);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.studentId?.toLowerCase().includes(q)
    );
  });

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
            <h1 className="text-2xl font-bold text-gray-900">Campus Users Directory</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Manage and inspect all student, faculty, and administrative accounts.
            </p>
          </div>
          <div className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">
            Total Users: <span className="font-bold text-gray-900">{users.length}</span>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or student ID..."
          className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-xs text-gray-900 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-xs">Loading campus directory...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-xs">
                      No users match your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block">{u.name}</span>
                            <span className="text-gray-400 text-[11px]">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700">
                            <UserCheck className="w-3 h-3" />
                            Student
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {u.studentId || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{u.email}</span>
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
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
