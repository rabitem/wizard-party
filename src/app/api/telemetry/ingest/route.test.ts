import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  TELEMETRY_HEADERS,
  TELEMETRY_LIMITS,
  TELEMETRY_SCHEMA_VERSION,
  TelemetryEventType,
  signTelemetryRequest,
  type AnyTelemetryEnvelope,
} from '@shared/telemetry';

import { HttpTelemetryTransport } from '../../../../../party/telemetry/http-telemetry-transport';

/** The event store the route writes to, in memory; `available: false` models a database outage. */
const store = vi.hoisted(() => ({
  available: true,
  events: [] as unknown[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/telemetry/postgres-telemetry-store', () => ({
  PostgresTelemetryStore: class {
    async append(events: readonly unknown[]) {
      if (!store.available) throw new Error('database unavailable');
      store.events.push(...events);
      return { inserted: events.length };
    }
  },
}));
// The batches here complete no game, so the global stats adapters are never reached.
vi.mock('@/infrastructure/stats/postgres-completed-game-reader', () => ({ PostgresCompletedGameReader: class {} }));
vi.mock('@/infrastructure/stats/redis-global-stats-store', () => ({ RedisGlobalStatsStore: class {} }));

import { POST } from './route';

const SECRET = 'telemetry-secret-for-tests';
const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);
const ENDPOINT = 'https://wizardparty.fun/api/telemetry/ingest';

/** The worker posts straight into the route handler. */
const routeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => POST(new Request(input, init))) as typeof fetch;

function workerTransport({ secret = SECRET, now = () => Date.now() }: { secret?: string; now?: () => number } = {}) {
  return new HttpTelemetryTransport({ url: ENDPOINT, secret, producer: 'worker-test', fetch: routeFetch, now });
}

function playerLeft(seq: number, overrides: Partial<AnyTelemetryEnvelope> = {}): AnyTelemetryEnvelope {
  return {
    schemaVersion: TELEMETRY_SCHEMA_VERSION,
    eventId: `0190a000-0000-7000-8000-${String(seq).padStart(12, '0')}`,
    type: TelemetryEventType.PLAYER_LEFT,
    occurredAt: NOW - 1_000 + seq,
    roomId: 'ROOM1',
    gameId: null,
    seq,
    source: 'system',
    actorId: null,
    correlationId: `c-${seq}`,
    commandType: null,
    round: null,
    phase: 'LOBBY',
    serverVersion: null,
    payload: { playerId: 'p-1' },
    ...overrides,
  } as AnyTelemetryEnvelope;
}

describe('POST /api/telemetry/ingest', () => {
  beforeEach(() => {
    // Only the clock is faked: the signature tolerance is checked against Date.now().
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    vi.stubEnv('TELEMETRY_INGEST_SECRET', SECRET);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    store.available = true;
    store.events = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should store a batch the worker signed exactly as sent and count as delivered', async () => {
    const events = [playerLeft(1), playerLeft(2)];
    expect(await workerTransport().send(events)).toEqual({ status: 'delivered' });
    expect(store.events).toEqual(events);
  });

  it.each([
    ['another secret', { secret: 'not-the-ingest-secret' }],
    ['a timestamp outside the replay window', { now: () => NOW - TELEMETRY_LIMITS.SIGNATURE_TOLERANCE_MS - 1 }],
  ])('should refuse a batch signed with %s as 401, which the worker retries', async (_label, options) => {
    const result = await workerTransport(options).send([playerLeft(1)]);
    expect(result).toEqual({ status: 'retry', reason: expect.stringMatching(/^HTTP 401/) });
    expect(store.events).toEqual([]);
  });

  it('should answer 422 for a batch the schema refuses, which the worker dead-letters', async () => {
    const result = await workerTransport().send([playerLeft(1, { eventId: 'not-a-uuid' })]);
    expect(result).toEqual({ status: 'rejected', reason: expect.stringMatching(/^HTTP 422/) });
    expect(store.events).toEqual([]);
  });

  it('should answer 400 for a signed body that is not JSON', async () => {
    const body = '{"producer":';
    const response = await POST(new Request(ENDPOINT, {
      method: 'POST',
      headers: {
        [TELEMETRY_HEADERS.SIGNATURE]: await signTelemetryRequest(SECRET, NOW, body),
        [TELEMETRY_HEADERS.TIMESTAMP]: String(NOW),
      },
      body,
    }));
    expect(response.status).toBe(400);
  });

  it('should answer 503 while the store is down, which the worker retries', async () => {
    store.available = false;
    const result = await workerTransport().send([playerLeft(1)]);
    expect(result).toEqual({ status: 'retry', reason: expect.stringMatching(/^HTTP 503/) });
  });

  it('should answer 503 without an ingest secret, storing nothing', async () => {
    vi.stubEnv('TELEMETRY_INGEST_SECRET', '');
    const result = await workerTransport().send([playerLeft(1)]);
    expect(result).toEqual({ status: 'retry', reason: expect.stringMatching(/^HTTP 503/) });
    expect(store.events).toEqual([]);
  });

  it('should refuse an oversized chunked body with 413 without reading it to the end', async () => {
    const CHUNK_BYTES = 100_000;
    const CHUNKS = Math.ceil((2 * TELEMETRY_LIMITS.MAX_BODY_BYTES) / CHUNK_BYTES);
    let pulled = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled === CHUNKS) return controller.close();
        pulled++;
        controller.enqueue(new Uint8Array(CHUNK_BYTES).fill(0x20));
      },
    });
    // A chunked upload declares no Content-Length, so only reading can find out its size.
    const response = await POST(new Request(ENDPOINT, { method: 'POST', body: stream, duplex: 'half' } as RequestInit));
    expect(response.status).toBe(413);
    expect(pulled).toBeLessThan(CHUNKS);
  });
});
