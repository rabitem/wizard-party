import { describe, expect, it, vi } from 'vitest';

import { ZERO_HUD_INSETS, createHudInsetsStore, getHudInsetsFromRects } from './hud-insets-store';

describe('getHudInsetsFromRects', () => {
  it('should measure each covered strip from its viewport edge', () => {
    const viewport = { top: 0, right: 1366, bottom: 768, left: 0 };
    const stage = { top: 96, right: 1010, bottom: 700, left: 16 };

    expect(getHudInsetsFromRects(viewport, stage)).toEqual({ top: 96, right: 356, bottom: 68, left: 16 });
  });

  it('should be relative to an offset game viewport and round sub-pixel values', () => {
    const viewport = { top: 40, right: 840, bottom: 640, left: 40 };
    const stage = { top: 100.4, right: 799.6, bottom: 590.2, left: 48.7 };

    expect(getHudInsetsFromRects(viewport, stage)).toEqual({ top: 60, right: 40, bottom: 50, left: 9 });
  });

  it('should never report negative insets', () => {
    const viewport = { top: 0, right: 100, bottom: 100, left: 0 };
    const stage = { top: -5, right: 105, bottom: 110, left: -2 };

    expect(getHudInsetsFromRects(viewport, stage)).toEqual(ZERO_HUD_INSETS);
  });
});

describe('createHudInsetsStore', () => {
  it('should start at zero and notify only on real changes', () => {
    const store = createHudInsetsStore();
    const listener = vi.fn();
    store.subscribe(listener);

    expect(store.get()).toEqual(ZERO_HUD_INSETS);

    store.set({ top: 10, right: 0, bottom: 20, left: 0 });
    store.set({ top: 10, right: 0, bottom: 20, left: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get()).toEqual({ top: 10, right: 0, bottom: 20, left: 0 });

    store.reset();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.get()).toBe(ZERO_HUD_INSETS);
  });

  it('should stop notifying after unsubscribe', () => {
    const store = createHudInsetsStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.set({ top: 1, right: 1, bottom: 1, left: 1 });
    expect(listener).not.toHaveBeenCalled();
  });
});
