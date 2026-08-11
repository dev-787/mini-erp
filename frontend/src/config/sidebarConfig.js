import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileText,
  UserPlus,
  History,
} from 'lucide-react';

export const sidebarSections = [
  {
    id: 'overview',
    label: 'OVERVIEW',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'sales', 'warehouse', 'accounts'],
        breadcrumbName: 'Overview',
      },
    ],
  },
  {
    id: 'operations',
    label: 'OPERATIONS',
    items: [
      {
        id: 'customers',
        label: 'Customers',
        path: '/dashboard/customers',
        icon: Users,
        roles: ['admin', 'sales'],
        breadcrumbName: 'Customers',
      },
      {
        id: 'products',
        label: 'Products',
        path: '/dashboard/products',
        icon: Package,
        roles: ['admin', 'warehouse', 'sales'],
        breadcrumbName: 'Products',
      },
      {
        id: 'inventory',
        label: 'Inventory / Stock',
        path: '/dashboard/inventory',
        icon: Layers,
        roles: ['admin', 'warehouse'],
        breadcrumbName: 'Inventory',
      },
      {
        id: 'challans',
        label: 'Sales Challans',
        path: '/dashboard/challans',
        icon: FileText,
        roles: ['admin', 'sales', 'warehouse', 'accounts'],
        breadcrumbName: 'Sales Challans',
      },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    items: [
      {
        id: 'users',
        label: 'Users & Invites',
        path: '/dashboard/users',
        icon: UserPlus,
        roles: ['admin'],
        breadcrumbName: 'Users & Invites',
      },
      {
        id: 'audit-log',
        label: 'Audit Log',
        path: '/dashboard/audit-log',
        icon: History,
        roles: ['admin'],
        breadcrumbName: 'Audit Log',
      },
    ],
  },
];

/**
 * Utility helper to check if a role is permitted for a specific path
 */
export const isRoleAllowedForPath = (path, userRole) => {
  if (!userRole) return false;
  const normalizedRole = userRole.toLowerCase();

  // Find matching item in sidebarSections
  for (const section of sidebarSections) {
    for (const item of section.items) {
      if (item.path === path) {
        return item.roles.includes(normalizedRole);
      }
    }
  }

  // Default to true for path matches under /dashboard if not explicitly restricted
  return true;
};

/**
 * Utility helper to get breadcrumb title for a path
 */
export const getBreadcrumbForPath = (path) => {
  for (const section of sidebarSections) {
    for (const item of section.items) {
      if (item.path === path) {
        return item.breadcrumbName || item.label;
      }
    }
  }
  return 'Overview';
};
