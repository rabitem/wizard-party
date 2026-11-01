'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint } from 'lucide-react';

import { authClient, setTwoFactorListener, unwrap } from '@/lib/account/auth-client';
import type { AuthProviderId } from '@/infrastructure/auth/auth-capabilities';
import { useAuthCapabilities } from '@/presentation/hooks/account/useAuthCapabilities';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { ProviderButtons } from '../ProviderButtons';
import { Button, Divider, Notice, errorMessage } from '../ui';
import { CredentialsForm, type CredentialsValues } from './CredentialsForm';
import { EmailCodeStep } from './EmailCodeStep';
import { ForgotPasswordFlow } from './ForgotPasswordFlow';
import { TwoFactorChallenge } from './TwoFactorChallenge';
import { safeNext } from './auth-flow.utils';
import { WELCOME_DESTINATION, signInWithPassword, usePasswordAuth, type PendingVerification } from './usePasswordAuth';
import { useUsernameAvailability } from './useUsernameAvailability';

export type SignInMode = 'sign-in' | 'sign-up' | 'forgot' | 'two-factor' | 'verify-email';

const TITLES: Record<'sign-in' | 'sign-up' | 'forgot', { title: string; subtitle: string }> = {
  'sign-in': { title: 'Welcome back', subtitle: 'Sign in to keep your stats, rewards and settings on every device.' },
  'sign-up': { title: 'Create your account', subtitle: 'Free forever. Your guest progress from this browser can come with you.' },
  forgot: { title: 'Reset your password', subtitle: 'We will email you a 6-digit code to choose a new password.' },
};

const EMPTY_VALUES: CredentialsValues = { identifier: '', username: '', email: '', password: '' };

const LINK_CLASS = 'min-h-11 px-1 text-amber-400 hover:text-amber-300 cursor-pointer';

function ModeSwitch({ mode, onSwitch }: { mode: SignInMode; onSwitch: (mode: SignInMode) => void }) {
  const toSignUp = mode === 'sign-in';
  return (
    <p className="mt-6 text-center text-sm text-amber-200/55 font-serif">
      {toSignUp ? 'New here? ' : 'Already have an account? '}
      <button type="button" className={LINK_CLASS} onClick={() => onSwitch(toSignUp ? 'sign-up' : 'sign-in')}>
        {toSignUp ? 'Create an account' : 'Sign in'}
      </button>
    </p>
  );
}

export function SignInPanel({ initialMode = 'sign-in', next }: { initialMode?: SignInMode; next?: string | null }) {
  const router = useRouter();
  const { refreshSession } = useAccount();
  const capabilities = useAuthCapabilities();
  const [mode, setMode] = useState<SignInMode>(initialMode === 'verify-email' ? 'sign-in' : initialMode);
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[]>(['totp']);
  const [values, setValues] = useState<CredentialsValues>(EMPTY_VALUES);
  const [verification, setVerification] = useState<PendingVerification | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  const usernameAvailability = useUsernameAvailability(mode === 'sign-up' ? values.username : '');
  const target = safeNext(next);

  useEffect(() => {
    queueMicrotask(() => setLastUsed(authClient.getLastUsedLoginMethod()));
    setTwoFactorListener((methods) => {
      setTwoFactorMethods(methods);
      setMode('two-factor');
    });
    return () => setTwoFactorListener(null);
  }, []);

  const switchMode = (nextMode: SignInMode) => {
    setMode(nextMode);
    setError(null);
  };

  const finish = useCallback(
    async (destination: string) => {
      await refreshSession();
      router.replace(destination);
    },
    [refreshSession, router]
  );

  const onVerificationNeeded = useCallback((pendingVerification: PendingVerification) => {
    setVerification(pendingVerification);
    setMode('verify-email');
    setError(null);
  }, []);

  const passwordAuth = usePasswordAuth({ finish, onVerificationNeeded });

  const run = async (key: string, action: () => Promise<void>) => {
    setPending(key);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(null);
    }
  };

  const usernameBlocked = usernameAvailability.status === 'invalid' || usernameAvailability.status === 'taken';

  const submitCredentials = (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'sign-up') {
      if (!usernameBlocked) void run('password', () => passwordAuth.signUp(values));
      return;
    }
    void run('password', () => passwordAuth.signIn(values.identifier, values.password, target));
  };

  const signInWithProvider = (provider: AuthProviderId) =>
    run(provider, async () => {
      await unwrap(authClient.signIn.social({ provider, callbackURL: target, newUserCallbackURL: WELCOME_DESTINATION, errorCallbackURL: '/sign-in' }));
    });

  const signInWithPasskey = () =>
    run('passkey', async () => {
      await unwrap(authClient.signIn.passkey());
      await finish(target);
    });

  if (mode === 'two-factor') {
    return <TwoFactorChallenge methods={twoFactorMethods} onVerified={() => void finish(verification?.destination ?? target)} onCancel={() => switchMode('sign-in')} />;
  }

  if (mode === 'verify-email' && verification) {
    return (
      <EmailCodeStep
        email={verification.email}
        sentAt={verification.sentAt}
        notice={verification.notice}
        password={values.password}
        onVerified={() => passwordAuth.continueAfterVerification(verification, values.password)}
        onBack={() => switchMode('sign-in')}
        backLabel="Back to sign in"
      />
    );
  }

  const formMode = mode === 'sign-up' ? 'sign-up' : 'sign-in';
  const { title, subtitle } = TITLES[mode === 'forgot' ? 'forgot' : formMode];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl text-amber-50 text-center" style={{ fontFamily: 'var(--font-serif)', textShadow: '0 2px 20px color-mix(in srgb, var(--accent-deep) 25%, transparent)' }}>
        {title}
      </h1>
      <p className="mt-2 mb-6 text-center text-sm text-amber-200/55 leading-relaxed">{subtitle}</p>

      {mode === 'forgot' ? (
        <ForgotPasswordFlow
          emailAvailable={capabilities?.email !== false}
          initialEmail={values.identifier}
          onSignIn={async (email, password) => {
            if (await signInWithPassword(email, password)) await finish(target);
          }}
        />
      ) : (
        <>
          {error ? <Notice tone="error" className="mb-4">{error}</Notice> : null}
          <div className="space-y-2.5">
            <ProviderButtons providers={capabilities?.providers ?? []} pending={pending} lastUsed={lastUsed} onSelect={signInWithProvider} />
            {formMode === 'sign-in' && capabilities?.passkeys !== false ? (
              <Button type="button" block icon={<Fingerprint className="w-4 h-4" />} loading={pending === 'passkey'} disabled={pending !== null} onClick={signInWithPasskey}>
                Sign in with a passkey
              </Button>
            ) : null}
          </div>
          {(capabilities?.providers.length ?? 0) > 0 || formMode === 'sign-in' ? <Divider label={formMode === 'sign-in' ? 'or with your password' : 'or with email'} /> : null}
          <CredentialsForm
            mode={formMode}
            values={values}
            onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
            usernameAvailability={usernameAvailability}
            verifiesEmail={capabilities?.email === true}
            busy={pending === 'password'}
            disabled={pending !== null || (formMode === 'sign-up' && usernameBlocked)}
            onSubmit={submitCredentials}
            onForgotPassword={() => switchMode('forgot')}
          />
        </>
      )}

      <ModeSwitch mode={mode} onSwitch={switchMode} />
    </div>
  );
}
