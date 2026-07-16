"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Package, 
  Archive, 
  ShoppingCart, 
  ShoppingBag, 
  BarChart2, 
  Folder, 
  MoreHorizontal, 
  Layers, 
  ChevronRight, 
  ChevronDown,
  Circle,
  Plus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItem {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Home',
    href: '/',
    icon: <Home className="w-5 h-5" />
  },
  {
    title: 'Items',
    icon: <Package className="w-5 h-5" />,
    children: [
      { title: 'Items', href: '/items' },
      { title: 'Item Groups', href: '/items/groups' },
    ]
  },
  {
    title: 'Inventory',
    icon: <Archive className="w-5 h-5" />,
    children: [
      { title: 'Adjustments', href: '/inventory/adjustments' }
    ]
  },
  {
    title: 'Sales',
    icon: <ShoppingCart className="w-5 h-5" />,
    children: [
      { title: 'Invoices', href: '/sales/invoices' },
      { title: 'Sales Orders', href: '/sales/orders' }
    ]
  },
  {
    title: 'Purchases',
    icon: <ShoppingBag className="w-5 h-5" />,
    children: [
      { title: 'Purchase Orders', href: '/purchases/orders' },
      { title: 'Purchase Receives', href: '/purchases/receives' }
    ]
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: <BarChart2 className="w-5 h-5" />
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: <Folder className="w-5 h-5" />
  },
  {
    title: 'Custom Modules',
    icon: <MoreHorizontal className="w-5 h-5" />,
    children: [
      { title: 'Module 1', href: '/modules/1' }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Items': true // Default expanded
  });

  const toggleExpand = (title: string) => {
    setExpanded(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const isActive = (href?: string) => pathname === href;
  
  const isChildActive = (children?: NavItem[]) => {
    if (!children) return false;
    return children.some(child => pathname === child.href);
  };

  return (
    <aside className="w-64 bg-[#f8f9fc] border-r border-slate-200 flex flex-col h-screen overflow-y-auto shrink-0">
      <div className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const hasChildren = !!item.children;
          const isItemExpanded = expanded[item.title];
          const active = isActive(item.href) || (hasChildren && isChildActive(item.children));

          return (
            <div key={item.title}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 flex justify-center">
                      {isItemExpanded ? (
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                    {item.icon}
                    <span>{item.title}</span>
                  </div>
                </button>
              ) : (
                <Link
                  href={item.href || '#'}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    active 
                      ? (item.title === 'Home' ? "bg-[#3b82f6] text-white" : "bg-blue-50 text-blue-700") 
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <div className={cn("w-4 flex justify-center", active && item.title === 'Home' ? "text-white" : "text-slate-500")}>
                     {/* Empty div for alignment if needed, or we can just render icon directly */}
                  </div>
                  {React.cloneElement(item.icon as React.ReactElement, { 
                    className: cn("w-4 h-4", active && item.title === 'Home' ? "text-white" : "text-slate-500") 
                  })}
                  <span>{item.title}</span>
                </Link>
              )}

              {/* Children (Dropdown) */}
              {hasChildren && isItemExpanded && (
                <div className="mt-1 space-y-1 pb-1">
                  {item.children!.map((child) => (
                    <Link
                      key={child.title}
                      href={child.href || '#'}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors ml-10 mr-3",
                        isActive(child.href)
                          ? "bg-[#3b82f6] text-white font-medium shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <span>{child.title}</span>
                      {isActive(child.href) && <Plus className="w-4 h-4 text-white opacity-80 hover:opacity-100" />}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* APPS Section */}
        <div className="pt-6 pb-2">
          <p className="px-10 text-xs font-semibold text-slate-400 tracking-wider">APPS</p>
        </div>
        <Link
          href="/payments"
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors pl-10",
            isActive('/payments') ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <Layers className="w-5 h-5 text-slate-500" />
          <span>Zoho Payments</span>
        </Link>
      </div>

      {/* Footer Button */}
      <div className="p-4 bg-[#f8f9fc]">
        <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700">
          <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />
          TAKE A LIVE PRODUCT TOUR
        </button>
      </div>
    </aside>
  );
}
