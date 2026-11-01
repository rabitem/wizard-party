import { describe, expect, it, vi } from 'vitest';

import { PinOverrideStore } from './pin-overrides';

const game = (clientGameId: string, pinnedAt: number | null = null) => ({ clientGameId, pinnedAt });

describe('PinOverrideStore', () => {
  it('should show a confirmed pin on lists loaded before it', () => {
    const store = new PinOverrideStore();
    store.begin('u1', 'g1', 5);
    expect(store.pinnedAt('u1', game('g1'))).toBe(5);
    store.confirm('u1', 'g1', 7);
    expect(store.pinnedAt('u1', game('g1'))).toBe(7);
  });

  it('should let fresh server data win over an older change (unpinned on another device)', () => {
    const store = new PinOverrideStore();
    store.begin('u1', 'g1', 5);
    store.confirm('u1', 'g1', 5);
    const checkpoint = store.checkpoint();
    // Page 1 refetched after the pin was confirmed: the server says it is no longer pinned.
    store.reconcile(['g1'], checkpoint);
    expect(store.pinnedAt('u1', game('g1', null))).toBeNull();
  });

  it('should keep a change confirmed after the request for the fresh data started', () => {
    const store = new PinOverrideStore();
    const checkpoint = store.checkpoint();
    store.begin('u1', 'g1', 5);
    store.confirm('u1', 'g1', 5);
    store.reconcile(['g1'], checkpoint);
    expect(store.pinnedAt('u1', game('g1', null))).toBe(5);
  });

  it('should keep a change that is still in flight', () => {
    const store = new PinOverrideStore();
    store.begin('u1', 'g1', 5);
    store.reconcile(['g1'], store.checkpoint());
    expect(store.pinnedAt('u1', game('g1', null))).toBe(5);
  });

  it('should fall back to the last confirmed state when a request fails', () => {
    const store = new PinOverrideStore();
    store.begin('u1', 'g1', 5);
    store.confirm('u1', 'g1', 5);
    store.begin('u1', 'g1', null);
    store.revert('u1', 'g1');
    expect(store.pinnedAt('u1', game('g1', null))).toBe(5);
    store.begin('u1', 'g2', 9);
    store.revert('u1', 'g2');
    expect(store.pinnedAt('u1', game('g2', null))).toBeNull();
  });

  it('should never apply one account’s changes to another account', () => {
    const store = new PinOverrideStore();
    store.begin('u1', 'g1', 5);
    store.confirm('u1', 'g1', 5);
    expect(store.pinnedAt('u2', game('g1', null))).toBeNull();
    expect(store.pinnedAt(null, game('g1', null))).toBeNull();
    store.begin('u2', 'g2', 8);
    // Switching accounts drops the previous account's changes for good.
    expect(store.pinnedAt('u1', game('g1', null))).toBeNull();
  });

  it('should notify subscribers on changes only', () => {
    const store = new PinOverrideStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.reconcile(['g1'], store.checkpoint());
    expect(listener).not.toHaveBeenCalled();
    store.begin('u1', 'g1', 5);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
