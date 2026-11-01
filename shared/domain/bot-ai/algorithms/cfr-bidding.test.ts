import { describe, expect, it } from 'vitest';

import type { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { CFRBiddingTrainer } from './cfr-bidding';
import { jester, n, wizard } from '../bot-ai.fixtures';

const HANDS: { name: string; hand: Card[] }[] = [
  { name: 'three Wizards', hand: [wizard(0), wizard(1), wizard(2)] },
  { name: 'three losers', hand: [jester(0), n(Suit.ELVES, 2), n(Suit.HUMANS, 3)] },
  { name: 'one card', hand: [n(Suit.GIANTS, 13)] },
];

describe('CFR bidding policy', () => {
  // The expert bidder asks the policy for its best bid with the room's forbidden bid marked.
  it.each(HANDS.flatMap(({ name, hand }) =>
    [null, ...Array.from({ length: hand.length + 1 }, (_, bid) => bid)].map((forbiddenBid) => ({ name, hand, forbiddenBid }))
  ))('names a bid in range other than the forbidden one: $name, forbidden $forbiddenBid', ({ hand, forbiddenBid }) => {
    const trainer = new CFRBiddingTrainer();
    const infoSet = trainer.createInfoSet({
      hand,
      trumpSuit: Suit.GIANTS,
      position: 2,
      numPlayers: 3,
      previousBids: [1, 0],
      forbiddenBid,
    });

    const bid = trainer.getBestBid(infoSet);

    expect(bid).toBeGreaterThanOrEqual(0);
    expect(bid).toBeLessThanOrEqual(hand.length);
    expect(bid).not.toBe(forbiddenBid);
  });
});
