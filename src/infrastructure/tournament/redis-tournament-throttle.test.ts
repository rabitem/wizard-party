import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { TOURNAMENT_RATE_LIMITS } from '@shared/domain/tournament';
import type { IUsageCounter } from '@shared/application';

import { RedisTournamentThrottle } from './redis-tournament-throttle';
import { TOURNAMENT_INFRASTRUCTURE } from './tournament-config';

/** In-memory fixed-window counter (one window), like Redis INCRBY. */
class MemoryCounter implements IUsageCounter {
  readonly keys: string[] = [];
  private readonly totals = new Map<string, number>();

  async add(key: string, amount: number): Promise<number | null> {
    this.keys.push(key);
    const total = (this.totals.get(key) ?? 0) + amount;
    this.totals.set(key, total);
    return total;
  }
}

async function allowedTimes(throttle: RedisTournamentThrottle, action: keyof typeof TOURNAMENT_RATE_LIMITS, subject: string, attempts: number) {
  let allowed = 0;
  for (let attempt = 0; attempt < attempts; attempt++) {
    // eslint-disable-next-line no-await-in-loop -- counts must accumulate in order
    if (await throttle.allow(action, subject)) allowed += 1;
  }
  return allowed;
}

describe('RedisTournamentThrottle', () => {
  describe('allow', () => {
    it('should apply the budget of each action', async () => {
      const throttle = new RedisTournamentThrottle(new MemoryCounter(), 'test-key');
      const { limit } = TOURNAMENT_RATE_LIMITS.create;
      expect(await allowedTimes(throttle, 'create', 'user-1', limit + 2)).toBe(limit);
    });

    it('should count actions and subjects separately', async () => {
      const throttle = new RedisTournamentThrottle(new MemoryCounter(), 'test-key');
      const { limit } = TOURNAMENT_RATE_LIMITS.create;
      await allowedTimes(throttle, 'create', 'user-1', limit);
      expect(await throttle.allow('create', 'user-2')).toBe(true);
      expect(await throttle.allow('register', 'user-1')).toBe(true);
    });

    it('should key the counters under the tournament prefix with hashed subjects', async () => {
      const counter = new MemoryCounter();
      await new RedisTournamentThrottle(counter, 'test-key').allow('ticket', 'user-1');
      expect(counter.keys[0]?.startsWith(`${TOURNAMENT_INFRASTRUCTURE.RATE_LIMIT_PREFIX}:ticket:`)).toBe(true);
      expect(counter.keys[0]).not.toContain('user-1');
    });
  });
});
