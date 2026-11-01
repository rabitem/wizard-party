import type { Metadata } from 'next';
import Link from 'next/link';
import { MailX } from 'lucide-react';

import { EMAIL_CATEGORY_DEFINITIONS, isEmailCategory } from '@shared/domain/social';

import { AccountShell, Panel } from '@/presentation/components/account';
import { Notice } from '@/presentation/components/account/ui';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string; status?: string; category?: string }> };

/** The category named by a done page, or by the (still unverified) token on the confirm page. */
function mailLabel(category: string | undefined, token: string | undefined): string {
  const named = category ?? token?.split('.')[0];
  return isEmailCategory(named) ? EMAIL_CATEGORY_DEFINITIONS[named].label : 'these emails';
}

function UnsubscribeBody({ token, status, label }: { token?: string; status?: string; label: string }) {
  if (status === 'done') {
    return <Notice tone="success">You won&apos;t get {label} anymore. Everything still shows up in your in-game inbox.</Notice>;
  }
  if (status === 'invalid' || !token) {
    return <Notice tone="error">This unsubscribe link is invalid. You can turn emails off under Account → Profile → Communication.</Notice>;
  }
  return (
    <form method="post" action={`/api/email/unsubscribe?token=${encodeURIComponent(token)}`} className="space-y-4">
      <p className="text-sm text-amber-200/70 leading-relaxed">
        Stop {label} while you&apos;re offline? You can turn them back on anytime in your account.
      </p>
      <button
        type="submit"
        className="w-full min-h-11 rounded-xl border-2 border-amber-600/60 text-amber-100 hover:border-amber-500/80 bg-[linear-gradient(180deg,color-mix(in_srgb,_var(--color-amber-700)_55%,_transparent)_0%,color-mix(in_srgb,_var(--color-amber-900)_70%,_transparent)_100%)] cursor-pointer font-serif"
      >
        Unsubscribe
      </button>
    </form>
  );
}

/** Confirms an unsubscribe link from an email; the actual change is a POST (see the API route). */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { token, status, category } = await searchParams;
  const label = mailLabel(category, token);
  return (
    <AccountShell width="narrow">
      <Panel>
        <div className="p-5 sm:p-8 space-y-5">
          <h1 className="flex items-center gap-2 text-xl text-amber-100 font-serif">
            <MailX className="w-5 h-5 text-amber-500/80" />
            Email notifications
          </h1>
          <UnsubscribeBody token={token} status={status} label={label} />
          <Link href="/account?tab=profile" className="block text-center text-sm text-amber-400/80 hover:text-amber-200 underline font-serif">
            Communication settings
          </Link>
        </div>
      </Panel>
    </AccountShell>
  );
}
