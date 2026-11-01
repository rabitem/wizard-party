import { describe, expect, it, vi } from 'vitest';

import { RESPONSIVE_CONFIG } from '@/presentation/config/responsive.config';
import { createViewportStore } from './viewport-store';

type Handler = () => void;

function createFakeWindow(width: number, height: number, coarse: boolean) {
  const handlers = new Map<string, Set<Handler>>();
  const queryHandlers = new Set<Handler>();
  const query = {
    matches: coarse,
    addEventListener: (_type: string, handler: Handler) => queryHandlers.add(handler),
    removeEventListener: (_type: string, handler: Handler) => queryHandlers.delete(handler),
  };
  const win = {
    innerWidth: width,
    innerHeight: height,
    matchMedia: vi.fn(() => query),
    addEventListener: (type: string, handler: Handler) => {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)?.add(handler);
    },
    removeEventListener: (type: string, handler: Handler) => handlers.get(type)?.delete(handler),
  };
  return {
    win,
    asWindow: win as unknown as Window,
    fire: (type: string) => handlers.get(type)?.forEach((handler) => handler()),
    firePointerChange: () => queryHandlers.forEach((handler) => handler()),
    listenerCount: () => [...handlers.values()].reduce((sum, set) => sum + set.size, 0) + queryHandlers.size,
    query,
  };
}

describe('createViewportStore', () => {
  it('should return the server profile without a window', () => {
    const store = createViewportStore(() => undefined);

    expect(store.getSnapshot()).toEqual(RESPONSIVE_CONFIG.SERVER_PROFILE);
    expect(store.getServerSnapshot()).toEqual(RESPONSIVE_CONFIG.SERVER_PROFILE);
  });

  it('should read the real viewport on the first client snapshot', () => {
    const fake = createFakeWindow(390, 844, true);
    const store = createViewportStore(() => fake.asWindow);

    expect(store.getSnapshot()).toEqual({ width: 390, height: 844, orientation: 'portrait', coarsePointer: true });
  });

  it('should keep the snapshot identity while the viewport is unchanged', () => {
    const fake = createFakeWindow(390, 844, true);
    const store = createViewportStore(() => fake.asWindow);

    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it('should notify subscribers on rotation and pointer changes only when the profile changes', () => {
    const fake = createFakeWindow(390, 844, true);
    const store = createViewportStore(() => fake.asWindow);
    const listener = vi.fn();
    store.subscribe(listener);
    store.getSnapshot();

    fake.fire('resize');
    expect(listener).not.toHaveBeenCalled();

    fake.win.innerWidth = 844;
    fake.win.innerHeight = 390;
    fake.fire('orientationchange');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().orientation).toBe('landscape');

    fake.query.matches = false;
    fake.firePointerChange();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().coarsePointer).toBe(false);
  });

  it('should attach the browser listeners once and detach after the last subscriber', () => {
    const fake = createFakeWindow(1366, 768, false);
    const store = createViewportStore(() => fake.asWindow);

    const unsubscribeA = store.subscribe(() => {});
    const unsubscribeB = store.subscribe(() => {});
    expect(fake.listenerCount()).toBe(3);
    expect(fake.win.matchMedia).toHaveBeenCalledTimes(1);

    unsubscribeA();
    expect(fake.listenerCount()).toBe(3);
    unsubscribeB();
    expect(fake.listenerCount()).toBe(0);
  });
});
