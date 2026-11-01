import { describe, expect, it, vi } from 'vitest';

import { VersionWatch, type VersionWatchDeps } from './version-watch';

const MIN_GAP_MS = 60_000;

function setup(overrides: Partial<VersionWatchDeps> = {}) {
  let tick: (() => void) | null = null;
  const stop = vi.fn(() => { tick = null; });
  let clock = 1_000_000;
  const fetchDeployedVersion = vi.fn(async (): Promise<string | null> => 'abc123');
  const watch = new VersionWatch({
    currentVersion: 'abc123',
    fetchDeployedVersion,
    scheduler: { start: vi.fn((onTick: () => void) => { tick = onTick; return stop; }) },
    now: () => clock,
    minCheckGapMs: MIN_GAP_MS,
    ...overrides,
  });
  return {
    watch,
    fetchDeployedVersion,
    stop,
    isScheduled: () => tick !== null,
    advance: (ms: number) => { clock += ms; },
  };
}

describe('VersionWatch', () => {
  describe('check', () => {
    it('should stay unavailable while the deployment serves the same release', async () => {
      const { watch } = setup();
      await watch.check();
      expect(watch.isAvailable()).toBe(false);
    });

    it('should become available once the deployment serves another release', async () => {
      const { watch, fetchDeployedVersion } = setup();
      fetchDeployedVersion.mockResolvedValue('def456');
      await watch.check();
      expect(watch.isAvailable()).toBe(true);
    });

    it('should never check from an unversioned build', async () => {
      const { watch, fetchDeployedVersion } = setup({ currentVersion: 'dev' });
      await watch.check();
      expect(fetchDeployedVersion).not.toHaveBeenCalled();
      expect(watch.isAvailable()).toBe(false);
    });

    it('should ignore an unversioned or missing answer', async () => {
      const { watch, fetchDeployedVersion, advance } = setup();
      fetchDeployedVersion.mockResolvedValueOnce('dev').mockResolvedValueOnce(null);
      await watch.check();
      advance(MIN_GAP_MS);
      await watch.check();
      expect(watch.isAvailable()).toBe(false);
    });

    it('should survive a failed request and ask again on a later check', async () => {
      const { watch, fetchDeployedVersion, advance } = setup();
      fetchDeployedVersion.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('def456');
      await watch.check();
      expect(watch.isAvailable()).toBe(false);
      advance(MIN_GAP_MS);
      await watch.check();
      expect(watch.isAvailable()).toBe(true);
    });

    it('should skip checks closer together than the minimum gap', async () => {
      const { watch, fetchDeployedVersion, advance } = setup();
      await watch.check();
      advance(MIN_GAP_MS - 1);
      await watch.check();
      expect(fetchDeployedVersion).toHaveBeenCalledTimes(1);
      advance(1);
      await watch.check();
      expect(fetchDeployedVersion).toHaveBeenCalledTimes(2);
    });

    it('should not start a second request while one is underway', async () => {
      const { watch, fetchDeployedVersion, advance } = setup();
      let answer: (version: string) => void = () => {};
      fetchDeployedVersion.mockReturnValueOnce(new Promise<string | null>((resolve) => { answer = resolve; }));
      const first = watch.check();
      advance(MIN_GAP_MS);
      await watch.check();
      answer('abc123');
      await first;
      expect(fetchDeployedVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('should check only while someone subscribes', () => {
      const { watch, stop, isScheduled } = setup();
      expect(isScheduled()).toBe(false);
      const unsubscribeA = watch.subscribe(() => {});
      const unsubscribeB = watch.subscribe(() => {});
      expect(isScheduled()).toBe(true);
      unsubscribeA();
      expect(stop).not.toHaveBeenCalled();
      unsubscribeB();
      expect(stop).toHaveBeenCalledTimes(1);
    });

    it('should not schedule checks in an unversioned build', () => {
      const { watch, isScheduled } = setup({ currentVersion: 'dev' });
      watch.subscribe(() => {});
      expect(isScheduled()).toBe(false);
    });

    it('should notify subscribers and stop checking once a newer release is found', async () => {
      const { watch, fetchDeployedVersion, stop } = setup();
      fetchDeployedVersion.mockResolvedValue('def456');
      const listener = vi.fn();
      watch.subscribe(listener);
      await watch.check();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('placement', () => {
    it('should report an inline host until every claim is released', () => {
      const { watch } = setup();
      const releaseA = watch.claimInlineHost();
      const releaseB = watch.claimInlineHost();
      releaseA();
      releaseA();
      expect(watch.hasInlineHost()).toBe(true);
      releaseB();
      expect(watch.hasInlineHost()).toBe(false);
    });

    it('should remember a dismissal and notify once', () => {
      const { watch } = setup();
      const listener = vi.fn();
      watch.subscribe(listener);
      watch.dismiss();
      watch.dismiss();
      expect(watch.isDismissed()).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
