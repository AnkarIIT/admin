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
  Lock,
} from 'lucide-react';
import { useAdmin, TabType } from '../context/AdminContext';
import { canAccessTab, RESTRICTED_MESSAGE } from '../lib/roles';

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
  const { currentTab, setCurrentTab, orders, inventoryItems, products, settings, staffUsers, user, addToast } = useAdmin();

  const currentUser = user
    ? {
        name: user.name,
        email: user.email,
        roleName: user.role,
      }
    : staffUsers[0] || {
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
    { id: 'inventory', label: 'Inventory & Warehouses', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined, badgeColor: 'bg-amber-500 text-white', category: 'Operations' },
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
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0a0a0c] border-r border-white/5 text-slate-400 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shrink-0 flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 p-6 space-y-10 overflow-y-auto scrollbar-hide">
          {categories.map((cat) => {
            const items = navItems.filter((item) => item.category === cat);
            return (
              <div key={cat} className="space-y-2">
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-700">
                  {cat}
                </h3>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    const allowed = canAccessTab(user?.role, item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!allowed) {
                            addToast({ type: 'warning', title: 'Access Restricted', message: RESTRICTED_MESSAGE });
                          }
                          handleSelectTab(item.id);
                        }}
                        className={`group relative flex w-full items-center justify-between rounded-xl pl-5 pr-3 py-2.5 text-[13px] font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'text-white bg-white/[0.03] shadow-lg shadow-black/20 border border-white/5'
                            : allowed
                            ? 'hover:text-white hover:bg-white/[0.015]'
                            : 'text-slate-700 grayscale cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-300'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!allowed && <Lock className="h-3 w-3 text-slate-700" />}
                          {item.badge !== undefined && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                                item.badgeColor
                                  ? item.badgeColor
                                  : isActive
                                  ? 'bg-indigo-500/20 text-indigo-400'
                                  : 'bg-white/5 text-slate-500 group-hover:text-slate-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {isActive && (
                          <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Admin User Card - Minimalist */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 font-bold text-white text-xs shadow-lg shadow-indigo-500/10">
                {currentUser.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'A'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0a0c]" />
            </div>
            <div className="overflow-hidden space-y-0.5">
              <div className="text-[13px] font-semibold text-white truncate leading-none">{currentUser.name}</div>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate">{currentUser.roleName}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
