import { Suit, CardType } from '../value-objects/card-types';

/**
 * Card data transfer object interface
 */
export interface ICard {
  readonly id: string;
  readonly type: CardType;
  readonly suit: Suit | null;
  readonly value: number | null;
}

/**
 * Card entity representing a single card in the Wizard deck
 *
 * The deck consists of:
 * - 52 number cards (1-13 in each of 4 suits)
 * - 4 Wizards (always win)
 * - 4 Jesters (always lose)
 */
export class Card implements ICard {
  constructor(
    public readonly id: string,
    public readonly type: CardType,
    public readonly suit: Suit | null,
    public readonly value: number | null
  ) {}

  /**
   * Factory method to create a number card
   */
  static createNumberCard(suit: Suit, value: number): Card {
    if (value < 1 || value > 13) {
      throw new Error('Number card value must be between 1 and 13');
    }
    return new Card(`${suit}-${value}`, CardType.NUMBER, suit, value);
  }

  /**
   * Factory method to create a Wizard card
   */
  static createWizard(index: number): Card {
    return new Card(`WIZARD-${index}`, CardType.WIZARD, null, null);
  }

  /**
   * Factory method to create a Jester card
   */
  static createJester(index: number): Card {
    return new Card(`JESTER-${index}`, CardType.JESTER, null, null);
  }

  isWizard(): boolean {
    return this.type === CardType.WIZARD;
  }

  isJester(): boolean {
    return this.type === CardType.JESTER;
  }

  isNumberCard(): boolean {
    return this.type === CardType.NUMBER;
  }

  getDisplayValue(): string {
    if (this.isWizard()) return 'W';
    if (this.isJester()) return 'J';
    return this.value?.toString() ?? '';
  }

  /**
   * Determines if this card beats another card given the lead suit and trump suit
   *
   * Rules:
   * 1. Wizards always win (first Wizard in trick wins)
   * 2. Jesters always lose
   * 3. Trump suit beats non-trump
   * 4. Lead suit beats non-lead (when no trump)
   * 5. Higher value wins within same suit
   */
  beats(other: Card, leadSuit: Suit | null, trumpSuit: Suit | null): boolean {
    // Wizards always win (first wizard wins - so later wizards don't beat earlier ones)
    if (other.isWizard()) return false;
    if (this.isWizard()) return true;

    // Jesters always lose
    if (this.isJester()) return false;
    if (other.isJester()) return true;

    // Both are number cards
    const thisIsTrump = this.suit === trumpSuit;
    const otherIsTrump = other.suit === trumpSuit;

    // Trump beats non-trump
    if (thisIsTrump && !otherIsTrump) return true;
    if (!thisIsTrump && otherIsTrump) return false;

    // If same trump status, check lead suit
    const thisFollowsLead = this.suit === leadSuit;
    const otherFollowsLead = other.suit === leadSuit;

    // Following lead suit beats not following (when no trump involved)
    if (!thisIsTrump && !otherIsTrump) {
      if (thisFollowsLead && !otherFollowsLead) return true;
      if (!thisFollowsLead && otherFollowsLead) return false;
    }

    // Same suit - higher value wins
    if (this.suit === other.suit) {
      return (this.value ?? 0) > (other.value ?? 0);
    }

    // Different non-lead suits - first card wins (other doesn't beat this)
    return false;
  }

  /**
   * Serialize to plain object for network transfer
   */
  toJSON(): ICard {
    return {
      id: this.id,
      type: this.type,
      suit: this.suit,
      value: this.value,
    };
  }

  /**
   * Deserialize from plain object
   */
  static fromJSON(data: ICard): Card {
    return new Card(data.id, data.type, data.suit, data.value);
  }
}
