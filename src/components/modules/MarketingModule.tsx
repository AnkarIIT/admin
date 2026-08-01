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
  Trash2,
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
    <div className="space-y-10 selection:bg-indigo-500/30">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Tag className="h-6 w-6 text-indigo-500" />
            Marketing
          </h2>
          <p className="text-[13px] text-slate-500 font-medium">
            Manage your store promotions and customer recovery strategies.
          </p>
        </div>

        {/* View Switcher - Minimalist */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 shadow-xs">
          {[
            { id: 'coupons', label: 'Coupons', icon: Tag },
            { id: 'carts', label: 'Recovery', icon: ShoppingBag },
            { id: 'flash', label: 'Flash Sale', icon: Flame },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-xs border border-slate-200 dark:border-white/10'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons View */}
      {activeTab === 'coupons' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Active Promotions</h3>
            <button
              onClick={() => setCouponModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-indigo-500 active:scale-[0.98] shadow-lg shadow-indigo-600/10"
            >
              <Plus className="h-4 w-4" /> Create Coupon
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {coupons.map((c) => (
              <div key={c.id} className="group relative rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-5 transition-all hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <span className="font-mono text-[15px] font-bold text-slate-900 dark:text-indigo-300 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {c.code}
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">{c.label || 'Standard Promotion'}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                    {c.type === 'Percentage' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50 dark:border-white/5 text-[11px]">
                  <div className="space-y-0.5">
                    <p className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Requirement</p>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">{c.minOrderValue > 0 ? `₹${c.minOrderValue} min` : 'No minimum'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Redemptions</p>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">{c.timesUsed} / {c.usageLimit > 0 ? c.usageLimit : '∞'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${c.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className={`text-[11px] font-bold tracking-wide uppercase ${c.status === 'Active' ? 'text-emerald-500' : 'text-slate-400'}`}>{c.status}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateCoupon(c.code, { status: c.status === 'Active' ? 'Inactive' : 'Active' })}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-white/5 transition-all"
                      title={c.status === 'Active' ? 'Disable' : 'Enable'}
                    >
                      {c.status === 'Active' ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => deleteCoupon(c.code)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-white/5 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart Recovery View */}
      {activeTab === 'carts' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Recovery Queue</h3>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {abandonedCarts.filter((ac) => !ac.recovered).length} Pending Sessions
            </span>
          </div>

          <div className="space-y-3">
            {abandonedCarts.map((cart) => (
              <div key={cart.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 hover:border-indigo-500/20 transition-all gap-4">
                <div className="space-y-1">
                  <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white leading-none">{cart.customerName}</h4>
                  <p className="text-[12px] text-slate-500 font-medium">
                    {cart.customerEmail} • <span className="text-indigo-500">₹{cart.cartValue.toFixed(2)}</span>
                  </p>
                </div>

                {cart.recovered ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Recovered
                  </span>
                ) : (
                  <button
                    onClick={() => sendCartRecoveryEmail(cart.id)}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2 text-[12px] font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    <Send className="h-3.5 w-3.5" /> Send Reminder
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flash Sale Banner Config */}
      {activeTab === 'flash' && (
        <div className="max-w-xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pt-10">
          <div className="space-y-8 p-8 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01]">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Storefront Ticker</h3>
              <p className="text-[13px] text-slate-500">Configure the high-visibility banner for your shop's homepage.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Headline</label>
                <input
                  type="text"
                  value={flashTitle}
                  onChange={(e) => setFlashTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Duration (Hours)</label>
                <input
                  type="number"
                  value={flashHours}
                  onChange={(e) => setFlashHours(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0c] p-6 text-white text-center border border-white/5">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Live Preview</p>
              <p className="text-[13px] font-semibold mb-2">{flashTitle}</p>
              <div className="flex justify-center gap-3 font-mono font-light text-2xl tracking-widest text-amber-500">
                <span>{String(flashHours).padStart(2, '0')}:48:12</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-3xl border border-white/5 bg-[#0a0a0c] p-8 shadow-2xl space-y-8">
            <div className="space-y-2">
              <h3 className="text-xl font-medium tracking-tight text-white">Create Coupon</h3>
              <p className="text-[13px] text-slate-500">Configure a new promotional code for your store.</p>
            </div>

            <form onSubmit={handleCouponSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium uppercase tracking-widest text-slate-500 ml-1">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="SUMMER2025"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm font-bold tracking-wider text-indigo-300 outline-none transition-all focus:border-indigo-500/50 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium uppercase tracking-widest text-slate-500 ml-1">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-3 text-[13px] font-semibold text-white outline-none transition-all focus:border-indigo-500/50 appearance-none cursor-pointer"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium uppercase tracking-widest text-slate-500 ml-1">Value</label>
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-[13px] font-bold text-white outline-none transition-all focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium uppercase tracking-widest text-slate-500 ml-1">Min Spend</label>
                    <input
                      type="number"
                      value={minSpend}
                      onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-[13px] font-bold text-white outline-none transition-all focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium uppercase tracking-widest text-slate-500 ml-1">Limit</label>
                    <input
                      type="number"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-[13px] font-bold text-white outline-none transition-all focus:border-indigo-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-600/10">
                  Save Coupon
                </button>
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="text-[12px] font-medium text-slate-600 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
