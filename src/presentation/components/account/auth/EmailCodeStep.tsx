'use client';

import { useState, type FormEvent } from 'react';
import { MailCheck, RotateCw } from 'lucide-react';

import { authClient, unwrap } from '@/lib/account/auth-client';

import { Button, Notice, SERIF, errorMessage } from '../ui';
import { CodeField } from './CodeField';
import { isCompleteCode } from './auth-flow.utils';
import { useResendCooldown } from './useResendCooldown';

interface EmailCodeStepProps {
  email: string;
  /** When the current code was sent (ms epoch); starts the resend cooldown. */
  sentAt: number | null;
  /** Shown above the form, e.g. when the fresh code could not be sent. */
  notice?: string | null;
  /**
   * Password of the account, when the user is not signed in. The server only confirms an email
   * for whoever proves they own the account (a session or its password), so a code reaching the
   * inbox cannot confirm an account someone else created with this address.
   */
  password?: string;
  /** Runs after the email is verified (sign in, continue, ...). Errors are shown here. */
  onVerified: () => Promise<void>;
  onBack?: () => void;
  backLabel?: string;
}

/** "Enter the 6-digit code we sent to <email>" with resend cooldown; verifies the email. */
export function EmailCodeStep({ email, sentAt, notice, password, onVerified, onBack, backLabel = 'Back' }: EmailCodeStepProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'verify' | 'resend' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [verified, setVerified] = useState(false);
  const { secondsLeft, markSent } = useResendCooldown(sentAt);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isCompleteCode(code)) return;
    setBusy('verify');
    setError(null);
    try {
      if (!verified) {
        // `password` is read by the app's sign-in guard, not by the email-otp plugin's typed body.
        const body = { email, otp: code, ...(password ? { password } : {}) };
        await unwrap(authClient.emailOtp.verifyEmail(body as { email: string; otp: string }));
        setVerified(true);
      }
      await onVerified();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const resend = async () => {
    setBusy('resend');
    setError(null);
    setResent(false);
    try {
      await unwrap(authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }));
      markSent();
      setResent(true);
      setCode('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 shrink-0 rounded-xl border border-amber-600/40 bg-amber-900/30 inline-flex items-center justify-center text-amber-400">
          <MailCheck className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-amber-100 text-lg" style={SERIF}>Confirm your email</h2>
          <p className="text-xs sm:text-sm text-amber-200/55 leading-relaxed">
            Enter the 6-digit code we sent to <span className="text-amber-200/90 break-all">{email}</span>.
          </p>
        </div>
      </div>

      {notice ? <Notice tone="info">{notice}</Notice> : null}
      {resent ? <Notice tone="success">A new code is on its way. Check your inbox and spam folder.</Notice> : null}
      {verified && error ? <Notice tone="success">Email confirmed.</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <CodeField value={code} onChange={setCode} />

      <Button type="submit" variant="primary" block loading={busy === 'verify'} disabled={busy !== null || !isCompleteCode(code)}>
        {verified ? 'Continue' : 'Verify email'}
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Button type="button" variant="ghost" icon={<RotateCw className="w-4 h-4" />} loading={busy === 'resend'} disabled={busy !== null || secondsLeft > 0 || verified} onClick={resend}>
          {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
        </Button>
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack} disabled={busy !== null}>
            {backLabel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
