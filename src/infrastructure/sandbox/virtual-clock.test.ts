import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VIRTUAL_FRAME_MS, VirtualClock } from './virtual-clock';

/*
 * The sandbox clock replaces the page's timers, performance.now and Date.now with a virtual
 * timeline. Node has no window, so each test hands the clock a window whose display frames
 * (requestAnimationFrame) the test fires itself; MessageChannel and the real timers are Node's.
 */

const realPerformanceNow = performance.now;
const realDateNow = Date.now;
/** Below a microsecond: the rounding of subtracting two absolute times, not a missing frame. */
const FLOAT_TOLERANCE_MS = 1e-3;

type BrowserWindow = Window & typeof globalThis;
let displayFrames: FrameRequestCallback[];
let page: BrowserWindow;
let clock: VirtualClock;

function installPausedClock(): VirtualClock {
  const virtual = new VirtualClock();
  virtual.install();
  virtual.setMode('paused');
  return virtual;
}

/** One frame of the real display: the driver in play mode advances on it. */
function fireDisplayFrame(): void {
  const callbacks = displayFrames;
  displayFrames = [];
  for (const callback of callbacks) callback(realPerformanceNow.call(performance));
}

/** Lets the driver's yields (MessageChannel messages) run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    // eslint-disable-next-line no-await-in-loop -- each turn of the event loop lets one more yield through
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
}

beforeEach(() => {
  displayFrames = [];
  page = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
    requestAnimationFrame: (callback: FrameRequestCallback) => displayFrames.push(callback),
    cancelAnimationFrame: () => {},
  } as unknown as BrowserWindow;
  vi.stubGlobal('window', page);
});

afterEach(() => {
  clock?.setMode('paused');
  performance.now = realPerformanceNow;
  Date.now = realDateNow;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('VirtualClock timers', () => {
  beforeEach(() => {
    clock = installPausedClock();
  });

  it('fires timers in due order, and timers due together in the order they were set', async () => {
    const fired: [string, number][] = [];
    const record = (name: string) => () => fired.push([name, clock.stats().frame]);
    page.setTimeout(record('late'), 60);
    page.setTimeout(record('b'), 20);
    page.setTimeout(record('c'), 20);
    page.setTimeout(record('a'), 18);
    page.setTimeout(record('now'), 0);

    await clock.step(4);

    // Frames end at 16.7, 33.3, 50 and 66.7 ms.
    expect(fired).toEqual([['now', 1], ['a', 2], ['b', 2], ['c', 2], ['late', 4]]);
  });

  it('never fires a cleared timer or a cancelled animation frame', async () => {
    const fired: string[] = [];
    const timer = page.setTimeout(() => fired.push('timer'), 10);
    const frame = page.requestAnimationFrame(() => fired.push('frame'));
    page.setTimeout(() => fired.push('kept'), 10);
    page.clearTimeout(timer);
    page.cancelAnimationFrame(frame);

    await clock.step(2);

    expect(fired).toEqual(['kept']);
  });

  it('repeats an interval on its own period until it is cleared', async () => {
    const ticks: number[] = [];
    const interval = page.setInterval(() => ticks.push(clock.stats().frame), 5);

    await clock.step(2);
    page.clearInterval(interval);
    await clock.step(2);

    // Due at 5, 10, 15 (frame 1) and 20, 25, 30 (frame 2).
    expect(ticks).toEqual([1, 1, 1, 2, 2, 2]);
  });

  it('runs a zero-period interval at most once per virtual millisecond, so a frame cannot hang', async () => {
    let count = 0;
    page.setInterval(() => count++, 0);

    await clock.step(1);

    expect(count).toBeGreaterThanOrEqual(Math.floor(VIRTUAL_FRAME_MS));
    expect(count).toBeLessThanOrEqual(Math.ceil(VIRTUAL_FRAME_MS));
  });

  it('keeps running later timers when one callback throws', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fired: string[] = [];
    page.setTimeout(() => { throw new Error('boom'); }, 1);
    page.setTimeout(() => fired.push('after'), 2);
    page.requestAnimationFrame(() => fired.push('frame'));

    await clock.step(1);

    expect(fired).toEqual(['after', 'frame']);
    expect(errors).toHaveBeenCalledOnce();
  });
});

describe('VirtualClock time', () => {
  beforeEach(() => {
    clock = installPausedClock();
  });

  it('moves performance.now and Date.now by one fixed frame per step, and only then', async () => {
    const startNow = performance.now();
    const startDate = Date.now();

    await clock.realDelay(5);
    expect(performance.now()).toBe(startNow);

    await clock.step(3);

    expect(performance.now()).toBeCloseTo(startNow + 3 * VIRTUAL_FRAME_MS, 6);
    expect(clock.now()).toBe(performance.now());
    expect(Math.abs(Date.now() - (startDate + 50))).toBeLessThanOrEqual(1);
    expect(clock.stats()).toMatchObject({ frame: 3, mode: 'paused' });
  });

  it('runs an animation frame once, on the next frame, with the virtual timestamp', async () => {
    const stamps: number[] = [];
    const start = clock.now();
    const loop = (timestamp: number) => {
      stamps.push(timestamp);
      if (stamps.length < 3) page.requestAnimationFrame(loop);
    };
    page.requestAnimationFrame(loop);

    await clock.step(5);

    expect(stamps).toHaveLength(3);
    stamps.forEach((stamp, index) => expect(stamp).toBeCloseTo(start + (index + 1) * VIRTUAL_FRAME_MS, 6));
  });

  it('steps frames itself while paused until a wait is satisfied', async () => {
    let done = false;
    page.setTimeout(() => { done = true; }, 90);

    await expect(clock.waitUntil(() => done, 1_000)).resolves.toBe(true);

    // The frames end at 83.3 and 100 ms: the timer fires, and the wait ends, on the 6th.
    expect(clock.stats().frame).toBe(6);
  });

  it('gives up a wait once its virtual timeout has passed', async () => {
    const start = clock.now();

    await expect(clock.waitUntil(() => false, 50)).resolves.toBe(false);

    expect(clock.now() - start).toBeGreaterThanOrEqual(50);
    expect(clock.now() - start).toBeLessThan(50 + VIRTUAL_FRAME_MS);
  });

  it('advances by at least the requested virtual time, firing the timers due on the way', async () => {
    const fired: number[] = [];
    page.setTimeout(() => fired.push(40), 40);
    page.setTimeout(() => fired.push(500), 500);
    const start = clock.now();

    await clock.advance(100);

    expect(fired).toEqual([40]);
    // Both readings are large absolute times, so their difference loses the last bits of the
    // fraction (99.99999999999997 for six frames); compare at a microsecond.
    const elapsed = clock.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(100 - FLOAT_TOLERANCE_MS);
    expect(elapsed).toBeLessThan(100 + VIRTUAL_FRAME_MS);
  });
});

describe('VirtualClock driver', () => {
  it('in play mode advances `speed` frames per display frame', async () => {
    clock = new VirtualClock();
    clock.install();
    clock.setMode('play', 2);
    await settle();
    expect(clock.stats().frame).toBe(0);

    fireDisplayFrame();
    await settle();
    expect(clock.stats().frame).toBe(2);

    clock.setMode('play', 0.5);
    await settle();
    fireDisplayFrame();
    await settle();
    expect(clock.stats().frame).toBe(2);
    fireDisplayFrame();
    await settle();
    expect(clock.stats().frame).toBe(3);
  });

  it('keeps the speed between an eighth and eight frames per display frame', () => {
    clock = installPausedClock();

    clock.setMode('paused', 100);
    expect(clock.stats().speed).toBe(8);
    clock.setMode('paused', 0);
    expect(clock.stats().speed).toBe(0.125);
  });

  it('in fast mode runs frames without waiting for the display, and stops when paused', async () => {
    clock = installPausedClock();
    displayFrames = [];

    clock.setMode('fast');
    await vi.waitFor(() => expect(clock.stats().frame).toBeGreaterThanOrEqual(10));
    clock.setMode('paused');
    await settle();
    const frame = clock.stats().frame;
    await settle();

    expect(clock.stats().frame).toBe(frame);
    expect(displayFrames).toHaveLength(0);
  });

  it('stays out of the page without a browser window', () => {
    vi.unstubAllGlobals();
    clock = new VirtualClock();

    clock.install();

    expect(clock.installed).toBe(false);
    expect(performance.now).toBe(realPerformanceNow);
    expect(Date.now).toBe(realDateNow);
  });
});
