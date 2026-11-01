import { describe, expect, it } from 'vitest';

import { TrickPresentation } from './trick-presentation';
import { OPPONENT, collectTrick, state, trickComplete, visibleIds } from './test-support/trick-fixtures';

/**
 * Card flights: opponents' cards fly one after another in trick order, a backlog is placed at
 * rest (TRICK_PRESENTATION.MAX_FLIGHT_BACKLOG flights at live pace, the one in the air included),
 * and the local player's own card answers at once.
 */
describe('TrickPresentation flights', () => {
  it('should place a reconnect backlog at rest and fly only the newest cards', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);

    const report = presentation.applySnapshot(state([]), state(['card-1', 'card-2', 'card-3', 'card-4']), 2, OPPONENT);

    expect(report.replayedCardCount).toBe(4);
    expect(visibleIds(presentation)).toEqual(['card-1', 'card-2', 'card-3']);
    expect(presentation.isAnimatedCard('card-1')).toBe(false);
    expect(presentation.isAnimatedCard('card-3')).toBe(true);
    expect(presentation.getState().backlog).toBe(1);
  });

  it('should count the card in flight against the catch-up backlog', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);
    presentation.applySnapshot(state([]), state(['card-1']), 2, OPPONENT);

    presentation.applySnapshot(state(['card-1']), state(['card-1', 'card-2', 'card-3']), 3, OPPONENT);

    expect(visibleIds(presentation)).toEqual(['card-1', 'card-2']);
    expect(presentation.isAnimatedCard('card-2')).toBe(false);
    expect(presentation.getState().backlog).toBe(1);
  });

  it('should show the whole trick at once when it is the local player\'s turn', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, 'player-1');

    presentation.applySnapshot(state([]), state(['card-1', 'card-2', 'card-3']), 2, 'player-1');

    expect(presentation.getState().backlog).toBe(0);
    expect(presentation.getState().visiblePlayedCardIds.size).toBe(3);
  });

  it('should release opponent cards one at a time, each after the previous one landed', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);
    presentation.cardPlayed({ cardId: 'card-1' });
    presentation.applySnapshot(state([]), state(['card-1']), 2, OPPONENT);
    presentation.cardPlayed({ cardId: 'card-2' });
    presentation.applySnapshot(state(['card-1']), state(['card-1', 'card-2']), 3, OPPONENT);

    expect(visibleIds(presentation)).toEqual(['card-1']);
    expect(presentation.getState().backlog).toBe(1);

    presentation.playedCardLanded('card-1');

    expect(visibleIds(presentation)).toEqual(['card-1', 'card-2']);
    expect(presentation.isAnimatedCard('card-2')).toBe(true);
    expect(presentation.getState().backlog).toBe(0);
  });

  it('should not report cards announced by CARD_PLAYED as replayed when their snapshot arrives', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);
    presentation.cardPlayed({ cardId: 'card-1' });

    const report = presentation.applySnapshot(state([]), state(['card-1']), 2, OPPONENT);

    expect(report.replayedCardCount).toBe(0);
    expect(visibleIds(presentation)).toEqual(['card-1']);
  });

  it('should keep backlog and visible cards when the same snapshot arrives twice', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);
    const twoCards = state(['card-1', 'card-2']);
    presentation.applySnapshot(state([]), twoCards, 2, OPPONENT);
    const view = presentation.getState();

    const report = presentation.applySnapshot(twoCards, state(['card-1', 'card-2']), 3, OPPONENT);

    expect(report.replayedCardCount).toBe(0);
    expect(presentation.getState()).toBe(view);
    expect(view.backlog).toBe(1);
  });

  it('should fly a trick in snapshot order even when a later card was announced first', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);
    presentation.cardPlayed({ cardId: 'card-2' });

    presentation.applySnapshot(state([]), state(['card-1', 'card-2']), 2, OPPONENT);
    expect(visibleIds(presentation)).toEqual(['card-1']);

    presentation.playedCardLanded('card-1');
    expect(visibleIds(presentation)).toEqual(['card-1', 'card-2']);
  });

  it('should fly a next-trick card announced before its predecessors after them once the presented trick is collected', () => {
    // Regression of 14f5a4a: the early card took the free slot at the trick boundary.
    const presentation = new TrickPresentation();
    const old = state(['old-1', 'old-2']);
    presentation.applySnapshot(null, old, 1, OPPONENT);
    presentation.trickCompleted(trickComplete(0, ['old-1', 'old-2'], old));
    presentation.cardPlayed({ cardId: 'giants-2' });
    const next = state(['dwarves-8', 'humans-8', 'dwarves-6', 'giants-2']);
    presentation.applySnapshot(old, next, 2, OPPONENT);
    expect(presentation.getState().visiblePlayedCardIds.has('giants-2')).toBe(false);

    collectTrick(presentation, ['old-1', 'old-2']);

    // Two flights at live pace: the oldest two land at rest, dwarves-6 flies, giants-2 waits for it.
    expect(visibleIds(presentation)).toEqual(['dwarves-8', 'humans-8', 'dwarves-6']);
    expect(presentation.isAnimatedCard('dwarves-6')).toBe(true);
    presentation.playedCardLanded('dwarves-6');
    expect(visibleIds(presentation)).toEqual(['dwarves-8', 'humans-8', 'dwarves-6', 'giants-2']);
  });

  it('should land waiting opponent cards before the local card flies, and keep it through the server echo', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state(['card-1', 'card-2']), 1, OPPONENT);
    expect(presentation.getState().backlog).toBe(1);

    presentation.cardPlayed({ cardId: 'local-card', isLocalPlayer: true });
    presentation.playedCardLanded('local-card');
    presentation.cardPlayed({ cardId: 'local-card', isLocalPlayer: true, soundChoice: 'cardImpact' });

    const view = presentation.getState();
    expect(view.backlog).toBe(0);
    expect(view.visiblePlayedCardIds.has('card-2')).toBe(true);
    expect(presentation.isAnimatedCard('card-2')).toBe(false);
    expect(presentation.getCardSoundChoice('local-card')).toBe('cardImpact');
  });

  it('should make an opponent card wait for the local card that took an idle table', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);
    presentation.cardPlayed({ cardId: 'local-card', isLocalPlayer: true });
    presentation.cardPlayed({ cardId: 'card-2' });

    presentation.applySnapshot(state([]), state(['local-card', 'card-2']), 2, OPPONENT);
    expect(visibleIds(presentation)).toEqual(['local-card']);

    presentation.playedCardLanded('local-card');
    expect(visibleIds(presentation)).toEqual(['local-card', 'card-2']);
  });

  it('should keep an unconfirmed local throw flying when a snapshot without it arrives', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state(['card-1']), 1, OPPONENT);
    presentation.playedCardLanded('card-1');
    presentation.cardPlayed({ cardId: 'local-card', isLocalPlayer: true });

    presentation.applySnapshot(state(['card-1']), state(['card-1']), 2, OPPONENT);
    expect(presentation.getState().visiblePlayedCardIds.has('local-card')).toBe(true);
    expect(presentation.isAnimatedCard('local-card')).toBe(true);

    presentation.applySnapshot(state(['card-1']), state(['card-1', 'local-card']), 3, OPPONENT);
    expect(presentation.getState().visiblePlayedCardIds.has('local-card')).toBe(true);
  });

  it('should keep a landed live card animated when the snapshot confirming it arrives, so it is never swapped for a static one', () => {
    const presentation = new TrickPresentation();
    presentation.applySnapshot(null, state([]), 1, OPPONENT);
    presentation.cardPlayed({ cardId: 'local-card', isLocalPlayer: true });
    presentation.playedCardLanded('local-card');

    presentation.applySnapshot(state([]), state(['local-card']), 2, OPPONENT);

    expect(visibleIds(presentation)).toEqual(['local-card']);
    expect(presentation.isAnimatedCard('local-card')).toBe(true);
  });

  it('should take a refused local play off the table', () => {
    const presentation = new TrickPresentation();
    presentation.cardPlayed({ cardId: 'local-card', isLocalPlayer: true });

    presentation.retractLocalPlay('local-card');

    expect(presentation.getState().visiblePlayedCardIds.has('local-card')).toBe(false);
    expect(presentation.getCardSoundChoice('local-card')).toBeNull();
  });
});
