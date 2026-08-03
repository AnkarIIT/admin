import React from 'react';
import { Lock } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { RESTRICTED_MESSAGE } from '../../lib/roles';

interface RestrictedAccessProps {
  label?: string;
}

export const RestrictedAccess: React.FC<RestrictedAccessProps> = ({ label }) => {
  const { user, setCurrentTab } = useAdmin();
  const roleLabel = user?.role || 'Guest';

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-amber-200 bg-amber-50/60 px-6 py-16 text-center shadow-xs dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
        <Lock className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-lg font-extrabold text-amber-700 dark:text-amber-300">
        {RESTRICTED_MESSAGE}
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
        {label ? `The "${label}" section is reserved for the Super Admin role.` : 'This section is reserved for the Super Admin role.'}{' '}
        Your current role (<span className="font-bold">{roleLabel}</span>) does not have permission to view or modify it.
      </p>
      <button
        onClick={() => setCurrentTab('dashboard')}
        className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700"
      >
        Back to Dashboard
      </button>
    </div>
  );
};
