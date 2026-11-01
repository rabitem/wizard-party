import { describe, expect, it, vi } from 'vitest';

import { GamePhase, type IGameState } from '@shared/domain';

import { TrickPresentation, type TrickCompleteInput } from './trick-presentation';
import { OPPONENT, collectTrick, completedTrick, frozenIds, landTrick, played, state, trickComplete, visibleIds } from './test-support/trick-fixtures';

/** The trick lifecycle: completion, freeze, collection, deferral, dedupe, recovery and resets. */
describe('TrickPresentation', () => {
  it('should never change the server state and freeze the completed trick on the table instead', () => {
    const presentation = new TrickPresentation();
    const server = state(['card-1', 'card-2']);
    const snapshot = structuredClone(server);
    presentation.applySnapshot(null, server, 1, OPPONENT);

    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2'], server));
    const nextTrick = state(['card-3']);
    presentation.applySnapshot(server, nextTrick, 2, OPPONENT);

    expect(server).toEqual(snapshot);
    expect(frozenIds(presentation)).toEqual(['card-1', 'card-2']);
    expect(presentation.getState().pendingTrickResult?.winnerId).toBe('player-2');
  });

  it('should catch up with the latest snapshot after the collection, without asking the server', () => {
    const presentation = new TrickPresentation();
    const first = state(['card-1', 'card-2']);
    presentation.applySnapshot(null, first, 1, OPPONENT);
    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2'], first));
    presentation.cardPlayed({ cardId: 'card-3', soundChoice: 'jester' });
    presentation.applySnapshot(first, state(['card-3']), 2, OPPONENT);
    expect(presentation.getState().visiblePlayedCardIds.has('card-3')).toBe(false);

    landTrick(presentation, ['card-1', 'card-2']);
    presentation.allCardsLanded();
    expect(presentation.getState().trickResult?.winnerId).toBe('player-2');
    presentation.trickCollected();

    const view = presentation.getState();
    expect(view.frozenTrick).toBeNull();
    expect(view.trickResult).toBeNull();
    expect(view.visiblePlayedCardIds.has('card-3')).toBe(true);
    expect(presentation.getCardSoundChoice('card-3')).toBe('jester');
    expect(presentation.getCardSoundChoice('card-1')).toBeNull();
  });

  it('should not fly a collected trick again while the server still shows it (round end)', () => {
    const presentation = new TrickPresentation();
    const last = state(['card-1', 'card-2']);
    presentation.applySnapshot(null, last, 1, OPPONENT);
    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2'], last));
    collectTrick(presentation, ['card-1', 'card-2']);

    presentation.applySnapshot(last, state(['card-1', 'card-2'], { phase: GamePhase.ROUND_END }), 2, OPPONENT);

    expect(presentation.getState().visiblePlayedCardIds.size).toBe(0);
  });

  it('should defer a trick that completes while the previous one is presented and start it after collection', () => {
    const presentation = new TrickPresentation();
    const first = state(['card-1', 'card-2']);
    presentation.applySnapshot(null, first, 1, OPPONENT);
    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2'], first));
    landTrick(presentation, ['card-1', 'card-2']);
    presentation.allCardsLanded();

    // Delivered twice (a resend after a reconnect): it is still presented once.
    presentation.trickCompleted(trickComplete(1, ['card-3', 'card-4'], first));
    presentation.trickCompleted(trickComplete(1, ['card-3', 'card-4'], first));
    expect(presentation.getState().trickResult?.timestamp).toBe(1);

    presentation.applySnapshot(first, state([]), 2, OPPONENT);
    presentation.trickCollected();

    const view = presentation.getState();
    expect(view.pendingTrickResult?.timestamp).toBe(2);
    expect(frozenIds(presentation)).toEqual(['card-3', 'card-4']);
    expect(view.visiblePlayedCardIds.has('card-3')).toBe(true);
    expect(view.visiblePlayedCardIds.has('card-4')).toBe(false);

    collectTrick(presentation, ['card-3', 'card-4']);
    expect(presentation.getState().pendingTrickResult).toBeNull();
    expect(presentation.getState().trickResult).toBeNull();
    expect(presentation.isBusy()).toBe(false);
  });

  it('should ignore a duplicate of the trick that is already presented', () => {
    const presentation = new TrickPresentation();
    const server = state(['card-1', 'card-2']);
    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2'], server));
    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2'], server));
    presentation.allCardsLanded();
    presentation.trickCollected();

    expect(presentation.getState().pendingTrickResult).toBeNull();
    expect(presentation.isBusy()).toBe(false);
  });

  const roundOne = state([]);
  const roundTwo = state([], { currentRound: 2 });
  const legacy = (input: TrickCompleteInput): TrickCompleteInput => ({ ...input, trickCards: undefined, trickIndex: undefined, timestamp: 100 });
  it.each<[string, TrickCompleteInput, TrickCompleteInput, boolean]>([
    ['the same cards in another order', { ...trickComplete(0, ['card-1', 'card-2'], roundOne), trickIndex: undefined }, { ...trickComplete(0, ['card-2', 'card-1'], roundOne), trickIndex: undefined }, false],
    ['the same trick index without cards', trickComplete(1, ['card-1', 'card-2'], roundOne), { ...trickComplete(1, [], roundOne), trickCards: undefined }, false],
    ['the same timestamp of a server that sends neither index nor cards', legacy(trickComplete(0, [], roundOne)), legacy(trickComplete(0, [], roundOne)), false],
    ['other cards won by the same player', { ...trickComplete(0, ['card-1', 'card-2'], roundOne), trickIndex: undefined }, { ...trickComplete(0, ['card-3', 'card-4'], roundOne), trickIndex: undefined }, true],
    ['the same trick index in the next round', trickComplete(0, ['card-1', 'card-2'], roundOne), trickComplete(0, ['card-1', 'card-2'], roundTwo), true],
  ])('should present each completed trick once: a TRICK_COMPLETE with %s', (_case, first, repeat, presentedAgain) => {
    const presentation = new TrickPresentation();
    presentation.trickCompleted(first);
    expect(presentation.getState().pendingTrickResult).not.toBeNull();
    presentation.allCardsLanded();
    presentation.trickCollected();

    presentation.trickCompleted(repeat);

    expect(presentation.getState().pendingTrickResult !== null).toBe(presentedAgain);
  });

  it('should freeze the completed trick with every card of TRICK_COMPLETE when the snapshot held only part of it', () => {
    const presentation = new TrickPresentation();
    const partial = state(['card-1', 'card-2']);
    presentation.applySnapshot(null, partial, 1, OPPONENT);

    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2', 'card-3'], partial));

    expect(frozenIds(presentation)).toEqual(['card-1', 'card-2', 'card-3']);
  });

  it('should recover the frozen trick from completedTricks when TRICK_COMPLETE carried no cards', () => {
    const presentation = new TrickPresentation();
    const before = state([]);
    presentation.applySnapshot(null, before, 1, OPPONENT);
    presentation.trickCompleted({ ...trickComplete(0, [], before), trickCards: undefined });

    const after = state([], { completedTricks: [completedTrick(['card-1', 'card-2', 'card-3'])] } as Partial<IGameState>);
    const report = presentation.applySnapshot(before, after, 2, OPPONENT);

    expect(frozenIds(presentation)).toEqual(['card-1', 'card-2', 'card-3']);
    // The snapshot completes the trick that is presented; it is not a missed one.
    expect(report.recoveredMissedTrick).toBe(false);
  });

  it('should recover a trick completion it missed while away from the next snapshot', () => {
    const presentation = new TrickPresentation();
    const before = state(['card-1']);
    presentation.applySnapshot(null, before, 1, OPPONENT);
    const after = state([], { completedTricks: [completedTrick(['card-1', 'card-2'])] } as Partial<IGameState>);

    const report = presentation.applySnapshot(before, after, 2, OPPONENT);

    expect(report.recoveredMissedTrick).toBe(true);
    expect(presentation.getState().pendingTrickResult?.winnerName).toBe('Morgana');
    expect(presentation.getState().frozenTrick?.cards).toHaveLength(2);
  });

  it('should queue a missed trick completion behind the trick that is presented, and never repeat it', () => {
    const presentation = new TrickPresentation();
    const first = state(['card-1', 'card-2']);
    presentation.applySnapshot(null, first, 1, OPPONENT);
    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2'], first));
    const completed = (cardIds: string[][]) => cardIds.map((ids) => ({ cards: played(ids), leadSuit: null, winnerId: 'player-2' }));

    const afterFirst = state([], { completedTricks: completed([['card-1', 'card-2']]) } as Partial<IGameState>);
    expect(presentation.applySnapshot(first, afterFirst, 2, OPPONENT).recoveredMissedTrick).toBe(false);
    const afterSecond = state([], { completedTricks: completed([['card-1', 'card-2'], ['card-3', 'card-4']]) } as Partial<IGameState>);
    expect(presentation.applySnapshot(afterFirst, afterSecond, 3, OPPONENT).recoveredMissedTrick).toBe(true);
    expect(frozenIds(presentation)).toEqual(['card-1', 'card-2']);

    collectTrick(presentation, ['card-1', 'card-2']);

    expect(frozenIds(presentation)).toEqual(['card-3', 'card-4']);
    expect(presentation.getState().pendingTrickResult?.winnerId).toBe('player-2');
  });

  it('should not replay completed tricks on the first snapshot of a visit', () => {
    const presentation = new TrickPresentation();
    const joined = state([], { completedTricks: [completedTrick(['card-1', 'card-2'])] } as Partial<IGameState>);

    const report = presentation.applySnapshot(null, joined, 1, OPPONENT);

    expect(report.recoveredMissedTrick).toBe(false);
    expect(presentation.getState().pendingTrickResult).toBeNull();
    expect(presentation.getState().frozenTrick).toBeNull();
  });

  it('should forget card sounds, landings and the presented trick of the previous round', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);
    presentation.cardPlayed({ cardId: 'card-1', soundChoice: 'jester' });
    const roundEnd = state(['card-1', 'card-2', 'card-3', 'card-4']);
    // A backlog of four: card-1 and card-2 land at rest at once.
    presentation.applySnapshot(state([]), roundEnd, 2, OPPONENT);
    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2', 'card-3', 'card-4'], roundEnd));
    expect(presentation.isAnimatedCard('card-1')).toBe(false);

    // Card ids repeat every round: card-1 is a new card of round 2.
    presentation.applySnapshot(roundEnd, state(['card-1'], { currentRound: 2 }), 3, OPPONENT);

    const view = presentation.getState();
    expect(view.pendingTrickResult).toBeNull();
    expect(view.frozenTrick).toBeNull();
    expect(visibleIds(presentation)).toEqual(['card-1']);
    expect(presentation.isAnimatedCard('card-1')).toBe(true);
    expect(presentation.getCardSoundChoice('card-1')).toBeNull();
  });

  it('should not collect a replayed trick while one of its cards still waits to fly', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);
    const replayed = state(['card-1', 'card-2', 'card-3', 'card-4']);
    presentation.applySnapshot(state([]), replayed, 2, OPPONENT);
    presentation.trickCompleted(trickComplete(0, ['card-1', 'card-2', 'card-3', 'card-4'], replayed));

    // The table reports on what it shows (two rested, one flying); card-4 is still queued.
    presentation.allCardsLanded();
    expect(presentation.getState().trickResult).toBeNull();

    landTrick(presentation, ['card-3', 'card-4']);
    presentation.allCardsLanded();
    expect(presentation.getState().trickResult?.winnerId).toBe('player-2');
  });

  it('should drop every trace of a trick on reset and notify subscribers once per change', () => {
    const presentation = new TrickPresentation();
    const server = state(['card-1', 'card-2']);
    presentation.applySnapshot(null, server, 1, OPPONENT);
    const listener = vi.fn();
    presentation.subscribe(listener);
    presentation.trickCompleted(trickComplete(4, ['card-1', 'card-2'], server));

    presentation.reset({ forgetPresentedTricks: true });
    presentation.reset();

    const view = presentation.getState();
    expect(view.pendingTrickResult).toBeNull();
    expect(view.isTrickAnimating).toBe(false);
    expect(view.visiblePlayedCardIds.size).toBe(0);
    expect(view.backlog).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
