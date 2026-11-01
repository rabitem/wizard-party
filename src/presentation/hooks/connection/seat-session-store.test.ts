import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSTANTS } from '@/presentation/config/constants';
import { forgetSeatToken, loadSeatToken, saveSeatToken } from './seat-session-store';

const NOW = 1_700_000_000_000;

function stubStorage() {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  };
  vi.stubGlobal('window', { localStorage: storage });
  return entries;
}

describe('seat session store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps one token per room and forgets it on leave', () => {
    stubStorage();
    saveSeatToken('room-a', 'token-a');
    saveSeatToken('room-b', 'token-b');

    expect(loadSeatToken('room-a')).toBe('token-a');
    expect(loadSeatToken('room-b')).toBe('token-b');

    forgetSeatToken('room-a');
    expect(loadSeatToken('room-a')).toBeUndefined();
    expect(loadSeatToken('room-b')).toBe('token-b');
  });

  it('expires tokens with the saved session', () => {
    stubStorage();
    saveSeatToken('room-a', 'token-a');

    vi.setSystemTime(NOW + CONSTANTS.TIMING.SESSION_TTL_MS + 1);
    expect(loadSeatToken('room-a')).toBeUndefined();
  });

  it('remembers a bounded number of rooms, dropping the oldest', () => {
    stubStorage();
    for (let room = 0; room < 25; room++) {
      vi.setSystemTime(NOW + room);
      saveSeatToken(`room-${room}`, `token-${room}`);
    }

    expect(loadSeatToken('room-0')).toBeUndefined();
    expect(loadSeatToken('room-24')).toBe('token-24');
  });

  it('survives corrupt or unavailable storage, keeping the token for the visit', () => {
    const entries = stubStorage();
    entries.set(CONSTANTS.STORAGE_KEYS.SEAT_SESSIONS, '{not json');
    expect(loadSeatToken('room-a')).toBeUndefined();

    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('blocked'); },
        setItem: () => { throw new Error('blocked'); },
      },
    });
    expect(() => saveSeatToken('room-a', 'token-a')).not.toThrow();
    expect(loadSeatToken('room-a')).toBe('token-a');
  });
});
