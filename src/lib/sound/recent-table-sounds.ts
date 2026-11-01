import type { SharedCustomSound } from '@shared/domain';

import { IndexedDbRecordStore, type AsyncRecordStore } from '../storage';
import { RECENT_TABLE_SOUNDS_CONFIG } from './custom-sound-library.config';

export interface RecentTableSoundRecord {
  sound: SharedCustomSound;
  heardAt: number;
}

interface RecentTableSoundsLimits {
  maxSounds: number;
  maxAgeMs: number;
}

const DEFAULT_LIMITS: RecentTableSoundsLimits = {
  maxSounds: RECENT_TABLE_SOUNDS_CONFIG.MAX_SOUNDS,
  maxAgeMs: RECENT_TABLE_SOUNDS_CONFIG.MAX_AGE_MS,
};

const recordKey = (sound: Pick<SharedCustomSound, 'ownerId' | 'id'>) => `${sound.ownerId}:${sound.id}`;

function isRecord(value: unknown): value is RecentTableSoundRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<Record<keyof RecentTableSoundRecord, unknown>>;
  const sound = record.sound as Partial<SharedCustomSound> | undefined;
  return typeof record.heardAt === 'number' && typeof sound?.id === 'string'
    && typeof sound.ownerId === 'string' && typeof sound.dataUrl === 'string';
}

/**
 * Shared sounds heard at recent tables, newest first, so they can be imported outside a room.
 * Device-local only. Storage failures are swallowed: the list is a convenience, never required.
 */
export class RecentTableSounds {
  constructor(
    private readonly store: AsyncRecordStore<RecentTableSoundRecord>,
    private readonly now: () => number = Date.now,
    private readonly limits: RecentTableSoundsLimits = DEFAULT_LIMITS
  ) {}

  async remember(sounds: readonly SharedCustomSound[]): Promise<void> {
    if (sounds.length === 0) return;
    const heardAt = this.now();
    try {
      await Promise.all(sounds.map((sound) => this.store.put(recordKey(sound), { sound, heardAt })));
      await this.prune();
    } catch {
      // IndexedDB blocked or full: nothing to remember on this device.
    }
  }

  async list(): Promise<SharedCustomSound[]> {
    try {
      return (await this.kept()).map((record) => record.sound);
    } catch {
      return [];
    }
  }

  private async kept(): Promise<RecentTableSoundRecord[]> {
    const cutoff = this.now() - this.limits.maxAgeMs;
    return (await this.store.getAll())
      .filter(isRecord)
      .filter((record) => record.heardAt >= cutoff)
      .sort((a, b) => b.heardAt - a.heardAt)
      .slice(0, this.limits.maxSounds);
  }

  private async prune(): Promise<void> {
    const keep = new Set((await this.kept()).map((record) => recordKey(record.sound)));
    const keys = await this.store.getAllKeys();
    await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => this.store.delete(key)));
  }
}

/** This device's list, backed by IndexedDB (opened lazily on first use). */
export const recentTableSounds = new RecentTableSounds(
  new IndexedDbRecordStore<RecentTableSoundRecord>(
    RECENT_TABLE_SOUNDS_CONFIG.DATABASE_NAME,
    RECENT_TABLE_SOUNDS_CONFIG.STORE_NAME
  )
);
