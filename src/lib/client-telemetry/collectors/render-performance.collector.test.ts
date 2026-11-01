import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TelemetrySink } from '../client-telemetry';
import { RENDER_PERFORMANCE_CONFIG } from '../client-telemetry.config';
import { publishRenderQuality } from '../render-quality-snapshot';
import { createRenderPerformanceCollector } from './render-performance.collector';

const { WINDOW_MS, MIN_FRAMES_PER_WINDOW } = RENDER_PERFORMANCE_CONFIG;
const MB = 1024 * 1024;

/** A browser frame loop driven by the test: each `frame` advances the clock and runs rAF callbacks. */
class FrameLoop {
  now = 0;
  private callbacks = new Map<number, (time: number) => void>();
  private nextHandle = 1;

  request = (callback: (time: number) => void) => {
    const handle = this.nextHandle++;
    this.callbacks.set(handle, callback);
    return handle;
  };
  cancel = (handle: number) => void this.callbacks.delete(handle);

  get pending(): number {
    return this.callbacks.size;
  }

  frame(deltaMs: number): void {
    this.now += deltaMs;
    const due = [...this.callbacks.values()];
    this.callbacks.clear();
    for (const callback of due) callback(this.now);
  }

  frames(count: number, deltaMs: number): void {
    for (let index = 0; index < count; index++) this.frame(deltaMs);
  }
}

/** PerformanceObserver for `longtask` entries; the test emits the entries. */
class FakeLongTaskObserver {
  static supportedEntryTypes = ['longtask'];
  static active: FakeLongTaskObserver | null = null;
  constructor(private readonly callback: (list: { getEntries(): { duration: number }[] }) => void) {}
  observe() {
    FakeLongTaskObserver.active = this;
  }
  disconnect() {
    FakeLongTaskObserver.active = null;
  }
  emit(...durations: number[]) {
    this.callback({ getEntries: () => durations.map((duration) => ({ duration })) });
  }
}

let loop: FrameLoop;
let doc: EventTarget & { hidden: boolean };
let tracked: { type: string; payload: Record<string, unknown> }[];
let sink: TelemetrySink;

beforeEach(() => {
  vi.useFakeTimers();
  loop = new FrameLoop();
  doc = Object.assign(new EventTarget(), { hidden: false });
  tracked = [];
  sink = { track: (type, payload) => void tracked.push({ type, payload: payload as Record<string, unknown> }), reportError: () => undefined, flush: () => undefined };
  vi.stubGlobal('performance', { now: () => loop.now });
  vi.stubGlobal('requestAnimationFrame', loop.request);
  vi.stubGlobal('cancelAnimationFrame', loop.cancel);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', {
    setInterval: (handler: () => void, ms: number) => setInterval(handler, ms),
    clearInterval: (handle: ReturnType<typeof setInterval>) => clearInterval(handle),
  });
  vi.stubGlobal('PerformanceObserver', FakeLongTaskObserver);
  FakeLongTaskObserver.active = null;
});

afterEach(() => {
  publishRenderQuality(null);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createRenderPerformanceCollector', () => {
  it('should report one window of steady 50 fps frames with long tasks, render quality and heap', () => {
    publishRenderQuality({ tier: 'high', dpr: 1.5, adaptive: true });
    vi.stubGlobal('performance', { now: () => loop.now, memory: { usedJSHeapSize: 50 * MB, jsHeapSizeLimit: 2048 * MB } });
    createRenderPerformanceCollector().start(sink);

    loop.frame(0); // the first frame only starts the clock
    loop.frames(40, 20);
    FakeLongTaskObserver.active?.emit(60, 90.5);
    vi.advanceTimersByTime(WINDOW_MS);

    expect(tracked).toEqual([
      {
        type: 'render.performance',
        payload: {
          qualityTier: 'high',
          renderDpr: 1.5,
          windowMs: 800,
          frames: 40,
          avgFps: 50,
          p5Fps: 50,
          avgFrameMs: 20,
          p95FrameMs: 20,
          maxFrameMs: 20,
          droppedFrames: 0,
          longTasks: 2,
          longTaskMs: 151,
          jsHeapUsedMb: 50,
          jsHeapLimitMb: 2048,
        },
      },
    ]);
  });

  it('should report unknown quality and heap where the browser exposes neither', () => {
    createRenderPerformanceCollector().start(sink);

    loop.frames(MIN_FRAMES_PER_WINDOW + 1, 20);
    vi.advanceTimersByTime(WINDOW_MS);

    expect(tracked[0].payload).toMatchObject({ qualityTier: null, renderDpr: null, jsHeapUsedMb: null, jsHeapLimitMb: null, longTasks: 0 });
  });

  it('should skip a window with too few frames and start the next one from scratch', () => {
    createRenderPerformanceCollector().start(sink);

    loop.frames(MIN_FRAMES_PER_WINDOW, 20); // one fewer delta than the minimum
    vi.advanceTimersByTime(WINDOW_MS);
    expect(tracked).toEqual([]);

    loop.frames(MIN_FRAMES_PER_WINDOW, 20);
    vi.advanceTimersByTime(WINDOW_MS);
    expect(tracked).toHaveLength(1);
    expect(tracked[0].payload.frames).toBe(MIN_FRAMES_PER_WINDOW);
  });

  it('should not report a window that ends while the tab is hidden', () => {
    createRenderPerformanceCollector().start(sink);

    loop.frames(60, 20);
    doc.hidden = true;
    vi.advanceTimersByTime(WINDOW_MS);

    expect(tracked).toEqual([]);
  });

  it('should treat the gap of a hidden tab as a pause and drop the partial window', () => {
    createRenderPerformanceCollector().start(sink);

    loop.frames(20, 20);
    doc.dispatchEvent(new Event('visibilitychange'));
    loop.frame(5_000);
    loop.frames(35, 20);
    vi.advanceTimersByTime(WINDOW_MS);

    expect(tracked).toHaveLength(1);
    expect(tracked[0].payload).toMatchObject({ frames: 35, maxFrameMs: 20, droppedFrames: 0 });
  });

  it('should count frames slower than the display refresh as dropped', () => {
    createRenderPerformanceCollector().start(sink);

    loop.frame(0);
    loop.frames(36, 16);
    loop.frames(4, 48); // each 48 ms frame spans three 16 ms refreshes: two dropped
    vi.advanceTimersByTime(WINDOW_MS);

    expect(tracked[0].payload).toMatchObject({ frames: 40, droppedFrames: 8, maxFrameMs: 48 });
  });

  it('should release the frame loop, the timer and the observers when stopped', () => {
    const stop = createRenderPerformanceCollector().start(sink);
    loop.frames(60, 20);

    stop();
    vi.advanceTimersByTime(WINDOW_MS * 2);

    expect(tracked).toEqual([]);
    expect(loop.pending).toBe(0);
    expect(FakeLongTaskObserver.active).toBeNull();
  });
});
