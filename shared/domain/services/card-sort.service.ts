/**
 * Card Sort Service
 * Single responsibility: Sort cards in a consistent, predictable order
 */

import { ICard } from '../entities/card';
import { CardType, Suit } from '../value-objects';
import { getCardDefinition } from '../expansions/card-definitions';

/**
 * Standard suit order used for sorting
 * Giants -> Elves -> Dwarves -> Humans
 */
export const SUIT_ORDER: Suit[] = [Suit.GIANTS, Suit.ELVES, Suit.DWARVES, Suit.HUMANS];

/**
 * Card sort domain service - stateless functions for card sorting logic
 */
export class CardSortService {
  /**
   * Sort a hand of cards in a consistent order
   *
   * Sorting rules:
   * - Strong special cards first (Dragon, Wizards, Shapeshifter, Vampire, Cloud, Juggler)
   * - Number cards sorted by suit (Giants, Elves, Dwarves, Humans) then by value (ascending)
   * - Weak special cards last (Werewolf, Bomb, Jesters, Fairy, Witch)
   * Order comes from each card definition's sortOrder.
   *
   * @param hand - The cards to sort
   * @returns A new array with cards sorted
   */
  static sortHand(hand: ICard[]): ICard[] {
    return [...hand].sort(CardSortService.compareCards);
  }

  /**
   * Compare two cards for sorting
   */
  private static compareCards(a: ICard, b: ICard): number {
    const aSpecial = CardSortService.getSpecialCardOrder(a);
    const bSpecial = CardSortService.getSpecialCardOrder(b);

    if (aSpecial !== bSpecial) return aSpecial - bSpecial;
    if (aSpecial !== 0) return 0; // Both are same special type

    return CardSortService.compareNumberCards(a, b);
  }

  private static getSpecialCardOrder(card: ICard): number {
    return getCardDefinition(card.type).sortOrder;
  }

  private static compareNumberCards(a: ICard, b: ICard): number {
    const aSuit = a.suit ?? Suit.GIANTS;
    const bSuit = b.suit ?? Suit.GIANTS;
    const suitDiff = SUIT_ORDER.indexOf(aSuit) - SUIT_ORDER.indexOf(bSuit);
    if (suitDiff !== 0) return suitDiff;
    return (a.value ?? 0) - (b.value ?? 0);
  }

  /**
   * Get the sort index for a card (useful for animations and positioning)
   *
   * @param card - The card to get the sort index for
   * @returns A numeric sort index
   */
  static getSortIndex(card: ICard): number {
    if (card.type !== CardType.NUMBER) {
      // Special cards sit left or right of all number cards (per sortOrder)
      return getCardDefinition(card.type).sortOrder * 1000;
    }
    // Number cards: suit index * 100 + value
    const suitIndex = SUIT_ORDER.indexOf(card.suit ?? Suit.GIANTS);
    return suitIndex * 100 + (card.value ?? 0);
  }
}
