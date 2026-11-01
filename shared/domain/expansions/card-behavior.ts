/**
 * Card Behaviour
 *
 * A physical card (ICard) plus the player's declaration resolves to a CardBehavior:
 * the only thing trick resolution, follow-suit checks and the bot AI need to know.
 * This keeps every rule engine independent of individual card types.
 */

import type { Suit, CardType } from '../value-objects/card-types';

/**
 * Strength class of a played card, strongest first. Within SUITED the usual
 * trump / lead suit / value comparison applies; every other class is decided by
 * play order.
 */
export enum TrickRank {
  DRAGON = 'DRAGON',
  WIZARD = 'WIZARD',
  SUITED = 'SUITED',
  JESTER = 'JESTER',
  FAIRY = 'FAIRY',
  WITCH = 'WITCH',
  BOMB = 'BOMB',
}

/** Things that happen once a trick holding the card is complete. */
export enum TrickEffectKind {
  /** Nobody wins the trick (Bomb). */
  VOID_TRICK = 'VOID_TRICK',
  /** Every player passes one hand card to the left (Juggler). */
  PASS_LEFT = 'PASS_LEFT',
  /** The trick winner changes their bid by one (Cloud). */
  ADJUST_BID = 'ADJUST_BID',
  /** The card's owner swaps a hand card with a card from the trick (Witch). */
  SWAP_WITH_TRICK = 'SWAP_WITH_TRICK',
}

/** The form a Shapeshifter takes when played. */
export enum CardForm {
  WIZARD = 'WIZARD',
  JESTER = 'JESTER',
}

/** What a player announces when playing a card that needs a choice. */
export interface ICardDeclaration {
  /** Suit announced for Cloud and Juggler. */
  suit?: Suit;
  /** Form announced for the Shapeshifter. */
  form?: CardForm;
}

/** Which kind of declaration a card needs when it is played. */
export enum DeclarationKind {
  SUIT = 'SUIT',
  FORM = 'FORM',
}

export interface CardBehavior {
  readonly rank: TrickRank;
  /** Suit the card competes in (SUITED only). */
  readonly suit: Suit | null;
  /** Value inside its suit (SUITED only); Juggler 7.5, Cloud 9.75. */
  readonly value: number;
  readonly effects: readonly TrickEffectKind[];
  /** The card type whose rules apply (differs from the physical type for the Vampire). */
  readonly actsAs: CardType;
}

export function hasEffect(behavior: CardBehavior, effect: TrickEffectKind): boolean {
  return behavior.effects.includes(effect);
}
