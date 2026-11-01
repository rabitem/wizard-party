'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { safeLocalStorage } from '@/lib/storage';
import { CONSTANTS } from '@/presentation/config/constants';
import { useAccount } from '@/presentation/providers/AccountProvider';

const GUEST_NAME_KEY = CONSTANTS.STORAGE_KEYS.USERNAME;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readGuestName(): string {
  return safeLocalStorage.getItem(GUEST_NAME_KEY) ?? '';
}

function writeGuestName(name: string): void {
  // Storage blocked or full: SafeStorage keeps the name for this visit.
  safeLocalStorage.setItem(GUEST_NAME_KEY, name);
  listeners.forEach((listener) => listener());
}

export interface PlayerName {
  /** The name to join a table with. */
  name: string;
  /** Signed in: the name is the account's username and cannot be edited here. */
  isAccountName: boolean;
  /** False while the session is still loading, so nobody joins under the wrong name. */
  ready: boolean;
  /** Edits the guest name (remembered on this device); ignored for signed-in players. */
  setGuestName: (name: string) => void;
}

/**
 * The name a player sits at a table with. A signed-in player always plays under their username,
 * the one name friends know them by; a guest types one, remembered on this device.
 */
export function usePlayerName(): PlayerName {
  const { status, user } = useAccount();
  const guestName = useSyncExternalStore(subscribe, readGuestName, () => '');
  const isAccountName = status === 'signed-in' && user !== null;

  const setGuestName = useCallback((name: string) => {
    if (!isAccountName) writeGuestName(name);
  }, [isAccountName]);

  return {
    name: isAccountName ? user.displayUsername : guestName,
    isAccountName,
    ready: status !== 'loading',
    setGuestName,
  };
}
