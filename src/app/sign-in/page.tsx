import type { Metadata } from 'next';

import { AccountShell, Panel, SignInPanel, type SignInMode } from '@/presentation/components/account';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Wizard Party to keep your stats, rewards and settings on every device.',
  robots: { index: false, follow: true },
};

const MODES: SignInMode[] = ['sign-in', 'sign-up', 'forgot', 'two-factor'];

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const requested = (params.step ?? params.mode) as SignInMode | undefined;
  const mode = requested && MODES.includes(requested) ? requested : 'sign-in';
  const next = typeof params.next === 'string' ? params.next : null;
  const providerError = typeof params.error === 'string' ? params.error : null;

  return (
    <AccountShell width="narrow">
      <Panel>
        <div className="p-5 sm:p-8">
          {providerError ? (
            <p role="alert" className="mb-4 rounded-xl border border-red-800/50 bg-red-950/35 px-3.5 py-3 text-sm text-red-200/90">
              Sign-in did not complete ({providerError.replace(/_/g, ' ')}). Please try again.
            </p>
          ) : null}
          <SignInPanel key={mode} initialMode={mode} next={next} />
        </div>
      </Panel>
      <p className="mt-6 text-center text-xs text-amber-200/35 leading-relaxed px-2">
        No account needed to play: you can always continue as a guest. By creating an account you agree to our{' '}
        <a href="/privacy" className="underline hover:text-amber-200/70">privacy policy</a>.
      </p>
    </AccountShell>
  );
}
