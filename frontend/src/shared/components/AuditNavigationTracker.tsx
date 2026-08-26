'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackAuditEvents } from '@/features/audit/api/audit.api';

const getModuleFromPath = (path: string): string => {
  if (path.includes('/site-portal/demand-notes')) return 'Demand Notes (Site Portal)';
  if (path.includes('/pm-portal/demand-notes')) return 'Demand Notes (PM Portal)';
  if (path.includes('/pd-portal/demand-notes')) return 'Demand Notes (PD Portal)';
  if (path.includes('/store/demand-notes')) return 'Demand Notes (Store)';
  if (path.includes('/site-portal/incoming-work-orders')) return 'Incoming Work Orders';
  if (path.includes('/site-portal/jmc-register')) return 'JMC Register';
  if (path.includes('/site-portal/wip-consumed')) return 'WIP Consumed';
  if (path.includes('/site-portal/wip-required')) return 'WIP Required';
  if (path.includes('/site-portal/mhrov')) return 'MHROV';
  if (path.includes('/site-portal/contractor-billing')) return 'Contractor Billing';
  if (path.includes('/site-portal/contractor-summary')) return 'Site Contractor Summary';
  if (path.includes('/store/contractor-issue')) return 'Contractor Issue (Store)';
  if (path.includes('/store/contractor-return')) return 'Contractor Return (Store)';
  if (path.includes('/store/inventory')) return 'Store Inventory';
  if (path.includes('/store/transfers')) return 'Store Transfers';
  if (path.includes('/purchases/invoices')) return 'Purchase Invoices';
  if (path.includes('/purchases/orders')) return 'Purchase Orders';
  if (path.includes('/di')) return 'Dispatch Instructions';
  if (path.includes('/ho-billing')) return 'HO Billing';
  if (path.includes('/reports')) return 'Reports';
  if (path.includes('/items')) return 'Item Master';
  if (path.includes('/contractors')) return 'Contractors';
  if (path.includes('/settings')) return 'Settings';
  if (path === '/' || path === '') return 'Dashboard';
  return 'App';
};

/**
 * AuditNavigationTracker
 * Automatically logs a VIEW event every time the user navigates to a new page.
 * Mount this once in the root layout.
 */
export default function AuditNavigationTracker() {
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    const module = getModuleFromPath(pathname);
    trackAuditEvents([{
      action: 'NAVIGATE',
      entityType: 'Page',
      page: pathname,
      route: pathname,
      module,
      label: module,
      description: `Navigated to: ${module} (${pathname})`,
      timestamp: new Date().toISOString(),
      status: 'success',
    }]).catch(() => {});
  }, [pathname]);

  return null;
}
