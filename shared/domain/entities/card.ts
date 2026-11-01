import { Suit, CardType, isSpecialCardType, type SpecialCardType } from '../value-objects/card-types';
import { resolveCardBehavior, type ICardRoundContext } from '../expansions/card-rules';
import { behaviorBeats } from '../expansions/trick-resolver';
import { getCardCatalogEntry } from '../expansions/card-catalog';
import type { CardBehavior, ICardDeclaration } from '../expansions/card-behavior';

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
 * The classic deck consists of:
 * - 52 number cards (1-13 in each of 4 suits)
 * - 4 Wizards (always win)
 * - 4 Jesters (always lose)
 * Expansions add special cards; their rules live in shared/domain/expansions.
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

  /**
   * Factory method to create an expansion special card
   */
  static createSpecial(type: SpecialCardType, index: number = 0): Card {
    return new Card(`${type}-${index}`, type, null, null);
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

  /** Expansion special card (Dragon, Fairy, ...). */
  isSpecial(): boolean {
    return isSpecialCardType(this.type);
  }

  getDisplayValue(): string {
    if (this.isNumberCard()) return this.value?.toString() ?? '';
    return getCardCatalogEntry(this.type).cornerLabel;
  }

  /**
   * How this card acts in a trick for a declaration and round context.
   */
  getBehavior(declaration?: ICardDeclaration, context?: ICardRoundContext): CardBehavior {
    return resolveCardBehavior(this, declaration, context);
  }

  /**
   * Determines if this card, played after `other`, takes the trick from it given the
   * lead suit and trump suit (first card wins ties).
   *
   * Pairwise view for heuristics; whole tricks are resolved by resolveTrick, which
   * also applies the Bomb and the Fairy-beats-Dragon rule.
   */
  beats(other: Card, leadSuit: Suit | null, trumpSuit: Suit | null): boolean {
    return behaviorBeats(this.getBehavior(), other.getBehavior(), leadSuit, trumpSuit);
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
