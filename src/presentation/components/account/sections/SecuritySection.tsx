'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Fingerprint, KeyRound, Laptop, Link2, Trash2 } from 'lucide-react';

import { authClient, unwrap } from '@/lib/account/auth-client';
import type { AuthProviderId } from '@/infrastructure/auth/auth-capabilities';
import { useAuthCapabilities } from '@/presentation/hooks/account/useAuthCapabilities';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { useSearchParams } from 'next/navigation';

import { PROVIDER_META } from '../ProviderButtons';
import { describeProviderLinkResult, linkCallbackUrls } from './provider-link-result';

const PROVIDER_LABELS = {
  google: PROVIDER_META.google.label,
  discord: PROVIDER_META.discord.label,
  github: PROVIDER_META.github.label,
};
import { Button, Field, Notice, Panel, SERIF, SectionHeading, errorMessage } from '../ui';
import { TwoFactorCard } from './TwoFactorCard';

interface LinkedAccount {
  id: string;
  providerId: string;
  accountId: string;
}

interface PasskeyInfo {
  id: string;
  name?: string | null;
  createdAt?: string | Date | null;
  deviceType?: string;
}

interface SessionInfo {
  id: string;
  token: string;
  userAgent?: string | null;
  createdAt: string | Date;
}

// Order matters: Edge user agents also contain "Chrome", and Chrome ones contain "Safari".
const BROWSERS: [RegExp, string][] = [[/Edg\//, 'Edge'], [/Firefox\//, 'Firefox'], [/Chrome\//, 'Chrome'], [/Safari\//, 'Safari']];
const SYSTEMS: [RegExp, string][] = [[/iPhone|iPad/, 'iOS'], [/Android/, 'Android'], [/Mac OS X/, 'macOS'], [/Windows/, 'Windows'], [/Linux/, 'Linux']];

function describeAgent(userAgent?: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? 'Browser';
  const os = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  return os ? `${browser} on ${os}` : browser;
}

function useSecurityData() {
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const reload = useCallback(async () => {
    const [accountList, passkeyList, sessionList] = await Promise.all([
      authClient.listAccounts(),
      authClient.passkey.listUserPasskeys(),
      authClient.listSessions(),
    ]);
    setAccounts((accountList.data as LinkedAccount[] | null) ?? []);
    setPasskeys((passkeyList.data as PasskeyInfo[] | null) ?? []);
    setSessions((sessionList.data as SessionInfo[] | null) ?? []);
  }, []);
  useEffect(() => {
    queueMicrotask(() => void reload());
  }, [reload]);
  return { accounts, passkeys, sessions, reload };
}

function PasswordCard({ hasPassword, email }: { hasPassword: boolean; email: string }) {
  const capabilities = useAuthCapabilities();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      if (hasPassword) {
        await unwrap(authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true }));
        setCurrent('');
        setNext('');
        setStatus({ tone: 'success', text: 'Password changed. Other devices were signed out.' });
      } else {
        await unwrap(authClient.requestPasswordReset({ email, redirectTo: '/reset-password' }));
        setStatus({ tone: 'success', text: `We emailed ${email} a link to set a password.` });
      }
    } catch (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel accent={false}>
      <form onSubmit={submit} className="p-4 sm:p-5 space-y-4">
        <SectionHeading icon={<KeyRound className="w-4 h-4" />} title="Password" description={hasPassword ? undefined : 'You sign in with a provider or passkey. A password is optional.'} />
        {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        {hasPassword ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Current password" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} required />
            <Field label="New password" type="password" autoComplete="new-password" minLength={10} maxLength={128} value={next} onChange={(event) => setNext(event.target.value)} required />
          </div>
        ) : null}
        {hasPassword || capabilities?.email ? (
          <Button type="submit" variant={hasPassword ? 'primary' : 'secondary'} loading={busy}>
            {hasPassword ? 'Change password' : 'Email me a link to set a password'}
          </Button>
        ) : null}
      </form>
    </Panel>
  );
}

