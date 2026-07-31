import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAdmin();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`flex items-start justify-between rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200 ${
              isSuccess
                ? 'bg-emerald-900/90 text-white border-emerald-700/50'
                : isError
                ? 'bg-rose-900/90 text-white border-rose-700/50'
                : isWarning
                ? 'bg-amber-900/90 text-white border-amber-700/50'
                : 'bg-slate-900/90 text-white border-slate-700/50'
            }`}
          >
            <div className="flex items-start gap-3">
              {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />}
              {isError && <AlertCircle className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />}
              {isWarning && <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />}
              {!isSuccess && !isError && !isWarning && <Info className="h-5 w-5 text-sky-400 mt-0.5 shrink-0" />}

              <div>
                <h4 className="text-xs font-bold tracking-tight">{toast.title}</h4>
                <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-white/70 hover:text-white ml-2 p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
