import { afterEach, describe, expect, it, vi } from 'vitest';

import { SafeStorage, isQuotaExceededError, resolveBrowserStorage, type StorageLike } from './safe-storage';

class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

function quotaError(): Error {
  const error = new Error('The quota has been exceeded.');
  error.name = 'QuotaExceededError';
  return error;
}

class FullStorage extends MemoryStorage {
  setItem() { throw quotaError(); }
}

class BlockedStorage implements StorageLike {
  getItem(): string | null { throw new Error('The operation is insecure.'); }
  setItem() { throw new Error('The operation is insecure.'); }
  removeItem() { throw new Error('The operation is insecure.'); }
}

describe('SafeStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reads and writes through to working storage', () => {
    const backing = new MemoryStorage();
    const storage = new SafeStorage('local', () => backing);

    expect(storage.setItem('a', '1')).toEqual({ ok: true });
    expect(backing.data.get('a')).toBe('1');
    expect(storage.getItem('a')).toBe('1');
    storage.removeItem('a');
    expect(storage.getItem('a')).toBeNull();
    expect(storage.isPersistent()).toBe(true);
  });

  it('keeps values in memory when the storage getter throws (blocked site data)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = new SafeStorage('local', () => null);

    expect(storage.getItem('player')).toBeNull();
    expect(storage.setItem('player', 'p-1')).toEqual({ ok: false, reason: 'unavailable' });
    expect(storage.getItem('player')).toBe('p-1');
    expect(storage.isPersistent()).toBe(false);
  });

  it('never throws when every storage method throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // One backing object, as the browser returns: a new object would start a fresh overlay.
    const blocked = new BlockedStorage();
    const storage = new SafeStorage('session', () => blocked);

    expect(() => storage.getItem('k')).not.toThrow();
    expect(storage.setItem('k', 'v')).toEqual({ ok: false, reason: 'unavailable' });
    expect(storage.getItem('k')).toBe('v');
    expect(() => storage.removeItem('k')).not.toThrow();
    expect(storage.getItem('k')).toBeNull();
  });

  it('reports quota failures to listeners and keeps the newer value readable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const backing = new FullStorage();
    backing.data.set('settings', 'old');
    const storage = new SafeStorage('local', () => backing);
    const listener = vi.fn();
    const unsubscribe = storage.onWriteFailure(listener);

    expect(storage.setItem('settings', 'new')).toEqual({ ok: false, reason: 'quota' });
    expect(storage.getItem('settings')).toBe('new');
    expect(listener).toHaveBeenCalledWith({ area: 'local', key: 'settings', reason: 'quota' });

    storage.setItem('settings', 'newer');
    expect(warn).toHaveBeenCalledOnce();

    unsubscribe();
    storage.setItem('settings', 'newest');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('drops the memory overlay once a later write persists', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let full = true;
    const backing = new MemoryStorage();
    const storage = new SafeStorage('local', () => backing);
    vi.spyOn(backing, 'setItem').mockImplementation((key: string, value: string) => {
      if (full) throw quotaError();
      backing.data.set(key, value);
    });

    storage.setItem('k', 'memory-only');
    full = false;
    storage.setItem('k', 'persisted');
    backing.data.set('k', 'changed-in-another-tab');

    expect(storage.getItem('k')).toBe('changed-in-another-tab');
  });

  it('tracks memory-only values until a later write of the key persists', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let full = true;
    const backing = new MemoryStorage();
    const storage = new SafeStorage('local', () => backing);
    vi.spyOn(backing, 'setItem').mockImplementation((key: string, value: string) => {
      if (full) throw quotaError();
      backing.data.set(key, value);
    });
    const changes = vi.fn();
    storage.onUnsavedChange(changes);

    expect(storage.hasUnsavedValues('quota')).toBe(false);
    storage.setItem('settings', 'big');
    storage.setItem('settings', 'bigger');
    expect(storage.hasUnsavedValues('quota')).toBe(true);
    expect(storage.hasUnsavedValues('unavailable')).toBe(false);
    expect(changes).toHaveBeenCalledOnce();

    full = false;
    storage.setItem('other', 'small');
    expect(storage.hasUnsavedValues('quota')).toBe(true);
    storage.setItem('settings', 'smaller');
    expect(storage.hasUnsavedValues('quota')).toBe(false);
    expect(changes).toHaveBeenCalledTimes(2);
  });

  it('forgets memory-only values that are removed', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const backing = new FullStorage();
    const storage = new SafeStorage('local', () => backing);

    storage.setItem('k', 'v');
    expect(storage.hasUnsavedValues('quota')).toBe(true);
    storage.removeItem('k');

    expect(storage.hasUnsavedValues('quota')).toBe(false);
  });

  it('starts a fresh overlay when the backing storage changes', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let backing: StorageLike | null = null;
    const storage = new SafeStorage('local', () => backing);

    storage.setItem('k', 'memory');
    backing = new MemoryStorage();

    expect(storage.getItem('k')).toBeNull();
  });

  it('parses JSON and treats corrupt values as missing', () => {
    const backing = new MemoryStorage();
    const storage = new SafeStorage('local', () => backing);

    storage.writeJson('ok', { a: 1 });
    backing.data.set('broken', '{');

    expect(storage.readJson('ok')).toEqual({ a: 1 });
    expect(storage.readJson('broken')).toBeNull();
    expect(storage.readJson('missing')).toBeNull();
  });
});

describe('resolveBrowserStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when the window getter throws SecurityError', () => {
    const blockedWindow = {};
    Object.defineProperty(blockedWindow, 'localStorage', {
      get() { throw new Error('The operation is insecure.'); },
    });
    vi.stubGlobal('window', blockedWindow);

    expect(resolveBrowserStorage('local')).toBeNull();
  });

  it('prefers window storage and falls back to the global one', () => {
    const fromWindow = new MemoryStorage();
    const fromGlobal = new MemoryStorage();
    vi.stubGlobal('window', { sessionStorage: fromWindow });
    vi.stubGlobal('localStorage', fromGlobal);

    expect(resolveBrowserStorage('session')).toBe(fromWindow);
    expect(resolveBrowserStorage('local')).toBe(fromGlobal);
  });

  it('rejects objects that are not real Storage (null, half-implemented globals)', () => {
    vi.stubGlobal('window', { localStorage: null, sessionStorage: { getItem: 1 } });
    vi.stubGlobal('localStorage', undefined);
    vi.stubGlobal('sessionStorage', undefined);

    expect(resolveBrowserStorage('local')).toBeNull();
    expect(resolveBrowserStorage('session')).toBeNull();
  });
});

describe('isQuotaExceededError', () => {
  it('recognises the names and legacy codes engines use', () => {
    expect(isQuotaExceededError(quotaError())).toBe(true);
    expect(isQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
    expect(isQuotaExceededError({ code: 22 })).toBe(true);
    expect(isQuotaExceededError(new Error('SecurityError'))).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
  });
});
