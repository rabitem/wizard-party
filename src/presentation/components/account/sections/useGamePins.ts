'use client';

import { useCallback, useRef, useState, useSyncExternalStore } from 'react';

import { ACCOUNT_LIMITS } from '@shared/domain/account';

import { AccountApiError, accountApi, type AccountGameDto } from '@/lib/account/account-api';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { errorMessage } from '../ui';
import { pinOverrides, type PinnableGame } from './pin-overrides';

function pinErrorMessage(error: unknown): string {
  if (error instanceof AccountApiError) {
    if (error.code === 'quota_exceeded') return `You can pin up to ${ACCOUNT_LIMITS.MAX_PINNED_GAMES} games. Unpin one first.`;
    if (error.code === 'not_found') return 'That game is not in your chronicle yet. Try again in a moment.';
  }
  return errorMessage(error);
}

/**
 * Optimistic pin/unpin with per-game busy state and a user-facing error. `pinnedAt` reads the
 * shared pin store (pin-overrides.ts) for the signed-in user; the hook re-renders on any change.
 */
export function useGamePins() {
  useSyncExternalStore(pinOverrides.subscribe, pinOverrides.getVersion, pinOverrides.getVersion);
  const userId = useAccount().user?.id ?? null;
  const busyRef = useRef(new Set<string>());
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const markBusy = useCallback((id: string, isBusy: boolean) => {
    if (isBusy) busyRef.current.add(id);
    else busyRef.current.delete(id);
    setBusy(new Set(busyRef.current));
  }, []);

  const pinnedAt = useCallback((game: PinnableGame) => pinOverrides.pinnedAt(userId, game), [userId]);

  const toggle = useCallback(
    async (game: AccountGameDto) => {
      const id = game.clientGameId;
      if (!userId || busyRef.current.has(id)) return;
      const pin = pinOverrides.pinnedAt(userId, game) === null;
      markBusy(id, true);
      setError(null);
      pinOverrides.begin(userId, id, pin ? Date.now() : null);
      try {
        if (pin) pinOverrides.confirm(userId, id, (await accountApi.pinGame(id)).pinnedAt);
        else {
          await accountApi.unpinGame(id);
          pinOverrides.confirm(userId, id, null);
        }
      } catch (cause) {
        pinOverrides.revert(userId, id);
        setError(pinErrorMessage(cause));
      } finally {
        markBusy(id, false);
      }
    },
    [markBusy, userId]
  );

  const clearError = useCallback(() => setError(null), []);

  return { toggle, pinnedAt, isBusy: (id: string) => busy.has(id), error, clearError };
}
