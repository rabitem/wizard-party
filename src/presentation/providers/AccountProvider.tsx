'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { levelsGained, summarizeLevelUps } from '@shared/domain/account';
import type { RecordGameResultsOutput } from '@shared/application/use-cases/account';

import { accountApi, type AccountOverviewDto } from '@/lib/account/account-api';
import { authClient } from '@/lib/account/auth-client';
import { useAccountSync } from '@/presentation/hooks/account/useAccountSync';
import { isSandboxRoute } from '@/presentation/utils/sandbox-route';
import { AccountToasts, achievementToast, levelUpToast, type AccountToast } from '@/presentation/components/account/AchievementToasts';
import { pinOverrides } from '@/presentation/components/account/sections/pin-overrides';

export type AccountStatus = 'loading' | 'guest' | 'signed-in';

export interface AccountUser {
  id: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  twoFactorEnabled?: boolean | null;
  /** The account's only name, lowercase: sign-in and /u/<username>. */
  username: string;
  /** The username as the player spells it; what everyone sees, at the table too. */
  displayUsername: string;
  /** Last rename (an ISO string over the wire); null until the first one. */
  usernameChangedAt?: string | Date | null;
}

export interface AccountContextValue {
  status: AccountStatus;
  user: AccountUser | null;
  /** Profile, stats, level and achievements; null for guests or while loading. */
  overview: AccountOverviewDto | null;
  refreshOverview: () => Promise<void>;
  /** Re-reads the session after sign-in, 2FA, linking etc. */
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = (session?.user as AccountUser | undefined) ?? null;
  const userId = user?.id ?? null;
  const [overview, setOverview] = useState<AccountOverviewDto | null>(null);
  const [toasts, setToasts] = useState<AccountToast[]>([]);
  /**
   * Highest total XP seen for this user, the baseline for level-up announcements. It only grows,
   * so a stale overview response arriving after a recorded game can't re-announce a level.
   */
  const knownXp = useRef<number | null>(null);

  const rememberXp = useCallback((next: AccountOverviewDto) => {
    knownXp.current = Math.max(knownXp.current ?? 0, next.progression.totalXp);
  }, []);

  const enqueue = useCallback((items: AccountToast[]) => {
    if (items.length === 0) return;
    setToasts((queue) => {
      const queued = new Set(queue.map((toast) => toast.key));
      return [...queue, ...items.filter((item) => !queued.has(item.key))];
    });
  }, []);

  /** Overview from the server; its recent games' pins replace older pin changes from this tab. */
  const fetchOverview = useCallback(async () => {
    const checkpoint = pinOverrides.checkpoint();
    const next = await accountApi.overview();
    pinOverrides.reconcile(next.recentGames.map((game) => game.clientGameId), checkpoint);
    return next;
  }, []);

  const dismissToast = useCallback((key: string) => setToasts((queue) => queue.filter((queued) => queued.key !== key)), []);

  const refreshOverview = useCallback(async () => {
    try {
      const next = await fetchOverview();
      rememberXp(next);
      setOverview(next);
    } catch (error) {
      console.warn('[account] overview unavailable', error);
    }
  }, [fetchOverview, rememberXp]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchOverview().then(
      (next) => {
        if (cancelled) return;
        rememberXp(next);
        setOverview(next);
      },
      (error) => console.warn('[account] overview unavailable', error)
    );
    return () => {
      cancelled = true;
      knownXp.current = null;
      setOverview(null);
    };
  }, [userId, fetchOverview, rememberXp]);

  const onGamesRecorded = useCallback(
    (output: RecordGameResultsOutput) => {
      const nextXp = output.progression?.totalXp;
      const items: AccountToast[] = [];
      // Without a known baseline (overview not loaded yet) the gain is unknown, so stay quiet.
      if (typeof nextXp === 'number' && knownXp.current !== null) {
        const levelUp = summarizeLevelUps(levelsGained(knownXp.current, nextXp));
        if (levelUp) items.push(levelUpToast(levelUp));
      }
      if (typeof nextXp === 'number') knownXp.current = Math.max(knownXp.current ?? 0, nextXp);
      items.push(...output.newlyUnlocked.map(achievementToast));
      enqueue(items);
      void refreshOverview();
    },
    [enqueue, refreshOverview]
  );
  // The animation sandbox runs on isolated settings; syncing them would overwrite the account's.
  const pathname = usePathname();
  const syncUserId = isSandboxRoute(pathname) ? null : userId;
  useAccountSync(syncUserId, onGamesRecorded);

  const refreshSession = useCallback(async () => {
    // Bypass (and renew) the signed session cookie cache so flags like twoFactorEnabled update now.
    await authClient.getSession({ query: { disableCookieCache: true } });
    await refetch();
  }, [refetch]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    await refetch();
  }, [refetch]);

  const value = useMemo<AccountContextValue>(
    () => ({
      status: isPending ? 'loading' : user ? 'signed-in' : 'guest',
      user,
      overview,
      refreshOverview,
      refreshSession,
      signOut,
    }),
    [isPending, user, overview, refreshOverview, refreshSession, signOut]
  );

  return (
    <AccountContext.Provider value={value}>
      {children}
      <AccountToasts toasts={toasts} onDismiss={dismissToast} />
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) throw new Error('useAccount must be used inside AccountProvider');
  return context;
}
