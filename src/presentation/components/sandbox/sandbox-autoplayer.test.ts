import { describe, expect, it } from 'vitest';
import { SANDBOX_DEFAULT_TRUMP_SUIT, SandboxAutoplayer } from './sandbox-autoplayer';
import type { SandboxClock, SandboxGameHandles } from './sandbox.types';

function handles(overrides: Partial<SandboxGameHandles>, calls: string[]): SandboxGameHandles {
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
    playCard: (cardId) => {
      calls.push(`play:${cardId}`);
    },
    shuffle: () => {},
    sort: () => {},
    placeBid: (bid) => {
      calls.push(`bid:${bid}`);
    },
    nextRound: () => {
      calls.push('next-round');
    },
    selectTrump: (suit) => {
      calls.push(`trump:${suit}`);
    },
    takeOverSeat: () => {},
    ...overrides,
  };
}

function clockTicks() {
  const listeners = new Set<(now: number, frame: number) => void>();
  const clock: Pick<SandboxClock, 'onFrame'> = {
    onFrame(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  return { clock, tick: () => listeners.forEach(listener => listener(0, 0)) };
}

describe('SandboxAutoplayer', () => {
  it('should name trump once when a Wizard turns up on its own deal', () => {
    const calls: string[] = [];
    const autoplayer = new SandboxAutoplayer(() => true);
    const choosing = handles({ phase: 'TRUMP_SELECTION' }, calls);
    autoplayer.act(choosing);
    autoplayer.act(choosing);
    expect(calls).toEqual([`trump:${SANDBOX_DEFAULT_TRUMP_SUIT}`]);
  });

  it('should leave trump to the dealer when it does not deal', () => {
    const calls: string[] = [];
    new SandboxAutoplayer(() => true).act(handles({ phase: 'TRUMP_SELECTION', isLocalTurn: false }, calls));
    expect(calls).toEqual([]);
  });

  it('should bid a legal amount and play a playable card on its turns', () => {
    const calls: string[] = [];
    const autoplayer = new SandboxAutoplayer(() => true);
    autoplayer.act(handles({ phase: 'BIDDING', forbiddenBid: 0 }, calls));
    autoplayer.act(handles({ phase: 'PLAYING' }, calls));
    expect(calls).toEqual(['bid:1', 'play:A']);
  });

  it('should start the next round only once the table is idle', () => {
    const calls: string[] = [];
    let idle = false;
    const autoplayer = new SandboxAutoplayer(() => idle);
    const roundEnd = handles({ phase: 'ROUND_END', isLocalTurn: false }, calls);
    autoplayer.act(roundEnd);
    idle = true;
    autoplayer.act(roundEnd);
    expect(calls).toEqual(['next-round']);
  });
  it('notices a bidding turn on clock ticks even when no GPU frame is drawn', () => {
    const calls: string[] = [];
    const { clock, tick } = clockTicks();
    const autoplayer = new SandboxAutoplayer(() => true);
    let state = handles({ phase: 'BIDDING' }, calls);
    const stop = autoplayer.watch(clock, () => state);
    tick();
    expect(calls).toEqual([]);
    autoplayer.setEnabled(true);
    tick(); tick();
    expect(calls).toEqual(['bid:0']);
    stop();
    state = handles({ phase: 'PLAYING' }, calls);
    tick();
    expect(calls).toEqual(['bid:0']);
  });

  it('lets the scenario observe round end and pause before starting its measured round', async () => {
    const calls: string[] = [];
    const { clock, tick } = clockTicks();
    const autoplayer = new SandboxAutoplayer(() => true);
    const state = handles({ phase: 'ROUND_END', localHand: [] }, calls);
    autoplayer.watch(clock, () => state);
    autoplayer.setEnabled(true);
    let release!: () => void;
    const observed = autoplayer.observeRoundEnd(true, () => new Promise<void>(resolve => { release = resolve; }));
    tick();
    expect(calls).toEqual([]);
    release();
    await observed;
    autoplayer.setEnabled(false);
    tick();
    expect(calls).toEqual([]);
    autoplayer.setEnabled(true);
    tick(); tick();
    expect(calls).toEqual(['next-round']);
  });

});
