import { describe, expect, it, vi } from 'vitest';

import { ExternalStore } from './external-store';

describe('ExternalStore', () => {
  it('should notify subscribers only when the state changed', () => {
    const store = new ExternalStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.update((state) => state);
    store.update((state) => ({ count: state.count + 1 }));
    unsubscribe();
    store.update((state) => ({ count: state.count + 1 }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().count).toBe(2);
  });

  it('should let a listener unsubscribe while being notified', () => {
    const store = new ExternalStore(0);
    const second = vi.fn();
    const unsubscribeFirst = store.subscribe(() => unsubscribeFirst());
    store.subscribe(second);

    store.update((value) => value + 1);
    store.update((value) => value + 1);

    expect(second).toHaveBeenCalledTimes(2);
  });
});