function PasskeysCard({ passkeys, onChange }: { passkeys: PasskeyInfo[]; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await onChange();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5 space-y-4">
        <SectionHeading
          icon={<Fingerprint className="w-4 h-4" />}
          title="Passkeys"
          description="Sign in with your fingerprint, face or device PIN. Phishing-proof and no password to remember."
        />
        {error ? <Notice tone="error">{error}</Notice> : null}
        {passkeys.length > 0 ? (
          <ul className="divide-y divide-amber-800/20 rounded-xl border border-amber-800/30">
            {passkeys.map((key) => (
              <li key={key.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <Fingerprint className="w-4 h-4 text-amber-500/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-amber-100 truncate" style={SERIF}>{key.name || 'Passkey'}</div>
                  <div className="text-[11px] text-amber-200/40">
                    {key.deviceType === 'multiDevice' ? 'Synced' : 'This device'}
                    {key.createdAt ? ` · added ${new Date(key.createdAt).toLocaleDateString()}` : ''}
                  </div>
                </div>
                <Button variant="ghost" aria-label="Remove passkey" loading={busy === key.id} onClick={() => run(key.id, () => unwrap(authClient.passkey.deletePasskey({ id: key.id })))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <Button
          variant="primary"
          icon={<Fingerprint className="w-4 h-4" />}
          loading={busy === 'add'}
          onClick={() => run('add', () => unwrap(authClient.passkey.addPasskey({ name: describeAgent(navigator.userAgent) })))}
        >
          Add a passkey
        </Button>
      </div>
    </Panel>
  );
}

function LinkedAccountsCard({ accounts, onChange }: { accounts: LinkedAccount[]; onChange: () => Promise<void> }) {
  const capabilities = useAuthCapabilities();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Outcome of a provider round trip (the provider redirects back here with ?linked= or ?error=).
  const redirectResult = describeProviderLinkResult(new URLSearchParams(searchParams.toString()), PROVIDER_LABELS);
  const providers = capabilities?.providers ?? [];
  if (providers.length === 0) return null;

  const linked = new Set(accounts.map((account) => account.providerId));
  const canUnlink = accounts.length > 1;

  const toggle = async (provider: AuthProviderId) => {
    setBusy(provider);
    setError(null);
    try {
      if (linked.has(provider)) {
        const account = accounts.find((candidate) => candidate.providerId === provider);
        if (account) await unwrap(authClient.unlinkAccount({ accountId: account.accountId }));
        await onChange();
      } else {
        await unwrap(authClient.linkSocial({ provider, ...linkCallbackUrls(provider) }));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5 space-y-4">
        <SectionHeading
          icon={<Link2 className="w-4 h-4" />}
          title="Connected accounts"
          description="Connect more sign-in providers to this account, even ones that use a different email. You need at least one way to sign in."
        />
        {error ? <Notice tone="error">{error}</Notice> : redirectResult ? <Notice tone={redirectResult.tone}>{redirectResult.message}</Notice> : null}
        <ul className="space-y-2">
          {providers.map((provider) => (
            <li key={provider} className="flex items-center gap-3 rounded-xl border border-amber-800/30 px-3.5 py-2.5">
              <span className="shrink-0">{PROVIDER_META[provider].icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-amber-100" style={SERIF}>{PROVIDER_META[provider].label}</span>
                <span className={`block text-[11px] ${linked.has(provider) ? 'text-emerald-400/80' : 'text-amber-200/40'}`}>
                  {linked.has(provider) ? 'Connected' : 'Not connected'}
                </span>
              </span>
              <Button
                variant={linked.has(provider) ? 'ghost' : 'secondary'}
                loading={busy === provider}
                disabled={linked.has(provider) && !canUnlink}
                onClick={() => void toggle(provider)}
              >
                {linked.has(provider) ? 'Disconnect' : 'Connect'}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function SessionsCard({ sessions, onChange }: { sessions: SessionInfo[]; onChange: () => Promise<void> }) {
  const { data } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const currentToken = data?.session.token;
  const others = sessions.filter((session) => session.token !== currentToken);

  const revokeOthers = async () => {
    setBusy(true);
    try {
      await unwrap(authClient.revokeOtherSessions());
      await onChange();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5 space-y-4">
        <SectionHeading
          icon={<Laptop className="w-4 h-4" />}
          title="Signed-in devices"
          action={others.length > 0 ? <Button variant="ghost" loading={busy} onClick={revokeOthers}>Sign out others</Button> : undefined}
        />
        <ul className="divide-y divide-amber-800/20">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center gap-3 py-2">
              <Laptop className="w-4 h-4 text-amber-600/70 shrink-0" />
              <span className="flex-1 min-w-0 text-sm text-amber-100 truncate" style={SERIF}>{describeAgent(session.userAgent)}</span>
              <span className="text-[11px] text-amber-200/40 shrink-0">
                {session.token === currentToken ? <span className="text-emerald-400/80">This device</span> : new Date(session.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

export function SecuritySection() {
  const { user } = useAccount();
  const { accounts, passkeys, sessions, reload } = useSecurityData();
  if (!user || accounts === null) {
    return <div className="h-64 rounded-2xl bg-amber-900/10 animate-pulse" aria-label="Loading security settings" />;
  }
  const hasPassword = accounts.some((account) => account.providerId === 'credential');
  return (
    <div className="space-y-4 sm:space-y-5">
      <TwoFactorCard hasPassword={hasPassword} />
      <PasskeysCard passkeys={passkeys} onChange={reload} />
      <PasswordCard hasPassword={hasPassword} email={user.email} />
      <LinkedAccountsCard accounts={accounts} onChange={reload} />
      <SessionsCard sessions={sessions} onChange={reload} />
    </div>
  );
}
