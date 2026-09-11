import { User } from '@/shared/store/auth.store';

// Map of route prefixes to their required logical module/permission names
// Note: These must match the module titles in Sidebar.tsx (e.g., 'Purchases', 'Items', 'Site Portal')
export const ROUTE_PERMISSIONS_MAP: Record<string, string[]> = {
  '/di': ['Purchases'],
  '/purchases': ['Purchases'],
  '/items': ['Items'],
  '/reports': ['Reports'],
  '/documents': ['Documents'],
  '/store': ['Stock Inward', 'Stock Outward'],
  '/settings': ['Settings', 'System Admin'],
  '/ho-billing': ['HO Billing Portal'],
  '/site-portal': ['Site Portal'],
  '/pm-portal': ['Project Manager Portal'],
  '/pd-portal': ['Project Director Portal'],
  '/billing': ['Billing']
};

export const hasAccessToRoute = (pathname: string, user: User | null): boolean => {
  if (!user) return false;

  // 1. Unrestricted routes
  if (pathname === '/' || pathname === '/login' || pathname.startsWith('/unauthorized')) {
    return true;
  }

  // 2. Identify the base route prefix
  const matchedPrefix = Object.keys(ROUTE_PERMISSIONS_MAP).find(prefix => 
    pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)
  );

  // If the route doesn't have explicit protections, assume it's open
  if (!matchedPrefix) {
    return true;
  }

  const requiredModules = ROUTE_PERMISSIONS_MAP[matchedPrefix];

  // 3. User Role and Permissions Check
  const permissions: string[] = user.role?.permissions || [];
  
  // Super Admin check
  if (permissions.includes('*') || user.role?.name === 'Super Admin') {
    return true;
  }

  // Backward compatibility for Store Manager
  if (user.role?.name === 'Store Manager') {
    return ['Stock Inward', 'Stock Outward'].some(mod => requiredModules.includes(mod));
  }

  // Project Manager and Project Director special logic
  if (user.role?.name === 'Project Manager') {
    return ['Project Manager Portal', 'Reports', 'Items'].some(mod => requiredModules.includes(mod));
  }
  
  if (user.role?.name === 'Project Director') {
    return ['Project Director Portal', 'Reports', 'Items'].some(mod => requiredModules.includes(mod));
  }

  // Main role-based check against the required modules for this route
  // If the user has *any* of the required module permissions for this route, grant access
  const hasPermission = requiredModules.some(mod => permissions.includes(mod));
  
  if (hasPermission) return true;

  // Edge cases (e.g., newly added billing module might fallback to site portal)
  if (requiredModules.includes('Billing') && permissions.includes('Site Portal')) {
    return true;
  }

  // System Admin specific logic
  if (requiredModules.includes('System Admin') && (permissions.includes('roles:manage') || permissions.includes('users:manage'))) {
      return true;
  }

  return false;
};
