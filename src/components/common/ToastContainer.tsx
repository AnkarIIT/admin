import React from 'react';
import { useAdmin } from '../../context/AdminContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, darkMode } = useAdmin();

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
            className={`flex items-start justify-between rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-200 ${
              darkMode
                ? isSuccess
                  ? 'bg-emerald-900/90 text-white border-emerald-700/50'
                  : isError
                  ? 'bg-rose-900/90 text-white border-rose-700/50'
                  : isWarning
                  ? 'bg-amber-900/90 text-white border-amber-700/50'
                  : 'bg-slate-900/90 text-white border-slate-700/50'
                : isSuccess
                ? 'bg-emerald-50 text-emerald-950 border-emerald-200 shadow-emerald-100/40'
                : isError
                ? 'bg-rose-50 text-rose-950 border-rose-200 shadow-rose-100/40'
                : isWarning
                ? 'bg-amber-50 text-amber-950 border-amber-200 shadow-amber-100/40'
                : 'bg-slate-50 text-slate-950 border-slate-200 shadow-slate-100/40'
            }`}
          >
            <div className="flex items-start gap-3">
              {isSuccess && <CheckCircle2 className={`h-5 w-5 mt-0.5 shrink-0 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />}
              {isError && <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${darkMode ? 'text-rose-400' : 'text-rose-600'}`} />}
              {isWarning && <AlertCircle className={`h-5 w-5 mt-0.5 shrink-0 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />}
              {!isSuccess && !isError && !isWarning && <Info className={`h-5 w-5 mt-0.5 shrink-0 ${darkMode ? 'text-sky-400' : 'text-indigo-600'}`} />}

              <div>
                <h4 className="text-xs font-bold tracking-tight">{toast.title}</h4>
                <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className={`ml-2 p-0.5 cursor-pointer transition-colors ${
                darkMode ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
