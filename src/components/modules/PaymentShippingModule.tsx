import React, { useState } from 'react';
import {
  CreditCard,
  Truck,
  ShieldCheck,
  Globe,
  Plus,
  CheckCircle2,
  XCircle,
  Key,
  RefreshCw,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

export const PaymentShippingModule: React.FC = () => {
  const { paymentGateways, togglePaymentGateway, shippingZones, updateShippingZone, addToast } = useAdmin();

  const [activeTab, setActiveTab] = useState<'payments' | 'shipping' | 'carriers'>('payments');
  const [carrierTesting, setCarrierTesting] = useState(false);

  const testCarrierAPI = (carrierName: string) => {
    setCarrierTesting(true);
    setTimeout(() => {
      setCarrierTesting(false);
      addToast({
        type: 'success',
        title: 'Carrier API Connection Verified',
        message: `${carrierName} webhooks & real-time rate calculation active.`,
      });
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-100">
        <div>
          <p className="text-sm font-extrabold">Not Connected to live payment &amp; shipping systems</p>
          <p className="text-xs opacity-80">This tab is a demo. Changes here are not saved to the database and will reset on refresh. Configure real processors and carriers in the storefront.</p>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Payment & Shipping Gateway Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure credit card processors, regional shipping zones, flat/weight rules, and carrier APIs
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          {[
            { id: 'payments', label: 'Payment Gateways', icon: CreditCard },
            { id: 'shipping', label: 'Shipping Zones & Rules', icon: Globe },
            { id: 'carriers', label: 'Carrier API Integrations', icon: Truck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Gateways View */}
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paymentGateways.map((gw) => (
            <div
              key={gw.id}
              className={`rounded-3xl border p-6 shadow-xs transition-all ${
                gw.enabled
                  ? 'border-indigo-200 bg-white dark:border-indigo-900 dark:bg-slate-900'
                  : 'border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{gw.name}</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Fee: {gw.feePercentage}% per transaction
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gw.enabled}
                    onChange={() => togglePaymentGateway(gw.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Mode Environment</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                      gw.testMode
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {gw.testMode ? 'TEST / SANDBOX MODE' : 'LIVE PRODUCTION'}
                  </span>
                </div>

                {gw.apiKey && (
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Key className="h-3 w-3" /> API Publishable Key
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={gw.apiKey}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100/80 p-2 font-mono text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shipping Zones View */}
      {activeTab === 'shipping' && (
        <div className="space-y-6">
          {shippingZones.map((zone) => (
            <div key={zone.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-500" /> {zone.name}
                  </h3>
                  <p className="text-xs text-slate-500">Countries: {zone.countries.join(', ')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Shipping Rates</h4>
                {zone.methods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{method.name}</p>
                      <p className="text-[11px] text-slate-500">Type: {method.type}</p>
                    </div>
                    <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                      {method.rate === 0 ? 'FREE' : `₹${method.rate.toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Carriers Integration View */}
      {activeTab === 'carriers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {[
            { name: 'FedEx Express', code: 'FEDEX', status: 'Connected', logo: '📦' },
            { name: 'DHL International', code: 'DHL', status: 'Connected', logo: '✈️' },
            { name: 'BlueDart Logistics', code: 'BLUEDART', status: 'Connected', logo: '🚚' },
          ].map((carrier) => (
            <div key={carrier.code} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{carrier.logo}</span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{carrier.name}</h3>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">● {carrier.status}</span>
                </div>
              </div>

              <p className="text-slate-500">Auto-generates commercial tracking numbers and calculates real-time dimensional weight tariffs.</p>

              <button
                onClick={() => testCarrierAPI(carrier.name)}
                disabled={carrierTesting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 py-2.5 font-bold text-indigo-600 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                <RefreshCw className={`h-4 w-4 ${carrierTesting ? 'animate-spin' : ''}`} />
                Test API Connection
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
