import { describe, expect, it } from 'vitest';
import type { SharedCustomSound } from '@shared/domain';

import { MemoryRecordStore, type AsyncRecordStore } from '../storage';
import { RecentTableSounds, type RecentTableSoundRecord } from './recent-table-sounds';

const DAY = 24 * 60 * 60 * 1000;

function shared(ownerId: string, id: string): SharedCustomSound {
  return {
    id, ownerId, ownerName: ownerId.toUpperCase(), name: `${ownerId} ${id}`,
    dataUrl: 'data:audio/wav;base64,AAAA', size: 3, duration: 1, category: 'custom',
    roles: { wizard: false, jester: false, trick: false, afk: false, shared: true },
  };
}

class UnavailableStore implements AsyncRecordStore<RecentTableSoundRecord> {
  get() { return Promise.reject(new Error('blocked')); }
  getAll() { return Promise.reject(new Error('blocked')); }
  getAllKeys() { return Promise.reject(new Error('blocked')); }
  put() { return Promise.reject(new Error('blocked')); }
  delete() { return Promise.reject(new Error('blocked')); }
}

describe('RecentTableSounds', () => {
  it('should list the most recently heard sounds first and keep one entry per owner and sound', async () => {
    let now = 0;
    const recent = new RecentTableSounds(new MemoryRecordStore(), () => now);
    await recent.remember([shared('ann', 'a')]);
    now = 1;
    await recent.remember([shared('bob', 'b')]);
    now = 2;
    await recent.remember([shared('ann', 'a')]);

    expect((await recent.list()).map((sound) => `${sound.ownerId}:${sound.id}`)).toEqual(['ann:a', 'bob:b']);
  });

  it('should delete sounds beyond the cap and past the age limit', async () => {
    let now = 0;
    const store = new MemoryRecordStore<RecentTableSoundRecord>();
    const recent = new RecentTableSounds(store, () => now, { maxSounds: 2, maxAgeMs: 7 * DAY });
    await recent.remember([shared('old', '1')]);
    now = 8 * DAY;
    await recent.remember([shared('a', '1')]);
    now += 1;
    await recent.remember([shared('b', '1')]);
    now += 1;
    await recent.remember([shared('c', '1')]);

    expect((await recent.list()).map((sound) => sound.ownerId)).toEqual(['c', 'b']);
    expect((await store.getAllKeys()).sort()).toEqual(['b:1', 'c:1']);
  });

  it('should treat blocked storage as an empty list', async () => {
    const recent = new RecentTableSounds(new UnavailableStore());
    await expect(recent.remember([shared('ann', 'a')])).resolves.toBeUndefined();
    await expect(recent.list()).resolves.toEqual([]);
  });
});
