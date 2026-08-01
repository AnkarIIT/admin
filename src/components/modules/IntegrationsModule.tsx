import React, { useState } from 'react';
import {
  Plug,
  CreditCard,
  Star,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Power,
  Wrench,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { Integration } from '../../types';
import { isSuperAdmin, RESTRICTED_MESSAGE } from '../../lib/roles';

const typeMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  payment: { label: 'Payment Gateway', icon: CreditCard, color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' },
  reviews: { label: 'Reviews', icon: Star, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  messaging: { label: 'Messaging', icon: Star, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
};

export const IntegrationsModule: React.FC = () => {
  const { integrations, updateIntegration, user } = useAdmin();
  const canManage = isSuperAdmin(user?.role);

  const [saving, setSaving] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleToggle = async (int: Integration, next: boolean) => {
    setSaving(int.id);
    const ok = await updateIntegration(int.id, next);
    setSaving(null);
    if (ok) setConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Plug className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            API Services & Gateways
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Turn third-party services on or off. Technical configuration (API keys, webhooks) is handled by the developer.
          </p>
        </div>

        {!canManage && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <Lock className="h-4 w-4" /> {RESTRICTED_MESSAGE}
          </div>
        )}
      </div>

      {canManage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((int) => {
            const meta = typeMeta[int.type] || { label: int.type, icon: Plug, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
            const TypeIcon = meta.icon;
            const isWorking = saving === int.id;

            return (
              <div
                key={int.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{int.name}</h3>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>{meta.label}</span>
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                      int.enabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-900/50'
                        : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    {int.enabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {int.enabled ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">{int.description}</p>

                {confirmId === int.id && !int.enabled ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900/40 dark:bg-rose-950/30">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Enable {int.name}?</span>
                    <button
                      disabled={isWorking}
                      onClick={() => handleToggle(int, true)}
                      className="ml-auto rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => (int.enabled ? setConfirmId(int.id) : handleToggle(int, true))}
                    disabled={isWorking}
                    className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 ${
                      int.enabled ? 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                    {int.enabled ? 'Turn Off' : 'Turn On'}
                  </button>
                )}

                {int.enabled && confirmId === int.id && (
                  <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900/40 dark:bg-rose-950/30">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Disable {int.name}? The storefront will stop using it.</span>
                    <button
                      disabled={isWorking}
                      onClick={() => handleToggle(int, false)}
                      className="ml-auto rounded-lg bg-rose-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {isWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes, disable'}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="mt-auto flex items-start gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2 text-[11px] text-slate-500 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-400">
                  <Wrench className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{int.developerNote}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canManage && integrations.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No integration services registered.
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        The admin panel only stores whether each service is ON or OFF. API keys, secrets and webhook wiring are managed by the developer in the
        storefront/deployment configuration — they are never stored here.
      </div>
    </div>
  );
};
