import type { TabType } from '../context/AdminContext';

export const RESTRICTED_MESSAGE = 'RESTRICTED: Only super_admin can access these settings';

export type RoleKey = 'super_admin' | 'store_manager' | 'fulfillment' | 'support' | 'editor';

const ROLE_ALIASES: Record<string, RoleKey> = {
  super_admin: 'super_admin',
  'super admin': 'super_admin',
  admin: 'super_admin',
  owner: 'super_admin',
  store_manager: 'store_manager',
  'store manager': 'store_manager',
  manager: 'store_manager',
  fulfillment: 'fulfillment',
  fulfillment_specialist: 'fulfillment',
  'fulfillment specialist': 'fulfillment',
  'fulfillment-specialist': 'fulfillment',
  support: 'support',
  customer_support: 'support',
  'customer support': 'support',
  support_staff: 'support',
  editor: 'editor',
  content_editor: 'editor',
  contenteditor: 'editor',
};

export function normalizeRole(role?: string | null): RoleKey {
  if (!role) return 'editor';
  const key = role.trim().toLowerCase().replace(/\s+/g, ' ');
  return ROLE_ALIASES[key] || 'editor';
}

export function isSuperAdmin(role?: string | null): boolean {
  return normalizeRole(role) === 'super_admin';
}

export const ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: 'Super Admin',
  store_manager: 'Store Manager',
  fulfillment: 'Fulfillment Specialist',
  support: 'Customer Support',
  editor: 'Editor',
};

const ALL_TABS: TabType[] = [
  'dashboard',
  'products',
  'orders',
  'customers',
  'inventory',
  'payment-shipping',
  'cms',
  'marketing',
  'staff',
  'users-roles',
  'settings',
];

const TAB_ACCESS: Record<RoleKey, TabType[]> = {
  super_admin: ALL_TABS,
  store_manager: [
    'dashboard',
    'products',
    'orders',
    'customers',
    'inventory',
    'payment-shipping',
    'marketing',
  ],
  fulfillment: ['dashboard', 'products', 'orders', 'inventory'],
  support: ['dashboard', 'orders', 'customers'],
  editor: ['dashboard', 'products', 'cms', 'marketing'],
};

export function canAccessTab(role: string | null | undefined, tab: TabType): boolean {
  return TAB_ACCESS[normalizeRole(role)].includes(tab);
}
