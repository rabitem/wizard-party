import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RealClock, summarizeFrameTimes } from './real-clock';

/*
 * The wall-clock sandbox clock counts the browser's own display frames. Time is vitest's fake
 * performance clock; each display frame is fired by the test after moving that clock on.
 */

let displayFrames: FrameRequestCallback[];

/** The browser paints after `elapsedMs` of real time. */
function paint(elapsedMs: number): void {
  vi.advanceTimersByTime(elapsedMs);
  const callbacks = displayFrames;
  displayFrames = [];
  for (const callback of callbacks) callback(performance.now());
}

/** Paints `count` frames `elapsedMs` apart, letting promise callbacks run after each. */
async function paintFrames(count: number, elapsedMs: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    paint(elapsedMs);
    // eslint-disable-next-line no-await-in-loop -- waits resolved by one frame settle before the next frame
    await Promise.resolve();
  }
}

function installedClock(): RealClock {
  const clock = new RealClock();
  clock.install();
  return clock;
}

beforeEach(() => {
  displayFrames = [];
  vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout'] });
  vi.stubGlobal('window', {});
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => displayFrames.push(callback));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('RealClock', () => {
  it('counts each display frame once, however often it is installed', () => {
    const clock = installedClock();
    clock.install();
    const seen: number[] = [];
    clock.onFrame((_now, frame) => seen.push(frame));

    paint(16);
    paint(16);

    expect(seen).toEqual([1, 2]);
    expect(clock.stats()).toMatchObject({ frame: 2, mode: 'play', speed: 1 });
  });

  it('stops calling a frame listener once it unsubscribed', () => {
    const clock = installedClock();
    const seen: number[] = [];
    const unsubscribe = clock.onFrame((_now, frame) => seen.push(frame));

    paint(16);
    unsubscribe();
    paint(16);

    expect(seen).toEqual([1]);
  });

  it('resolves a wait on the first frame the condition holds', async () => {
    const clock = installedClock();
    let ready = false;
    const wait = clock.waitUntil(() => ready, 1_000);

    await paintFrames(2, 16);
    ready = true;
    await paintFrames(1, 16);

    await expect(wait).resolves.toBe(true);
    expect(clock.stats().frame).toBe(3);
  });

  it('gives up a wait on the first frame after its real timeout', async () => {
    const clock = installedClock();
    let settled: boolean | undefined;
    void clock.waitUntil(() => false, 100).then((result) => { settled = result; });

    await paintFrames(6, 16);
    expect(settled).toBeUndefined();
    await paintFrames(1, 16);

    expect(settled).toBe(false);
  });

  it('steps by display frames and advances by real time', async () => {
    const clock = installedClock();
    let stepped = false;
    let advanced = false;
    void clock.step(3).then(() => { stepped = true; });
    void clock.advance(100).then(() => { advanced = true; });

    await paintFrames(2, 20);
    expect([stepped, advanced]).toEqual([false, false]);
    await paintFrames(1, 20);
    expect([stepped, advanced]).toEqual([true, false]);
    await paintFrames(2, 20);
    expect(advanced).toBe(true);
  });

  it('reports frame times between display frames since the last reset', () => {
    const clock = installedClock();
    paint(16);
    [10, 10, 30].forEach((delta) => paint(delta));

    expect(clock.stats()).toMatchObject({ lastFrameCostMs: 30, maxFrameCostMs: 30 });
    expect(clock.frameTiming()).toMatchObject({ frames: 3, durationMs: 50, maxMs: 30 });

    clock.resetFrameCostStats();
    paint(20);

    expect(clock.frameTiming()).toMatchObject({ frames: 1, durationMs: 20, maxMs: 20 });
    expect(clock.stats().maxFrameCostMs).toBe(20);
  });

  it('waits real time for real delays', async () => {
    const clock = installedClock();
    let done = false;
    void clock.realDelay(250).then(() => { done = true; });

    await vi.advanceTimersByTimeAsync(249);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});

describe('summarizeFrameTimes', () => {
  it('reports an empty run as zeros', () => {
    expect(summarizeFrameTimes([])).toEqual({
      frames: 0, durationMs: 0, fps: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, over120HzBudget: 0, over60HzBudget: 0,
    });
  });

  it('derives fps, percentiles and the share of frames over each refresh budget', () => {
    // 18 frames at 60 Hz, one at 25 ms and one at 40 ms: 20 frames in 365 ms.
    const deltas = [...Array<number>(18).fill(1000 / 60), 25, 40];

    expect(summarizeFrameTimes(deltas)).toEqual({
      frames: 20,
      durationMs: 365,
      fps: 54.79,
      p50Ms: 16.67,
      p95Ms: 40,
      p99Ms: 40,
      maxMs: 40,
      // Every frame misses 8.33 ms (+5%); only the two slow ones miss 16.67 ms (+5%).
      over120HzBudget: 1,
      over60HzBudget: 0.1,
    });
  });

  it('tolerates frames up to 5% over a budget', () => {
    const atTolerance = (1000 / 120) * 1.05;

    expect(summarizeFrameTimes([atTolerance, atTolerance + 0.01]).over120HzBudget).toBe(0.5);
  });
});
