import { describe, expect, it, vi } from 'vitest';

import type { IngestClientTelemetryInput } from '@shared/application';
import { CLIENT_TELEMETRY_LIMITS } from '@shared/telemetry';

import { ClientTelemetryClient } from '@/lib/client-telemetry/client-telemetry';
import { collectDeviceProfile } from '@/lib/client-telemetry/collectors/device-profile';

import { createClientTelemetryHandler, type ClientTelemetryHandlerDeps } from './client-telemetry-handler';

const NOW = 1_700_000_000_000;

function event(id = 1) {
  return {
    eventId: `01900000-0000-7000-8000-${String(id).padStart(12, '0')}`,
    type: 'error',
    occurredAt: NOW,
    sessionId: '01900000-0000-7000-8000-0000000000aa',
    playerId: null,
    roomId: null,
    page: '/',
    appVersion: 'dev',
    payload: { kind: 'error', message: 'boom' },
  };
}

function setup(overrides: Partial<ClientTelemetryHandlerDeps> = {}) {
  const execute = vi.fn(async (input: IngestClientTelemetryInput) => ({
    received: input.events.length,
    inserted: input.events.length,
    duplicates: 0,
    throttled: 0,
  }));
  const allow = vi.fn(async (_key: string, _cost?: number) => true);
  const allowEvents = vi.fn(async (_key: string, _cost?: number) => true);
  const log = vi.fn();
  const handle = createClientTelemetryHandler({
    ingest: { execute },
    requestLimiter: { allow },
    eventLimiter: { allow: allowEvents },
    isStorageConfigured: () => true,
    log,
    now: () => NOW,
    ...overrides,
  });
  return { handle, execute, allow, allowEvents, log };
}

function request(body: string, headers: Record<string, string> = {}) {
  return new Request('https://wizardparty.fun/api/telemetry/client', {
    method: 'POST',
    body,
    headers: { 'content-type': 'text/plain;charset=UTF-8', ...headers },
  });
}

const validBody = JSON.stringify({ sentAt: NOW, events: [event()] });

/** The body a real browser client sends for one session profile, one WebGL loss and one error. */
function browserClientBody(): { body: string; eventIds: string[] } {
  const bodies: string[] = [];
  const eventIds: string[] = [];
  const client = new ClientTelemetryClient({
    transport: (body) => bodies.push(body) > 0,
    collectors: [],
    now: () => NOW,
    createEventId: () => {
      const eventId = `01900000-0000-7000-8000-${String(eventIds.length + 1).padStart(12, '0')}`;
      eventIds.push(eventId);
      return eventId;
    },
    getSessionId: () => '01900000-0000-7000-8000-0000000000aa',
    getPage: () => '/game/ABCD',
    appVersion: 'abc123',
    schedule: () => undefined,
    every: () => () => undefined,
    onPageHidden: () => () => undefined,
    flushIntervalMs: 10_000,
    flushThreshold: 100,
    maxBuffered: 500,
    maxDistinctErrors: 10,
  });
  client.start();
  client.setPlayerId('p_1');
  client.setRoomId('ABCD');
  client.track('session.started', collectDeviceProfile({
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      language: 'de-DE',
      languages: ['de-DE', 'en'],
      hardwareConcurrency: 6,
      maxTouchPoints: 5,
    } as unknown as Navigator,
    screen: { width: 393, height: 852 },
    viewport: { width: 393, height: 659 },
    devicePixelRatio: 3,
    matchMedia: (query) => ({ matches: query.includes('dark') }),
    referrer: '',
    origin: 'https://wizardparty.fun',
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  }));
  client.track('webgl.context', { state: 'lost' });
  client.reportError({ kind: 'error', error: new TypeError('boom'), source: 'https://wizardparty.fun/_next/app.js?v=1', line: 3, column: 7 });
  client.flush();
  if (bodies.length !== 1) throw new Error(`expected one batch, got ${bodies.length}`);
  return { body: bodies[0], eventIds };
}

