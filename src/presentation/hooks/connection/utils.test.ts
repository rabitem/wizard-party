import { afterEach, describe, expect, it, vi } from 'vitest';

import { CONSTANTS } from '@/presentation/config/constants';

import { getOrCreatePlayerId } from './utils';

describe('getOrCreatePlayerId', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns the stored id', () => {
    const data = new Map([[CONSTANTS.STORAGE_KEYS.PLAYER_ID as string, 'player-stored']]);
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
        removeItem: (key: string) => void data.delete(key),
      },
    });

    expect(getOrCreatePlayerId()).toBe('player-stored');
  });

  it('does not throw and keeps one id for the visit when site data is blocked', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const blockedWindow = {};
    Object.defineProperty(blockedWindow, 'localStorage', {
      get() { throw new Error('The operation is insecure.'); },
    });
    vi.stubGlobal('window', blockedWindow);

    const first = getOrCreatePlayerId();

    expect(first).toMatch(/^player-/);
    expect(getOrCreatePlayerId()).toBe(first);
  });
});
