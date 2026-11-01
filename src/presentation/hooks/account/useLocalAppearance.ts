'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { appearanceForLegacyAvatar, type CharacterAppearance } from '@shared/domain/character';

import { accountApi } from '@/lib/account/account-api';
import { loadGameSettings } from '@/presentation/components/settings';
import { useAccount, type AccountStatus } from '@/presentation/providers/AccountProvider';

interface Loaded {
  userId: string;
  appearance: CharacterAppearance;
  /** False while the server derived the look from the avatar too. */
  saved: boolean;
}

/**
 * Which look the local player shows. A guest has none (a silhouette): choosing a character comes
 * with an account. Signed in: a saved look; otherwise the one derived from the avatar in the local
 * settings, by the same rule the server applies, so a new sigil shows at once and nothing flashes
 * while the account loads.
 */
export function chooseLocalAppearance(
  status: AccountStatus,
  userId: string | null,
  loaded: Loaded | null,
  legacyAvatarId: string | null
): CharacterAppearance | null {
  if (status === 'guest') return null;
  if (loaded && loaded.userId === userId && loaded.saved) return loaded.appearance;
  return appearanceForLegacyAvatar(legacyAvatarId);
}

/** The signed-in player's look as the server returned it, shared by every component on the page. */
let loaded: Loaded | null = null;
let loading: string | null = null;
const listeners = new Set<() => void>();

function subscribeLoaded(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function load(userId: string): void {
  if (loaded?.userId === userId || loading === userId) return;
  loading = userId;
  accountApi.character().then(
    (character) => {
      loaded = { userId, appearance: character.appearance, saved: character.saved };
      listeners.forEach((listener) => listener());
    },
    () => undefined
  ).finally(() => {
    if (loading === userId) loading = null;
  });
}

/** After a save: every avatar of the local player on the page shows the new look at once. */
export function rememberSavedAppearance(userId: string, appearance: CharacterAppearance): void {
  loaded = { userId, appearance, saved: true };
  listeners.forEach((listener) => listener());
}

function subscribeSettings(listener: () => void) {
  window.addEventListener('settings-changed', listener);
  return () => window.removeEventListener('settings-changed', listener);
}

/** The local player's character (chooseLocalAppearance); loads the saved look once per page. */
export function useLocalAppearance(): CharacterAppearance | null {
  const { status, user } = useAccount();
  const userId = status === 'signed-in' ? user?.id ?? null : null;
  const legacyAvatar = useSyncExternalStore(subscribeSettings, () => loadGameSettings().avatar, () => null);
  const current = useSyncExternalStore(subscribeLoaded, () => loaded, () => null);

  useEffect(() => {
    if (userId) load(userId);
  }, [userId]);

  return chooseLocalAppearance(status, userId, current, legacyAvatar);
}
