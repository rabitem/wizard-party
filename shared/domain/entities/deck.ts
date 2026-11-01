import { Card } from './card';
import type { SpecialCardType } from '../value-objects/card-types';
import { buildDeckCards } from '../expansions/deck-composition';
import { randomInt, systemRandom, type IRandom } from '../ports/random.port';

/**
 * Deck entity: the classic 60-card Wizard deck plus any expansion special cards.
 *
 * Classic contents:
 * - 52 number cards (1-13 in each of 4 suits)
 * - 4 Wizards
 * - 4 Jesters
 */
export class Deck {
  private cards: Card[];

  constructor(
    private specialCards: readonly SpecialCardType[] = [],
    private readonly random: IRandom = systemRandom
  ) {
    this.cards = [];
    this.initialize();
  }

  /**
   * Initialize deck with the classic cards and the enabled special cards
   */
  private initialize(): void {
    this.cards = buildDeckCards(this.specialCards).map((card) => Card.fromJSON(card));
  }

  /**
   * Fisher-Yates shuffle with the deck's random source
   */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = randomInt(this.random, i + 1);
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  /**
   * Deal specified number of cards from top of deck
   */
  deal(count: number): Card[] {
    if (count > this.cards.length) {
      throw new Error(`Cannot deal ${count} cards, only ${this.cards.length} remaining`);
    }
    return this.cards.splice(0, count);
  }

  /**
   * Draw one card from top of deck
   */
  drawOne(): Card | null {
    return this.cards.shift() ?? null;
  }

  /**
   * Get remaining card count
   */
  remaining(): number {
    return this.cards.length;
  }

  /**
   * Reset deck to initial state, optionally with a new special-card selection
   */
  reset(specialCards: readonly SpecialCardType[] = this.specialCards): void {
    this.specialCards = specialCards;
    this.initialize();
  }

  /**
   * Get copy of all cards (for inspection)
   */
  getCards(): Card[] {
    return [...this.cards];
  }
}
