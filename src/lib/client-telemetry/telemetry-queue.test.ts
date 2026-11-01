import { describe, expect, it } from 'vitest';

import { CLIENT_TELEMETRY_LIMITS, type AnyClientTelemetryEnvelope } from '@shared/telemetry';

import { TelemetryQueue, type TelemetryQueueOptions } from './telemetry-queue';

function event(n: number, payload: Record<string, unknown> = { state: 'lost' }): AnyClientTelemetryEnvelope {
  return {
    eventId: `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`,
    type: 'webgl.context',
    occurredAt: 1_700_000_000_000 + n,
    sessionId: '01900000-0000-7000-8000-000000000000',
    playerId: null,
    roomId: null,
    page: '/',
    appVersion: 'test',
    payload,
  } as AnyClientTelemetryEnvelope;
}

function setup(overrides: Partial<TelemetryQueueOptions> = {}) {
  const sent: { sentAt: number; events: AnyClientTelemetryEnvelope[] }[] = [];
  const bodies: string[] = [];
  const scheduled: (() => void)[] = [];
  const queue = new TelemetryQueue({
    transport: (body) => {
      bodies.push(body);
      sent.push(JSON.parse(body));
      return true;
    },
    now: () => 42,
    schedule: (task) => scheduled.push(task),
    flushThreshold: 10,
    maxBuffered: 100,
    ...overrides,
  });
  return { queue, sent, bodies, scheduled };
}

describe('TelemetryQueue', () => {
  it('buffers without sending until flushed', () => {
    const { queue, sent } = setup();
    queue.push(event(1));
    queue.push(event(2));
    expect(sent).toHaveLength(0);
    expect(queue.size).toBe(2);

    queue.flush();
    expect(sent).toEqual([{ sentAt: 42, events: [event(1), event(2)] }]);
    expect(queue.size).toBe(0);
  });

  it('does nothing when flushing an empty buffer', () => {
    const { queue, sent } = setup();
    queue.flush();
    expect(sent).toHaveLength(0);
  });

  it('schedules exactly one flush once the size threshold is reached', () => {
    const { queue, sent, scheduled } = setup({ flushThreshold: 3 });
    queue.push(event(1));
    queue.push(event(2));
    expect(scheduled).toHaveLength(0);
    queue.push(event(3));
    queue.push(event(4));
    expect(scheduled).toHaveLength(1);

    scheduled[0]();
    expect(sent).toHaveLength(1);
    expect(sent[0].events).toHaveLength(4);
  });

  it('drops the oldest events beyond the buffer bound', () => {
    const { queue, sent } = setup({ maxBuffered: 3, flushThreshold: 100 });
    for (let i = 1; i <= 5; i++) queue.push(event(i));
    expect(queue.size).toBe(3);
    expect(queue.dropped).toBe(2);
    queue.flush();
    expect(sent[0].events.map((e) => e.occurredAt % 1000)).toEqual([3, 4, 5]);
  });

  it('splits a flush into batches bounded by event count', () => {
    const { queue, sent } = setup({ maxEventsPerBatch: 2, flushThreshold: 100 });
    for (let i = 1; i <= 5; i++) queue.push(event(i));
    queue.flush();
    expect(sent.map((batch) => batch.events.length)).toEqual([2, 2, 1]);
  });

  it('splits a flush into batches bounded by body bytes', () => {
    const { queue, bodies } = setup({ maxBodyBytes: 900, flushThreshold: 100 });
    for (let i = 1; i <= 6; i++) queue.push(event(i));
    queue.flush();
    expect(bodies.length).toBeGreaterThan(1);
    for (const body of bodies) expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(900);
    expect(bodies.flatMap((body) => JSON.parse(body).events)).toHaveLength(6);
  });

  it('drops single events larger than the per-event limit', () => {
    const { queue, sent } = setup({ maxEventBytes: 500 });
    queue.push(event(1, { blob: 'x'.repeat(1_000) }));
    queue.push(event(2));
    queue.flush();
    expect(sent[0].events).toEqual([event(2)]);
    expect(queue.dropped).toBe(1);
  });

  it('clear drops buffered events', () => {
    const { queue, sent } = setup();
    queue.push(event(1));
    queue.clear();
    queue.flush();
    expect(sent).toHaveLength(0);
  });

  it('keeps the total bytes of one flush within the keepalive quota and sends the rest later', () => {
    const { queue, bodies } = setup({ maxBodyBytes: 900, maxFlushBytes: 2_000, flushThreshold: 100 });
    for (let i = 1; i <= 20; i++) queue.push(event(i));
    queue.flush();
    const firstFlush = bodies.splice(0);
    const total = firstFlush.reduce((sum, body) => sum + new TextEncoder().encode(body).byteLength, 0);
    expect(total).toBeLessThanOrEqual(2_000);
    const sentFirst = firstFlush.flatMap((body) => JSON.parse(body).events);
    expect(sentFirst.length).toBeGreaterThan(0);
    expect(queue.size).toBe(20 - sentFirst.length);

    while (queue.size > 0) queue.flush();
    const all = [...sentFirst, ...bodies.flatMap((body) => JSON.parse(body).events)];
    expect(all.map((e) => e.occurredAt % 1000)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('never exceeds the keepalive quota with the default limits', () => {
    const { queue, bodies } = setup({ maxBuffered: 500, flushThreshold: 1_000 });
    for (let i = 1; i <= 500; i++) queue.push(event(i, { blob: 'x'.repeat(1_000) }));
    queue.flush();
    const total = bodies.reduce((sum, body) => sum + new TextEncoder().encode(body).byteLength, 0);
    expect(total).toBeLessThanOrEqual(CLIENT_TELEMETRY_LIMITS.KEEPALIVE_QUOTA_BYTES);
    expect(queue.size).toBeGreaterThan(0);
  });

  it('keeps a batch the browser refused and retries it on the next flush', () => {
    let accept = false;
    const sent: AnyClientTelemetryEnvelope[][] = [];
    const queue = new TelemetryQueue({
      transport: (body) => {
        if (accept) sent.push(JSON.parse(body).events);
        return accept;
      },
      now: () => 42,
      schedule: () => undefined,
      flushThreshold: 100,
      maxBuffered: 100,
    });
    queue.push(event(1));
    queue.push(event(2));
    queue.flush();
    expect(queue.size).toBe(2);
    accept = true;
    queue.flush();
    expect(sent).toEqual([[event(1), event(2)]]);
    expect(queue.size).toBe(0);
  });

  it('counts the size threshold from the leftover backlog, not from zero', () => {
    const { queue, scheduled } = setup({ flushThreshold: 3, maxBodyBytes: 900, maxFlushBytes: 900 });
    for (let i = 1; i <= 8; i++) queue.push(event(i));
    scheduled.splice(0).forEach((task) => task());
    const backlog = queue.size;
    expect(backlog).toBeGreaterThan(0);
    queue.push(event(9));
    expect(scheduled).toHaveLength(0);
    queue.push(event(10));
    queue.push(event(11));
    expect(scheduled).toHaveLength(1);
  });
});
