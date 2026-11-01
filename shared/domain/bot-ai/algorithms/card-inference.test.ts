import { describe, expect, it } from 'vitest';

import type { ICard } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { createCardInferenceEngine, sampleInformedDeterminization } from './card-inference';
import { n, play, positionContext, wizard, withSeededMath, type PositionSpec } from '../bot-ai.fixtures';

/**
 * Round 3, Giants trump. Trick 1: p1 led Elves 7, p2 showed out with Dwarves 2, we won
 * with Elves 9. Trick 2 so far: p2 led Giants 4 and p1 showed out with Humans 1.
 */
const COMPLETED = [[play('p1', n(Suit.ELVES, 7)), play('p2', n(Suit.DWARVES, 2)), play('me', n(Suit.ELVES, 9))]];
const CURRENT = [play('p2', n(Suit.GIANTS, 4)), play('p1', n(Suit.HUMANS, 1))];
const HAND = [n(Suit.HUMANS, 5), n(Suit.GIANTS, 13)];
const TRUMP_CARD = n(Suit.GIANTS, 8);

function showOutPosition(overrides: Partial<PositionSpec> = {}) {
  return positionContext({
    hand: HAND,
    trumpSuit: Suit.GIANTS,
    trumpCard: TRUMP_CARD,
    completedTricks: COMPLETED,
    trick: CURRENT,
    bids: { p1: 1, p2: 0, me: 1 },
    tricksWon: { me: 1 },
    ...overrides,
  });
}

const SEEN: ICard[] = [...HAND, TRUMP_CARD, ...COMPLETED.flat().map((p) => p.card), ...CURRENT.map((p) => p.card)];

/**
 * Round 4, the same voids from finished tricks only: trick 2 went to our Giants 10 over p2's
 * Giants 4 after p1 showed out with Humans 1. We lead trick 3, so every seat still holds two cards.
 */
const LEADING_TRICKS = [
  ...COMPLETED,
  [play('me', n(Suit.GIANTS, 10)), play('p1', n(Suit.HUMANS, 1)), play('p2', n(Suit.GIANTS, 4))],
];
const CARDS_LEFT_EACH = 2;
const leadingPosition = () =>
  positionContext({
    hand: HAND,
    trumpSuit: Suit.GIANTS,
    trumpCard: TRUMP_CARD,
    completedTricks: LEADING_TRICKS,
    bids: { p1: 1, p2: 0, me: 2 },
    tricksWon: { me: 2 },
  });
const SEEN_LEADING: ICard[] = [...HAND, TRUMP_CARD, ...LEADING_TRICKS.flat().map((p) => p.card)];

describe('CardInferenceEngine distributions', () => {
  it('marks a player void in a suit after a number card off that suit, in finished and running tricks', () => {
    const distributions = createCardInferenceEngine(showOutPosition()).inferAllDistributions();

    expect([...(distributions.get('p2')?.voidSuits ?? [])]).toEqual([Suit.ELVES]);
    expect([...(distributions.get('p1')?.voidSuits ?? [])]).toEqual([Suit.GIANTS]);
  });

  it('gives a void player no chance of holding any card of that suit', () => {
    const distributions = createCardInferenceEngine(showOutPosition()).inferAllDistributions();
    const p2 = distributions.get('p2')?.cardProbabilities ?? new Map<string, number>();
    const p1 = distributions.get('p1')?.cardProbabilities ?? new Map<string, number>();

    for (let value = 1; value <= 13; value++) {
      const elves = n(Suit.ELVES, value).id;
      const giants = n(Suit.GIANTS, value).id;
      if (p2.has(elves)) expect(p2.get(elves)).toBe(0);
      if (p1.has(giants)) expect(p1.get(giants)).toBe(0);
    }
    // The other opponent may still hold them.
    expect(p1.get(n(Suit.ELVES, 13).id)).toBeGreaterThan(0);
  });

  it('never assigns a card the seat has seen: its hand, the trump card or a played card', () => {
    const distributions = createCardInferenceEngine(showOutPosition()).inferAllDistributions();

    for (const distribution of distributions.values()) {
      for (const card of SEEN) expect(distribution.cardProbabilities.has(card.id)).toBe(false);
    }
  });

  it('expects each opponent to hold as many cards as it has left to play', () => {
    const distributions = createCardInferenceEngine(leadingPosition()).inferAllDistributions();

    expect([...distributions.keys()].sort()).toEqual(['p1', 'p2']);
    for (const distribution of distributions.values()) {
      const expectedCards = [...distribution.cardProbabilities.values()].reduce((sum, p) => sum + p, 0);
      expect(expectedCards).toBeCloseTo(CARDS_LEFT_EACH, 6);
    }
  });

  it('only models opponents whose bids the seat may see', () => {
    const distributions = createCardInferenceEngine(showOutPosition({ bids: { p1: 1, me: 1 } })).inferAllDistributions();

    expect([...distributions.keys()]).toEqual(['p1']);
  });

  it('expects fewer Wizards from a player who needed every trick and lost one', () => {
    // Round 5, p1 bid 5. In trick 1 p1 played Elves 12 and lost it to our Wizard.
    const lostTrick = [[play('p1', n(Suit.ELVES, 12)), play('p2', n(Suit.ELVES, 3)), play('me', wizard(0))]];
    const hand = [n(Suit.HUMANS, 5), n(Suit.HUMANS, 6), n(Suit.HUMANS, 7), n(Suit.HUMANS, 8)];
    const base = { hand, trumpSuit: Suit.GIANTS, bids: { p1: 5, p2: 5 } };
    const wizardsBelieved = (completedTricks: PositionSpec['completedTricks'], tricksWon: Record<string, number>) =>
      createCardInferenceEngine(positionContext({ ...base, completedTricks, tricksWon }))
        .inferAllDistributions().get('p1')?.expectedWizards ?? Number.NaN;

    const wonIt = [[play('p1', n(Suit.ELVES, 12)), play('p2', n(Suit.ELVES, 3)), play('me', n(Suit.ELVES, 2))]];

    expect(wizardsBelieved(lostTrick, { me: 1 })).toBeLessThan(wizardsBelieved(wonIt, { p1: 1 }));
  });
});

describe('informed determinizations', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('deal every modelled opponent a consistent hand (seed %i)', (seed) => {
    const hands = withSeededMath(seed, () => sampleInformedDeterminization(leadingPosition()));

    expect([...hands.keys()].sort()).toEqual(['p1', 'p2']);
    const dealt = [...hands.values()].flat();
    const ids = dealt.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const card of SEEN_LEADING) expect(ids).not.toContain(card.id);
    expect(hands.get('p1')?.length).toBe(CARDS_LEFT_EACH);
    expect(hands.get('p2')?.length).toBe(CARDS_LEFT_EACH);
    expect(hands.get('p1')?.some((card) => card.suit === Suit.GIANTS)).toBe(false);
    expect(hands.get('p2')?.some((card) => card.suit === Suit.ELVES)).toBe(false);
  });
});
