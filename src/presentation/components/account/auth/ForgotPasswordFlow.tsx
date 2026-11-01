'use client';

import { useState, type FormEvent } from 'react';
import { KeyRound, Mail, RotateCw } from 'lucide-react';

import { authClient, unwrap } from '@/lib/account/auth-client';

import { Button, Field, Notice, errorMessage } from '../ui';
import { CodeField } from './CodeField';
import { PasswordField } from './PasswordField';
import { isCompleteCode } from './auth-flow.utils';
import { useResendCooldown } from './useResendCooldown';

type Step = 'request' | 'reset' | 'done';

interface ForgotPasswordFlowProps {
  /** False when this deployment cannot deliver mail; shows a notice instead of the form. */
  emailAvailable: boolean;
  initialEmail?: string;
  /** Signs in with the new password (may switch to the 2FA step). */
  onSignIn: (email: string, password: string) => Promise<void>;
}

/** Forgot password by code: email -> 6-digit code + new password -> signed in. */
export function ForgotPasswordFlow({ emailAvailable, initialEmail = '', onSignIn }: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(initialEmail.includes('@') ? initialEmail : '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'send' | 'reset' | 'sign-in' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const { secondsLeft, markSent } = useResendCooldown(null);

  const run = async (key: NonNullable<typeof busy>, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const sendCode = (event?: FormEvent) => {
    event?.preventDefault();
    const wasResend = step === 'reset';
    void run('send', async () => {
      setResent(false);
      await unwrap(authClient.emailOtp.requestPasswordReset({ email: email.trim() }));
      markSent();
      setStep('reset');
      if (wasResend) {
        setCode('');
        setResent(true);
      }
    });
  };

  const resetPassword = (event: FormEvent) => {
    event.preventDefault();
    if (!isCompleteCode(code)) return;
    void run('reset', async () => {
      await unwrap(authClient.emailOtp.resetPassword({ email: email.trim(), otp: code, password }));
      setStep('done');
    });
  };

  const signIn = () => run('sign-in', () => onSignIn(email.trim(), password));

  if (!emailAvailable) {
    return <Notice tone="warning">Password reset emails are not available yet. Sign in with a passkey or a linked provider instead.</Notice>;
  }

  if (step === 'done') {
    return (
      <div className="space-y-4">
        <Notice tone="success">Password updated. Every device was signed out for safety.</Notice>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button variant="primary" block loading={busy === 'sign-in'} disabled={busy !== null} onClick={signIn}>
          Sign in now
        </Button>
      </div>
    );
  }

  if (step === 'request') {
    return (
      <form onSubmit={sendCode} className="space-y-4">
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Field id="forgot-email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required autoFocus />
        <Button type="submit" variant="primary" block loading={busy === 'send'} disabled={busy !== null} icon={<Mail className="w-4 h-4" />}>
          Send reset code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={resetPassword} className="space-y-4">
      <Notice tone="info">
        If an account exists for <span className="break-all">{email.trim()}</span>, we sent it a 6-digit code.
      </Notice>
      {resent ? <Notice tone="success">A new code is on its way.</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <CodeField value={code} onChange={setCode} />
      <PasswordField id="forgot-new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 10 characters. Checked against known data breaches." />
      <Button type="submit" variant="primary" block loading={busy === 'reset'} disabled={busy !== null || !isCompleteCode(code)} icon={<KeyRound className="w-4 h-4" />}>
        Save new password
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Button type="button" variant="ghost" icon={<RotateCw className="w-4 h-4" />} loading={busy === 'send'} disabled={busy !== null || secondsLeft > 0} onClick={() => sendCode()}>
          {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
        </Button>
        <Button type="button" variant="ghost" disabled={busy !== null} onClick={() => setStep('request')}>
          Use another email
        </Button>
      </div>
    </form>
  );
}
