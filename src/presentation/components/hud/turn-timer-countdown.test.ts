import { describe, expect, it } from 'vitest';

import {
  createTimerCountdownSync,
  getTimerCountdownSeconds,
} from './turn-timer-countdown';

describe('turn timer countdown', () => {
  it('uses the server timestamp instead of the local device clock', () => {
    const sync = createTimerCountdownSync({
      playerId: 'player-1',
      sequence: 1,
      durationMs: 5_000,
      expiresAt: 105_000,
      expired: false,
      serverNow: 100_000,
    }, 70_000);

    expect(sync.remainingMsAtSync).toBe(5_000);
    expect(getTimerCountdownSeconds(sync, 70_000)).toBe(5);
    expect(getTimerCountdownSeconds(sync, 74_100)).toBe(1);
  });

  it('caps missing-server-clock fallback at the configured duration', () => {
    const sync = createTimerCountdownSync({
      playerId: 'player-1',
      sequence: 1,
      durationMs: 5_000,
      expiresAt: 105_000,
      expired: false,
    }, 70_000);

    expect(sync.remainingMsAtSync).toBe(5_000);
    expect(getTimerCountdownSeconds(sync, 70_000)).toBe(5);
  });

  it('returns zero for expired timers', () => {
    const sync = createTimerCountdownSync({
      playerId: 'player-1',
      sequence: 1,
      durationMs: 5_000,
      expiresAt: 105_000,
      expired: true,
      serverNow: 100_000,
    }, 70_000);

    expect(getTimerCountdownSeconds(sync, 70_000)).toBe(0);
  });
});
