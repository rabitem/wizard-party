'use client';

import { useState, type FormEvent } from 'react';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';

import { authClient, unwrap } from '@/lib/account/auth-client';

import { Button, Field, Notice, errorMessage } from '../ui';

type Method = 'totp' | 'backup' | 'otp';

const COPY: Record<Method, { label: string; hint: string; placeholder: string }> = {
  totp: { label: 'Authenticator code', hint: 'Open your authenticator app and enter the 6-digit code.', placeholder: '123456' },
  otp: { label: 'Email code', hint: 'We sent a 6-digit code to your email.', placeholder: '123456' },
  backup: { label: 'Backup code', hint: 'Each backup code works once.', placeholder: 'xxxxx-xxxxx' },
};

export function TwoFactorChallenge({ methods, onVerified, onCancel }: { methods: string[]; onVerified: () => void; onCancel: () => void }) {
  const [method, setMethod] = useState<Method>(methods.includes('totp') ? 'totp' : 'otp');
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const switchTo = (next: Method) => {
    setMethod(next);
    setCode('');
    setError(null);
  };

  const sendOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      await unwrap(authClient.twoFactor.sendOtp({}));
      setOtpSent(true);
      switchTo('otp');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const value = code.trim();
      if (method === 'totp') await unwrap(authClient.twoFactor.verifyTotp({ code: value, trustDevice }));
      else if (method === 'otp') await unwrap(authClient.twoFactor.verifyOtp({ code: value, trustDevice }));
      else await unwrap(authClient.twoFactor.verifyBackupCode({ code: value, trustDevice }));
      onVerified();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl border border-amber-600/40 bg-amber-900/30 inline-flex items-center justify-center text-amber-400">
          <ShieldCheck className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-amber-100 text-lg font-serif">Two-step verification</h2>
          <p className="text-xs text-amber-200/50">{COPY[method].hint}</p>
        </div>
      </div>

      {otpSent && method === 'otp' ? <Notice tone="success">Code sent. Check your inbox.</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Field
        label={COPY[method].label}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder={COPY[method].placeholder}
        inputMode={method === 'backup' ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        autoFocus
        required
        maxLength={method === 'backup' ? 32 : 6}
      />

      <label className="flex items-center gap-2.5 text-sm text-amber-200/70 cursor-pointer select-none">
        <input type="checkbox" checked={trustDevice} onChange={(event) => setTrustDevice(event.target.checked)} className="w-4 h-4 accent-amber-600" />
        Trust this device for 30 days
      </label>

      <Button type="submit" variant="primary" block loading={busy} disabled={code.trim().length < 6}>
        Verify
      </Button>

      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs">
        {method !== 'totp' && methods.includes('totp') ? (
          <button type="button" className="text-amber-400/80 hover:text-amber-300 cursor-pointer inline-flex items-center gap-1.5" onClick={() => switchTo('totp')}>
            <ShieldCheck className="w-3.5 h-3.5" /> Use authenticator app
          </button>
        ) : null}
        {method !== 'backup' ? (
          <button type="button" className="text-amber-400/80 hover:text-amber-300 cursor-pointer inline-flex items-center gap-1.5" onClick={() => switchTo('backup')}>
            <KeyRound className="w-3.5 h-3.5" /> Use a backup code
          </button>
        ) : null}
        {methods.includes('otp') && method !== 'otp' ? (
          <button type="button" className="text-amber-400/80 hover:text-amber-300 cursor-pointer inline-flex items-center gap-1.5" onClick={sendOtp} disabled={busy}>
            <Mail className="w-3.5 h-3.5" /> Email me a code
          </button>
        ) : null}
        <button type="button" className="text-amber-600/70 hover:text-amber-400 cursor-pointer" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
