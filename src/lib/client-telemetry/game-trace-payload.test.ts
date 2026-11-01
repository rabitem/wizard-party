import { describe, expect, it } from 'vitest';

import { toGameTracePayload } from './game-trace-payload';

describe('toGameTracePayload', () => {
  it('maps a game trace entry to a bounded game.trace payload', () => {
    const payload = toGameTracePayload({
      type: 'ws.command',
      severity: 'debug',
      clientTimestamp: 1,
      traceSessionId: 'trace-1',
      commandType: 'PLAY_CARD',
      requestId: 'req-1',
      cardId: 'card-1',
      details: { hasCustomAudio: true, note: 'x'.repeat(1_000) },
    });
    expect(payload).toMatchObject({
      traceType: 'ws.command',
      severity: 'debug',
      traceSessionId: 'trace-1',
      commandType: 'PLAY_CARD',
      requestId: 'req-1',
      cardId: 'card-1',
      eventType: null,
      lagMs: null,
    });
    expect((payload?.details?.note as string).length).toBeLessThan(1_000);
  });
});
