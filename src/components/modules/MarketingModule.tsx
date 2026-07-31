import React, { useState } from 'react';
import {
  Tag,
  ShoppingBag,
  Plus,
  Send,
  Zap,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Percent,
  Copy,
  Flame,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Coupon } from '../../types';

export const MarketingModule: React.FC = () => {
  const {
    coupons,
    abandonedCarts,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    sendCartRecoveryEmail,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'coupons' | 'carts' | 'flash'>('coupons');

  // Coupon Modal
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [value, setValue] = useState(20);
  const [minSpend, setMinSpend] = useState(50);
  const [usageLimit, setUsageLimit] = useState(100);

  // Flash Sale Timer setup
  const [flashTitle, setFlashTitle] = useState('⚡ Flash Tech Sale - 30% Off Everything');
  const [flashHours, setFlashHours] = useState(12);

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    await addCoupon({
      code: code.toUpperCase(),
      type: type === 'percentage' ? 'Percentage' : 'Fixed Amount',
      value,
      minOrderValue: minSpend,
      expiryDate: new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10),
      usageLimit,
      status: 'Active',
    });
    setCode('');
    setCouponModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-100">
        <div>
          <p className="text-sm font-extrabold">Coupons are saved &amp; live on your store</p>
          <p className="text-xs opacity-80">Coupons you create here work instantly on the storefront checkout. Abandoned-cart emails and flash-sale banners are demo-only.</p>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Marketing & Promotion Growth Suite
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create discount coupons, trigger abandoned cart recovery emails, and configure flash sale countdowns
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          {[
            { id: 'coupons', label: 'Coupons & Discounts', icon: Tag },
            { id: 'carts', label: 'Abandoned Cart Recovery', icon: ShoppingBag },
            { id: 'flash', label: 'Flash Sale Countdown', icon: Flame },
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

      {/* Coupons View */}
      {activeTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Active Promotional Coupons</h3>
            <button
              onClick={() => setCouponModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" /> Create Coupon
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {coupons.map((c) => (
              <div key={c.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-950 dark:bg-indigo-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300 tracking-wider">
                    {c.code}
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {c.type === 'Percentage' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-300">
                  Min Spend: {c.minOrderValue > 0 ? `₹${c.minOrderValue}` : 'None'} •{' '}
                  {c.expiryDate ? `Expires: ${c.expiryDate}` : 'No expiry'}
                </p>
                <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-indigo-100 dark:border-indigo-900">
                  <span>Redeemed: {c.timesUsed} / {c.usageLimit > 0 ? c.usageLimit : '∞'}</span>
                  <span className={`font-bold ${c.status === 'Active' ? 'text-emerald-600' : 'text-rose-500'}`}>{c.status}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => updateCoupon(c.code, { status: c.status === 'Active' ? 'Inactive' : 'Active' })}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors ${
                      c.status === 'Active'
                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {c.status === 'Active' ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => deleteCoupon(c.code)}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart Recovery View */}
      {activeTab === 'carts' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Abandoned Cart Recovery Queue</h3>
              <p className="text-slate-500">Auto-target dropped checkout sessions with AI personalized email triggers</p>
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-1 font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              {abandonedCarts.filter((ac) => !ac.recovered).length} Pending Carts
            </span>
          </div>

          <div className="space-y-3">
            {abandonedCarts.map((cart) => (
              <div key={cart.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{cart.customerName} ({cart.customerEmail})</h4>
                  <p className="text-slate-500 mt-0.5">
                    Cart Value: <strong className="text-indigo-600 dark:text-indigo-400">${cart.cartValue.toFixed(2)}</strong> • {cart.itemsCount} items • {cart.lastActiveTime}
                  </p>
                </div>

                {cart.recovered ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> Recovered!
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      sendCartRecoveryEmail(cart.id);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-md hover:bg-indigo-700 shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" /> Send Recovery Email
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flash Sale Banner Config */}
      {activeTab === 'flash' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 max-w-xl mx-auto space-y-4 text-xs">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" /> Store Homepage Flash Sale Ticker Bar
          </h3>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300">Ticker Announcement Headline</label>
            <input
              type="text"
              value={flashTitle}
              onChange={(e) => setFlashTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300">Countdown Duration (Hours)</label>
            <input
              type="number"
              value={flashHours}
              onChange={(e) => setFlashHours(parseInt(e.target.value) || 1)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 p-4 text-white text-center shadow-lg">
            <p className="text-xs font-bold uppercase tracking-widest">{flashTitle}</p>
            <div className="mt-2 flex justify-center gap-3 font-mono font-black text-xl">
              <span>{String(flashHours).padStart(2, '0')}:</span>
              <span>48:</span>
              <span>12</span>
            </div>
            <span className="text-[10px] opacity-80 mt-1 block">Live Store Countdown Banner Preview</span>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Create Coupon Code</h3>
            <form onSubmit={handleCouponSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="SUMMER20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 uppercase font-mono font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Discount Value</label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
