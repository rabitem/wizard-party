import { describe, expect, it, vi } from 'vitest';
import { RefCountedLruCache } from './ref-counted-lru-cache';

interface Value { id: string }

function createCache(capacity: number) {
  const dispose = vi.fn<(value: Value) => void>();
  const cache = new RefCountedLruCache<Value>({ capacity: () => capacity, dispose });
  return { cache, dispose };
}

describe('RefCountedLruCache', () => {
  it('should create a value once and hand the same value to every user', () => {
    const { cache } = createCache(2);
    const create = vi.fn(() => ({ id: 'a' }));
    const first = cache.peekOrCreate('a', 't', create);
    const second = cache.peekOrCreate('a', 't', create);
    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('should never dispose a value that is retained', () => {
    const { cache, dispose } = createCache(0);
    const value = cache.peekOrCreate('a', 't', () => ({ id: 'a' }));
    cache.retain('a', 't', value);
    const other = cache.peekOrCreate('b', 't', () => ({ id: 'b' }));
    cache.retain('b', 't', other);
    cache.release('b', other);
    expect(dispose).toHaveBeenCalledWith(other);
    expect(dispose).not.toHaveBeenCalledWith(value);
  });

  it('should keep released values idle up to the capacity and evict the least recently used', () => {
    const { cache, dispose } = createCache(2);
    const values = ['a', 'b', 'c'].map((key) => {
      const value = cache.peekOrCreate(key, 't', () => ({ id: key }));
      cache.retain(key, 't', value);
      return value;
    });
    values.forEach((value) => cache.release(value.id, value));

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledWith(values[0]);
    // The two most recently released values are still cached: no repaint for them
    const recreate = vi.fn((): Value => ({ id: 'recreated' }));
    expect(cache.peekOrCreate('b', 't', recreate)).toBe(values[1]);
    expect(cache.peekOrCreate('c', 't', recreate)).toBe(values[2]);
    expect(recreate).not.toHaveBeenCalled();
  });

  it('should reuse an idle value when a card remounts at its next stage', () => {
    const { cache } = createCache(4);
    const create = vi.fn(() => ({ id: 'a' }));
    const hand = cache.peekOrCreate('a', 't', create);
    cache.retain('a', 't', hand);
    cache.release('a', hand);
    const played = cache.peekOrCreate('a', 't', create);
    expect(played).toBe(hand);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('should purge idle values of another tag (theme change) but keep values in use', () => {
    const { cache, dispose } = createCache(8);
    const idleOld = cache.peekOrCreate('old-idle', 'old', () => ({ id: 'old-idle' }));
    const usedOld = cache.peekOrCreate('old-used', 'old', () => ({ id: 'old-used' }));
    cache.retain('old-used', 'old', usedOld);

    cache.purgeIdle((tag) => tag !== 'new');

    expect(dispose).toHaveBeenCalledWith(idleOld);
    expect(dispose).not.toHaveBeenCalledWith(usedOld);
  });

  it('should dispose an orphaned value (evicted before it was retained) on its own release', () => {
    const { cache, dispose } = createCache(0);
    const orphan = cache.peekOrCreate('a', 't', () => ({ id: 'orphan' }));
    cache.purgeIdle(() => true);
    const fresh = cache.peekOrCreate('a', 't', () => ({ id: 'fresh' }));
    cache.retain('a', 't', fresh);

    cache.retain('a', 't', orphan);
    cache.release('a', orphan);

    expect(dispose).toHaveBeenCalledWith(orphan);
    expect(dispose).not.toHaveBeenCalledWith(fresh);
  });
});
