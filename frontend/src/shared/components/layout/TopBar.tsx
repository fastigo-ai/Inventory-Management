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
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/shared/api/axios';

export function TopBar() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for dropdowns
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchContext, setSearchContext] = useState('Customers');
  const [currentOrg, setCurrentOrg] = useState('Fastigo AI');
  
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
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      // force route anyway
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
    <header ref={topBarRef} className="h-14 bg-[#2b3040] text-white flex items-center justify-between px-4 shrink-0 shadow-sm z-50 relative">
      {/* Left side: Logo & Search */}
      <div className="flex items-center gap-6 flex-1">
        <Link href="/" className="flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg tracking-wide">Inventory</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.location.reload()}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4 text-slate-300" />
          </button>
          
          <div className="relative flex items-center group w-96">
            <button 
              onClick={() => toggleDropdown('searchContext')}
              className="absolute left-1.5 flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <Search className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {/* Search Context Dropdown */}
            {activeDropdown === 'searchContext' && (
              <div className="absolute top-10 left-0 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 text-slate-700 z-50">
                {['Customers', 'Items', 'Purchase Orders', 'Invoices'].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setSearchContext(item);
                      setActiveDropdown(null);
                      searchInputRef.current?.focus();
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between"
                  >
                    {item}
                    {searchContext === item && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}

            <input 
              ref={searchInputRef}
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder={`Search in ${searchContext} ( / )`} 
              className="w-full bg-[#1c2130] border border-white/10 rounded-md py-1.5 pl-14 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-4 text-sm text-slate-300">
        <div className="flex items-center gap-3 pr-4 border-r border-white/10 h-6">
          <span>Your premium trial pla...</span>
          <a href="#" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">Subscribe</a>
          
          <div className="relative ml-2">
            <button 
              onClick={() => toggleDropdown('org')}
              className="flex items-center gap-1 cursor-pointer hover:text-white"
            >
              <span>{currentOrg}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            
            {/* Org Switcher Dropdown */}
            {activeDropdown === 'org' && (
              <div className="absolute top-8 right-0 w-56 bg-white rounded-md shadow-lg border border-slate-200 py-1 text-slate-700 z-50">
                <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Organizations</div>
                {['Fastigo AI', 'Demo Company'].map((org) => (
                  <button
                    key={org}
                    onClick={() => {
                      setCurrentOrg(org);
                      setActiveDropdown(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400" />
                      {org}
                    </div>
                    {currentOrg === org && <Check className="w-4 h-4 text-blue-500" />}
                  </button>
                ))}
                <div className="border-t border-slate-100 my-1"></div>
                <button className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-slate-50 font-medium">
                  Manage Organizations
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Quick Create Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleDropdown('create')}
              className="w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors ml-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </button>
            {activeDropdown === 'create' && (
              <div className="absolute top-10 right-0 w-48 bg-white rounded-md shadow-lg border border-slate-200 py-1 text-slate-700 z-50">
                <Link href="/items" onClick={() => setActiveDropdown(null)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" /> New Item
                </Link>
                <Link href="/purchases/orders" onClick={() => setActiveDropdown(null)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-slate-400" /> New Purchase Order
                </Link>
                <Link href="/sales/invoices" onClick={() => setActiveDropdown(null)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" /> New Invoice
                </Link>
              </div>
            )}
          </div>

          <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors">
            <Users className="w-5 h-5" />
          </button>
          
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
                  <p className="text-sm font-semibold text-slate-800">Admin User</p>
                  <p className="text-xs text-slate-500">admin@fastigo.ai</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-slate-400" /> My Profile
                </button>
                <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400" /> Preferences
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
