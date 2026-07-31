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

const MainLayout: React.FC = () => {
  const { currentTab } = useAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col">
      {/* Top Fixed Utility Navigation Header */}
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Responsive Navigation Sidebar */}
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

        {/* Main Content Workspace Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all overflow-y-auto">
          {currentTab === 'dashboard' && <DashboardModule />}
          {currentTab === 'products' && <ProductModule />}
          {currentTab === 'orders' && <OrderModule />}
          {currentTab === 'customers' && <CustomerModule />}
          {currentTab === 'payment-shipping' && <PaymentShippingModule />}
          {currentTab === 'cms' && <CMSModule />}
          {currentTab === 'marketing' && <MarketingModule />}
          {(currentTab === 'staff' || currentTab === 'users-roles') && <StaffModule />}
          {currentTab === 'settings' && <SettingsModule />}
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
