import { describe, expect, it } from 'vitest';

import type { ICard } from '../entities/card';
import { CardType, Suit } from '../value-objects/card-types';
import { CardSortService } from './card-sort.service';

const n = (suit: Suit, value: number): ICard => ({ id: `${suit}-${value}`, type: CardType.NUMBER, suit, value });
const special = (type: CardType, index = 0): ICard => ({ id: `${type}-${index}`, type, suit: null, value: null });

const ids = (cards: readonly ICard[]) => cards.map((card) => card.id);

describe('CardSortService.sortHand', () => {
  it('puts strong specials left, number cards by suit then value, weak specials right', () => {
    // The order from the hand-sorting rules: Dragon, Wizards, Shapeshifter, Vampire, Cloud,
    // Juggler | Giants, Elves, Dwarves, Humans (ascending) | Werewolf, Bomb, Jesters, Fairy, Witch.
    const expected = [
      special(CardType.DRAGON),
      special(CardType.WIZARD),
      special(CardType.SHAPESHIFTER),
      special(CardType.VAMPIRE),
      special(CardType.CLOUD),
      special(CardType.JUGGLER),
      n(Suit.GIANTS, 2),
      n(Suit.GIANTS, 13),
      n(Suit.ELVES, 1),
      n(Suit.ELVES, 7),
      n(Suit.DWARVES, 9),
      n(Suit.HUMANS, 3),
      n(Suit.HUMANS, 12),
      special(CardType.WEREWOLF),
      special(CardType.BOMB),
      special(CardType.JESTER),
      special(CardType.FAIRY),
      special(CardType.WITCH),
    ];
    // A fixed shuffle, so the input order never already matches.
    const shuffled = [13, 4, 0, 9, 16, 2, 11, 7, 5, 14, 1, 10, 17, 6, 12, 3, 15, 8].map((index) => expected[index]);

    expect(ids(CardSortService.sortHand(shuffled))).toEqual(ids(expected));
  });

  it('keeps copies of the same special card in the order they were dealt', () => {
    const hand = [special(CardType.JESTER, 3), special(CardType.WIZARD, 2), special(CardType.JESTER, 1), special(CardType.WIZARD, 0)];

    expect(ids(CardSortService.sortHand(hand))).toEqual(['WIZARD-2', 'WIZARD-0', 'JESTER-3', 'JESTER-1']);
  });

  it('returns a new array and leaves the dealt hand untouched', () => {
    const hand = [n(Suit.HUMANS, 5), n(Suit.GIANTS, 5)];

    const sorted = CardSortService.sortHand(hand);

    expect(ids(sorted)).toEqual(['GIANTS-5', 'HUMANS-5']);
    expect(ids(hand)).toEqual(['HUMANS-5', 'GIANTS-5']);
  });
});
