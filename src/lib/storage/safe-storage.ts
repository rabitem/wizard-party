/**
 * Safe key-value storage: the only module in src/ that touches window.localStorage or
 * window.sessionStorage (enforced by eslint `no-restricted-globals` / `no-restricted-properties`).
 *
 * Browsers throw from storage in situations a player cannot fix and the app must survive:
 * - Safari "Block all cookies", Firefox/Chrome with site data blocked, sandboxed frames: the
 *   `window.localStorage` getter itself throws SecurityError.
 * - Firefox with `dom.storage.enabled = false`: the property is null.
 * - Every engine: `setItem` throws QuotaExceededError when the origin's ~5 MB budget is full.
 *
 * SafeStorage never throws. A value that could not be persisted is kept in an in-memory overlay
 * for the rest of the page's life, so reads stay consistent with writes (a player id generated
 * while storage is blocked stays the same for the whole visit). Writes report what happened as
 * a result value, and failures are broadcast to `onWriteFailure` listeners so UI can tell the
 * player that a change will not be remembered.
 */

export type StorageArea = 'local' | 'session';

/** 'quota': storage works but is full. 'unavailable': storage is blocked or missing. */
export type StorageFailureReason = 'quota' | 'unavailable';

export type StorageWriteResult = { ok: true } | { ok: false; reason: StorageFailureReason };

export interface StorageWriteFailure {
  area: StorageArea;
  key: string;
  reason: StorageFailureReason;
}

/** The subset of the Web Storage API this module needs; tests and adapters can provide it. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const WRITE_OK: StorageWriteResult = { ok: true };
const PROBE_KEY = '__wizard-party-storage-probe__';
const STORAGE_PROPERTY: Record<StorageArea, 'localStorage' | 'sessionStorage'> = {
  local: 'localStorage',
  session: 'sessionStorage',
};

/** Reads and writes must work; removeItem is only ever called inside a try. */
function isStorageLike(value: unknown): value is StorageLike {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Record<keyof StorageLike, unknown>>;
  return typeof candidate.getItem === 'function' && typeof candidate.setItem === 'function';
}

/**
 * The browser's storage object for `area`, or null when it is blocked, missing or not a real
 * Storage. Resolved on every call (never cached): tests swap globals between cases, and the
 * object is a cheap property read in browsers.
 */
export function resolveBrowserStorage(area: StorageArea): StorageLike | null {
  const property = STORAGE_PROPERTY[area];
  try {
    const fromWindow = typeof window === 'undefined'
      ? undefined
      : (window as unknown as Record<string, unknown>)[property];
    const candidate = fromWindow ?? (globalThis as unknown as Record<string, unknown>)[property];
    return isStorageLike(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

/** QuotaExceededError across engines (legacy Firefox name and legacy numeric codes included). */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === 'QuotaExceededError'
    || name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || code === 22
    || code === 1014;
}

export class SafeStorage {
  /** Values that could not be persisted, shadowing the backing store for this page's life. */
  private readonly memory = new Map<string, string>();
  /** Why each value in `memory` could not be persisted. */
  private readonly unsavedReasons = new Map<string, StorageFailureReason>();
  private readonly unsavedListeners = new Set<() => void>();
  /** The backing store the overlay belongs to; a different store (new test stub) starts clean. */
  private memoryOwner: StorageLike | null = null;
  private readonly failureListeners = new Set<(failure: StorageWriteFailure) => void>();
  private readonly warnedReasons = new Set<StorageFailureReason>();

  constructor(
    readonly area: StorageArea,
    private readonly resolveBacking: () => StorageLike | null = () => resolveBrowserStorage(area)
  ) {}

  getItem(key: string): string | null {
    const backing = this.backing();
    const overlaid = this.memory.get(key);
    if (overlaid !== undefined) return overlaid;
    if (!backing) return null;
    try {
      return backing.getItem(key);
    } catch {
      return null;
    }
  }

  setItem(key: string, value: string): StorageWriteResult {
    const backing = this.backing();
    if (!backing) return this.keepInMemory(key, value, 'unavailable');
    try {
      backing.setItem(key, value);
      this.forget(key);
      return WRITE_OK;
    } catch (error) {
      return this.keepInMemory(key, value, isQuotaExceededError(error) ? 'quota' : 'unavailable');
    }
  }

  removeItem(key: string): void {
    const backing = this.backing();
    this.forget(key);
    try {
      backing?.removeItem(key);
    } catch {
      // Blocked storage has nothing to remove; the overlay entry is already gone.
    }
  }

  /** Parsed JSON at `key`, or null when missing or unparsable. */
  readJson(key: string): unknown {
    const raw = this.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  writeJson(key: string, value: unknown): StorageWriteResult {
    return this.setItem(key, JSON.stringify(value));
  }

  /** True when writes reach the browser's storage (and so survive a reload). */
  isPersistent(): boolean {
    const backing = this.backing();
    if (!backing) return false;
    try {
      backing.setItem(PROBE_KEY, '1');
      backing.removeItem(PROBE_KEY);
      return true;
    } catch (error) {
      // A full store is still persistent for reads and smaller writes.
      return isQuotaExceededError(error);
    }
  }

  /**
   * True while a value written in this visit is kept only in memory because storage refused it
   * for `reason`. Clears once a later write of that key persists (e.g. after freeing space).
   */
  hasUnsavedValues(reason: StorageFailureReason): boolean {
    for (const unsavedReason of this.unsavedReasons.values()) {
      if (unsavedReason === reason) return true;
    }
    return false;
  }

  /** Notified when the set of memory-only values changes. Returns an unsubscribe function. */
  onUnsavedChange(listener: () => void): () => void {
    this.unsavedListeners.add(listener);
    return () => {
      this.unsavedListeners.delete(listener);
    };
  }

  /** Notified whenever a write could not be persisted. Returns an unsubscribe function. */
  onWriteFailure(listener: (failure: StorageWriteFailure) => void): () => void {
    this.failureListeners.add(listener);
    return () => {
      this.failureListeners.delete(listener);
    };
  }

  private backing(): StorageLike | null {
    const backing = this.resolveBacking();
    if (backing !== this.memoryOwner) {
      this.memory.clear();
      this.memoryOwner = backing;
      if (this.unsavedReasons.size > 0) {
        this.unsavedReasons.clear();
        this.notifyUnsavedChange();
      }
    }
    return backing;
  }

  /** Drops the memory-only copy of `key` (it was persisted or removed). */
  private forget(key: string): void {
    this.memory.delete(key);
    if (this.unsavedReasons.delete(key)) this.notifyUnsavedChange();
  }

  private notifyUnsavedChange(): void {
    this.unsavedListeners.forEach((listener) => listener());
  }

  private keepInMemory(key: string, value: string, reason: StorageFailureReason): StorageWriteResult {
    this.memory.set(key, value);
    if (this.unsavedReasons.get(key) !== reason) {
      this.unsavedReasons.set(key, reason);
      this.notifyUnsavedChange();
    }
    if (!this.warnedReasons.has(reason)) {
      this.warnedReasons.add(reason);
      console.warn(`[storage] ${this.area}Storage ${reason === 'quota' ? 'is full' : 'is unavailable'}; `
        + 'changes are kept for this visit only');
    }
    const failure: StorageWriteFailure = { area: this.area, key, reason };
    this.failureListeners.forEach((listener) => listener(failure));
    return { ok: false, reason };
  }
}

/** Survives reloads and is shared between tabs of the origin. */
export const safeLocalStorage = new SafeStorage('local');

/** Survives reloads of one tab only. */
export const safeSessionStorage = new SafeStorage('session');
