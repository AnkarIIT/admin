import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Smartphone,
  Loader2,
  ArrowLeft,
  Boxes,
  AlertTriangle,
  RefreshCw,
  KeySquare,
} from 'lucide-react';

const CODE_TTL_SECONDS = 300;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatRecoveryInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const groups = clean.match(/.{1,4}/g) || [];
  return groups.join('-');
}

const LoginPage: React.FC = () => {
  const { login, verify2fa } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState<string | undefined>();
  const [useRecovery, setUseRecovery] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL_SECONDS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const codeRef = useRef<HTMLInputElement>(null);
  const autoSubmitted = useRef(false);

  const exitToStep1 = useCallback(() => {
    setPendingToken(undefined);
    setCode('');
    setError('');
    setUseRecovery(false);
    setSecondsLeft(CODE_TTL_SECONDS);
    autoSubmitted.current = false;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await login(email.trim(), password);
      if (res.twoFactorRequired) {
        setPendingToken(res.pendingToken);
        setSecondsLeft(CODE_TTL_SECONDS);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = useCallback(
    async (value: string) => {
      if (!pendingToken || busy) return;
      setError('');
      setBusy(true);
      try {
        await verify2fa(pendingToken, value);
      } catch (err: any) {
        setError(err.message || 'Verification failed');
        setCode('');
        autoSubmitted.current = false;
        setUseRecovery(false);
        setTimeout(() => codeRef.current?.focus(), 50);
      } finally {
        setBusy(false);
      }
    },
    [pendingToken, busy, verify2fa]
  );

  useEffect(() => {
    if (!pendingToken) return;
    setUseRecovery(false);
    setCode('');
    setError('');
    setSecondsLeft(CODE_TTL_SECONDS);
    autoSubmitted.current = false;
    const t = setTimeout(() => codeRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [pendingToken]);

  useEffect(() => {
    if (!pendingToken) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [pendingToken]);

  useEffect(() => {
    if (!pendingToken || useRecovery) return;
    if (code.length === 6 && !autoSubmitted.current && !busy) {
      autoSubmitted.current = true;
      submitCode(code);
    }
  }, [code, pendingToken, useRecovery, busy, submitCode]);

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length !== 6) autoSubmitted.current = false;
  };

  const handleRecoveryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(formatRecoveryInput(e.target.value));
  };

  const handleVerifyForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (useRecovery) {
      submitCode(code);
    }
  };

  const recoveryReady = code.replace(/[^A-Z0-9]/g, '').length === 12;
  const expired = secondsLeft <= 0;
  const step = !pendingToken ? 1 : 2;

  const inputBase =
    'w-full rounded-xl border border-white/10 bg-slate-900/70 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40 min-h-11';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-600/30 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30">
            <Boxes className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-white">
            3D By SD <span className="text-indigo-400">Admin</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to manage your store</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">
          {step === 1 ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className={`${inputBase} pl-10 pr-3`}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputBase} pl-10 pr-3`}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Sign In
              </button>
            </form>
          ) : expired ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Verification expired</h2>
                <p className="mt-1 text-xs text-slate-400">
                  This sign-in request timed out. Enter your password again to get a fresh code.
                </p>
              </div>
              <button
                type="button"
                onClick={exitToStep1}
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90"
              >
                <RefreshCw className="h-4 w-4" /> Start Over
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyForm} className="space-y-4">
              <button
                type="button"
                onClick={exitToStep1}
                className="flex min-h-11 items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>

              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                  {useRecovery ? <KeySquare className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                </div>
                <h2 className="text-base font-bold text-white">
                  {useRecovery ? 'Enter a recovery code' : 'Two-Factor Authentication'}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {useRecovery
                    ? 'Use one of the single-use codes you saved when enabling 2FA.'
                    : 'Enter the 6-digit code from your Google Authenticator app.'}
                </p>
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Step 2 of 2 · Code expires in {formatCountdown(secondsLeft)}
                </p>
              </div>

              <input
                ref={codeRef}
                value={code}
                onChange={useRecovery ? handleRecoveryInput : handleCodeInput}
                placeholder={useRecovery ? 'ABCD-EFGH-IJKL' : '000000'}
                inputMode={useRecovery ? 'text' : 'numeric'}
                pattern={useRecovery ? undefined : '[0-9]*'}
                autoComplete={useRecovery ? 'off' : 'one-time-code'}
                maxLength={useRecovery ? 14 : 6}
                aria-label={useRecovery ? 'Recovery code' : 'Authenticator code'}
                className="w-full min-h-11 rounded-xl border border-white/10 bg-slate-900/70 py-3 text-center text-2xl font-bold tracking-[0.35em] text-white placeholder-slate-600 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
              />

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || (useRecovery ? !recoveryReady : code.length !== 6)}
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {useRecovery ? 'Verify Recovery Code' : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setUseRecovery((prev) => !prev);
                  setCode('');
                  setError('');
                  autoSubmitted.current = false;
                  setTimeout(() => codeRef.current?.focus(), 50);
                }}
                className="mx-auto flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                <KeySquare className="h-3.5 w-3.5" />
                {useRecovery ? 'Use authenticator code instead' : 'Lost your device? Use a recovery code'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Secured with password authentication and TOTP two-factor protection
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
