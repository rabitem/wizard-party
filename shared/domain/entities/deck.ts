import { Card } from './card';
import { ALL_SUITS } from '../value-objects/card-types';

/**
 * Deck entity representing the 60-card Wizard deck
 *
 * Contains:
 * - 52 number cards (1-13 in each of 4 suits)
 * - 4 Wizards
 * - 4 Jesters
 */
export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = [];
    this.initialize();
  }

  /**
   * Initialize deck with all 60 cards
   */
  private initialize(): void {
    this.cards = [];

    // Add number cards (1-13 in each suit)
    for (const suit of ALL_SUITS) {
      for (let value = 1; value <= 13; value++) {
        this.cards.push(Card.createNumberCard(suit, value));
      }
    }

    // Add 4 Wizards
    for (let i = 0; i < 4; i++) {
      this.cards.push(Card.createWizard(i));
    }

    // Add 4 Jesters
    for (let i = 0; i < 4; i++) {
      this.cards.push(Card.createJester(i));
    }
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
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
   * Reset deck to initial state
   */
  reset(): void {
    this.initialize();
  }

  /**
   * Get copy of all cards (for inspection)
   */
  getCards(): Card[] {
    return [...this.cards];
  }
}
