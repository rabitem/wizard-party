import { describe, expect, it } from 'vitest';
import { AnimationAuditRecorder } from './animation-audit-recorder';
import { canPlayLocally, createWaitCondition, isSandboxIdle, isSandboxReady, type WaitConditionContext } from './sandbox-conditions';
import type { SandboxGameHandles, SandboxServer } from './sandbox.types';

function handles(overrides: Partial<SandboxGameHandles> = {}): SandboxGameHandles {
  return {
    isConnected: true,
    phase: 'PLAYING',
    localHand: [{ id: 'A', type: 'NUMBER', suit: 'GIANTS', value: 3 }],
    playableCardIds: ['A'],
    isLocalTurn: true,
    forbiddenBid: null,
    trickResult: false,
    pendingTrickResult: false,
    isTrickAnimating: false,
    handAnimation: 'none',
    queuedPlayedCards: 0,
    opponents: [],
    playCard: () => {},
    shuffle: () => {},
    sort: () => {},
    placeBid: () => {},
    nextRound: () => {},
    selectTrump: () => {},
    takeOverSeat: () => {},
    ...overrides,
  };
}

describe('canPlayLocally', () => {
  it('should allow a play on the local turn with a playable card', () => {
    expect(canPlayLocally(handles())).toBe(true);
  });

  it('should respect the UI input lock while a trick result is pending or animating', () => {
    expect(canPlayLocally(handles({ pendingTrickResult: true }))).toBe(false);
    expect(canPlayLocally(handles({ trickResult: true }))).toBe(false);
    expect(canPlayLocally(handles({ isTrickAnimating: true }))).toBe(false);
  });

  it('should refuse outside the local turn or the playing phase', () => {
    expect(canPlayLocally(handles({ isLocalTurn: false }))).toBe(false);
    expect(canPlayLocally(handles({ phase: 'BIDDING' }))).toBe(false);
    expect(canPlayLocally(null)).toBe(false);
  });
});

describe('createWaitCondition', () => {
  it('should wait for the next collection, not one that already happened', () => {
    let collections = 3;
    const context: WaitConditionContext = {
      handles: () => handles(),
      server: () => null,
      recorder: () => null,
      isIdle: () => false,
      collectCompletions: () => collections,
      landedCompletions: () => 0,
      reconnected: () => false,
    };
    const collected = createWaitCondition('trick-collected', context);
    expect(collected()).toBe(false);
    collections++;
    expect(collected()).toBe(true);
  });
});

function server(overrides: Partial<SandboxServer> = {}): SandboxServer {
  return {
    socketFactory: () => { throw new Error('not used'); },
    localPlayerId: 'local',
    hasPendingDeliveries: false,
    isBotTurnScheduled: false,
    isConnected: true,
    setNetwork: () => {},
    setBotPacing: () => {},
    stall: () => {},
    dropConnection: () => {},
    broadcastState: () => {},
    playBot: () => false,
    dispose: () => {},
    ...overrides,
  };
}

describe('isSandboxIdle', () => {
  it('should be idle when nothing is queued, scheduled or animating', () => {
    expect(isSandboxIdle(handles(), server(), new AnimationAuditRecorder())).toBe(true);
  });

  it('should not be idle while messages, bots or trick animations are pending', () => {
    expect(isSandboxIdle(handles(), server({ hasPendingDeliveries: true }), null)).toBe(false);
    expect(isSandboxIdle(handles(), server({ isBotTurnScheduled: true }), null)).toBe(false);
    expect(isSandboxIdle(handles({ queuedPlayedCards: 1 }), server(), null)).toBe(false);
    expect(isSandboxIdle(handles({ handAnimation: 'shuffle' }), server(), null)).toBe(false);
    expect(isSandboxIdle(null, server(), null)).toBe(false);
  });
});

describe('isSandboxReady', () => {
  it('should wait until the scene draws every card of the hand', () => {
    const recorder = new AnimationAuditRecorder();
    expect(isSandboxReady(handles(), recorder, true)).toBe(false);
    recorder.frame(16, [{
      name: 'hand-card:A', kind: 'hand-card', cardId: 'A', position: [0, 0, 0], cameraPosition: [0, 0, 0],
      quaternion: [0, 0, 0, 1], scale: 1, visible: true, finite: true, ndc: null,
    }], { handAnimating: false });
    expect(isSandboxReady(handles(), recorder, true)).toBe(true);
    expect(isSandboxReady(handles(), recorder, false)).toBe(false);
  });
});
