"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  RotateCw, 
  Plus, 
  Users, 
  Bell, 
  Settings, 
  Grid,
  Package,
  User,
  ChevronDown,
  LogOut,
  Building,
  Check,
  FileText,
  ShoppingCart,
  Menu
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/shared/api/axios';
import { useUIStore } from '@/shared/store/ui.store';
import { useAuthStore } from '@/shared/store/auth.store';

export function TopBar() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for dropdowns
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  const { toggleMobileSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  
  const topBarRef = useRef<HTMLDivElement>(null);

  // Focus search on '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' && 
        document.activeElement?.tagName !== 'INPUT' && 
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (topBarRef.current && !topBarRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      logout();
      router.push('/login');
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Direct to items page with search query
      router.push(`/items?search=${encodeURIComponent(searchQuery.trim())}`);
      searchInputRef.current?.blur();
    }
  };

  return (
    <header ref={topBarRef} className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 shrink-0 shadow-md z-50 relative border-b border-slate-800 transition-colors">
      {/* Left side: Logo & Search */}
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 -ml-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Package className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg tracking-wide">Inventory</span>
        </Link>
        
        <div className="flex items-center gap-2 hidden md:flex">
          <button 
            onClick={() => window.location.reload()}
            className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white rounded-md transition-all active:scale-95"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          

        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-4 text-sm text-slate-300">

        
        <div className="flex items-center gap-1.5">

          
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('notifications')}
              className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#2b3040]"></span>
            </button>
            {activeDropdown === 'notifications' && (
              <div className="absolute top-10 right-0 w-72 bg-white rounded-md shadow-lg border border-slate-200 py-2 text-slate-700 z-50">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Notifications</span>
                  <button className="text-xs text-blue-500 hover:underline">Mark all as read</button>
                </div>
                <div className="p-4 text-center text-sm text-slate-500">
                  No new notifications
                </div>
              </div>
            )}
          </div>

          <Link href="/settings/preferences/items" className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
          
          {/* User Profile */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('profile')}
              className="w-9 h-9 flex items-center justify-center ml-2"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors flex items-center justify-center text-slate-700">
                 <User className="w-5 h-5 text-slate-600" />
              </div>
            </button>
            {activeDropdown === 'profile' && (
              <div className="absolute top-10 right-0 w-56 bg-white rounded-md shadow-lg border border-slate-200 py-1 text-slate-700 z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{user?.role?.name || (user?.firstName ? `${user.firstName} ${user.lastName}` : 'Admin User')}</p>
                  <p className="text-xs text-slate-500">{user?.email || 'admin@fastigo.ai'}</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-slate-400" /> My Profile
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 text-red-600">
                  <LogOut className="w-4 h-4 text-red-500" /> Sign Out
                </button>
              </div>
            )}
          </div>

          <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors ml-1">
            <Grid className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
