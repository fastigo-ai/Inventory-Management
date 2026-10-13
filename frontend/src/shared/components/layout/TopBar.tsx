"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  RotateCw, 
  Plus, 
  Users, 
  Bell, 
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
import { getUnregularizedExtraIssues } from '@/features/contractors/api/contractors.api';

export function TopBar() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for dropdowns
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [unregularizedExtras, setUnregularizedExtras] = useState<any[]>([]);
  
  const { toggleMobileSidebar, toggleDesktopSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  
  const topBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      getUnregularizedExtraIssues()
        .then(res => {
          if (res && res.success && res.data) {
            const list = Array.isArray(res.data) ? res.data : (res.data?.unregularizedIssues || []);
            setUnregularizedExtras(list);
          }
        })
        .catch(() => {});
    }
  }, [user]);

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
    } catch (err) {
      // Just warn, don't error so Next.js doesn't show an overlay if backend is down
      console.warn('Logout failed or backend unreachable');
    } finally {
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
          onClick={() => {
            if (window.innerWidth < 768) {
              toggleMobileSidebar();
            } else {
              toggleDesktopSidebar();
            }
          }}
          className="p-2 -ml-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-md transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Package className="w-6 h-6 text-blue-400 flex-shrink-0" />
          <span className="hidden sm:block font-bold text-lg tracking-wide whitespace-nowrap">
            {user?.role?.name === 'Store Manager' ? 'Store Manager Portal' : 'Inventory'}
          </span>
        </Link>
        
        {user?.role?.name === 'Store Manager' && (user?.assignedCircle || (user as any)?.assignedSubcircle) && (
          <div className="hidden md:flex items-center ml-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold tracking-wider uppercase shadow-sm">
            {(user as any)?.assignedSubcircle || user.assignedCircle} Store
          </div>
        )}
        
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
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unregularizedExtras.length > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center px-1 border border-slate-900 shadow-sm animate-pulse">
                  {unregularizedExtras.length}
                </span>
              ) : (
                <span className="absolute top-2 right-2 w-2 h-2 bg-slate-500/50 rounded-full"></span>
              )}
            </button>
            {activeDropdown === 'notifications' && (
              <div className="absolute top-10 right-0 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 text-slate-700 z-50 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 text-sm">Notifications</span>
                    {unregularizedExtras.length > 0 && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                        {unregularizedExtras.length} new
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {unregularizedExtras.length > 0 ? (
                    unregularizedExtras.map((item: any) => {
                      const minNumber = item.minNo || item.assignmentNumber;
                      const contractor = item.contractorId?.name || item.contractorId?.dynamicData?.displayName || item.contractorFarmName || 'Contractor';
                      const extraCount = (item.lineItems || []).filter((li: any) => li.isExtra || Number(li.quantity) > Number(li.demandQty || 0)).length;

                      return (
                        <Link 
                          key={item._id}
                          href={`/site-portal/demand-notes?openExtraModal=${item._id}`}
                          onClick={() => setActiveDropdown(null)}
                          className="p-3 hover:bg-amber-50/60 flex flex-col gap-1 transition-colors block text-left"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              Over-Issue: {minNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {new Date(item.minDate || item.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-1">
                            {contractor} &bull; {extraCount} extra material(s) issued
                          </p>
                          <span className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 mt-0.5">
                            Demand Extra Qty & Regularize &rarr;
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="p-5 text-center text-xs text-slate-500">
                      No new notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          
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
