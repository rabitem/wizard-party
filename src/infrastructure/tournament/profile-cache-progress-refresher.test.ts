import { describe, expect, it, vi } from 'vitest';

import { ProfileCacheProgressRefresher } from './profile-cache-progress-refresher';

function setup(innerRefresh: (userIds: readonly string[]) => Promise<void> = async () => undefined) {
  const order: string[] = [];
  const inner = {
    refresh: vi.fn(async (userIds: readonly string[]) => {
      order.push('refresh');
      await innerRefresh(userIds);
    }),
  };
  const usernamesOf = vi.fn(async (userIds: readonly string[]) => userIds.filter((id) => id !== 'gone').map((id) => `name-${id}`));
  const invalidate = vi.fn((usernames: readonly string[]) => {
    order.push(`invalidate:${usernames.join(',')}`);
  });
  return { order, inner, usernamesOf, invalidate, refresher: new ProfileCacheProgressRefresher(inner, usernamesOf, invalidate) };
}

describe('ProfileCacheProgressRefresher', () => {
  describe('refresh', () => {
    it('should purge the current profiles after the progress was recomputed', async () => {
      const { order, refresher } = setup();
      await refresher.refresh(['a', 'gone', 'b']);
      expect(order).toEqual(['refresh', 'invalidate:name-a,name-b']);
    });

    it('should still purge and then rethrow when part of the recompute failed', async () => {
      const failure = new AggregateError([new Error('boom')]);
      const { invalidate, refresher } = setup(async () => {
        throw failure;
      });
      await expect(refresher.refresh(['a'])).rejects.toBe(failure);
      expect(invalidate).toHaveBeenCalledWith(['name-a']);
    });

    it('should do nothing for nobody and skip the purge when no account is left', async () => {
      const { inner, invalidate, refresher } = setup();
      await refresher.refresh([]);
      await refresher.refresh(['gone']);
      expect(inner.refresh).toHaveBeenCalledTimes(1);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });
});
