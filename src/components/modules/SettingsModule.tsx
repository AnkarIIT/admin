import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Store,
  DollarSign,
  Bell,
  Key,
  Globe,
  Save,
  Check,
  Plus,
  Sun,
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { api } from '../../api';

export const SettingsModule: React.FC = () => {
  const { settings, updateSettings, addToast, darkMode, toggleDarkMode, user } = useAdmin();
  const [activeTab, setActiveTab] = useState<'store' | 'tax' | 'notifications' | 'appearance' | 'api' | 'security'>('store');
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<{ secret: string; uri: string; qr?: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [formData, setFormData] = useState({
    ...settings,
    notifications: settings.notifications || {},
  });

  // API Keys list
  const [apiKeys, setApiKeys] = useState(settings.apiKeys || []);
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    let ignore = false;

    if (!user?.email) {
      setTotpEnabled(false);
      setTotpSetupData(null);
      return;
    }

    const loadTotpStatus = async () => {
      try {
        const response = await api.totpStatus(user.email!);
        if (!ignore) {
          setTotpEnabled(Boolean(response?.enabled));
        }
      } catch (error) {
        if (!ignore) {
          setTotpEnabled(false);
        }
      }
    };

    loadTotpStatus();

    return () => {
      ignore = true;
    };
  }, [user?.email]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    addToast({ type: 'success', title: 'Settings Saved', message: 'Store preferences updated successfully.' });
  };

  const generateApiKey = () => {
    if (!newKeyName.trim()) return;
    const newKey = {
      id: 'key-' + Date.now(),
      name: newKeyName,
      key: 'omni_live_sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      created: new Date().toISOString().substring(0, 10),
    };
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    addToast({ type: 'success', title: 'API Key Generated', message: `Key created for ${newKeyName}` });
  };

  const handleTotpSetup = async () => {
    if (!user?.email) {
      addToast({ type: 'error', title: 'Admin email required', message: 'Please sign in again to connect an authenticator app.' });
      return;
    }

    setTotpLoading(true);
    setTotpError('');
    setTotpSetupData(null);

    try {
      const response = await api.totpSetup(user.email);
      setTotpSetupData(response);
      setTotpCode('');
    } catch (error: any) {
      setTotpError(error?.message || 'Unable to start TOTP setup.');
      addToast({ type: 'error', title: 'TOTP setup failed', message: error?.message || 'Unable to start TOTP setup.' });
    } finally {
      setTotpLoading(false);
    }
  };

  const handleTotpConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.email) {
      addToast({ type: 'error', title: 'Admin email required', message: 'Please sign in again to finish the setup.' });
      return;
    }

    if (!totpCode.trim()) {
      setTotpError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setTotpLoading(true);
    setTotpError('');

    try {
      await api.totpConfirm(user.email, totpCode.trim());
      setTotpEnabled(true);
      setTotpSetupData(null);
      setTotpCode('');
      addToast({ type: 'success', title: 'TOTP enabled', message: 'Your authenticator app is now connected.' });
    } catch (error: any) {
      setTotpError(error?.message || 'The verification code was invalid.');
      addToast({ type: 'error', title: 'Verification failed', message: error?.message || 'The verification code was invalid.' });
    } finally {
      setTotpLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Global Store Settings & System Operations
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure regional currency, tax rules, automated webhooks, and third-party developer API keys
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          {[
            { id: 'store', label: 'Store Profile', icon: Store },
            { id: 'tax', label: 'Currency & Tax', icon: DollarSign },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'appearance', label: 'Theme & Styling', icon: Palette },
            { id: 'api', label: 'Developer API Keys', icon: Key },
            { id: 'security', label: 'Security', icon: ShieldCheck },
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

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* Store Profile View */}
        {activeTab === 'store' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Store Identity</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Store Name</label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Support Phone</label>
                <input
                  type="text"
                  value={formData.supportPhone}
                  onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Physical Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Currency & Tax View */}
        {activeTab === 'tax' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Currency & Tax Rules</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Default Store Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="USD">$ USD - United States Dollar</option>
                  <option value="EUR">€ EUR - Euro</option>
                  <option value="GBP">£ GBP - British Pound</option>
                  <option value="INR">₹ INR - Indian Rupee</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Sales Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notifications View */}
        {activeTab === 'notifications' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Email Webhook Notifications</h3>

            <div className="space-y-3">
              {[
                { id: 'orderConfirmation', label: 'Order Confirmation Email to Customer' },
                { id: 'lowStockAlerts', label: 'Low Stock Alert Email to Warehouse Managers' },
                { id: 'refundNotifications', label: 'Refund Receipt Trigger to Customer' },
              ].map((notif) => (
                <div key={notif.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                  <span className="font-bold text-slate-900 dark:text-white">{notif.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean((formData.notifications as Record<string, boolean>)[notif.id])}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notifications: { ...(formData.notifications || {}), [notif.id]: e.target.checked },
                      })
                    }
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Appearance & Theme View */}
        {activeTab === 'appearance' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Dashboard Theme & Color Mode</h3>
            <p className="text-slate-500 text-xs">Customize the interface visual theme and light/dark color mode preferences.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (darkMode) toggleDarkMode();
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  !darkMode
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-600">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Light Theme</div>
                    <div className="text-[11px] opacity-75">Clean, bright high-contrast visual display</div>
                  </div>
                </div>
                {!darkMode && <Check className="h-5 w-5 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!darkMode) toggleDarkMode();
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  darkMode
                    ? 'border-indigo-500 bg-indigo-950/40 text-white font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
                    <Moon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm">Dark Theme</div>
                    <div className="text-[11px] opacity-75">Eye-friendly, sleek slate night theme</div>
                  </div>
                </div>
                {darkMode && <Check className="h-5 w-5 text-indigo-400" />}
              </button>
            </div>
          </div>
        )}

        {/* Security View */}
        {activeTab === 'security' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Two-Factor Authentication
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Connect an authenticator app such as Google Authenticator or Microsoft Authenticator to secure this admin account.
                </p>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${totpEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                <Smartphone className="h-3.5 w-3.5" />
                {totpEnabled ? 'TOTP connected' : 'TOTP not connected'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">Admin email</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email || 'Sign in again to connect your authenticator app.'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleTotpSetup}
                  disabled={totpLoading || !user?.email}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {totpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  {totpEnabled ? 'Reconnect TOTP App' : 'Connect TOTP App'}
                </button>
              </div>

              {totpError && <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">{totpError}</p>}

              {totpSetupData && (
                <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    {totpSetupData.qr ? (
                      <img src={totpSetupData.qr} alt="TOTP QR code" className="h-44 w-44 rounded-xl object-contain mx-auto" />
                    ) : (
                      <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        QR code unavailable
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Scan this QR code</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Or enter the secret manually in your authenticator app.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Manual secret</p>
                      <p className="mt-2 break-all font-mono text-sm text-slate-700 dark:text-slate-200">{totpSetupData.secret}</p>
                    </div>
                    <form onSubmit={handleTotpConfirm} className="space-y-3">
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Enter 6-digit verification code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={totpLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white shadow-md hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {totpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Verify & Enable TOTP
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* API Keys View */}
        {activeTab === 'api' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Developer API Keys</h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Key Name (e.g., Zapier Webhook Sync)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={generateApiKey}
                className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white shadow-md hover:bg-indigo-700 shrink-0"
              >
                <Plus className="h-4 w-4" /> Generate API Key
              </button>
            </div>

            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60 font-mono">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white font-sans">{k.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{k.key}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-sans">Created {k.created}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab !== 'security' && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" /> Save Preferences
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
