import { describe, expect, it } from 'vitest';

import type { AnyClientTelemetryEnvelope, DeviceProfile } from '@shared/telemetry';

import { buildClientSessionRows } from './client-session-projection';

const SESSION = '01900000-0000-7000-8000-0000000000aa';
const context = { receivedAt: 5_000, country: 'DE', userAgent: 'request-ua' };

const profile: DeviceProfile = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1',
  uaBrands: null, uaMobile: null, uaPlatform: null, uaPlatformVersion: null, uaModel: null, uaArchitecture: null,
  language: 'de-DE', languages: ['de-DE'], timezone: 'Europe/Berlin',
  screenWidth: 393, screenHeight: 852, viewportWidth: 393, viewportHeight: 659, devicePixelRatio: 3,
  hardwareConcurrency: 6, deviceMemory: null, maxTouchPoints: 5,
  connectionType: null, connectionRttMs: null, connectionDownlinkMbps: null, saveData: null,
  prefersReducedMotion: false, colorScheme: 'dark', webglVendor: 'Apple Inc.', webglRenderer: 'Apple GPU', referrerOrigin: null,
};

function envelope(partial: Partial<AnyClientTelemetryEnvelope>): AnyClientTelemetryEnvelope {
  return {
    eventId: '01900000-0000-7000-8000-000000000001',
    type: 'webgl.context',
    occurredAt: 1_000,
    sessionId: SESSION,
    playerId: null,
    roomId: null,
    page: '/',
    appVersion: 'v1',
    payload: { state: 'lost' },
    ...partial,
  } as AnyClientTelemetryEnvelope;
}

describe('buildClientSessionRows', () => {
  it('folds a batch into one row per session with the parsed device profile', () => {
    const rows = buildClientSessionRows([
      envelope({ type: 'session.started', occurredAt: 1_000, payload: profile }),
      envelope({ occurredAt: 3_000, playerId: 'player-1-abc', appVersion: 'v2' }),
      envelope({ occurredAt: 2_000 }),
      envelope({ sessionId: '01900000-0000-7000-8000-0000000000bb', occurredAt: 4_000 }),
    ], context);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      session_id: SESSION,
      first_seen: 1_000,
      last_seen: 3_000,
      player_id: 'player-1-abc',
      app_version: 'v2',
      browser: 'Safari',
      os: 'iOS',
      device_type: 'mobile',
      screen_width: 393,
      device_pixel_ratio: 3,
      cpu_cores: 6,
      gpu_renderer: 'Apple GPU',
      language: 'de-DE',
      timezone: 'Europe/Berlin',
      country: 'DE',
      user_agent: 'request-ua',
    });
  });

  it('leaves profile columns null for sessions without session.started in the batch', () => {
    const [row] = buildClientSessionRows([envelope({})], context);
    expect(row).toMatchObject({ browser: null, device_type: null, screen_width: null, country: 'DE' });
  });

  it('applies client hints from the device profile', () => {
    const windows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    const [row] = buildClientSessionRows(
      [
        envelope({
          type: 'session.started',
          payload: {
            ...profile,
            userAgent: windows,
            maxTouchPoints: 0,
            uaBrands: [{ brand: 'Google Chrome', version: '130' }],
            uaPlatform: 'Windows',
            uaPlatformVersion: '15.0.0',
            uaMobile: false,
          },
        }),
      ],
      context
    );
    expect(row).toMatchObject({ browser: 'Chrome', browser_version: '130', os: 'Windows', os_version: '11', device_type: 'desktop' });
  });
});
