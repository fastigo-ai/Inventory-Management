/**
 * Translates API routes to Human-Readable "Modules" or T-Codes for Audit Logs.
 */
export const getModuleNameFromRoute = (route: string, method: string): string => {
  if (!route) return '';

  const path = route.split('?')[0].toLowerCase();

  // ----- PURCHASES -----
  if (path.includes('/api/purchases/orders')) return 'Purchase Orders';
  if (path.includes('/api/purchases/invoices')) return 'Purchase Invoices';
  if (path.includes('/api/purchases/vendors')) return 'Vendors Directory';

  // ----- STORE / INVENTORY -----
  if (path.includes('/api/store/receipts')) {
    if (path.includes('/import') || path.includes('/bulk')) return 'Store Inward (Bulk Import)';
    return 'Store Inward';
  }
  if (path.includes('/api/store/issues')) return 'Store Issue (Contractor)';
  if (path.includes('/api/store/returns')) return 'Store Return (Contractor)';
  if (path.includes('/api/store/demand-notes')) return 'Demand Notes (Store)';
  if (path.includes('/api/store/transfers/dispatch')) return 'Stock Transfer (Dispatch)';
  if (path.includes('/api/store/transfers/receive')) return 'Stock Transfer (Receipt)';

  // ----- DI (Dispatch Instructions) -----
  if (path.includes('/api/di')) {
    if (path.includes('/import')) return 'DI (Bulk Import)';
    return 'Dispatch Instructions (DI)';
  }

  // ----- SITE OPERATIONS -----
  if (path.includes('/api/site/jmc')) return 'JMC Register';
  if (path.includes('/api/site/wip')) return 'WIP Status';
  if (path.includes('/api/site/mhrov')) return 'MHROV (Material Handover)';
  
  // ----- BILLING -----
  if (path.includes('/api/billing/client')) return 'Client Billing';
  if (path.includes('/api/billing/contractor')) return 'Contractor Billing';

  // ----- MASTERS -----
  if (path.includes('/api/items')) return 'Item Master';
  if (path.includes('/api/users')) return 'User Management';
  if (path.includes('/api/roles')) return 'Roles & Permissions';
  if (path.includes('/api/locations')) return 'Location Master';

  // Default fallback
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 2) {
     const cleanModule = segments[1].replace(/-/g, ' ');
     return cleanModule.charAt(0).toUpperCase() + cleanModule.slice(1);
  }

  return 'System Request';
};
