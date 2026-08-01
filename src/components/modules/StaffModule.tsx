import React, { useState } from 'react';
import {
  Shield,
  UserPlus,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  Activity,
  UserCheck,
  Search,
  Wand2,
  Copy,
  Check,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StaffUser } from '../../types';

const generateRandomPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!?';
  const all = upper + lower + digits + symbols;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const chars = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(symbols),
    ...Array.from({ length: 10 }, () => pick(all)),
  ];
  return chars.sort(() => Math.random() - 0.5).join('');
};

export const StaffModule: React.FC = () => {
  const { staffUsers, activityLogs, addStaffUser, updateStaffRole } = useAdmin();

  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit'>('users');

  // Add Staff Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('Store Manager');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Success credentials modal
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState<null | 'email' | 'password'>(null);

  const copyToClipboard = async (value: string, field: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) return;
    const result = await addStaffUser({
      name,
      email,
      roleId: 'role-2',
      roleName: role,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
      status: 'Active',
      lastLogin: 'Just now',
      password: password.trim() || undefined,
    });
    if (!result) {
      setError('Could not create the staff member. Check the email and try again.');
      return;
    }
    setCredentials(result);
    setName('');
    setEmail('');
    setPassword('');
    setModalOpen(false);
  };

  const permissionMatrix = [
    { module: 'Dashboard & Financial Reports', superAdmin: true, manager: true, fulfillment: false, support: false },
    { module: 'Product Catalog & Inventory', superAdmin: true, manager: true, fulfillment: true, support: false },
    { module: 'Order Status & Tracking', superAdmin: true, manager: true, fulfillment: true, support: true },
    { module: 'Process Refunds & Returns', superAdmin: true, manager: true, fulfillment: false, support: true },
    { module: 'Customer Broadcasts & Segments', superAdmin: true, manager: true, fulfillment: false, support: false },
    { module: 'Payment Gateway API Keys', superAdmin: true, manager: false, fulfillment: false, support: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            User & Role Security Access Control
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage admin staff members, role permission matrices, and security audit activity logs
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          {[
            { id: 'users', label: 'Staff Accounts', icon: UserCheck },
            { id: 'permissions', label: 'Role Permissions Matrix', icon: Lock },
            { id: 'audit', label: 'Security Audit Logs', icon: Activity },
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

      {/* Staff Users View */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setError('');
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" /> Add Staff Member
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {staffUsers.map((staff) => (
              <div key={staff.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 font-bold text-white text-sm border border-slate-200 dark:border-slate-700">
                      {staff.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{staff.name}</h3>
                      <p className="text-slate-500 text-[11px]">{staff.email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Role Level</label>
                  <select
                    value={staff.roleName}
                    onChange={(e) => updateStaffRole(staff.id, e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Store Manager">Store Manager</option>
                    <option value="Fulfillment Specialist">Fulfillment Specialist</option>
                    <option value="Customer Support">Customer Support</option>
                  </select>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  <span>Last active: {staff.lastLogin}</span>
                  <span className="font-bold text-emerald-600">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Matrix View */}
      {activeTab === 'permissions' && (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Module Permission</th>
                  <th className="py-3 px-3 text-center">Super Admin</th>
                  <th className="py-3 px-3 text-center">Store Manager</th>
                  <th className="py-3 px-3 text-center">Fulfillment</th>
                  <th className="py-3 px-3 text-center">Customer Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {permissionMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{row.module}</td>
                    <td className="py-3.5 px-3 text-center">
                      {row.superAdmin ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {row.manager ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {row.fulfillment ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {row.support ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-slate-300 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log View */}
      {activeTab === 'audit' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3 text-xs">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">System Audit Activity Log</h3>
          <div className="space-y-2">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{log.user}</span>
                  <span className="text-slate-500 ml-1">({log.action})</span>
                  <p className="text-slate-600 dark:text-slate-300 font-mono text-[11px] mt-0.5">{log.module}</p>
                </div>
                <span className="text-[10px] text-slate-400">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Invite New Staff Member</h3>
            <form onSubmit={handleAddStaffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Email Address (Login ID)</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@omnistore.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Role Assignment</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Store Manager">Store Manager</option>
                  <option value="Fulfillment Specialist">Fulfillment Specialist</option>
                  <option value="Customer Support">Customer Support</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-indigo-500" /> Login Credentials (Password)
                </label>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Set a password for this member, or leave blank to auto-generate one.
                </p>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(generateRandomPassword())}
                    className="flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 font-bold text-indigo-600 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-400 shrink-0"
                    title="Generate a strong password"
                  >
                    <Wand2 className="h-3.5 w-3.5" /> Generate
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-500/10 dark:text-rose-300">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">
                  Add Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login Credentials Success Modal */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Staff Account Created</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Share these login credentials with the new member. The password is only shown once.
            </p>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Email (Login ID)</label>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-mono font-bold text-slate-900 dark:text-white break-all">{credentials.email}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(credentials.email, 'email')}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 shrink-0"
                  >
                    {copied === 'email' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-mono font-bold text-slate-900 dark:text-white break-all">{credentials.password}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(credentials.password, 'password')}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 shrink-0"
                  >
                    {copied === 'password' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === 'password' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCredentials(null)}
              className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2.5 font-bold text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
