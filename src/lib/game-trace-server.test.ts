import { describe, expect, it } from 'vitest';

import { sanitizeGameTracePayload } from './game-trace-server';

describe('sanitizeGameTracePayload', () => {
  it('keeps trace fields needed to correlate a game move', () => {
    expect(sanitizeGameTracePayload({
      type: 'ws.event',
      severity: 'warn',
      roomId: 'abc123',
      playerId: 'player-1',
      eventType: 'CARD_PLAYED',
      requestId: 'req-1',
      lagMs: 2400,
      details: { cardCount: 2 },
    })).toEqual({
      type: 'ws.event',
      severity: 'warn',
      roomId: 'abc123',
      playerId: 'player-1',
      eventType: 'CARD_PLAYED',
      commandType: undefined,
      cardId: undefined,
      requestId: 'req-1',
      serverTimestamp: undefined,
      clientTimestamp: undefined,
      traceSessionId: undefined,
      lagMs: 2400,
      replayedCardCount: undefined,
      reason: undefined,
      visibilityState: undefined,
      online: undefined,
      details: { cardCount: 2 },
    });
  });

  it('rejects malformed payloads', () => {
    expect(sanitizeGameTracePayload(null)).toBeNull();
    expect(sanitizeGameTracePayload({ type: '' })).toBeNull();
  });
});
