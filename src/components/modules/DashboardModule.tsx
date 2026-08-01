import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Eye,
  Percent,
  Download,
  Calendar,
  Filter,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAdmin } from '../../context/AdminContext';

export const DashboardModule: React.FC = () => {
  const { products, orders, customers, settings, addToast, setCurrentTab, darkMode, loading } = useAdmin();
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'customer' | 'tax'>('sales');

  const cur = settings.currencySymbol || '₹';

  const dataAvailable = orders.length > 0 || customers.length > 0 || products.length > 0;

  // Compute key metrics from database data
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 0);
  const totalOrdersCount = orders.length;
  const activeCustomersCount = customers.length;
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length;
  const avgOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  // Weekly trend comparisons (current 7 days vs previous 7 days)
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const NOW = Date.now();
  const inWindow = (t: number, start: number, end: number) => t >= start && t < end;
  const revenueIn = (list: typeof orders) =>
    list.reduce((s, o) => s + (o.paymentStatus === 'Paid' ? o.total : 0), 0);
  const weekOf = (list: typeof orders, offsetWeeks: number) =>
    list.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return inWindow(t, NOW - (offsetWeeks + 1) * WEEK_MS, NOW - offsetWeeks * WEEK_MS);
    });
  const trendPct = (curVal: number, prevVal: number) =>
    prevVal > 0 ? Math.round(((curVal - prevVal) / prevVal) * 100) : curVal > 0 ? 100 : 0;

  const pendingIn = weekOf(orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Processing'), 0).length;
  const pendingPrev = weekOf(orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Processing'), 1).length;

  const metrics = [
    { label: 'Revenue', value: totalRevenue, currency: true, trend: trendPct(revenueIn(weekOf(orders, 0)), revenueIn(weekOf(orders, 1))), sub: 'vs last week', icon: DollarSign, color: 'text-indigo-400' },
    { label: 'Orders', value: totalOrdersCount, trend: trendPct(weekOf(orders, 0).length, weekOf(orders, 1).length), sub: 'vs last week', icon: ShoppingBag, color: 'text-slate-400' },
    { label: 'Customers', value: activeCustomersCount, sub: 'total customers', icon: Users, color: 'text-slate-400' },
    { label: 'Pending', value: pendingOrdersCount, trend: trendPct(pendingIn, pendingPrev), sub: 'awaiting fulfilment', icon: Clock, color: 'text-amber-400' },
    { label: 'Live', value: products.length, live: true, sub: 'products in catalog', icon: Eye, color: 'text-emerald-400' },
    { label: 'Avg Value', value: avgOrderValue, currency: true, sub: 'per order', icon: TrendingUp, color: 'text-slate-400' },
  ];

  const metricDisplay = (m: (typeof metrics)[number]) => {
    if (!dataAvailable || m.value === 0) return '--';
    return m.currency ? `${cur}${Math.round(m.value).toLocaleString('en-IN')}` : m.value.toLocaleString('en-IN');
  };

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const bucketBy = (unit: 'day' | 'weekday' | 'month') => {
    const map = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      if (isNaN(d.getTime())) continue;
      const label =
        unit === 'month' ? months[d.getMonth()] : unit === 'weekday' ? weekdays[d.getDay()] : d.toISOString().substring(0, 10);
      const cur = map.get(label) || { revenue: 0, orders: 0 };
      cur.revenue += o.total;
      cur.orders += 1;
      map.set(label, cur);
    }
    return Array.from(map.entries()).map(([label, v]) => ({ label, ...v }));
  };

  const weeklyData = bucketBy('weekday');
  const dailyData = bucketBy('day');
  const monthlyData = bucketBy('month');

  const currentChartData =
    chartPeriod === 'daily' ? dailyData : chartPeriod === 'monthly' ? monthlyData : weeklyData;

  // Category breakdown chart data derived from order items matched to product categories
  const palette = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
  const catSales = new Map<string, number>();
  for (const o of orders) {
    for (const item of o.items) {
      const prod = products.find((p) => p.name === item.name || p.id === item.productId);
      const cat = prod?.category || 'Other';
      catSales.set(cat, (catSales.get(cat) || 0) + item.price * item.quantity);
    }
  }
  const categoryChartData = Array.from(catSales.entries())
    .map(([name, sales], i) => ({ name, sales, color: palette[i % palette.length] }))
    .sort((a, b) => b.sales - a.sales);
  const maxCategorySales = categoryChartData.length ? categoryChartData[0].sales : 0;

  const generateCSVReport = () => {
    let headers = '';
    let rows = '';

    if (reportType === 'sales') {
      headers = 'Order ID,Customer,Date,Total,Status\n';
      rows = orders.map((o) => `"${o.id}","${o.customerName}","${o.createdAt}",${o.total.toFixed(2)},"${o.orderStatus}"`).join('\n');
    } else if (reportType === 'inventory') {
      headers = 'Product Name,SKU,Category,Stock,Price,Status\n';
      rows = products.map((p) => `"${p.name}","${p.sku}","${p.category}",${p.stock},${p.price.toFixed(2)},"${p.status}"`).join('\n');
    } else {
      headers = 'Customer Name,Email,Orders Count,Total Spent,Segment\n';
      rows = customers.map((c) => `"${c.name}","${c.email}",${c.totalOrders},${c.totalSpent.toFixed(2)},"${c.segment}"`).join('\n');
    }

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportType}-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
    addToast({ type: 'success', title: 'Report Downloaded', message: `Exported ${reportType.toUpperCase()} CSV report.` });
    setReportModalOpen(false);
  };

  return (
    <div className="space-y-10 selection:bg-indigo-500/30">
      {/* Top Header / Actions */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Zap className="h-6 w-6 text-indigo-500" />
            Dashboard
          </h2>
          <p className="text-[13px] text-slate-500 font-medium">
            Real-time telemetry and executive performance metrics.
          </p>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.98] shadow-lg shadow-black/10"
        >
          <FileSpreadsheet className="h-4 w-4" /> Export Report
        </button>
      </div>

      {/* Metrics Grid - Minimalist */}
      {loading ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/5 dark:bg-white/[0.02]"
            >
              <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
              <div className="mt-4 h-7 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
              <div className="mt-3 h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-white/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
          {metrics.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-500/30 dark:border-white/5 dark:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">{card.label}</span>
                  <Icon className={`h-3.5 w-3.5 ${card.color} opacity-80`} />
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-light text-slate-900 tracking-tight tabular-nums dark:text-white">{metricDisplay(card)}</span>
                  {card.live && (
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </div>

                {card.trend !== undefined && dataAvailable ? (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                        card.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {card.trend >= 0 ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {Math.abs(card.trend)}%
                    </span>
                    <span className="text-[10px] text-slate-400">{card.sub}</span>
                  </div>
                ) : (
                  <div className="mt-3 text-[10px] text-slate-400">
                    {!dataAvailable ? 'Data unavailable' : card.sub}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Sales Analytics</h3>
              <p className="text-[12px] text-slate-500 font-medium px-0.5">Revenue and order volume trends.</p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`rounded-lg px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                    chartPeriod === period
                      ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
            ) : currentChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">Data unavailable</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "#ffffff" : "#000000"} opacity={0.03} />
                  <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tick={{dy: 10}} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tick={{dx: -5}} />
                  <Tooltip
                    cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{
                      backgroundColor: '#0a0a0c',
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '600',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] p-8">
          <div className="mb-10 space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">By Category</h3>
            <p className="text-[12px] text-slate-500 font-medium px-0.5">Revenue distribution.</p>
          </div>

          <div className="h-64 w-full overflow-y-auto pr-1">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-2 animate-pulse rounded-full bg-slate-100 dark:bg-white/5" />
                ))}
              </div>
            ) : categoryChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">Data unavailable</div>
            ) : (
              <div className="space-y-4">
                {categoryChartData.slice(0, 6).map((c) => {
                  const pct = maxCategorySales > 0 ? Math.round((c.sales / maxCategorySales) * 100) : 0;
                  return (
                    <div key={c.name}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{c.name}</span>
                        <span className="shrink-0 font-semibold text-slate-500">{cur}{c.sales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: c.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Ticker - Minimalist Table */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.01] p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Live Stream</h3>
          </div>
          <button
            onClick={() => setCurrentTab('orders')}
            className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            Full Queue →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="text-slate-600 dark:text-slate-500 font-bold uppercase tracking-[0.1em] text-[10px]">
                <th className="py-4 px-3 font-bold border-b border-slate-100 dark:border-white/5">ID</th>
                <th className="py-4 px-3 font-bold border-b border-slate-100 dark:border-white/5">Entity</th>
                <th className="py-4 px-3 font-bold border-b border-slate-100 dark:border-white/5">Volume</th>
                <th className="py-4 px-3 font-bold border-b border-slate-100 dark:border-white/5">Total</th>
                <th className="py-4 px-3 font-bold border-b border-slate-100 dark:border-white/5">Status</th>
                <th className="py-4 px-3 font-bold border-b border-slate-100 dark:border-white/5 text-right">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.03]">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                    {loading ? 'Loading orders...' : 'No orders yet — new orders will appear here.'}
                  </td>
                </tr>
              )}
              {orders.slice(0, 5).map((ord) => (
                <tr key={ord.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="py-4 px-3 font-mono font-bold text-indigo-500/80 uppercase">{ord.id.slice(0, 8)}</td>
                  <td className="py-4 px-3 font-medium text-slate-900 dark:text-white">{ord.customerName}</td>
                  <td className="py-4 px-3 text-slate-500">{ord.items.length} units</td>
                  <td className="py-4 px-3 font-bold text-slate-900 dark:text-slate-200">{cur}{ord.total.toLocaleString()}</td>
                  <td className="py-4 px-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        ord.orderStatus === 'Delivered'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : ord.orderStatus === 'Shipped'
                          ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                          : ord.orderStatus === 'Cancelled'
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}
                    >
                      <span className={`h-1 w-1 rounded-full ${
                        ord.orderStatus === 'Delivered' ? 'bg-emerald-500' :
                        ord.orderStatus === 'Shipped' ? 'bg-indigo-500' :
                        ord.orderStatus === 'Cancelled' ? 'bg-rose-500' : 'bg-amber-500'
                      }`} />
                      {ord.orderStatus}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right text-slate-500 font-medium">
                    {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" /> Export Custom Store Report
              </h3>
              <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Select Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="sales">Sales & Revenue Breakdown</option>
                  <option value="inventory">Inventory & Stock Valuation</option>
                  <option value="customer">Customer Metrics & LTV</option>
                </select>
              </div>

              <div className="rounded-2xl bg-indigo-50/50 p-3.5 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900">
                <p className="font-semibold">CSV File Summary</p>
                <p className="mt-1 opacity-80 text-[11px]">
                  Includes full order records, product pricing, quantities, SKUs, and transaction statuses formatted for Excel or Google Sheets.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={generateCSVReport}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
                >
                  Download CSV File
                </button>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
