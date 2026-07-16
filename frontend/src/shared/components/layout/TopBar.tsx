import React from 'react';
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
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

export function TopBar() {
  return (
    <header className="h-14 bg-[#2b3040] text-white flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
      {/* Left side: Logo & Search */}
      <div className="flex items-center gap-6 flex-1">
        <Link href="/" className="flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg tracking-wide">Inventory</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
            <RotateCw className="w-4 h-4 text-slate-300" />
          </button>
          
          <div className="relative flex items-center group w-96">
            <div className="absolute left-3 flex items-center gap-1.5 text-slate-400">
              <Search className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </div>
            <input 
              type="text" 
              placeholder="Search in Customers ( / )" 
              className="w-full bg-[#1c2130] border border-white/10 rounded-md py-1.5 pl-12 pr-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-4 text-sm text-slate-300">
        <div className="flex items-center gap-3 pr-4 border-r border-white/10 h-6">
          <span>Your premium trial pla...</span>
          <a href="#" className="text-blue-400 font-medium hover:text-blue-300 transition-colors">Subscribe</a>
          <div className="flex items-center gap-1 cursor-pointer hover:text-white ml-2">
            <span>Fastigo AI</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button className="w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors ml-2 shadow-sm">
            <Plus className="w-5 h-5" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors">
            <Users className="w-5 h-5" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center ml-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors flex items-center justify-center text-slate-700">
               <User className="w-5 h-5 text-slate-600" />
            </div>
          </button>
          <button className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-md transition-colors ml-1">
            <Grid className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
