import React from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  CreditCard,
  FileText,
  Megaphone,
  UserCheck,
  Settings,
  ChevronRight,
  Store,
} from 'lucide-react';
import { useAdmin, TabType } from '../context/AdminContext';

interface SidebarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  category: 'Main' | 'Operations' | 'Storefront' | 'System';
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileMenuOpen = false, setMobileMenuOpen }) => {
  const { currentTab, setCurrentTab, orders, inventoryItems, products, settings, staffUsers } = useAdmin();

  const currentUser = staffUsers[0] || {
    name: 'Admin',
    email: 'admin@example.com',
    roleName: 'Admin',
  };

  // Badges calculation
  const pendingOrdersCount = orders.filter(
    (o) => o.orderStatus === 'Pending' || o.orderStatus === 'Processing'
  ).length;

  const lowStockCount = inventoryItems.filter(
    (item) => item.status === 'Low Stock' || item.status === 'Out of Stock'
  ).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard & Analytics', icon: LayoutDashboard, category: 'Main' },
    { id: 'products', label: 'Product Catalog', icon: Package, badge: products.length, category: 'Main' },
    {
      id: 'orders',
      label: 'Orders & Refunds',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeColor: 'bg-indigo-500 text-white',
      category: 'Operations',
    },
    { id: 'customers', label: 'Customers & Reviews', icon: Users, category: 'Operations' },
    { id: 'payment-shipping', label: 'Payment & Shipping', icon: CreditCard, category: 'Storefront' },
    { id: 'cms', label: 'CMS & Page Builder', icon: FileText, category: 'Storefront' },
    { id: 'marketing', label: 'Marketing & Coupons', icon: Megaphone, category: 'Storefront' },
    { id: 'staff', label: 'Staff Roles & Security', icon: UserCheck, category: 'System' },
    { id: 'settings', label: 'Store Settings', icon: Settings, category: 'System' },
  ];

  const categories: NavItem['category'][] = ['Main', 'Operations', 'Storefront', 'System'];

  const handleSelectTab = (tab: TabType) => {
    setCurrentTab(tab);
    if (setMobileMenuOpen) setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shrink-0 overflow-y-auto ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6">
          {categories.map((cat) => {
            const items = navItems.filter((item) => item.category === cat);
            return (
              <div key={cat} className="space-y-1">
                <h3 className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {cat}
                </h3>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.badge !== undefined && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              item.badgeColor
                                ? item.badgeColor
                                : isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer Admin User Card */}
        <div className="mt-auto border-t border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3 rounded-lg p-2 bg-slate-100/80 border border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-xs">
              {currentUser.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser.roleName}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

