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
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';

function formatRecoveryInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const groups = clean.match(/.{1,4}/g) || [];
  return groups.join('-');
}

const LoginPage: React.FC = () => {
  const { loginWithTotp, loginWithPassword, completeSetup, enterAdmin, addToast, darkMode, toggleDarkMode } = useAdmin();

  // Screen/flow state
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  // Email & Password fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Login verification code (TOTP or backup code)
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Setup state (in case TOTP is disabled for the default admin)
  const [setup, setSetup] = useState<{ secret: string; uri: string; qr: string } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [setupUser, setSetupUser] = useState<any>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const codeRef = useRef<HTMLInputElement>(null);
  const setupRef = useRef<HTMLInputElement>(null);
  const autoSubmitted = useRef(false);

  // Check TOTP status on page load (defaults to primary admin)
  useEffect(() => {
    const checkPrimaryTotp = async () => {
      setChecking(true);
      setError('');
      try {
        const res = await api.totpStatus('');
        if (res.enabled) {
          setEnabled(true);
          setShowPasswordInput(false);
        } else {
          // If TOTP is disabled, default to password/email login screen instead of setup screen
          setEnabled(false);
          setShowPasswordInput(true);
        }
      } catch (err: any) {
        setError(err.message || 'Error checking TOTP status');
        setEnabled(false);
        setShowPasswordInput(true);
      } finally {
        setChecking(false);
      }
    };
    checkPrimaryTotp();
  }, []);

  // Clear states when toggling back to TOTP login from password view
  const handleBackToTotp = () => {
    setShowPasswordInput(false);
    setEmail('');
    setPassword('');
    setError('');
  };

  // Explicitly fetch setup details when user triggers authenticator setup manually
  const handleTriggerSetup = async () => {
    setChecking(true);
    setError('');
    try {
      const setupRes = await api.totpSetup('');
      setSetup(setupRes);
      setEnabled(false);
      setShowPasswordInput(false);
    } catch (err: any) {
      setError(err.message || 'Failed to start authenticator setup');
    } finally {
      setChecking(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || busy) return;
    setError('');
    setBusy(true);
    try {
      await loginWithPassword(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (setup && !recoveryCodes.length) {
      const t = setTimeout(() => setupRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [setup, recoveryCodes]);

  useEffect(() => {
    if (enabled && !showPasswordInput) {
      const t = setTimeout(() => codeRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [enabled, showPasswordInput]);

  const submitLogin = useCallback(
    async (value: string) => {
      if (!value || busy) return;
      setError('');
      setBusy(true);
      try {
        // Log in using the verified code (primary admin)
        await loginWithTotp(value, email.trim() || undefined);
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
    if (useRecovery || checking || showPasswordInput || !enabled) return;
    if (code.length === 6 && !autoSubmitted.current && !busy) {
      autoSubmitted.current = true;
      submitLogin(code);
    }
  }, [code, useRecovery, checking, showPasswordInput, enabled, busy, submitLogin]);

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
    submitLogin(code);
  };

  const handleSetupConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = setupCode.trim();
    if (value.length !== 6 || busy) return;
    setError('');
    setBusy(true);
    try {
      const res = await completeSetup(value);
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

  const handleReconnect = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const setupRes = await api.totpSetup('', true);
      setSetup(setupRes);
      setEnabled(false);
      setCode('');
      setUseRecovery(false);
      setReconnecting(true);
      setSetupUser(null);
      setRecoveryCodes([]);
    } catch (err: any) {
      setError(err.message || 'Failed to start reconnect');
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
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 relative overflow-hidden font-sans ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Dynamic Theme Switcher Button */}
      <button
        type="button"
        onClick={toggleDarkMode}
        className={`absolute top-4 right-4 z-50 p-3 rounded-2xl border transition-all cursor-pointer ${
          darkMode
            ? 'border-white/10 bg-white/5 text-amber-400 hover:bg-white/10'
            : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
        }`}
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className={`absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl transition-colors duration-200 ${
        darkMode ? 'bg-indigo-600/30' : 'bg-indigo-400/20'
      }`} />
      <div className={`absolute -bottom-32 -right-32 h-96 w-96 rounded-full blur-3xl transition-colors duration-200 ${
        darkMode ? 'bg-purple-600/30' : 'bg-purple-400/20'
      }`} />
      <div className={`absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl transition-colors duration-200 ${
        darkMode ? 'bg-fuchsia-500/10' : 'bg-fuchsia-400/10'
      }`} />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30">
            <Boxes className="h-8 w-8 text-white" />
          </div>
          <h1 className={`mt-4 text-2xl font-extrabold tracking-tight ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>
            3D By SD <span className="text-indigo-600 dark:text-indigo-400">Admin</span>
          </h1>
          <p className={`mt-1 text-sm ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>Secured sign-in with your authenticator app</p>
        </div>

        <div className={`rounded-3xl border p-6 transition-colors duration-200 ${
          darkMode ? 'border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl' : 'border-slate-200 bg-white shadow-xl'
        }`}>
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
          ) : showPasswordInput ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                  <Mail className="h-6 w-6" />
                </div>
                <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Login with Email</h2>
                <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Enter your admin credentials to proceed.
                </p>
              </div>

              <div>
                <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  autoComplete="email"
                  className={`w-full min-h-11 rounded-xl border px-3 py-2 text-sm outline-none transition-all ${
                    darkMode
                      ? 'border-white/10 bg-slate-900/70 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40'
                      : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>

              <div>
                <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full min-h-11 rounded-xl border px-3 py-2 text-sm outline-none transition-all ${
                    darkMode
                      ? 'border-white/10 bg-slate-900/70 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40'
                      : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !email.trim() || !password.trim()}
                className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Login
              </button>

              <div className="flex flex-col gap-2 pt-2">
                {enabled ? (
                  <button
                    type="button"
                    onClick={handleBackToTotp}
                    className="mx-auto flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-400 dark:hover:text-white hover:text-slate-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to TOTP login
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleTriggerSetup}
                    className="mx-auto flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-400 dark:hover:text-white hover:text-slate-900"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Set up authenticator app
                  </button>
                )}
              </div>
            </form>
          ) : !enabled ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {reconnecting ? 'Reconnect your authenticator' : 'Set up your authenticator'}
                </h2>
                <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {reconnecting
                    ? 'Scan the new QR code with Google Authenticator to re-enable TOTP login. Your old codes will stop working.'
                    : 'First time here? Scan the QR code with Google Authenticator to enable TOTP login for your admin.'}
                </p>
              </div>

              {setup ? (
                <>
                  <div className="flex justify-center">
                    <img
                      src={setup.qr}
                      alt="TOTP QR Code"
                      className={`h-44 w-44 rounded-2xl border p-2 bg-white ${darkMode ? 'border-white/10' : 'border-slate-200 shadow-sm'}`}
                    />
                  </div>
                  <div>
                    <p className={`mb-1 text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Manual setup key</p>
                    <p className={`break-all rounded-xl border px-3 py-2 font-mono text-xs font-bold transition-all ${
                      darkMode ? 'border-white/10 bg-slate-900/60 text-indigo-300' : 'border-slate-200 bg-slate-50 text-indigo-700'
                    }`}>
                      {setup.secret}
                    </p>
                  </div>
                  <form onSubmit={handleSetupConfirm} className="space-y-3">
                    <div>
                      <label className={`mb-1.5 block text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
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
                        className={`w-full min-h-11 rounded-xl border py-3 text-center text-2xl font-bold tracking-[0.35em] outline-none transition-all ${
                          darkMode
                            ? 'border-white/10 bg-slate-900/70 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40'
                            : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20'
                        }`}
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
                      {reconnecting ? 'Reconnect TOTP Login' : 'Enable TOTP Login'}
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
                onClick={() => {
                  setShowPasswordInput(true);
                  setError('');
                }}
                className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold text-slate-400 dark:hover:text-white hover:text-slate-900 mx-auto"
              >
                Login with email
              </button>
            </div>
          ) : (
            <form onSubmit={handleLoginForm} className="space-y-4">
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300">
                  {useRecovery ? <KeySquare className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                </div>
                <h2 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {useRecovery ? 'Enter a one-time code' : 'Two-Factor Authentication'}
                </h2>
                <p className={`mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {useRecovery
                    ? 'Use one of the single-use codes you saved when enabling TOTP.'
                    : `Enter the 6-digit code from your Google Authenticator app.`}
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
                className={`w-full min-h-11 rounded-xl border py-3 text-center text-2xl font-bold tracking-[0.35em] outline-none transition-all ${
                  darkMode
                    ? 'border-white/10 bg-slate-900/70 text-white placeholder-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40'
                    : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20'
                }`}
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
                Verify Code
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
                  className="mx-auto flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-400 dark:hover:text-white hover:text-slate-900"
                >
                  {useRecovery ? 'Use authenticator code instead' : 'Lost your device? Use a recovery code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordInput(true);
                    setError('');
                  }}
                  className="mx-auto flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-400 dark:hover:text-white hover:text-slate-900"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Login with email
                </button>

                <button
                  type="button"
                  onClick={handleReconnect}
                  disabled={busy}
                  className="mx-auto flex min-h-11 items-center gap-1.5 text-xs font-semibold text-rose-500 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-200 disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                  Reconnect authenticator
                </button>
              </div>
            </form>
          )}
        </div>

        <p className={`mt-6 text-center text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Protected with TOTP two-factor authentication · No password required
        </p>
      </div>
    </div>
  );
};

export default LoginPage;