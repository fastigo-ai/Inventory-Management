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
  Plus,
  Shield
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuthStore } from '@/shared/store/auth.store';

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
      { title: 'Store Manager Data', href: '/items/store-manager' },
    ]
  },
  {
    title: 'Purchases',
    icon: <ShoppingBag className="w-5 h-5" />,
    children: [
      { title: 'Vendors', href: '/purchases/vendors' },
      { title: 'Purchase Orders', href: '/purchases/orders' },
      { title: 'DI Registrations', href: '/di' },
      { title: 'Purchase Invoices', href: '/purchases/receives' }
    ]
  },
  {
    title: 'Reports',
    icon: <BarChart2 className="w-5 h-5" />,
    children: [
      { title: 'Dashboard', href: '/reports' },
      { title: 'Activity Logs', href: '/reports/activity' },
      { title: 'Item Summary', href: '/reports/item-summary' }
    ]
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: <Folder className="w-5 h-5" />
  },
  {
    title: 'Store Portal',
    icon: <Archive className="w-5 h-5" />,
    children: [
      { title: 'Store Receipts', href: '/store/receipts' },
      { title: 'Inward Registration', href: '/store/inventory' },
      { title: 'Inter-Store Transfers', href: '/store/transfers' },
      { title: 'Outward Register', href: '/store/outward-register' },
      { title: 'Contractor Assignments', href: '/contractors' }
    ]
  },
  {
    title: 'Settings',
    icon: <Folder className="w-5 h-5" />,
    children: [
      { title: 'Item Preferences', href: '/settings/preferences/items' },
      { title: 'Locations', href: '/settings/locations' },
      { title: 'Billing Companies', href: '/settings/billing-companies' },
      { title: 'Store Managers', href: '/settings/store-managers' }
    ]
  },
  {
    title: 'System Admin',
    icon: <Shield className="w-5 h-5" />,
    children: [
      { title: 'User Management', href: '/settings/users' },
      { title: 'Roles & Permissions', href: '/settings/roles' }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href?: string) => pathname === href;
  
  const isChildActive = (children?: NavItem[]) => {
    if (!children) return false;
    return children.some(child => pathname === child.href);
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = { 'Items': true };
    navItems.forEach(item => {
      if (item.children && isChildActive(item.children)) {
        initialState[item.title] = true;
      }
    });
    return initialState;
  });

  const toggleExpand = (title: string) => {
    setExpanded(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const { user } = useAuthStore();
  
  // Super Admins have the '*' permission
  const permissions = user?.role?.permissions || [];
  const isSuperAdmin = permissions.includes('*') || user?.role?.name === 'Super Admin';
  const isStoreManager = user?.role?.name === 'Store Manager';

  // Determine visibility based on permissions
  const visibleNavItems = navItems.filter(item => {
    // Super Admins see everything
    if (isSuperAdmin) return true;

    // Backward compatibility for existing hardcoded Store Manager logic
    if (isStoreManager) {
      return item.title === 'Store Portal';
    }

    // Role-based filtering based on module names
    if (permissions.includes(item.title)) {
      return true;
    }

    // Always show Home by default
    if (item.title === 'Home') return true;

    // For System Admin block, require specific roles:manage or users:manage permission
    if (item.title === 'System Admin') {
      return permissions.includes('roles:manage') || permissions.includes('users:manage');
    }

    return false;
  });

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-y-auto shrink-0 shadow-lg text-slate-300 transition-colors">
      <div className="flex-1 py-6 px-4 space-y-2">
        {visibleNavItems.map((item) => {
          const hasChildren = !!item.children;
          const isItemExpanded = expanded[item.title];
          const active = isActive(item.href) || (hasChildren && isChildActive(item.children));

          return (
            <div key={item.title}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.title)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                    active 
                      ? "bg-blue-600/10 text-blue-400" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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
                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                    active
                      ? "bg-blue-600/10 text-blue-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  <div className="w-4 flex justify-center text-slate-500">
                    {/* Empty div for alignment if needed, or we can just render icon directly */}
                  </div>
                  {item.icon && React.cloneElement(item.icon as React.ReactElement<any>, { 
                    className: cn("w-5 h-5", active ? "text-blue-400" : "text-slate-400") 
                  })}
                  <span>{item.title}</span>
                </Link>
              )}

              {/* Children (Dropdown) */}
              {hasChildren && isItemExpanded && (
                <div className="mt-1 space-y-1 pb-1 relative before:absolute before:inset-y-0 before:left-[21px] before:w-px before:bg-slate-800">
                  {item.children!.map((child) => (
                    <Link
                      key={child.title}
                      href={child.href || '#'}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ml-10 mr-3 relative before:absolute before:top-1/2 before:-translate-y-1/2 before:-left-[19px] before:w-[4px] before:h-[4px] before:bg-slate-700 before:rounded-full",
                        isActive(child.href)
                          ? "bg-blue-600/10 text-blue-400 font-medium before:bg-blue-500 before:w-[6px] before:h-[6px] before:-left-[20px]"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      )}
                    >
                      <span>{child.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      </div>

      {/* Footer Button */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 border border-slate-700 rounded-full shadow-sm hover:bg-slate-700 transition-colors text-xs font-semibold text-slate-300">
          <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />
          TAKE A LIVE PRODUCT TOUR
        </button>
      </div>
    </aside>
  );
}
