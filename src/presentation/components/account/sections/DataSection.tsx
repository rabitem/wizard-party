'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2 } from 'lucide-react';

import { accountApi } from '@/lib/account/account-api';
import { authClient, unwrap } from '@/lib/account/auth-client';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { Button, Field, Notice, Panel, SectionHeading, errorMessage } from '../ui';

export function DataSection() {
  const router = useRouter();
  const { refreshSession } = useAccount();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const deleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const result = await unwrap(authClient.deleteUser({ ...(password ? { password } : {}), callbackURL: '/' }));
      if (result && 'message' in result && /verification/i.test(String(result.message))) {
        setStatus({ tone: 'success', text: 'Check your inbox to confirm the deletion.' });
        return;
      }
      await refreshSession();
      router.replace('/');
    } catch (error) {
      const message = errorMessage(error);
      setStatus({
        tone: 'error',
        text: /fresh|session/i.test(message) ? 'For your safety, sign out and in again, then retry within a few minutes.' : message,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <Panel accent={false}>
        <div className="p-4 sm:p-5">
          <SectionHeading icon={<Download className="w-4 h-4" />} title="Your data" description="Download everything we store about you: profile, games, achievements, settings and sound metadata (JSON)." />
          {/* Content-Disposition: attachment downloads without leaving the page. */}
          <Button icon={<Download className="w-4 h-4" />} onClick={() => window.location.assign(accountApi.exportUrl)}>
            Download my data
          </Button>
        </div>
      </Panel>

      <Panel accent={false}>
        <div className="p-4 sm:p-5 space-y-4">
          <SectionHeading icon={<Trash2 className="w-4 h-4" />} title="Delete account" description="Permanently deletes your account, stats, achievements, synced settings and uploaded sounds. This cannot be undone." />
          {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
          {confirming ? (
            <form onSubmit={deleteAccount} className="space-y-3">
              <Field
                label="Password (if you have one)"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                hint="Accounts without a password need a recent sign-in instead."
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="danger" loading={busy}>Delete forever</Button>
                <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Keep my account</Button>
              </div>
            </form>
          ) : (
            <Button variant="danger" onClick={() => setConfirming(true)}>Delete my account…</Button>
          )}
        </div>
      </Panel>
    </div>
  );
}
