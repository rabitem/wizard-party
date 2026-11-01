'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import { CONSTANTS } from '@/presentation/config/constants';
import { useAccount } from '@/presentation/providers/AccountProvider';
import { PreferencesPanel } from '@/presentation/components/settings';
import { SettingsDrawer } from '@/presentation/components/settings/SettingsDrawer';

import { BAR_BG } from './account-surfaces';

const { ACCOUNT_PREFERENCES, PREFERENCES_QUERY_PARAM } = CONSTANTS.ROUTES;
const BUTTON_CLASS = 'inline-flex items-center justify-center h-11 w-11 rounded-full border border-amber-700/40 text-amber-200/90 hover:text-amber-50 hover:border-amber-500/60 hover:bg-amber-900/25 transition-all';
const BUTTON_STYLE = { background: BAR_BG, backdropFilter: 'blur(6px)' };

/**
 * Home-screen entry to Preferences: the account tab when signed in, the settings drawer for guests,
 * who have no account page. `?preferences=open` (the in-game panel's link) opens it directly.
 */
export function PreferencesButton() {
  const { status } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [opened, setOpened] = useState(false);
  const requested = searchParams.get(PREFERENCES_QUERY_PARAM) !== null;
  const isOpen = status === 'guest' && (opened || requested);

  const close = useCallback(() => {
    setOpened(false);
    if (!requested) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete(PREFERENCES_QUERY_PARAM);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, requested, router, searchParams]);

  if (status === 'signed-in') {
    return (
      <Link href={ACCOUNT_PREFERENCES} aria-label="Preferences" title="Preferences" className={BUTTON_CLASS} style={BUTTON_STYLE}>
        <SlidersHorizontal className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpened(true)} aria-label="Preferences" title="Preferences" disabled={status === 'loading'} className={`${BUTTON_CLASS} cursor-pointer disabled:opacity-50 disabled:cursor-default`} style={BUTTON_STYLE}>
        <SlidersHorizontal className="w-4 h-4" />
      </button>
      <SettingsDrawer isOpen={isOpen} onClose={close} closeOnEscape title="Preferences" subtitle="Saved on this device. Sign in to keep them on every device." icon={<SlidersHorizontal className="w-5 h-5" />}>
        <PreferencesPanel />
      </SettingsDrawer>
    </>
  );
}
