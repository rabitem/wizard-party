import { describe, expect, it, vi } from 'vitest';

import type { AnyClientTelemetryEnvelope } from '@shared/telemetry';

import { ClientTelemetryClient, type ClientTelemetryCollector, type ClientTelemetryDeps } from './client-telemetry';

function setup(collectors: ClientTelemetryCollector[] = []) {
  const batches: AnyClientTelemetryEnvelope[][] = [];
  const timers: { task: () => void; cancelled: boolean }[] = [];
  const scheduled: (() => void)[] = [];
  const hiddenListeners = new Set<() => void>();
  let id = 0;
  const deps: ClientTelemetryDeps = {
    transport: (body) => {
      batches.push(JSON.parse(body).events);
      return true;
    },
    collectors,
    now: () => 1_700_000_000_000,
    createEventId: () => `00000000-0000-7000-8000-${String(++id).padStart(12, '0')}`,
    getSessionId: () => '01900000-0000-7000-8000-000000000001',
    getPage: () => '/game/ABCD',
    appVersion: 'abc123',
    schedule: (task) => scheduled.push(task),
    every: (task) => {
      const timer = { task, cancelled: false };
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
    onPageHidden: (task) => {
      hiddenListeners.add(task);
      return () => hiddenListeners.delete(task);
    },
    flushIntervalMs: 10_000,
    flushThreshold: 100,
    maxBuffered: 500,
    maxDistinctErrors: 3,
  };
  const client = new ClientTelemetryClient(deps);
  const tick = () => timers.filter((t) => !t.cancelled).forEach((t) => t.task());
  const hide = () => [...hiddenListeners].forEach((listener) => listener());
  const runScheduled = () => scheduled.splice(0).forEach((task) => task());
  return { client, batches, tick, hide, runScheduled, hiddenListeners, timers };
}

function fakeCollector(scope: 'global' | 'game' = 'global') {
  const stop = vi.fn();
  const collector: ClientTelemetryCollector = { name: `fake-${scope}`, scope, start: vi.fn(() => stop) };
  return { collector, stop };
}

describe('ClientTelemetryClient consent gating', () => {
  it('records and sends nothing before consent', () => {
    const { collector } = fakeCollector();
    const { client, batches, tick, hide } = setup([collector]);
    client.track('webgl.context', { state: 'lost' });
    client.reportError({ kind: 'error', message: 'boom' });
    tick();
    hide();
    expect(batches).toHaveLength(0);
    expect(client.bufferedEvents).toBe(0);
    expect(collector.start).not.toHaveBeenCalled();
  });

  it('builds the envelope from context and sends on the interval', () => {
    const { client, batches, tick } = setup();
    client.start();
    client.setPlayerId('player-1700000000000-abc1234');
    client.setRoomId('ABCD');
    client.track('webgl.context', { state: 'lost' });
    tick();
    expect(batches).toEqual([[{
      eventId: '00000000-0000-7000-8000-000000000001',
      type: 'webgl.context',
      occurredAt: 1_700_000_000_000,
      sessionId: '01900000-0000-7000-8000-000000000001',
      playerId: 'player-1700000000000-abc1234',
      roomId: 'ABCD',
      page: '/game/ABCD',
      appVersion: 'abc123',
      payload: { state: 'lost' },
    }]]);
  });

  it('flushes when the page is hidden or unloaded', () => {
    const { client, batches, hide } = setup();
    client.start();
    client.track('webgl.context', { state: 'restored' });
    hide();
    expect(batches).toHaveLength(1);
  });

  it('also sends what later hidden listeners report on the same event (final web vitals)', () => {
    const { client, batches, hide, runScheduled, hiddenListeners } = setup();
    client.start();
    client.track('webgl.context', { state: 'lost' });
    // Registered after the client's own listener, like web-vitals' lazily added handlers.
    hiddenListeners.add(() => client.track('web_vital', {
      name: 'CLS', value: 0.1, delta: 0.1, rating: 'good', navigationType: 'navigate', metricId: 'v5-1',
    }));
    hide();
    expect(batches.flat().map((e) => e.type)).toEqual(['webgl.context']);
    runScheduled();
    expect(batches.flat().map((e) => e.type)).toEqual(['webgl.context', 'web_vital']);
  });

  it('drops buffered events and stops collectors and timers when consent is revoked', () => {
    const { collector, stop } = fakeCollector();
    const { client, batches, tick, hiddenListeners, timers } = setup([collector]);
    client.start();
    expect(collector.start).toHaveBeenCalledTimes(1);
    client.track('webgl.context', { state: 'lost' });

    client.stop();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(client.bufferedEvents).toBe(0);
    expect(hiddenListeners.size).toBe(0);
    expect(timers.every((t) => t.cancelled)).toBe(true);

    client.track('webgl.context', { state: 'lost' });
    tick();
    expect(batches).toHaveLength(0);
  });

  it('is idempotent for repeated start and stop', () => {
    const { collector, stop } = fakeCollector();
    const { client } = setup([collector]);
    client.start();
    client.start();
    client.stop();
    client.stop();
    expect(collector.start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('skips collectors that fail to start without breaking the others', () => {
    const broken: ClientTelemetryCollector = { name: 'broken', scope: 'global', start: () => { throw new Error('nope'); } };
    const { collector } = fakeCollector();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { client } = setup([broken, collector]);
    client.start();
    expect(collector.start).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('ClientTelemetryClient scopes', () => {
  it('runs scoped collectors only while the scope is held and consent is given', () => {
    const { collector, stop } = fakeCollector('game');
    const { client } = setup([collector]);

    const leaveBeforeConsent = client.enterScope('game');
    expect(collector.start).not.toHaveBeenCalled();
    client.start();
    expect(collector.start).toHaveBeenCalledTimes(1);

    const leaveAgain = client.enterScope('game');
    leaveBeforeConsent();
    expect(stop).not.toHaveBeenCalled();
    leaveAgain();
    leaveAgain();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});

describe('ClientTelemetryClient errors', () => {
  it('deduplicates identical errors and caps distinct errors per session', () => {
    const { client, batches, tick } = setup();
    client.start();
    for (let i = 0; i < 5; i++) client.reportError({ kind: 'error', message: 'same', source: 'app.js', line: 1, column: 2 });
    for (let i = 0; i < 5; i++) client.reportError({ kind: 'error', message: `distinct ${i}` });
    tick();
    const messages = batches.flat().map((e) => (e.payload as { message: string }).message);
    expect(messages).toEqual(['same', 'distinct 0', 'distinct 1']);
  });

  it('treats the same message at another line or of another kind as a distinct error', () => {
    const { client, batches, tick } = setup();
    client.start();
    for (let i = 0; i < 2; i++) {
      client.reportError({ kind: 'error', message: 'x', line: 1 });
      client.reportError({ kind: 'error', message: 'x', line: 2 });
      client.reportError({ kind: 'unhandledrejection', message: 'x', line: 1 });
    }
    tick();
    const reported = batches.flat().map((e) => {
      const { kind, line } = e.payload as { kind: string; line: number };
      return `${kind}:${line}`;
    });
    expect(reported).toEqual(['error:1', 'error:2', 'unhandledrejection:1']);
  });
});
