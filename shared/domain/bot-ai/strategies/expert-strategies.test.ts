import { describe, expect, it } from 'vitest';

import type { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { BotDifficulty, DEFAULT_BOT_CONFIGS } from '../types';
import { createExpertBiddingStrategy } from './expert-strategies';
import { jester, n, positionContext, wizard, withSeededMath } from '../bot-ai.fixtures';

/* Production builds Expert with the default config and its default personality only. */
const EXPERT = DEFAULT_BOT_CONFIGS[BotDifficulty.EXPERT];

const STRONG = [wizard(0), wizard(1), wizard(2), n(Suit.GIANTS, 13)];
const WEAK = [n(Suit.ELVES, 2), n(Suit.HUMANS, 3), n(Suit.DWARVES, 2), jester(0)];

/** Last bidder of four, so the hook rule applies; the forbidden bid is the one the hand wants. */
const HOOKED_BIDS: { name: string; hand: Card[]; bids: Record<string, number>; forbidden: number | null }[] = [
  { name: 'a strong hand barred from bidding every trick', hand: STRONG, bids: { p1: 0, p2: 0, p3: 0 }, forbidden: 4 },
  { name: 'a weak hand barred from bidding zero', hand: WEAK, bids: { p1: 2, p2: 1, p3: 1 }, forbidden: 0 },
  { name: 'an unrestricted first bidder', hand: STRONG, bids: {}, forbidden: null },
];

describe('ExpertBiddingStrategy', () => {
  it.each(HOOKED_BIDS)('bids in range and never the forbidden bid: $name', ({ hand, bids, forbidden }) => {
    const context = positionContext({
      hand,
      trumpSuit: Suit.GIANTS,
      playerIds: ['p1', 'p2', 'p3', 'me'],
      bids,
      forbiddenBid: forbidden,
    });
    for (let seed = 1; seed <= 10; seed++) {
      const bid = withSeededMath(seed, () => createExpertBiddingStrategy().calculateBid(context, EXPERT));
      expect(bid).toBeGreaterThanOrEqual(0);
      expect(bid).toBeLessThanOrEqual(hand.length);
      expect(bid).not.toBe(forbidden);
    }
  });

  it('bids more tricks with four sure winners than with four sure losers', () => {
    const bidFor = (hand: Card[]) =>
      createExpertBiddingStrategy().calculateBid(
        positionContext({ hand, trumpSuit: Suit.GIANTS, playerIds: ['me', 'p1', 'p2'] }),
        EXPERT
      );

    expect(bidFor(STRONG)).toBeGreaterThan(bidFor(WEAK));
  });
});
