import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deviceProfileSchema } from '@shared/telemetry/client-telemetry-schema';

import type { TelemetrySink } from '../client-telemetry';
import { CLIENT_TELEMETRY_CONFIG } from '../client-telemetry.config';
import { createSessionProfileCollector } from './session-profile.collector';

const IDLE_TIMEOUT_MS = CLIENT_TELEMETRY_CONFIG.SESSION_PROFILE_IDLE_TIMEOUT_MS;

let tracked: { type: string; payload: Record<string, unknown> }[];
let sink: TelemetrySink;

/** A browser window without requestIdleCallback (Safari); timers are vitest's fake ones. */
function browserWindow(extra: Record<string, unknown> = {}) {
  return {
    screen: { width: 1920, height: 1080 },
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 2,
    matchMedia: (query: string) => ({ matches: query.includes('dark') }),
    setTimeout: (handler: () => void, ms: number) => setTimeout(handler, ms),
    clearTimeout: (handle: ReturnType<typeof setTimeout>) => clearTimeout(handle),
    ...extra,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  tracked = [];
  sink = { track: (type, payload) => void tracked.push({ type, payload: payload as Record<string, unknown> }), reportError: () => undefined, flush: () => undefined };
  vi.stubGlobal('window', browserWindow());
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/131.0', language: 'en-GB', languages: ['en-GB', 'en'], hardwareConcurrency: 4, maxTouchPoints: 0 });
  vi.stubGlobal('document', { referrer: 'https://search.example/?q=wizard', createElement: () => ({ getContext: () => null }) });
  vi.stubGlobal('location', { origin: 'https://wizardparty.test' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('createSessionProfileCollector', () => {
  it('should wait for idle time, then send one session.started that the ingest schema accepts', async () => {
    createSessionProfileCollector().start(sink);

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS - 1);
    expect(tracked).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(tracked).toHaveLength(1);
    expect(tracked[0].type).toBe('session.started');
    expect(tracked[0].payload).toMatchObject({
      language: 'en-GB',
      viewportWidth: 1280,
      screenWidth: 1920,
      devicePixelRatio: 2,
      colorScheme: 'dark',
      referrerOrigin: 'https://search.example',
      webglRenderer: null,
    });
    expect(deviceProfileSchema.safeParse(tracked[0].payload).success).toBe(true);
  });

  it('should use requestIdleCallback with the idle timeout where the browser has it', async () => {
    const idle: { task: () => void; timeout: number }[] = [];
    vi.stubGlobal('window', browserWindow({
      requestIdleCallback: (task: () => void, options: { timeout: number }) => idle.push({ task, timeout: options.timeout }),
      cancelIdleCallback: () => undefined,
    }));
    createSessionProfileCollector().start(sink);

    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS * 2);
    expect(tracked).toEqual([]);
    expect(idle.map((entry) => entry.timeout)).toEqual([IDLE_TIMEOUT_MS]);

    idle[0].task();
    await vi.advanceTimersByTimeAsync(0);
    expect(tracked).toHaveLength(1);
  });

  it('should send nothing when stopped before the browser was idle', async () => {
    const stop = createSessionProfileCollector().start(sink);

    stop();
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS * 2);

    expect(tracked).toEqual([]);
  });

  it('should send the profile only once per page load, even when restarted', async () => {
    const collector = createSessionProfileCollector();
    const stop = collector.start(sink);
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS);
    stop();

    collector.start(sink);
    await vi.advanceTimersByTimeAsync(IDLE_TIMEOUT_MS * 2);

    expect(tracked).toHaveLength(1);
  });
});
