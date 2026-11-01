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
    const top = evaluator.evaluateCard(wizard(0), trump, null).absoluteScore;
    const bottom = evaluator.evaluateCard(jester(0), trump, null).absoluteScore;

    for (const card of NUMBER_CARDS) {
      const score = evaluator.evaluateCard(card, trump, null).absoluteScore;
      expect(score).toBeLessThanOrEqual(top);
      expect(score).toBeGreaterThanOrEqual(bottom);
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
});
