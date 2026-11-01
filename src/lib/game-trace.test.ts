import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const telemetry = vi.hoisted(() => ({
  enabled: false,
  isEnabled: vi.fn(() => telemetry.enabled),
  track: vi.fn(),
}));

vi.mock('./client-telemetry/browser-client-telemetry', () => ({ clientTelemetry: telemetry }));

import { recordGameTrace, type GameTraceEvent } from './game-trace';

const MOVE = { type: 'ws.command', severity: 'debug', commandType: 'PLAY_CARD', requestId: 'req-1', cardId: 'c-1' } as const;

describe('recordGameTrace forwarding', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
    // Warnings and errors are also echoed to the console; keep the test output clean.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    telemetry.track.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('persists the trace as client telemetry with consent', () => {
    telemetry.enabled = true;
    recordGameTrace(MOVE);
    expect(telemetry.track).toHaveBeenCalledWith('game.trace', expect.objectContaining({
      traceType: 'ws.command',
      commandType: 'PLAY_CARD',
      requestId: 'req-1',
      cardId: 'c-1',
    }));
  });

  it.each<[string, GameTraceEvent, boolean]>([
    ['forwards warnings', { type: 'ws.event', severity: 'warn' }, true],
    ['forwards errors', { type: 'ws.event', severity: 'error' }, true],
    ['forwards animation replay markers', { type: 'animation.replay.current_trick', severity: 'info' }, true],
    ['forwards game move events', { type: 'ws.event', severity: 'debug', eventType: 'CARD_PLAYED' }, true],
    ['forwards game move commands', { type: 'ws.command', severity: 'debug', commandType: 'PLAY_CARD' }, true],
    ['keeps ordinary debug traffic local', { type: 'ws.event', severity: 'debug' }, false],
  ])('with consent, %s', (_label, event, forwarded) => {
    telemetry.enabled = true;
    recordGameTrace(event);
    expect(telemetry.track).toHaveBeenCalledTimes(forwarded ? 1 : 0);
  });

  it('keeps traces in the browser without consent', () => {
    telemetry.enabled = false;
    recordGameTrace(MOVE);
    recordGameTrace({ type: 'ws.event', severity: 'error' });
    expect(telemetry.track).not.toHaveBeenCalled();
  });
});
