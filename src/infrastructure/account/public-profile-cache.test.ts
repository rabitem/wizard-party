import { beforeEach, describe, expect, it, vi } from 'vitest';

const nextCache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => nextCache);

import { LEADERBOARD_CACHE_TAG, publicProfileCacheTag, revalidatePublicProfiles } from './public-profile-cache';

describe('public profile cache', () => {
  beforeEach(() => {
    nextCache.revalidateTag.mockReset();
    nextCache.revalidatePath.mockReset();
  });

  it('should tag every spelling of a handle the same way', () => {
    expect(publicProfileCacheTag('Merlin')).toBe(publicProfileCacheTag(' merlin '));
  });

  it('should expire the tag immediately and purge the canonical path of every handle', () => {
    revalidatePublicProfiles(['Merlin', null, 'xyz']);
    expect(nextCache.revalidateTag.mock.calls).toEqual([
      // The leaderboard shows the same public data, so it is purged once alongside the profiles.
      [LEADERBOARD_CACHE_TAG, { expire: 0 }],
      ['public-profile:merlin', { expire: 0 }],
      ['public-profile:xyz', { expire: 0 }],
    ]);
    expect(nextCache.revalidatePath.mock.calls).toEqual([['/u/merlin'], ['/u/xyz']]);
  });

  it('should not touch the leaderboard when no handle is affected', () => {
    revalidatePublicProfiles([null, undefined]);
    expect(nextCache.revalidateTag).not.toHaveBeenCalled();
  });

  it('should never fail the write when purging fails', () => {
    nextCache.revalidateTag.mockImplementation(() => {
      throw new Error('no store');
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => revalidatePublicProfiles(['merlin'])).not.toThrow();
    warn.mockRestore();
  });
});
