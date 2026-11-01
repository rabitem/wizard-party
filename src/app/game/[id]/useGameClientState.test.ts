import { describe, expect, it } from 'vitest';

import { checkIsTrickAnimationPending, resolvePlayableCardIds, shouldSendCardPlay } from './useGameClientState';

describe('game client card play guard', () => {
  it('blocks stale or illegal card play attempts before they hit the socket', () => {
    expect(shouldSendCardPlay({
      cardId: 'card-1',
      playableCardIds: ['card-2'],
      isWaitingForTrickResult: false,
    })).toBe(false);

    expect(shouldSendCardPlay({
      cardId: 'card-1',
      playableCardIds: ['card-1'],
      isWaitingForTrickResult: true,
    })).toBe(false);
  });

  it('allows only currently playable cards when no trick result is pending', () => {
    expect(shouldSendCardPlay({
      cardId: 'card-1',
      playableCardIds: ['card-1'],
      isWaitingForTrickResult: false,
    })).toBe(true);
  });

  it('keeps plays blocked while a completed trick is still landing, before its result is active', () => {
    const result = { winnerId: 'player-2', winnerName: 'Morgana', timestamp: 1 };

    expect(checkIsTrickAnimationPending({ isTrickAnimating: true, trickResult: null, pendingTrickResult: result })).toBe(true);
    expect(checkIsTrickAnimationPending({ isTrickAnimating: true, trickResult: result, pendingTrickResult: null })).toBe(true);
    expect(checkIsTrickAnimationPending({ isTrickAnimating: false, trickResult: null, pendingTrickResult: null })).toBe(false);
  });

  it('offers no card while earlier cards of the trick still wait for their flight', () => {
    expect(resolvePlayableCardIds({ legalCardIds: ['card-1'], isWaitingForTrickResult: false, trickBacklog: 1 })).toEqual([]);
    expect(resolvePlayableCardIds({ legalCardIds: ['card-1'], isWaitingForTrickResult: true, trickBacklog: 0 })).toEqual([]);
    expect(resolvePlayableCardIds({ legalCardIds: ['card-1'], isWaitingForTrickResult: false, trickBacklog: 0 })).toEqual(['card-1']);
  });
});
