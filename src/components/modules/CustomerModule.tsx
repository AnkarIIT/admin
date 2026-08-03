import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Mail,
  Star,
  Shield,
  MessageSquare,
  CheckCircle,
  XCircle,
  Send,
  UserCheck,
  Award,
  Heart,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Customer, CustomerReview } from '../../types';

export const CustomerModule: React.FC = () => {
  const {
    customers,
    reviews,
    updateCustomerSegment,
    moderateReview,
    sendCustomerBroadcast,
    searchQuery,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<'profiles' | 'reviews' | 'broadcast'>('profiles');
  const [segmentFilter, setSegmentFilter] = useState<string>('All');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);

  // Email Broadcast form
  const [broadcastSegment, setBroadcastSegment] = useState<string>('VIP');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');

  // Review Reply State
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSegment = segmentFilter === 'All' || c.segment === segmentFilter;

    return matchesSearch && matchesSegment;
  });

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return;
    sendCustomerBroadcast(broadcastSegment, broadcastSubject, broadcastBody);
    setBroadcastSubject('');
    setBroadcastBody('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Customer Relationship & Review Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage customer LTV profiles, segment cohorts, send broadcasts, and moderate product reviews
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          {[
            { id: 'profiles', label: 'Profiles & Segments', icon: Users },
            { id: 'reviews', label: 'Review Moderation', icon: Star },
            { id: 'broadcast', label: 'Email Broadcasts', icon: Mail },
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

      {/* Profiles View */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          {/* Segment Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-1.5">
              {['All', 'VIP', 'Repeat Buyer', 'New Signup', 'Inactive'].map((seg) => (
                <button
                  key={seg}
                  onClick={() => setSegmentFilter(seg)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    segmentFilter === seg
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {seg}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-medium">
              {filteredCustomers.length} customer profile(s)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer List */}
            <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-3">Orders</th>
                      <th className="py-3 px-3">Total LTV</th>
                      <th className="py-3 px-3">Segment</th>
                      <th className="py-3 px-4 text-right">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCustomers.map((c) => {
                      const isSelected = selectedCustomer?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCustomer(c)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 font-bold text-white text-xs">
                                {c.name.split(' ').map((n) => n[0]).join('')}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">{c.name}</h4>
                                <p className="text-[10px] text-slate-400">{c.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                            {c.totalOrders} order(s)
                          </td>

                          <td className="py-3.5 px-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                            ${c.totalSpent.toFixed(2)}
                          </td>

                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                                c.segment === 'VIP'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  : c.segment === 'Repeat Buyer'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                  : c.segment === 'New Signup'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {c.segment}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                            {c.joinedDate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Customer Card */}
            {selectedCustomer && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 text-xs">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-base">
                    {selectedCustomer.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedCustomer.name}</h3>
                    <p className="text-slate-500">{selectedCustomer.location}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Lifetime Value</span>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ${selectedCustomer.totalSpent.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Avg Order Value</span>
                    <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      ${selectedCustomer.averageOrderValue.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Reassign Segment Cohort</label>
                  <select
                    value={selectedCustomer.segment}
                    onChange={(e) => updateCustomerSegment(selectedCustomer.id, e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="VIP">VIP High Spender</option>
                    <option value="Repeat Buyer">Repeat Buyer</option>
                    <option value="New Signup">New Signup</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Contact Details</p>
                  <p className="text-slate-500">Email: {selectedCustomer.email}</p>
                  <p className="text-slate-500">Phone: {selectedCustomer.phone}</p>
                  <p className="text-slate-500">Last Active: {selectedCustomer.lastOrderDate || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews Moderation View */}
      {activeTab === 'reviews' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Customer Product Reviews & Moderation</h3>

          <div className="space-y-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{rev.productName}</p>
                    <p className="text-[11px] text-slate-500">By {rev.customerName} on {rev.createdAt}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex text-amber-400 font-bold">
                      {'★'.repeat(rev.rating)}
                      {'☆'.repeat(5 - rev.rating)}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                        rev.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : rev.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {rev.status}
                    </span>
                  </div>
                </div>

                <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  "{rev.comment}"
                </p>

                {rev.reply && (
                  <div className="ml-4 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200">
                    <strong className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Official Staff Reply:</strong>
                    {rev.reply}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {rev.status !== 'Approved' && (
                    <button
                      onClick={() => moderateReview(rev.id, 'Approved')}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Approve Review
                    </button>
                  )}
                  {rev.status !== 'Rejected' && (
                    <button
                      onClick={() => moderateReview(rev.id, 'Rejected')}
                      className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1 font-bold text-white hover:bg-rose-700"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Broadcast Email View */}
      {activeTab === 'broadcast' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 max-w-2xl mx-auto space-y-4 text-xs">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600" /> Send Target Segment Broadcast Email
          </h3>

          <form onSubmit={handleBroadcastSubmit} className="space-y-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Target Segment Cohort</label>
              <select
                value={broadcastSegment}
                onChange={(e) => setBroadcastSegment(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              >
                <option value="All">All Registered Customers</option>
                <option value="VIP">VIP High Spenders</option>
                <option value="Repeat Buyer">Repeat Buyers</option>
                <option value="New Signup">New Signups</option>
                <option value="Inactive">Inactive Accounts</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Email Subject Line</label>
              <input
                type="text"
                required
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="🔥 Exclusive VIP Access: 20% Off Your Next Purchase"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300">Email Message Body</label>
              <textarea
                rows={5}
                required
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="Hi {{first_name}}, as a valued customer we're giving you early access..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-md hover:bg-indigo-700"
            >
              <Send className="h-4 w-4" /> Send Email Campaign Broadcast
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
