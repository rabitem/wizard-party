import { describe, expect, it, vi } from 'vitest';

import { DeferredProgressRefresher } from './deferred-progress-refresher';

describe('DeferredProgressRefresher', () => {
  describe('refresh', () => {
    it('should hand the refresh to the scheduler instead of running it inline', async () => {
      const inner = { refresh: vi.fn(async () => undefined) };
      const tasks: (() => Promise<void>)[] = [];
      const deferred = new DeferredProgressRefresher(() => inner, (task) => tasks.push(task), vi.fn());

      await deferred.refresh(['a', 'b']);
      expect(inner.refresh).not.toHaveBeenCalled();
      await tasks[0]();
      expect(inner.refresh).toHaveBeenCalledWith(['a', 'b']);
    });

    it('should report a failing background refresh instead of throwing', async () => {
      const error = new Error('down');
      const report = vi.fn();
      const tasks: (() => Promise<void>)[] = [];
      const deferred = new DeferredProgressRefresher(() => ({ refresh: async () => Promise.reject(error) }), (task) => tasks.push(task), report);

      await deferred.refresh(['a']);
      await expect(tasks[0]()).resolves.toBeUndefined();
      expect(report).toHaveBeenCalledWith('tournament_progress_refresh', error);
    });

    it('should report a refresher that cannot even be created (e.g. misconfigured accounts)', async () => {
      const report = vi.fn();
      const tasks: (() => Promise<void>)[] = [];
      const deferred = new DeferredProgressRefresher(
        () => {
          throw new Error('no database');
        },
        (task) => tasks.push(task),
        report
      );

      await deferred.refresh(['a']);
      await tasks[0]();
      expect(report).toHaveBeenCalledWith('tournament_progress_refresh', expect.any(Error));
    });

    it('should copy the ids, so later changes of the caller array do not leak in', async () => {
      const inner = { refresh: vi.fn(async () => undefined) };
      const tasks: (() => Promise<void>)[] = [];
      const ids = ['a'];
      await new DeferredProgressRefresher(() => inner, (task) => tasks.push(task), vi.fn()).refresh(ids);
      ids.push('b');
      await tasks[0]();
      expect(inner.refresh).toHaveBeenCalledWith(['a']);
    });

    it('should schedule nothing without accounts', async () => {
      const schedule = vi.fn();
      await new DeferredProgressRefresher(() => ({ refresh: vi.fn() }), schedule, vi.fn()).refresh([]);
      expect(schedule).not.toHaveBeenCalled();
    });
  });
});
