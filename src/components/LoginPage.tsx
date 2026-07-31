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
  Mail,
  ArrowLeft,
} from 'lucide-react';

function formatRecoveryInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const groups = clean.match(/.{1,4}/g) || [];
  return groups.join('-');
}

const LoginPage: React.FC = () => {
  const { loginWithTotp, completeSetup, enterAdmin, addToast } = useAdmin();

  // Email input state
  const [email, setEmail] = useState('');
  const [emailEntered, setEmailEntered] = useState(false);

  const [checking, setChecking] = useState(false);
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
  const autoSubmitted = useRef(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) return;
    setError('');
    setChecking(true);
    try {
      const res = await api.totpStatus(targetEmail);
      if (res.enabled) {
        setEnabled(true);
        setEmailEntered(true);
      } else {
        const setupRes = await api.totpSetup(targetEmail);
        setSetup(setupRes);
        setEnabled(false);
        setEmailEntered(true);
      }
    } catch (err: any) {
      setError(err.message || 'No admin account found.');
      setEmailEntered(false);
      setEnabled(false);
      setSetup(null);
    } finally {
      setChecking(false);
    }
  };

  const handleBack = () => {
    setEmailEntered(false);
    setEnabled(false);
    setSetup(null);
    setSetupCode('');
    setCode('');
    setError('');
  };

  useEffect(() => {
    if (setup && !recoveryCodes.length) {
      const t = setTimeout(() => setupRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [setup, recoveryCodes]);

  useEffect(() => {
    if (enabled) {
      const t = setTimeout(() => codeRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [enabled]);

  const submitLogin = useCallback(
    async (value: string) => {
      if (!value || busy) return;
      setError('');
      setBusy(true);
      try {
        await loginWithTotp(value, email);
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
    [busy, loginWithTotp, email]
  );

  useEffect(() => {
    if (useRecovery || checking || !emailEntered) return;
    if (code.length === 6 && !autoSubmitted.current && !busy) {
      autoSubmitted.current = true;
      submitLogin(code);
    }
  }, [code, useRecovery, checking, emailEntered, busy, submitLogin]);

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
      const res = await completeSetup(value, email);
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
          <p className="mt-1 text-sm text-slate-400">Secured sign-in with your authenticator app</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">
          {checking ? (
            <div className="flex min-h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          ) : recoveryCodes.length > 0 && setupUser ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <h2 className="text-sm font-extrabold text-white">Save these recovery codes</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Each code works only once and can sign you in if you lose your phone. Store them somewhere safe — you
                    will not see them again.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {recoveryCodes.map((rc, i) => (
                  <div
                    key={rc}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 font-mono text-xs font-bold tracking-wider text-amber-200"
                  >
                    <span className="text-slate-500">#{String(i + 1).padStart(2, '0')}</span>
                    {rc}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyRecoveryCodes}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-sm font-bold text-white hover:bg-white/10"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy All'}
                </button>
                <button
                  type="button"
                  onClick={() => setupUser && enterAdmin(setupUser)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90"
                >
                  <ShieldCheck className="h-4 w-4" /> Continue to Admin
                </button>
              </div>
            </div>
          ) : !emailEntered ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Mail className="h-6 w-6" />
                </div>
                <h2 className="text-base font-bold text-white">Sign In with Authenticator</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Enter your admin email address to proceed.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  className="w-full min-h-11 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Continue
              </button>
            </form>
          ) : !enabled ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h2 className="text-base font-bold text-white">Set up your authenticator</h2>
                <p className="mt-1 text-xs text-slate-400">
                  First time here? Scan the QR code with Google Authenticator to enable TOTP login for your admin.
                </p>
              </div>

              {setup ? (
                <>
                  <div className="flex justify-center">
                    <img
                      src={setup.qr}
                      alt="TOTP QR Code"
                      className="h-44 w-44 rounded-2xl border border-white/10 bg-white p-2"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Manual setup key</p>
                    <p className="break-all rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 font-mono text-xs font-bold text-indigo-300">
                      {setup.secret}
                    </p>
                  </div>
                  <form onSubmit={handleSetupConfirm} className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                        Enter 6-digit code
                      </label>
                      <input
                        ref={setupRef}
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        aria-label="Authenticator setup code"
                        className="w-full min-h-11 rounded-xl border border-white/10 bg-slate-900/70 py-3 text-center text-2xl font-bold tracking-[0.35em] text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                      />
                    </div>
                    {error && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                        {error}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={busy || setupCode.length !== 6}
                      className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90 disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Enable TOTP Login
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex min-h-24 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                </div>
              )}

              {error && !setup && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleBack}
                className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-slate-400 hover:text-white mx-auto"
              >
                <ArrowLeft className="h-3 w-3" /> Change email address
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoginForm} className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                  {useRecovery ? <KeySquare className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                </div>
                <h2 className="text-base font-bold text-white">
                  {useRecovery ? 'Enter a recovery code' : 'Two-Factor Authentication'}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {useRecovery
                    ? 'Use one of the single-use codes you saved when enabling TOTP.'
                    : `Enter the 6-digit code for ${email} from your Google Authenticator app.`}
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

              <div className="flex flex-col gap-2 pt-2">
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

                <button
                  type="button"
                  onClick={handleBack}
                  className="mx-auto flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change email address
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Protected with TOTP two-factor authentication · No password required
        </p>
      </div>
    </div>
  );
};

export default LoginPage;