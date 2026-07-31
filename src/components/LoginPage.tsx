import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { api } from '../api';
import {
  ShieldCheck,
  Smartphone,
  Loader2,
  Boxes,
  KeySquare,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

function formatRecoveryInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const groups = clean.match(/.{1,4}/g) || [];
  return groups.join('-');
}

export const LoginPage: React.FC = () => {
  const { loginWithTotp, completeSetup, enterAdmin, addToast } = useAdmin();

  const [emailMode, setEmailMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem('ADMIN_LOGIN_EMAIL') || '');
  const [emailInput, setEmailInput] = useState(() => localStorage.getItem('ADMIN_LOGIN_EMAIL') || '');
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);

  // Login mode
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Setup mode
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: string } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupUser, setSetupUser] = useState<any>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const codeRef = useRef<HTMLInputElement>(null);
  const setupRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        const res = await api.totpStatus(adminEmail || undefined);
        if (cancelled) return;
        setEnabled(res.enabled);
        if (res.enabled) setSetup(null);
        setError('');
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Could not reach the server.');
      } finally {
        if (cancelled) return;
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminEmail]);

  useEffect(() => {
    if (checking || enabled || setup) return;
    (async () => {
      try {
        const res = await api.totpSetup(adminEmail || undefined);
        setSetup(res);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to start TOTP setup');
      }
    })();
  }, [checking, enabled, setup]);

  useEffect(() => {
    if (setup && !recoveryCodes.length) {
      const t = setTimeout(() => setupRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [setup, recoveryCodes]);

  const submitLogin = useCallback(
    async (value: string) => {
      if (!value || busy) return;
      setError('');
      setBusy(true);
      try {
        await loginWithTotp(value, adminEmail || undefined);
      } catch (err: any) {
        setError(err.message || 'Invalid code');
        setCode('');
        autoSubmitted.current = false;
        setUseRecovery(false);
        setTimeout(() => codeRef.current?.focus(), 50);
      } finally {
        setBusy(false);
      }
    },
    [adminEmail, busy, loginWithTotp]
  );

  useEffect(() => {
    if (useRecovery || checking) return;
    if (code.length === 6 && !autoSubmitted.current && !busy) {
      autoSubmitted.current = true;
      submitLogin(code);
    }
  }, [code, useRecovery, checking, busy, submitLogin]);

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length !== 6) autoSubmitted.current = false;
  };

  const handleRecoveryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(formatRecoveryInput(e.target.value));
  };

  const handleLoginForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (useRecovery) submitLogin(code);
  };

  const handleSetupConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = setupCode.trim();
    if (value.length !== 6 || busy) return;
    setError('');
    setBusy(true);
    try {
      const res = await completeSetup(value, adminEmail || undefined);
      setSetupUser(res.user);
      setRecoveryCodes(res.recoveryCodes);
      setCopied(false);
      addToast({ type: 'success', title: 'TOTP Enabled', message: 'Two-factor login is now active.' });
    } catch (err: any) {
      setError(err.message || 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setCopied(true);
      addToast({ type: 'success', title: 'Recovery Codes Copied', message: 'Store them somewhere safe.' });
    } catch {
      addToast({ type: 'error', title: 'Copy Failed', message: 'Could not access the clipboard.' });
    }
  };

  const recoveryReady = code.replace(/[^A-Z0-9]/g, '').length === 12;

  const openEmailLogin = () => {
    setEmailMode(true);
    setError('');
    setTimeout(() => emailRef.current?.focus(), 50);
  };

  const applyAdminEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid admin email');
      return;
    }
    localStorage.setItem('ADMIN_LOGIN_EMAIL', email);
    setAdminEmail(email);
    setSetup(null);
    setSetupCode('');
    setCode('');
    setUseRecovery(false);
    setRecoveryCodes([]);
    setSetupUser(null);
    setCopied(false);
    autoSubmitted.current = false;
    setEmailMode(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] font-sans selection:bg-indigo-500/30">
      {/* Minimal ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="mb-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 mb-6">
            <Boxes className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-xl font-medium tracking-tight text-white">
            Admin <span className="text-slate-500">Workspace</span>
          </h1>
        </div>

        <div className="space-y-8 transition-all duration-500 ease-in-out">
          {emailMode ? (
            <form onSubmit={applyAdminEmail} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-medium text-white">Admin Login with Email</h2>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  Enter your admin email to continue with TOTP authentication.
                </p>
              </div>

              <div className="space-y-4">
                <input
                  ref={emailRef}
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@yourstore.com"
                  autoComplete="email"
                  className="w-full h-12 rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm text-white placeholder-white/30 outline-none transition-all focus:border-indigo-500/50"
                />
              </div>

              {error && (
                <div className="text-center text-[12px] font-medium text-red-400/90 bg-red-400/5 py-2 rounded-lg border border-red-400/10">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-600/10"
                >
                  Continue to TOTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode(false);
                    setError('');
                  }}
                  className="text-[12px] font-medium text-slate-500 hover:text-indigo-400 transition-colors"
                >
                  Back to authenticator screen
                </button>
              </div>
            </form>
          ) : checking ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-700" />
            </div>
          ) : recoveryCodes.length > 0 && setupUser ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-lg font-medium text-white">Save recovery codes</h2>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  These codes work only once. Store them safe — you will not see them again.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {recoveryCodes.map((rc, i) => (
                  <div
                    key={rc}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 font-mono text-[12px] font-medium tracking-wider text-amber-200/80"
                  >
                    <span className="text-slate-600">#{String(i + 1).padStart(2, '0')}</span>
                    {rc}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  onClick={copyRecoveryCodes}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-white/[0.03] border border-white/5 text-[13px] font-semibold text-white transition-all hover:bg-white/[0.06]"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy All'}
                </button>
                <button
                  type="button"
                  onClick={() => setupUser && enterAdmin(setupUser)}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-600/10"
                >
                  Continue to Workspace
                </button>
              </div>
            </div>
          ) : !enabled ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-medium text-white">Setup Authenticator</h2>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  Enable two-factor login by scanning the QR code with your app.
                </p>
                {adminEmail && <p className="text-[11px] text-indigo-300">Admin: {adminEmail}</p>}
              </div>

              {setup ? (
                <div className="space-y-8">
                  <div className="flex justify-center">
                    <div className="relative p-3 bg-white rounded-2xl">
                      <img src={setup.qr} alt="TOTP QR" className="h-40 w-44" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600 ml-1">Manual key</p>
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 font-mono text-[12px] font-medium text-indigo-300/80 break-all text-center">
                      {setup.secret}
                    </div>
                  </div>

                  <form onSubmit={handleSetupConfirm} className="space-y-6">
                    <div className="space-y-4">
                      <input
                        ref={setupRef}
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        inputMode="numeric"
                        autoComplete="off"
                        className="w-full h-14 bg-transparent border-b border-white/10 text-center text-3xl font-light tracking-[0.2em] text-white placeholder-white/5 outline-none transition-all focus:border-indigo-500/50"
                      />
                    </div>

                    {error && (
                      <div className="text-center text-[12px] font-medium text-red-400/90 bg-red-400/5 py-2 rounded-lg border border-red-400/10">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={busy || setupCode.length !== 6}
                      className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50 shadow-lg shadow-indigo-600/10"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Setup'}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={openEmailLogin}
                    className="mx-auto block text-[12px] font-medium text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    Switch to admin email login
                  </button>
                </div>
              ) : (
                <div className="flex min-h-[100px] items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-800" />
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleLoginForm} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-medium text-white">
                  {useRecovery ? 'Recovery Access' : 'Identity Verification'}
                </h2>
                <p className="text-[13px] text-slate-500 leading-relaxed">
                  {useRecovery
                    ? 'Enter an emergency code to bypass the authenticator.'
                    : 'Enter the 6-digit code from your authenticator app.'}
                </p>
                {adminEmail && <p className="text-[11px] text-indigo-300">Admin: {adminEmail}</p>}
              </div>

              <div className="space-y-4">
                <input
                  ref={codeRef}
                  value={code}
                  onChange={useRecovery ? handleRecoveryInput : handleCodeInput}
                  placeholder={useRecovery ? 'XXXX-XXXX-XXXX' : '000000'}
                  inputMode={useRecovery ? 'text' : 'numeric'}
                  autoComplete={useRecovery ? 'off' : 'one-time-code'}
                  maxLength={useRecovery ? 14 : 6}
                  className="w-full h-14 bg-transparent border-b border-white/10 text-center text-3xl font-light tracking-[0.2em] text-white placeholder-white/5 outline-none transition-all focus:border-indigo-500/50"
                />
              </div>

              {error && (
                <div className="text-center text-[12px] font-medium text-red-400/90 bg-red-400/5 py-2 rounded-lg border border-red-400/10">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {useRecovery && (
                  <button
                    type="submit"
                    disabled={busy || !recoveryReady}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-[13px] font-semibold text-white transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-600/10"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify Access'}
                  </button>
                )}

                <div className="flex flex-col gap-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecovery((prev) => !prev);
                      setCode('');
                      setError('');
                      autoSubmitted.current = false;
                      setTimeout(() => codeRef.current?.focus(), 50);
                    }}
                    className="text-[12px] font-medium text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {useRecovery ? 'Use authenticator code' : 'Lost device? Use recovery code'}
                  </button>
                  <button
                    type="button"
                    onClick={openEmailLogin}
                    className="text-[12px] font-medium text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    Switch to admin email login
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="mt-24 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-700">
            Secure Admin Gateway
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
