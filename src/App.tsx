import React from 'react';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import LoginPage from './components/LoginPage';
import { ToastContainer } from './components/common/ToastContainer';
import { InvoicePrinterModal } from './components/common/InvoicePrinterModal';

import { DashboardModule } from './components/modules/DashboardModule';
import { ProductModule } from './components/modules/ProductModule';
import { OrderModule } from './components/modules/OrderModule';
import { CustomerModule } from './components/modules/CustomerModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { PaymentShippingModule } from './components/modules/PaymentShippingModule';
import { CMSModule } from './components/modules/CMSModule';
import { MarketingModule } from './components/modules/MarketingModule';
import { StaffModule } from './components/modules/StaffModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { RestrictedAccess } from './components/common/RestrictedAccess';
import { canAccessTab } from './lib/roles';

const MainLayout: React.FC = () => {
  const { currentTab, user } = useAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const restrictedLabels: Partial<Record<string, string>> = {
    cms: 'CMS & Page Builder',
    settings: 'Store Settings',
    staff: 'Staff Roles & Security',
    'users-roles': 'Staff Roles & Security',
    inventory: 'Inventory & Warehouses',
    'payment-shipping': 'Payment & Shipping',
  };
  const allowed = user ? canAccessTab(user.role, currentTab) : true;
  const restrictedLabel = restrictedLabels[currentTab];

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 font-sans transition-colors duration-200 flex flex-col selection:bg-indigo-500/30">
      {/* Minimal ambient glow for depth */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 h-[500px] w-[1000px] bg-indigo-500/[0.03] blur-[120px] pointer-events-none z-0" />

      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full transition-all overflow-y-auto overflow-x-hidden">
          {allowed && currentTab === 'dashboard' && <DashboardModule />}
          {allowed && currentTab === 'products' && <ProductModule />}
          {allowed && currentTab === 'orders' && <OrderModule />}
          {allowed && currentTab === 'customers' && <CustomerModule />}
          {allowed && currentTab === 'inventory' && <InventoryModule />}
          {allowed && currentTab === 'payment-shipping' && <PaymentShippingModule />}
          {allowed && currentTab === 'cms' && <CMSModule />}
          {allowed && currentTab === 'marketing' && <MarketingModule />}
          {allowed && (currentTab === 'staff' || currentTab === 'users-roles') && <StaffModule />}
          {allowed && currentTab === 'settings' && <SettingsModule />}
          {!allowed && <RestrictedAccess label={restrictedLabel} />}
        </main>
      </div>

      {/* Global Drawers, Modals & Toast Containers */}
      <ToastContainer />
      <InvoicePrinterModal />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, authChecked } = useAdmin();

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-300">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-semibold">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <AdminProvider>
      <AppContent />
    </AdminProvider>
  );
}
