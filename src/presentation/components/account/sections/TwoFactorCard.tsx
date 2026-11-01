'use client';

import { useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ShieldCheck, ShieldOff } from 'lucide-react';

import { authClient, unwrap } from '@/lib/account/auth-client';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { Button, Field, Notice, Panel, SERIF, SectionHeading, errorMessage } from '../ui';

type Step = { kind: 'idle' } | { kind: 'password'; purpose: 'enable' | 'disable' | 'codes' } | { kind: 'scan'; totpURI: string; backupCodes: string[] } | { kind: 'codes'; backupCodes: string[] };

function BackupCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <Notice tone="warning">Save these backup codes somewhere safe. Each one signs you in once if you lose your authenticator.</Notice>
      <ul className="grid grid-cols-2 gap-1.5 rounded-xl border border-amber-800/40 bg-black/30 p-3 font-mono text-sm text-amber-100">
        {codes.map((code) => <li key={code} className="text-center tracking-wider">{code}</li>)}
      </ul>
      <Button
        variant="ghost"
        icon={<Copy className="w-4 h-4" />}
        onClick={() => void navigator.clipboard.writeText(codes.join('\n')).then(() => setCopied(true))}
      >
        {copied ? 'Copied' : 'Copy codes'}
      </Button>
    </div>
  );
}

export function TwoFactorCard({ hasPassword }: { hasPassword: boolean }) {
  const { user, refreshSession } = useAccount();
  const enabled = Boolean(user?.twoFactorEnabled);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const passwordArg = () => (hasPassword ? { password } : {});

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const start = (purpose: 'enable' | 'disable' | 'codes') => {
    setDone(null);
    setPassword('');
    if (hasPassword) setStep({ kind: 'password', purpose });
    else void proceed(purpose);
  };

  const proceed = (purpose: 'enable' | 'disable' | 'codes') =>
    run(async () => {
      if (purpose === 'enable') {
        const result = await unwrap(authClient.twoFactor.enable({ ...(passwordArg() as { password: string }), method: 'totp' }));
        if (result.method !== 'totp') throw new Error('Authenticator setup is unavailable.');
        setStep({ kind: 'scan', totpURI: result.totpURI, backupCodes: result.backupCodes });
      } else if (purpose === 'disable') {
        await unwrap(authClient.twoFactor.disable(passwordArg() as { password: string }));
        await refreshSession();
        setStep({ kind: 'idle' });
        setDone('Two-step verification is off.');
      } else {
        const result = await unwrap(authClient.twoFactor.generateBackupCodes(passwordArg() as { password: string }));
        setStep({ kind: 'codes', backupCodes: result.backupCodes });
      }
    });

  const confirmPassword = (event: FormEvent) => {
    event.preventDefault();
    if (step.kind === 'password') void proceed(step.purpose);
  };

  const verify = (event: FormEvent) => {
    event.preventDefault();
    if (step.kind !== 'scan') return;
    const { backupCodes } = step;
    void run(async () => {
      await unwrap(authClient.twoFactor.verifyTotp({ code: code.trim() }));
      await refreshSession();
      setCode('');
      setStep({ kind: 'codes', backupCodes });
      setDone('Two-step verification is on.');
    });
  };

  const secret = step.kind === 'scan' ? new URL(step.totpURI).searchParams.get('secret') : null;

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5 space-y-4">
        <SectionHeading
          icon={enabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
          title="Two-step verification"
          description="Require a code from an authenticator app (Google Authenticator, 1Password, Aegis …) when signing in."
          action={<span className={`text-xs rounded-full px-2.5 py-1 border ${enabled ? 'border-emerald-700/50 text-emerald-300 bg-emerald-950/30' : 'border-amber-800/40 text-amber-300/70'}`}>{enabled ? 'On' : 'Off'}</span>}
        />
        {error ? <Notice tone="error">{error}</Notice> : null}
        {done ? <Notice tone="success">{done}</Notice> : null}

        {step.kind === 'idle' ? (
          <div className="flex flex-wrap gap-2">
            {enabled ? (
              <>
                <Button onClick={() => start('codes')} loading={busy}>New backup codes</Button>
                <Button variant="danger" onClick={() => start('disable')} loading={busy}>Turn off</Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => start('enable')} loading={busy}>Set up authenticator</Button>
            )}
          </div>
        ) : null}

        {step.kind === 'password' ? (
          <form onSubmit={confirmPassword} className="space-y-3">
            <Field label="Confirm your password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" loading={busy}>Continue</Button>
              <Button type="button" variant="ghost" onClick={() => setStep({ kind: 'idle' })}>Cancel</Button>
            </div>
          </form>
        ) : null}

        {step.kind === 'scan' ? (
          <form onSubmit={verify} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="rounded-xl bg-[#f6efe2] p-3 shrink-0">
                <QRCodeSVG value={step.totpURI} size={164} bgColor="#f6efe2" fgColor="#1a1510" level="M" />
              </div>
              <div className="text-sm text-amber-200/70 space-y-2 min-w-0">
                <p style={SERIF}>1. Scan the code with your authenticator app.</p>
                {secret ? (
                  <p className="text-xs text-amber-200/45 break-all">
                    Can’t scan? Enter this key: <span className="font-mono text-amber-200/80">{secret}</span>
                  </p>
                ) : null}
                <p style={SERIF}>2. Enter the 6-digit code it shows.</p>
              </div>
            </div>
            <Field label="Code from your app" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} required />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" loading={busy} disabled={code.trim().length !== 6}>Activate</Button>
              <Button type="button" variant="ghost" onClick={() => setStep({ kind: 'idle' })}>Cancel</Button>
            </div>
          </form>
        ) : null}

        {step.kind === 'codes' ? (
          <div className="space-y-3">
            <BackupCodes codes={step.backupCodes} />
            <Button variant="primary" onClick={() => setStep({ kind: 'idle' })}>I saved them</Button>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
