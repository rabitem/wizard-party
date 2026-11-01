import { describe, expect, it } from 'vitest';

import { CLIENT_TELEMETRY_LIMITS } from './client-telemetry';
import { parseClientTelemetryBatch } from './client-telemetry-schema';

const NOW = 1_700_000_000_000;

function event(overrides: Record<string, unknown> = {}) {
  return {
    eventId: '01900000-0000-7000-8000-000000000001',
    type: 'web_vital',
    occurredAt: NOW,
    sessionId: '01900000-0000-7000-8000-0000000000aa',
    playerId: 'player-1700000000000-abc1234',
    roomId: 'ABCD',
    page: '/game/ABCD',
    appVersion: 'abc123',
    payload: { name: 'LCP', value: 1200 },
    ...overrides,
  };
}

describe('parseClientTelemetryBatch', () => {
  it('accepts a valid batch', () => {
    const result = parseClientTelemetryBatch({ sentAt: NOW, events: [event()] }, NOW);
    expect(result).toEqual({ ok: true, events: [event()], rejected: 0 });
  });

  it('rejects malformed batches', () => {
    expect(parseClientTelemetryBatch({ events: [event()] }, NOW).ok).toBe(false);
    expect(parseClientTelemetryBatch({ sentAt: NOW, events: [] }, NOW).ok).toBe(false);
    expect(parseClientTelemetryBatch('nope', NOW).ok).toBe(false);
    const tooMany = Array.from({ length: CLIENT_TELEMETRY_LIMITS.MAX_EVENTS_PER_BATCH + 1 }, () => event());
    expect(parseClientTelemetryBatch({ sentAt: NOW, events: tooMany }, NOW).ok).toBe(false);
  });

  it('drops invalid events individually and counts them', () => {
    const result = parseClientTelemetryBatch({
      sentAt: NOW,
      events: [
        event(),
        event({ eventId: 'not-a-uuid' }),
        event({ type: 'unknown.type' }),
        event({ sessionId: 'abc' }),
        event({ payload: 'string' }),
        event({ page: 'x'.repeat(CLIENT_TELEMETRY_LIMITS.MAX_PAGE_CHARS + 1) }),
        event({ payload: { blob: 'x'.repeat(CLIENT_TELEMETRY_LIMITS.MAX_EVENT_BYTES) } }),
        event({ occurredAt: NOW - CLIENT_TELEMETRY_LIMITS.MAX_CLOCK_SKEW_MS - 1 }),
      ],
    }, NOW);
    expect(result).toMatchObject({ ok: true, rejected: 7 });
    if (result.ok) expect(result.events).toHaveLength(1);
  });

  it('accepts null player and room ids', () => {
    const result = parseClientTelemetryBatch({ sentAt: NOW, events: [event({ playerId: null, roomId: null })] }, NOW);
    expect(result).toMatchObject({ ok: true, rejected: 0 });
  });

  describe('session.started', () => {
    const profile = {
      userAgent: 'Mozilla/5.0',
      uaBrands: [{ brand: 'Chromium', version: '130' }],
      uaPlatform: 'Windows',
      screenWidth: 1920,
      devicePixelRatio: 1.25,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      colorScheme: 'dark',
      futureField: { anything: true },
    };
    const started = (payload: Record<string, unknown>) => event({ type: 'session.started', payload });

    it('accepts a typed profile, partial profiles and unknown additive fields', () => {
      const result = parseClientTelemetryBatch({ sentAt: NOW, events: [started(profile), started({ userAgent: 'UA' })] }, NOW);
      expect(result).toMatchObject({ ok: true, rejected: 0 });
      if (result.ok) expect(result.events[0].payload).toEqual(profile);
    });

    it('drops profiles whose fields would break the typed session columns', () => {
      const malformed = [
        { uaBrands: 'x' },
        { uaPlatform: 1 },
        { screenWidth: 1.5 },
        { screenWidth: 'abc' },
        { hardwareConcurrency: 99_999 },
        { devicePixelRatio: -1 },
        { colorScheme: 'sepia' },
        { languages: ['de', 7] },
      ];
      const result = parseClientTelemetryBatch({ sentAt: NOW, events: [event(), ...malformed.map(started)] }, NOW);
      expect(result).toMatchObject({ ok: true, rejected: malformed.length });
      if (result.ok) expect(result.events).toHaveLength(1);
    });
  });
});