describe('POST /api/telemetry/client', () => {
  it('stores a sendBeacon batch and enriches it with edge context, never the IP', async () => {
    const { handle, execute, allow, allowEvents } = setup();
    const response = await handle(request(validBody, {
      'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      'x-vercel-ip-country': 'de',
      'user-agent': 'Mozilla/5.0 Test',
    }));
    expect(response.status).toBe(204);
    expect(allow).toHaveBeenCalledWith('203.0.113.7');
    expect(allowEvents).toHaveBeenCalledWith('203.0.113.7', 1);
    const input = execute.mock.calls[0][0];
    expect(input.events).toHaveLength(1);
    expect(input.context).toEqual({ receivedAt: NOW, country: 'DE', userAgent: 'Mozilla/5.0 Test' });
    expect(JSON.stringify(input)).not.toContain('203.0.113.7');
  });

  it('stores every event of a batch exactly as the browser client sends it', async () => {
    const { handle, execute } = setup();
    const { body, eventIds } = browserClientBody();
    expect((await handle(request(body))).status).toBe(204);
    expect(eventIds).toHaveLength(3);
    // Envelopes and payloads (the device profile the session projection reads) arrive untouched.
    const sent = (JSON.parse(body) as { events: unknown[] }).events;
    expect(execute.mock.calls[0][0].events).toEqual(sent);
  });

  it('accepts application/json bodies', async () => {
    const { handle } = setup();
    const response = await handle(request(validBody, { 'content-type': 'application/json' }));
    expect(response.status).toBe(204);
  });

  it('rejects bodies over the byte limit (declared or actual)', async () => {
    const { handle, execute } = setup();
    const big = 'x'.repeat(CLIENT_TELEMETRY_LIMITS.MAX_BODY_BYTES + 1);
    expect((await handle(request(big))).status).toBe(413);
    const lying = request(validBody, { 'content-length': String(CLIENT_TELEMETRY_LIMITS.MAX_BODY_BYTES + 1) });
    expect((await handle(lying)).status).toBe(413);
    expect(execute).not.toHaveBeenCalled();
  });

  it('rate limits requests before reading the body', async () => {
    const { handle, execute } = setup({ requestLimiter: { allow: async () => false } });
    const req = request(validBody);
    expect((await handle(req)).status).toBe(429);
    expect(req.bodyUsed).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it('budgets stored events per client network, buckets IPv6 by /64', async () => {
    const { handle, execute, allow, allowEvents } = setup();
    const body = JSON.stringify({ sentAt: NOW, events: [event(1), event(2), event(3)] });
    await handle(request(body, { 'x-forwarded-for': '2001:db8:1:2:aaaa::1' }));
    expect(allow).toHaveBeenCalledWith('2001:db8:1:2::/64');
    expect(allowEvents).toHaveBeenCalledWith('2001:db8:1:2::/64', 3);
    expect(execute).toHaveBeenCalled();

    const limited = setup({ eventLimiter: { allow: async () => false } });
    expect((await limited.handle(request(body))).status).toBe(429);
    expect(limited.execute).not.toHaveBeenCalled();
  });

  it('stores the valid events of a batch that also carries a malformed session.started', async () => {
    const { handle, execute } = setup();
    const malformed = {
      ...event(9),
      type: 'session.started',
      payload: { userAgent: 'UA', uaBrands: 'x', uaPlatform: 1, screenWidth: 1.5, hardwareConcurrency: 99_999 },
    };
    const response = await handle(request(JSON.stringify({ sentAt: NOW, events: [event(1), malformed, event(2)] })));
    expect(response.status).toBe(204);
    expect(execute.mock.calls[0][0].events.map((e) => e.eventId)).toEqual([event(1).eventId, event(2).eventId]);
  });

  it('rejects cross-site requests', async () => {
    const { handle } = setup();
    expect((await handle(request(validBody, { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
  });

  it('rejects invalid json and invalid batches', async () => {
    const { handle } = setup();
    expect((await handle(request('{not json'))).status).toBe(400);
    expect((await handle(request(JSON.stringify({ events: [] })))).status).toBe(400);
    const tooMany = Array.from({ length: CLIENT_TELEMETRY_LIMITS.MAX_EVENTS_PER_BATCH + 1 }, (_, i) => event(i));
    expect((await handle(request(JSON.stringify({ sentAt: NOW, events: tooMany }))) ).status).toBe(400);
  });

  it('answers 204 without storing when every event is invalid', async () => {
    const { handle, execute } = setup();
    const response = await handle(request(JSON.stringify({ sentAt: NOW, events: [{ type: 'bogus' }] })));
    expect(response.status).toBe(204);
    expect(execute).not.toHaveBeenCalled();
  });

  it('ignores malformed country headers', async () => {
    const { handle, execute } = setup();
    await handle(request(validBody, { 'x-vercel-ip-country': 'XX1' }));
    expect(execute.mock.calls[0][0].context.country).toBeNull();
  });

  it('returns 503 when storage is missing or fails', async () => {
    const unconfigured = setup({ isStorageConfigured: () => false });
    expect((await unconfigured.handle(request(validBody))).status).toBe(503);

    const failing = setup({ ingest: { execute: async () => { throw new Error('db down'); } } });
    expect((await failing.handle(request(validBody))).status).toBe(503);
    expect(failing.log).toHaveBeenCalledWith('error', 'client_telemetry_ingest_failed', expect.objectContaining({ error: 'db down' }));
  });
});
