import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Metric } from 'web-vitals';

import type { TelemetrySink } from '../client-telemetry';
import { createWebVitalsCollector } from './web-vitals.collector';

/** web-vitals listeners, as the library keeps them: they can be added but never removed. */
const vitals = vi.hoisted(() => ({ listeners: [] as ((metric: unknown) => void)[] }));

vi.mock('web-vitals', () => {
  const subscribe = (listener: (metric: unknown) => void) => void vitals.listeners.push(listener);
  return { onCLS: subscribe, onFCP: subscribe, onINP: subscribe, onLCP: subscribe, onTTFB: subscribe };
});

interface RecordingSink extends TelemetrySink {
  tracked: { type: string; payload: unknown }[];
  flushes: number;
}

function recordingSink(): RecordingSink {
  const sink: RecordingSink = {
    tracked: [],
    flushes: 0,
    track: (type, payload) => void sink.tracked.push({ type, payload }),
    reportError: () => undefined,
    flush: () => void sink.flushes++,
  };
  return sink;
}

const metric = (overrides: Partial<Metric> = {}): Metric =>
  ({ name: 'LCP', value: 1234.567891, delta: 1234.567891, rating: 'good', navigationType: 'navigate', id: 'v5-1700000000000-1234567890', entries: [], ...overrides }) as Metric;

/** Reports `value` through every registered listener, like web-vitals does for its metrics. */
function emit(value: Metric): void {
  for (const listener of vitals.listeners) listener(value);
}

beforeEach(() => {
  vitals.listeners = [];
  vi.stubGlobal('document', { visibilityState: 'visible' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createWebVitalsCollector', () => {
  it('should register one listener per Core Web Vital and forward a rounded, bounded metric', async () => {
    const sink = recordingSink();
    createWebVitalsCollector().start(sink);
    await vi.dynamicImportSettled();

    expect(vitals.listeners).toHaveLength(5);
    vitals.listeners[0](metric({ name: 'CLS', value: 0.123456789, delta: 0.000049, rating: 'needs-improvement', id: `v5-${'9'.repeat(100)}` }));

    expect(sink.tracked).toEqual([
      {
        type: 'web_vital',
        payload: { name: 'CLS', value: 0.1235, delta: 0, rating: 'needs-improvement', navigationType: 'navigate', metricId: `v5-${'9'.repeat(61)}` },
      },
    ]);
    expect(sink.flushes).toBe(0);
  });

  it('should flush at once when a final value arrives while the page is being hidden', async () => {
    const sink = recordingSink();
    createWebVitalsCollector().start(sink);
    await vi.dynamicImportSettled();
    vi.stubGlobal('document', { visibilityState: 'hidden' });

    vitals.listeners[0](metric());

    expect(sink.tracked).toHaveLength(1);
    expect(sink.flushes).toBe(1);
  });

  it('should drop metrics while stopped and forward them to the next sink without registering twice', async () => {
    const collector = createWebVitalsCollector();
    const first = recordingSink();
    const stop = collector.start(first);
    await vi.dynamicImportSettled();
    stop();

    emit(metric());
    const second = recordingSink();
    collector.start(second);
    await vi.dynamicImportSettled();
    vitals.listeners[0](metric());

    expect(first.tracked).toEqual([]);
    expect(vitals.listeners).toHaveLength(5);
    expect(second.tracked).toHaveLength(1);
  });
});
