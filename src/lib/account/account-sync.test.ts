import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CustomSound } from '@shared/domain';
import type { AccountDocument, StoredCustomSound } from '@shared/application/ports/account';

import { AccountApiError } from './account-api';
import { CustomSoundSync } from './custom-sound-sync';
import { SettingsSyncEngine, type SyncSlice } from './settings-sync-engine';

function installLocalStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  });
}

function memorySlice(initial: Record<string, unknown>) {
  let value = initial;
  const listeners = new Set<() => void>();
  const slice: SyncSlice & { set(next: Record<string, unknown>): void; value(): Record<string, unknown> } = {
    key: 'game-settings',
    read: () => value,
    apply: (remote) => void (value = remote as Record<string, unknown>),
    subscribe: (callback) => (listeners.add(callback), () => listeners.delete(callback)),
    set(next) {
      value = next;
      listeners.forEach((listener) => listener());
    },
    value: () => value,
  };
  return slice;
}

function memoryDocuments(initial: AccountDocument[] = []) {
  const docs = new Map(initial.map((doc) => [doc.key, doc]));
  return {
    docs,
    documents: vi.fn(async () => ({ documents: [...docs.values()] })),
    saveDocument: vi.fn(async (key: string, data: unknown, version: number) => {
      const current = docs.get(key);
      if ((current?.version ?? 0) !== version) {
        throw new AccountApiError(409, 'conflict', 'conflict', { current: current ?? null });
      }
      const document = { key, data, version: version + 1, updatedAt: 0 };
      docs.set(key, document);
      return { document };
    }),
  };
}

beforeEach(() => {
  installLocalStorage();
  vi.useRealTimers();
});

describe('SettingsSyncEngine', () => {
  it('should upload local settings when the account has none', async () => {
    const slice = memorySlice({ theme: 'forest' });
    const api = memoryDocuments();
    await new SettingsSyncEngine('u1', [slice], api).start();
    expect(api.docs.get('game-settings')).toMatchObject({ data: { theme: 'forest' }, version: 1 });
  });

  it('should let the account copy win on a fresh device', async () => {
    const slice = memorySlice({ theme: 'dark' });
    const api = memoryDocuments([{ key: 'game-settings', data: { theme: 'royal' }, version: 3, updatedAt: 0 }]);
    await new SettingsSyncEngine('u1', [slice], api).start();
    expect(slice.value()).toEqual({ theme: 'royal' });
    expect(api.saveDocument).not.toHaveBeenCalled();
  });

  it('should push edits made while offline and debounce live changes', async () => {
    const slice = memorySlice({ theme: 'dark' });
    const api = memoryDocuments([{ key: 'game-settings', data: { theme: 'dark' }, version: 1, updatedAt: 0 }]);
    const first = new SettingsSyncEngine('u1', [slice], api);
    await first.start();
    first.stop();

    slice.set({ theme: 'frost' }); // engine stopped = offline edit
    vi.useFakeTimers();
    const second = new SettingsSyncEngine('u1', [slice], api);
    await second.start();
    expect(api.docs.get('game-settings')).toMatchObject({ data: { theme: 'frost' }, version: 2 });

    slice.set({ theme: 'light' });
    slice.set({ theme: 'royal' });
    await vi.runAllTimersAsync();
    expect(api.saveDocument).toHaveBeenCalledTimes(2);
    expect(api.docs.get('game-settings')).toMatchObject({ data: { theme: 'royal' }, version: 3 });
    second.stop();
  });

  it('should re-apply the local change on top of a newer version after a conflict', async () => {
    const slice = memorySlice({ theme: 'dark' });
    const api = memoryDocuments([{ key: 'game-settings', data: { theme: 'dark' }, version: 1, updatedAt: 0 }]);
    vi.useFakeTimers();
    const engine = new SettingsSyncEngine('u1', [slice], api);
    await engine.start();
    api.docs.set('game-settings', { key: 'game-settings', data: { theme: 'light' }, version: 5, updatedAt: 0 });

    slice.set({ theme: 'forest' });
    await vi.runAllTimersAsync();
    expect(api.docs.get('game-settings')).toMatchObject({ data: { theme: 'forest' }, version: 6 });
    engine.stop();
  });
});

describe('CustomSoundSync', () => {
  const roles = { wizard: true, jester: false, trick: false, afk: false, shared: false };
  const localSound = (id: string): CustomSound => ({ id, name: id, dataUrl: `data:audio/wav;base64,${id}`, size: 4, duration: 1, category: 'custom', roles });
  const remoteSound = (id: string): StoredCustomSound => ({ id, name: id, url: `https://blob/${id}`, storageKey: id, size: 4, duration: 1, category: 'custom', roles, createdAt: 0 });

  function setup(local: CustomSound[], remote: StoredCustomSound[]) {
    let sounds = local;
    const stored = new Map(remote.map((sound) => [sound.id, sound]));
    const api = {
      sounds: vi.fn(async () => ({ sounds: [...stored.values()] })),
      uploadSound: vi.fn(async (_blob: Blob, meta: Record<string, unknown>) => {
        const sound = remoteSound(meta.id as string);
        stored.set(sound.id, sound);
        return { sound };
      }),
      updateSound: vi.fn(async () => undefined),
      deleteSound: vi.fn(async (id: string) => void stored.delete(id)),
    };
    const store = { read: () => sounds, write: (next: CustomSound[]) => void (sounds = next) };
    const fetchBlob = async () => new Blob(['RIFF'], { type: 'audio/wav' });
    vi.stubGlobal('FileReader', class {
      result = '';
      onload: (() => void) | null = null;
      readAsDataURL() {
        this.result = 'data:audio/wav;base64,UklGRg==';
        queueMicrotask(() => this.onload?.());
      }
    });
    return { api, store, stored, sync: new CustomSoundSync('u1', store, api, fetchBlob), sounds: () => sounds };
  }

  it('should upload new local sounds and download new remote ones', async () => {
    const ctx = setup([localSound('a')], [remoteSound('b')]);
    await ctx.sync.sync();
    expect(ctx.api.uploadSound).toHaveBeenCalledTimes(1);
    expect(ctx.sounds().map((sound) => sound.id).sort()).toEqual(['a', 'b']);
    expect([...ctx.stored.keys()].sort()).toEqual(['a', 'b']);
  });

  it('should propagate deletions in both directions after a first sync', async () => {
    const ctx = setup([localSound('a'), localSound('b')], []);
    await ctx.sync.sync();

    ctx.store.write([localSound('b')]); // deleted here
    ctx.stored.delete('b'); // deleted on another device
    await ctx.sync.sync();

    expect([...ctx.stored.keys()]).toEqual([]);
    expect(ctx.sounds()).toEqual([]);
  });

  it('should not touch the account while local sounds are still loading or unreadable', async () => {
    const ctx = setup([localSound('a')], []);
    await ctx.sync.sync();

    // The audio of 'a' is not readable on this device right now (IndexedDB blocked).
    const blocked = new CustomSoundSync('u1', {
      read: () => [],
      write: ctx.store.write,
      ready: () => Promise.reject(new Error('custom sounds are not readable')),
    }, ctx.api, async () => new Blob());

    await expect(blocked.sync()).rejects.toThrow('custom sounds are not readable');
    expect(ctx.api.deleteSound).not.toHaveBeenCalled();
    expect([...ctx.stored.keys()]).toEqual(['a']);
  });
});
