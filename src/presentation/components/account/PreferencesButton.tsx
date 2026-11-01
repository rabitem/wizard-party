'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

import { CONSTANTS } from '@/presentation/config/constants';
import { useAccount } from '@/presentation/providers/AccountProvider';
import { PreferencesPanel } from '@/presentation/components/settings';
import { SettingsDrawer } from '@/presentation/components/settings/SettingsDrawer';

const { ACCOUNT_PREFERENCES, PREFERENCES_QUERY_PARAM } = CONSTANTS.ROUTES;
/** A segment of the start page's top-right dock (HallDock): borderless, its hover a soft pill. */
const BUTTON_CLASS = 'inline-flex items-center justify-center h-11 w-11 rounded-full text-amber-200/90 hover:text-amber-50 hover:bg-amber-900/35 transition-colors';

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
      <Link href={ACCOUNT_PREFERENCES} aria-label="Preferences" title="Preferences" className={BUTTON_CLASS}>
        <SlidersHorizontal className="w-4 h-4" />
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpened(true)} aria-label="Preferences" title="Preferences" disabled={status === 'loading'} className={`${BUTTON_CLASS} cursor-pointer disabled:opacity-60 disabled:cursor-default`}>
        <SlidersHorizontal className="w-4 h-4" />
      </button>
      <SettingsDrawer isOpen={isOpen} onClose={close} closeOnEscape title="Preferences" subtitle="Saved on this device. Sign in to keep them on every device." icon={<SlidersHorizontal className="w-5 h-5" />}>
        <PreferencesPanel />
      </SettingsDrawer>
    </>
  );
}
