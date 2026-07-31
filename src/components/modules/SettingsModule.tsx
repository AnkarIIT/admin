import React, { useState } from 'react';
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
  Trash2,
  Lock,
  Sun,
  Moon,
  Palette,
  ShieldCheck,
  Smartphone,
  Loader2,
  Unlock,
  ShieldOff,
  Copy,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { api } from '../../api';

export const SettingsModule: React.FC = () => {
  const { settings, updateSettings, addToast, darkMode, toggleDarkMode, user, updateAuthUser } = useAdmin();

  const [activeTab, setActiveTab] = useState<'store' | 'tax' | 'notifications' | 'appearance' | 'api' | 'security'>('store');
  const [formData, setFormData] = useState({
    ...settings,
    notifications: settings.notifications || {},
  });

  // API Keys list
  const [apiKeys, setApiKeys] = useState(settings.apiKeys || []);
  const [newKeyName, setNewKeyName] = useState('');

  // 2FA
  const [twoFaSetup, setTwoFaSetup] = useState<{ secret: string; uri: string; qr: string } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [twoFaError, setTwoFaError] = useState('');
  const [showDisableInput, setShowDisableInput] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

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

  const startTwoFaSetup = async () => {
    setTwoFaError('');
    setTwoFaBusy(true);
    try {
      const res = await api.setup2fa();
      setTwoFaSetup(res);
    } catch (e: any) {
      setTwoFaError(e.message || 'Failed to start 2FA setup');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirmTwoFa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError('');
    setTwoFaBusy(true);
    try {
      const res = await api.confirm2fa(twoFaCode.trim());
      updateAuthUser(res.user);
      setTwoFaSetup(null);
      setTwoFaCode('');
      setRecoveryCodes(res.recoveryCodes || []);
      addToast({ type: 'success', title: '2FA Enabled', message: 'Two-factor authentication is now active.' });
    } catch (err: any) {
      setTwoFaError(err.message || 'Invalid code');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const disableTwoFa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError('');
    setTwoFaBusy(true);
    try {
      const res = await api.disable2fa(twoFaCode.trim());
      updateAuthUser(res.user);
      setTwoFaCode('');
      setShowDisableInput(false);
      addToast({ type: 'warning', title: '2FA Disabled', message: 'Two-factor authentication is turned off.' });
    } catch (err: any) {
      setTwoFaError(err.message || 'Invalid code');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const copyRecoveryCodes = async () => {
    if (!recoveryCodes.length) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      addToast({ type: 'success', title: 'Recovery Codes Copied', message: 'Paste them somewhere safe.' });
    } catch {
      addToast({ type: 'error', title: 'Copy Failed', message: 'Could not access the clipboard.' });
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
            { id: 'security', label: 'Security & 2FA', icon: ShieldCheck },
            { id: 'api', label: 'Developer API Keys', icon: Key },
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

        {/* Security & 2FA View */}
        {activeTab === 'security' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Account Security</h3>
            <p className="text-slate-500 text-xs">
              Signed in as <span className="font-bold text-slate-900 dark:text-white">{user?.email}</span>{' '}
              <span className="ml-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                {user?.role}
              </span>
            </p>

            {user?.totpEnabled ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-600 p-2 text-white">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-emerald-900 dark:text-emerald-300">Two-Factor Authentication Enabled</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Your account requires a TOTP code from Google Authenticator on every login.
                    </p>
                  </div>
                </div>
                {!showDisableInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFaError('');
                      setShowDisableInput(true);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  >
                    <ShieldOff className="h-4 w-4" /> Disable 2FA
                  </button>
                ) : (
                  <form onSubmit={disableTwoFa} className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={twoFaCode}
                      onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      className="w-28 rounded-xl border border-slate-200 bg-slate-50 p-2 text-center font-bold tracking-widest text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={twoFaBusy || twoFaCode.length !== 6}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      {twoFaBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
                      Confirm
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500 p-2 text-white">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 dark:text-white">Two-Factor Authentication Disabled</p>
                    <p className="text-[11px] text-slate-500">
                      Add an extra layer of security using the Google Authenticator TOTP app.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startTwoFaSetup}
                  disabled={twoFaBusy}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {twoFaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Enable Two-Factor Authentication
                </button>
              </div>
            )}

            {twoFaSetup && (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
                <h4 className="font-extrabold text-sm text-indigo-900 dark:text-indigo-200">Scan with Google Authenticator</h4>
                <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                  1. Open Google Authenticator → tap <b>+</b> → <b>Scan QR code</b>.<br />
                  2. Enter the 6-digit code to confirm setup.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row items-start gap-5">
                  <img
                    src={twoFaSetup.qr}
                    alt="TOTP QR Code"
                    className="h-40 w-40 rounded-xl border border-indigo-200 bg-white p-2 dark:border-indigo-800"
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                        Manual setup key
                      </p>
                      <p className="mt-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs font-bold text-slate-800 dark:bg-slate-900 dark:text-indigo-200">
                        {twoFaSetup.secret}
                      </p>
                    </div>
                    <form onSubmit={confirmTwoFa} className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={twoFaCode}
                        onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit code"
                        className="w-32 rounded-xl border border-indigo-200 bg-white p-2 text-center font-bold tracking-widest text-slate-900 dark:border-indigo-800 dark:bg-slate-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={twoFaBusy || twoFaCode.length !== 6}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {twoFaBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Confirm & Enable
                      </button>
                    </form>
                  </div>
                </div>
                {twoFaError && (
                  <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                    {twoFaError}
                  </p>
                )}
              </div>
            )}

            {twoFaError && !twoFaSetup && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                {twoFaError}
              </p>
            )}

            {recoveryCodes.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-xl bg-amber-500 p-2 text-white">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-900 dark:text-amber-300">Save these recovery codes</h4>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Each code works only once. Store them somewhere safe — you will not see them again.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyRecoveryCodes}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950/40"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy all
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecoveryCodes([])}
                      aria-label="Dismiss recovery codes"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-300 bg-white text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-950/40"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recoveryCodes.map((rc, i) => (
                    <div
                      key={rc}
                      className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono text-xs font-bold tracking-wider text-slate-800 dark:border-amber-800 dark:bg-slate-900 dark:text-amber-200"
                    >
                      <span className="text-slate-400 dark:text-slate-500">#{String(i + 1).padStart(2, '0')}</span>
                      {rc}
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700"
          >
            <Save className="h-4 w-4" /> Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
