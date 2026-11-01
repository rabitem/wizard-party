import { describe, expect, it } from 'vitest';

import type { Card } from '../entities/card';
import { ALL_SUITS, Suit } from '../value-objects/card-types';
import { CardEvaluator } from './card-evaluator';
import { jester, n, wizard } from './bot-ai.fixtures';

const evaluator = new CardEvaluator();
const NUMBER_CARDS: Card[] = ALL_SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => n(suit, i + 1)));
const TRUMP_OPTIONS: (Suit | null)[] = [Suit.GIANTS, null];

describe('CardEvaluator.evaluateCard', () => {
  it.each(TRUMP_OPTIONS)('ranks a Wizard at the top and a Jester at the bottom (trump %s)', (trump) => {
    const top = evaluator.evaluateCard(wizard(0), trump, null);
    const bottom = evaluator.evaluateCard(jester(0), trump, null);

    expect(top.winProbability).toBe(1);
    expect(bottom.winProbability).toBe(0);
    for (const card of NUMBER_CARDS) {
      const score = evaluator.evaluateCard(card, trump, null);
      expect(score.absoluteScore).toBeLessThanOrEqual(top.absoluteScore);
      expect(score.absoluteScore).toBeGreaterThanOrEqual(bottom.absoluteScore);
    }
  });

  it.each(ALL_SUITS)('scores a higher card of a suit above a lower one (%s)', (suit) => {
    for (const trump of TRUMP_OPTIONS) {
      for (let value = 1; value < 13; value++) {
        const lower = evaluator.evaluateCard(n(suit, value), trump, null).absoluteScore;
        const higher = evaluator.evaluateCard(n(suit, value + 1), trump, null).absoluteScore;
        expect(higher).toBeGreaterThan(lower);
      }
    }
  });

  it('scores a trump above the same value in another suit', () => {
    for (let value = 1; value <= 13; value++) {
      const trump = evaluator.evaluateCard(n(Suit.GIANTS, value), Suit.GIANTS, null).absoluteScore;
      const plain = evaluator.evaluateCard(n(Suit.ELVES, value), Suit.GIANTS, null).absoluteScore;
      expect(trump).toBeGreaterThan(plain);
    }
  });

  it('in a trick led in another suit, values any trump above any card that follows and a discard at nothing', () => {
    const contextual = (card: Card) => evaluator.evaluateCard(card, Suit.GIANTS, Suit.ELVES).contextualScore;
    const lowestTrump = Math.min(...NUMBER_CARDS.filter((c) => c.suit === Suit.GIANTS).map(contextual));
    const highestFollow = Math.max(...NUMBER_CARDS.filter((c) => c.suit === Suit.ELVES).map(contextual));

    expect(lowestTrump).toBeGreaterThan(highestFollow);
    for (const card of NUMBER_CARDS.filter((c) => c.suit === Suit.HUMANS || c.suit === Suit.DWARVES)) {
      expect(contextual(card)).toBe(0);
    }
  });
});
