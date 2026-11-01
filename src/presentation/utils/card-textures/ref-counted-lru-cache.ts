/**
 * Reference-counted cache with a bounded least-recently-used pool of idle entries.
 *
 * Users take a value during render with `peekOrCreate` (no side effects on the reference count,
 * so a discarded StrictMode render leaks nothing), then `retain` it when they commit and
 * `release` it when they unmount. An entry nobody retains is idle; idle entries beyond the
 * capacity are disposed oldest first. A value whose entry was evicted (or replaced) before it
 * was retained is adopted on `retain`, or disposed by its own `release`, so nothing leaks and
 * nothing in use is lost.
 */

interface Entry<T> {
  value: T;
  refs: number;
  tag: string;
}

export interface RefCountedLruCacheOptions<T> {
  /** Maximum number of idle entries kept (read on every trim, so it may depend on runtime state) */
  capacity: () => number;
  dispose: (value: T) => void;
}

export class RefCountedLruCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  /** Idle keys, least recently used first (Map keeps insertion order) */
  private readonly idle = new Map<string, true>();

  constructor(private readonly options: RefCountedLruCacheOptions<T>) {}

  /** Cached value for `key`, created (idle) when missing. Never changes a reference count. */
  peekOrCreate(key: string, tag: string, create: () => T): T {
    const entry = this.entries.get(key);
    if (entry) {
      if (entry.refs === 0) this.touchIdle(key);
      return entry.value;
    }
    const value = create();
    this.entries.set(key, { value, refs: 0, tag });
    this.idle.set(key, true);
    return value;
  }

  /** Mark `value` (obtained from peekOrCreate) as in use */
  retain(key: string, tag: string, value: T): void {
    const entry = this.entries.get(key);
    if (!entry) {
      this.entries.set(key, { value, refs: 1, tag });
      return;
    }
    // A newer value replaced ours after an eviction: ours is an orphan that release() disposes.
    if (entry.value !== value) return;
    entry.refs += 1;
    this.idle.delete(key);
  }

  /** Stop using `value`; the entry becomes idle (most recently used) when nobody else uses it */
  release(key: string, value: T): void {
    const entry = this.entries.get(key);
    if (!entry || entry.value !== value) {
      this.options.dispose(value);
      return;
    }
    entry.refs = Math.max(0, entry.refs - 1);
    if (entry.refs > 0) return;
    this.idle.set(key, true);
    this.trim();
  }

  /** Dispose idle entries whose tag matches (e.g. faces of a card theme no longer selected) */
  purgeIdle(shouldPurge: (tag: string) => boolean): void {
    for (const key of [...this.idle.keys()]) {
      const entry = this.entries.get(key);
      if (entry && shouldPurge(entry.tag)) this.evict(key, entry);
    }
  }

  /** Every cached value, in use or idle */
  forEachValue(visit: (value: T) => void): void {
    this.entries.forEach((entry) => visit(entry.value));
  }

  private touchIdle(key: string): void {
    this.idle.delete(key);
    this.idle.set(key, true);
  }

  private trim(): void {
    const capacity = Math.max(0, this.options.capacity());
    while (this.idle.size > capacity) {
      const oldest = this.idle.keys().next().value as string;
      const entry = this.entries.get(oldest);
      if (entry) this.evict(oldest, entry);
      else this.idle.delete(oldest);
    }
  }

  private evict(key: string, entry: Entry<T>): void {
    this.idle.delete(key);
    this.entries.delete(key);
    this.options.dispose(entry.value);
  }
}
