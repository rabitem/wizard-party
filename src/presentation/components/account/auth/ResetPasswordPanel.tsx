'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { authClient, unwrap } from '@/lib/account/auth-client';

import { Button, Notice, errorMessage } from '../ui';
import { PasswordField } from './PasswordField';

const CODE_FLOW_HREF = '/sign-in?mode=forgot';

/**
 * Landing page of emailed reset links ("set a password" for provider-only accounts and links
 * sent before the code flow existed). Without a valid token it points to the code-based flow.
 */
export function ResetPasswordPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const linkError = searchParams.get('error');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await unwrap(authClient.resetPassword({ newPassword: password, token }));
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl text-amber-50 text-center mb-6 font-serif">Choose a new password</h1>
      {!token || linkError ? (
        <div className="space-y-4">
          <Notice tone="error">This reset link is invalid or has expired.</Notice>
          <Button variant="primary" block onClick={() => router.push(CODE_FLOW_HREF)}>Get a reset code by email</Button>
        </div>
      ) : done ? (
        <div className="space-y-4">
          <Notice tone="success">Password updated. Every device was signed out for safety.</Notice>
          <Button variant="primary" block onClick={() => router.push('/sign-in')}>Sign in</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error ? <Notice tone="error">{error}</Notice> : null}
          <PasswordField id="reset-new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 10 characters." />
          <Button type="submit" variant="primary" block loading={busy}>Save password</Button>
          <p className="text-center text-xs text-amber-200/45">
            Link not working? <Link href={CODE_FLOW_HREF} className="text-amber-400 hover:text-amber-300 underline">Get a code instead</Link>.
          </p>
        </form>
      )}
    </div>
  );
}
