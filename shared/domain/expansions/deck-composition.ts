/**
 * Deck Composition
 *
 * Builds the card list for a round from the room's expansion rules. The classic
 * deck is always present; each enabled special card adds its copies.
 */

import type { ICard } from '../entities/card';
import { ALL_SUITS, CardType, type SpecialCardType } from '../value-objects/card-types';
import { normalizeSpecialCards } from '../value-objects/expansion-rules';
import { getCardDefinition } from './card-definitions';

export const SUIT_CARD_MIN_VALUE = 1;
export const SUIT_CARD_MAX_VALUE = 13;

/**
 * Size of the classic deck. The number of rounds is always based on it: special
 * cards make the deck bigger but never add rounds, so a trump card is turned up
 * even in the final round when they are in play (as in the anniversary editions).
 */
export const CLASSIC_DECK_SIZE =
  ALL_SUITS.length * SUIT_CARD_MAX_VALUE +
  getCardDefinition(CardType.WIZARD).copies +
  getCardDefinition(CardType.JESTER).copies;

export function specialCardId(type: CardType, index: number): string {
  return `${type}-${index}`;
}

function copiesOf(type: CardType): ICard[] {
  return Array.from({ length: getCardDefinition(type).copies }, (_, index) => ({
    id: specialCardId(type, index),
    type,
    suit: null,
    value: null,
  }));
}

export function buildClassicDeckCards(): ICard[] {
  const cards: ICard[] = [];
  for (const suit of ALL_SUITS) {
    for (let value = SUIT_CARD_MIN_VALUE; value <= SUIT_CARD_MAX_VALUE; value++) {
      cards.push({ id: `${suit}-${value}`, type: CardType.NUMBER, suit, value });
    }
  }
  return [...cards, ...copiesOf(CardType.WIZARD), ...copiesOf(CardType.JESTER)];
}

export function buildDeckCards(specialCards: readonly SpecialCardType[] = []): ICard[] {
  return [
    ...buildClassicDeckCards(),
    ...normalizeSpecialCards(specialCards).flatMap((type) => copiesOf(type)),
  ];
}

/** How many copies of a card type a deck with these special cards holds. */
export function countInDeck(type: CardType, specialCards: readonly SpecialCardType[] = []): number {
  if (type === CardType.NUMBER) return ALL_SUITS.length * SUIT_CARD_MAX_VALUE;
  if (type === CardType.WIZARD || type === CardType.JESTER) return getCardDefinition(type).copies;
  return normalizeSpecialCards(specialCards).includes(type as SpecialCardType) ? getCardDefinition(type).copies : 0;
}
