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
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useAdmin } from '../../context/AdminContext';

export const DashboardModule: React.FC = () => {
  const { products, orders, customers, settings, addToast, setCurrentTab, darkMode } = useAdmin();
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'customer' | 'tax'>('sales');

  const cur = settings.currencySymbol || '₹';

  // Compute key metrics from database data
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 0);
  const totalOrdersCount = orders.length;
  const activeCustomersCount = customers.length;
  const pendingOrdersCount = orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Processing').length;

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
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 dark:from-indigo-950 dark:via-indigo-900 dark:to-slate-900 p-6 text-white shadow-lg">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 dark:bg-indigo-500/30 px-3 py-1 text-xs font-bold text-white dark:text-indigo-200 border border-white/30 dark:border-indigo-400/30 mb-2">
            <Zap className="h-3.5 w-3.5 text-amber-300" /> Real-Time Analytics Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Executive Performance Dashboard</h2>
          <p className="text-xs text-indigo-100 dark:text-indigo-200 mt-1 max-w-xl">
            Live telemetry monitoring sales velocity, order conversion funnels, inventory balance, and traffic health.
          </p>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-extrabold text-indigo-900 shadow-md hover:bg-indigo-50 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 dark:border dark:border-slate-700 transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Custom Reports & CSV Export
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Total Revenue', value: `${cur}${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400' },
          { label: 'Total Orders', value: totalOrdersCount, icon: ShoppingBag, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400' },
          { label: 'Active Customers', value: activeCustomersCount, icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400' },
          { label: 'Pending Orders', value: pendingOrdersCount, icon: Percent, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400' },
          { label: 'Products Live', value: products.length, live: true, icon: Eye, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400' },
          { label: 'Avg Order Value', value: `${cur}${(totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0).toFixed(2)}`, icon: TrendingUp, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400' },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.label}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{card.value}</span>
                {card.live ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> LIVE NOW
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Traffic Trend Line Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sales Analytics</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Revenue ({settings.currency}) vs order volume over time</p>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition-all ${
                    chartPeriod === period
                      ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                    borderRadius: '12px',
                    color: darkMode ? '#ffffff' : '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area type="monotone" dataKey="revenue" name={`Revenue (${settings.currency})`} stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="orders" name="Orders" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Sales Breakdown Bar Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Sales by Category</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Top revenue generating departments</p>
          </div>

          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                    borderRadius: '12px',
                    color: darkMode ? '#ffffff' : '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Bar dataKey="sales" radius={[8, 8, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real-Time Recent Activity & Orders Ticker Feed */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Order Stream</h3>
          </div>
          <button
            onClick={() => setCurrentTab('orders')}
            className="text-xs font-extrabold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            View All Orders →
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">Order ID</th>
                <th className="py-3 px-2">Customer</th>
                <th className="py-3 px-2">Items</th>
                <th className="py-3 px-2">Total Amount</th>
                <th className="py-3 px-2">Order Status</th>
                <th className="py-3 px-2">Payment</th>
                <th className="py-3 px-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.slice(0, 5).map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-2 font-bold text-indigo-600 dark:text-indigo-400">{ord.id}</td>
                  <td className="py-3 px-2 font-semibold text-slate-900 dark:text-white">{ord.customerName}</td>
                  <td className="py-3 px-2 text-slate-500">{ord.items.length} item(s)</td>
                  <td className="py-3 px-2 font-extrabold text-slate-900 dark:text-white">{cur}{ord.total.toFixed(2)}</td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                        ord.orderStatus === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : ord.orderStatus === 'Shipped'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          : ord.orderStatus === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {ord.orderStatus}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="font-medium text-slate-600 dark:text-slate-300">{ord.paymentStatus}</span>
                  </td>
                  <td className="py-3 px-2 text-right text-slate-400 text-[11px]">
                    {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
