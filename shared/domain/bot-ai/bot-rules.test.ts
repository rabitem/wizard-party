import { describe, expect, it } from 'vitest';

import { Card } from '../entities/card';
import { Suit } from '../value-objects/card-types';
import { DEFAULT_CARD_RULES, type ICardRules } from '../value-objects/ruleset-config';
import {
  revealsVoid,
  trickWinnerId,
  trickWinnerIndex,
  withSuitToFollow,
  wouldTakeTrick,
} from './bot-rules';
import { getLosingCards, getWinningCards } from './algorithms/card-comparison-utils';

const n = (suit: Suit, value: number) => Card.createNumberCard(suit, value);
const wizard = (index: number) => Card.createWizard(index);
const jester = (index: number) => Card.createJester(index);

const LAST_WINS: ICardRules = { lastWizardWins: true, lastJesterWins: true };

describe('bot rules (the domain rules as the bot simulations use them)', () => {
  it('gives an all-Jester trick to the first Jester unless the room says otherwise', () => {
    const trick = [jester(0), jester(1), jester(2)];
    expect(trickWinnerIndex(trick, null)).toBe(0);
    expect(trickWinnerIndex(trick, null, LAST_WINS)).toBe(2);
  });

  it('respects the last-Wizard-wins rule', () => {
    const trick = [n(Suit.ELVES, 3), wizard(0), wizard(1)];
    expect(trickWinnerIndex(trick, Suit.GIANTS)).toBe(1);
    expect(trickWinnerIndex(trick, Suit.GIANTS, LAST_WINS)).toBe(2);
  });

  it('lets trump beat the lead suit and the lead suit beat other suits', () => {
    const plays = [
      { playerId: 'a', card: n(Suit.ELVES, 9) },
      { playerId: 'b', card: n(Suit.DWARVES, 13) },
      { playerId: 'c', card: n(Suit.GIANTS, 2) },
    ];
    expect(trickWinnerId(plays, Suit.GIANTS)).toBe('c');
    expect(trickWinnerId(plays, null)).toBe('a');
  });

  it('records the suit each player had to follow, for void inference', () => {
    const trick = [jester(0), n(Suit.ELVES, 5), wizard(0), n(Suit.DWARVES, 3)].map((card, index) => ({
      playerId: `p${index}`,
      card,
    }));
    const follow = withSuitToFollow(trick).map((entry) => entry.followSuit);

    expect(follow).toEqual([null, null, Suit.ELVES, Suit.ELVES]);
    expect(revealsVoid(trick[3].card, Suit.ELVES)).toBe(true);
    expect(revealsVoid(trick[2].card, Suit.ELVES)).toBe(false);
    expect(revealsVoid(trick[3].card, null)).toBe(false);
  });
});

describe('Monte Carlo card comparison', () => {
  it('finds winning and losing cards with the room card rules', () => {
    const trick = [{ playerId: 'a', card: wizard(0) }];
    const hand = [wizard(1), n(Suit.ELVES, 13)];

    expect(getWinningCards(hand, trick, null, DEFAULT_CARD_RULES)).toEqual([]);
    expect(getWinningCards(hand, trick, null, LAST_WINS)).toEqual([hand[0]]);
    expect(getLosingCards(hand, trick, null, DEFAULT_CARD_RULES)).toEqual(hand);
  });

  it('treats a lead card as holding the trick', () => {
    const hand = [jester(0), n(Suit.ELVES, 2)];
    expect(wouldTakeTrick([], jester(0), null)).toBe(true);
    expect(getWinningCards(hand, [], null, DEFAULT_CARD_RULES)).toEqual(hand);
  });
});
