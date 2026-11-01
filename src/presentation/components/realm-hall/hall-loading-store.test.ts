import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hallLoadingStore, switchRealm } from './hall-loading-store';

const TIMING = { target: 'Halloween', curtainMs: 160, minVisibleMs: 1000 };

describe('switchRealm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hallLoadingStore.setStatus('ready');
    hallLoadingStore.setBusy(false);
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('raises the curtain first and switches only once it has had time to paint', () => {
    const apply = vi.fn();
    switchRealm(apply, TIMING);
    expect(hallLoadingStore.get()).toMatchObject({ switching: true, target: 'Halloween' });
    expect(apply).not.toHaveBeenCalled();
    vi.advanceTimersByTime(TIMING.curtainMs);
    expect(apply).toHaveBeenCalledOnce();
  });

  it('lifts the curtain after the minimum time when the next room is ready', () => {
    switchRealm(() => {}, TIMING);
    vi.advanceTimersByTime(TIMING.curtainMs + TIMING.minVisibleMs - 1);
    expect(hallLoadingStore.get().switching).toBe(true);
    vi.advanceTimersByTime(1);
    expect(hallLoadingStore.get()).toMatchObject({ switching: false, target: null });
  });

  it('keeps the curtain up while the next room is still loading', () => {
    switchRealm(() => hallLoadingStore.setBusy(true), TIMING);
    vi.advanceTimersByTime(TIMING.curtainMs + TIMING.minVisibleMs + 2000);
    expect(hallLoadingStore.get().switching).toBe(true);
    hallLoadingStore.setBusy(false);
    vi.advanceTimersByTime(200);
    expect(hallLoadingStore.get().switching).toBe(false);
  });

  it('switches at once without a curtain when the room cannot render', () => {
    hallLoadingStore.setStatus('unavailable');
    const apply = vi.fn();
    switchRealm(apply, TIMING);
    expect(apply).toHaveBeenCalledOnce();
    expect(hallLoadingStore.get().switching).toBe(false);
  });
});
