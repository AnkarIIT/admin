import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Store,
  User,
  Shield,
  Download,
  RotateCcw,
  Menu,
  X,
  AlertTriangle,
  ShoppingBag,
  Plus,
  Settings2,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

interface HeaderProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ mobileMenuOpen = false, setMobileMenuOpen }) => {
  const {
    darkMode,
    toggleDarkMode,
    searchQuery,
    setSearchQuery,
    inventoryItems,
    orders,
    settings,
    staffUsers,
    resetToDefaults,
    exportBackupJSON,
    setCurrentTab,
    user,
  } = useAdmin();

  const currentUser = user
    ? { name: user.name, email: user.email, roleName: user.role }
    : staffUsers[0] || {
        name: 'Admin',
        email: 'admin@example.com',
        roleName: 'Admin',
      };

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Compute low stock items
  const lowStockItems = inventoryItems.filter(
    (item) => item.status === 'Low Stock' || item.status === 'Out of Stock'
  );

  // Compute pending orders
  const pendingOrders = orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Processing');

  const totalAlerts = lowStockItems.length + pendingOrders.length;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 shrink-0">
      {/* Left section: Logo & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileMenuOpen && setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-lg shadow-xs">
            {settings.storeName ? settings.storeName.charAt(0).toUpperCase() : 'E'}
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              {settings.storeName || 'ECOM-OS'}
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Admin OS</p>
          </div>
        </div>
      </div>

      {/* Middle section: Global Search */}
      <div className="hidden md:flex flex-1 max-w-sm mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders, products, customers..."
            className="w-full rounded-full border border-transparent bg-slate-100 pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right section: Quick stats, Actions, User */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Live Visitor Indicator */}
        <div className="hidden xl:flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-indigo-600 dark:text-indigo-400">Live Orders</span>
        </div>



        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {totalAlerts > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Notification Popover Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-88 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold uppercase text-slate-900 dark:text-white tracking-wider">Store Alerts</h3>
                </div>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  {totalAlerts} New
                </span>
              </div>

              <div className="mt-3 max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
                {lowStockItems.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
                      Inventory Alerts
                    </h4>
                    {lowStockItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setCurrentTab('inventory');
                          setShowNotifications(false);
                        }}
                        className="flex items-center justify-between rounded-lg p-2 bg-rose-50 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40 cursor-pointer hover:bg-rose-100/60 transition-colors"
                      >
                        <span className="text-xs font-semibold text-slate-900 dark:text-rose-200">{item.productName}</span>
                        <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded">
                          {item.quantity} LEFT
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {pendingOrders.length > 0 && (
                  <div className="pt-2">
                    <h4 className="font-semibold text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
                      Pending Orders
                    </h4>
                    {pendingOrders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => {
                          setCurrentTab('orders');
                          setShowNotifications(false);
                        }}
                        className="flex items-center justify-between rounded-lg p-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        <div>
                          <p className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-xs">{ord.id}</p>
                          <p className="text-[11px] text-slate-500">{ord.customerName}</p>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{settings.currencySymbol || '₹'}{ord.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="relative group flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all cursor-pointer"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300 transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-xs">
              {currentUser.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'A'}
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900 z-50">
              <div className="border-b border-slate-100 p-2.5 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                <span className="mt-1 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  {currentUser.roleName}
                </span>
              </div>

              <div className="p-1 space-y-1 text-xs">
                <button
                  onClick={() => {
                    exportBackupJSON();
                    setShowProfileMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-500" /> Export JSON
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('settings');
                    setShowProfileMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Settings2 className="h-3.5 w-3.5 text-slate-500" /> Settings & Security
                </button>
                <button
                  onClick={() => {
                    resetToDefaults();
                    setShowProfileMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    <RotateCcw className="h-3.5 w-3.5" /> Reload Data from DB
                  </button>
                </div>
              </div>
          )}
        </div>
      </div>
    </header>
  );
};

