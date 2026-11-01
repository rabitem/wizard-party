'use client';

import { useState } from 'react';
import { BadgeCheck, MailWarning } from 'lucide-react';

import { authClient, unwrap } from '@/lib/account/auth-client';
import { useAuthCapabilities } from '@/presentation/hooks/account/useAuthCapabilities';

import { EmailCodeStep } from '../auth/EmailCodeStep';
import { Button, Notice, SERIF, errorMessage } from '../ui';

/** "Verified" / "Not verified yet" next to an address. */
export function EmailVerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${verified ? 'text-emerald-400/80' : 'text-amber-400/80'}`}>
      {verified ? <BadgeCheck className="w-3.5 h-3.5" /> : <MailWarning className="w-3.5 h-3.5" />}
      {verified ? 'Verified' : 'Not verified yet'}
    </span>
  );
}

interface EmailVerificationProps {
  email: string;
  verified: boolean;
  onVerified: () => Promise<void>;
  /** Label of the button that sends the code. */
  actionLabel?: string;
}

/**
 * The address, its verification state and, while unverified, the 6-digit code flow (emailOTP
 * plugin). Used by the Email panel and by the Communication settings, so both always agree.
 */
export function EmailVerification({ email, verified, onVerified, actionLabel = 'Send verification code' }: EmailVerificationProps) {
  const capabilities = useAuthCapabilities();
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setSending(true);
    setError(null);
    try {
      await unwrap(authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }));
      setSentAt(Date.now());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  };

  const verifying = sentAt !== null && !verified;

  return (
    <div>
      {error ? <Notice tone="error" className="mb-3">{error}</Notice> : null}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="min-w-0">
          <div className="text-sm text-amber-100 break-all" style={SERIF}>{email}</div>
          <div className="mt-1">
            <EmailVerificationBadge verified={verified} />
          </div>
        </div>
        {!verified && capabilities?.email && !verifying ? (
          <Button onClick={sendCode} disabled={sending}>{sending ? 'Sending…' : actionLabel}</Button>
        ) : null}
      </div>
      {verifying ? (
        <div className="mt-4">
          <EmailCodeStep email={email} sentAt={sentAt} onVerified={onVerified} onBack={() => setSentAt(null)} />
        </div>
      ) : null}
    </div>
  );
}
