import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search, Plus, CheckCircle, HelpCircle, User, LogOut, Shield, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenReport, searchQuery, setSearchQuery, onOpenAuth }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">Found It</span>
            <span className="text-xs text-gray-500 block -mt-1">Campus Lost &amp; Found</span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`
            }
          >
            Browse Board
          </NavLink>

          {isAuthenticated && (
            <>
              <NavLink
                to="/my-reports"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                My Reports
              </NavLink>

              <NavLink
                to="/my-claims"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                My Claims
              </NavLink>
            </>
          )}

          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                  isActive ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
                }`
              }
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Portal
            </NavLink>
          )}
        </nav>

        {/* Action Buttons & Auth */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => onOpenReport?.('lost')}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">Report</span> Lost
          </button>

          <button
            onClick={() => onOpenReport?.('found')}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Report</span> Found
          </button>

          {/* User Account / Auth Button */}
          <div className="pl-2 border-l border-gray-200 flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-gray-100 text-gray-800 text-xs font-semibold">
                  <div
                    className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] uppercase font-bold ${
                      user?.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'
                    }`}
                  >
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="hidden lg:block text-left">
                    <span className="block max-w-[90px] truncate leading-tight">{user?.name}</span>
                    <span className="text-[10px] text-gray-400 font-normal uppercase block">
                      {user?.role === 'admin' ? 'Admin' : 'Student'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth?.('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <User className="w-4 h-4 text-gray-500" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
