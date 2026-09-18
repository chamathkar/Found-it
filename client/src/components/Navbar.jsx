import React from 'react';
import { Search, Plus, CheckCircle, HelpCircle, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenReport, searchQuery, setSearchQuery, onOpenAuth }) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">Found It</span>
            <span className="text-xs text-gray-500 block -mt-1">Campus Lost &amp; Found</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md items-center relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items, locations, keywords..."
            className="w-full bg-gray-50 text-sm text-gray-900 placeholder-gray-400 pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Action Buttons & Auth */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => onOpenReport('lost')}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">Report</span> Lost
          </button>

          <button
            onClick={() => onOpenReport('found')}
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
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] uppercase font-bold">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden lg:inline max-w-[100px] truncate">{user?.name}</span>
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
                onClick={() => onOpenAuth('login')}
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
