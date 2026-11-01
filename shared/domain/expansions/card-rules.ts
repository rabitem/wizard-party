/**
 * Card Rules
 *
 * Pure functions that turn cards + declarations into behaviours and answer the
 * questions every rule engine asks: which declaration does a card need, is a
 * declaration valid, which cards may be played, which suit leads a trick.
 */

import { ALL_SUITS, CardType, type Suit } from '../value-objects/card-types';
import type { ICard } from '../entities/card';
import {
  CardForm,
  DeclarationKind,
  type CardBehavior,
  type ICardDeclaration,
} from './card-behavior';
import { getCardDefinition, type ICardDefinition } from './card-definitions';
import { leadOf, leadSuitOf, type TrickLead } from './trick-lead';

/**
 * Round-wide facts a card's behaviour can depend on.
 */
export interface ICardRoundContext {
  /** The turned-up trump card the Vampire copies (null when none was turned up). */
  copySource: ICard | null;
}

export const EMPTY_ROUND_CONTEXT: ICardRoundContext = { copySource: null };

/**
 * The definition whose rules apply to a card in this round: a Vampire uses the
 * definition of the card it copies.
 */
export function getEffectiveDefinition(
  card: Pick<ICard, 'type'>,
  context: ICardRoundContext = EMPTY_ROUND_CONTEXT
): ICardDefinition {
  const definition = getCardDefinition(card.type);
  if (!definition.copiesTrumpCard) return definition;

  const source = context.copySource;
  if (!source || getCardDefinition(source.type).copiesTrumpCard) return definition;
  return getCardDefinition(source.type);
}

/** The card whose suit/value the behaviour is built from (the copied card for a Vampire). */
function getEffectiveCard(card: ICard, context: ICardRoundContext): ICard {
  const definition = getCardDefinition(card.type);
  if (!definition.copiesTrumpCard) return card;
  const source = context.copySource;
  if (!source || getCardDefinition(source.type).copiesTrumpCard) return card;
  return source;
}

export function resolveCardBehavior(
  card: ICard,
  declaration: ICardDeclaration | undefined,
  context: ICardRoundContext = EMPTY_ROUND_CONTEXT
): CardBehavior {
  const effectiveCard = getEffectiveCard(card, context);
  return getEffectiveDefinition(card, context).behave(effectiveCard, declaration ?? {});
}

export function getRequiredDeclaration(
  card: Pick<ICard, 'type'>,
  context: ICardRoundContext = EMPTY_ROUND_CONTEXT
): DeclarationKind | null {
  return getEffectiveDefinition(card, context).declaration;
}

export function getDeclarationOptions(kind: DeclarationKind): readonly (Suit | CardForm)[] {
  return kind === DeclarationKind.SUIT ? ALL_SUITS : [CardForm.WIZARD, CardForm.JESTER];
}

/**
 * Keep only the part of a declaration the card needs. Returns null when a
 * required choice is missing or invalid.
 */
export function normalizeDeclaration(
  card: Pick<ICard, 'type'>,
  declaration: unknown,
  context: ICardRoundContext = EMPTY_ROUND_CONTEXT
): ICardDeclaration | null {
  const kind = getRequiredDeclaration(card, context);
  if (kind === null) return {};
  if (typeof declaration !== 'object' || declaration === null) return null;

  const source = declaration as Record<string, unknown>;
  if (kind === DeclarationKind.SUIT) {
    return ALL_SUITS.includes(source.suit as Suit) ? { suit: source.suit as Suit } : null;
  }
  return source.form === CardForm.WIZARD || source.form === CardForm.JESTER
    ? { form: source.form }
    : null;
}

/**
 * The suit to follow, from the cards' behaviours in play order (see trick-lead.ts):
 * Jesters are skipped, a Wizard or Dragon before any suited card frees the trick,
 * otherwise the first suited card sets it.
 */
export function getLeadSuit(behaviors: readonly CardBehavior[]): Suit | null {
  return leadSuitOf(leadOf(behaviors));
}

/** A card as it lies in a trick: the physical card plus its declaration. */
export interface IPlayedCardLike {
  readonly card: ICard;
  readonly declaration?: ICardDeclaration;
}

/** The lead of a (partial) trick from its played cards. */
export function getTrickLead(
  plays: readonly IPlayedCardLike[],
  context: ICardRoundContext = EMPTY_ROUND_CONTEXT
): TrickLead {
  return leadOf(plays.map((played) => resolveCardBehavior(played.card, played.declaration, context)));
}

/** Only real number cards oblige a player to follow suit. */
export function canFollowSuit(hand: readonly Pick<ICard, 'type' | 'suit'>[], leadSuit: Suit): boolean {
  return hand.some((card) => card.type === CardType.NUMBER && card.suit === leadSuit);
}

/**
 * Cards that may legally be played:
 * - no lead suit, or the player cannot follow it: everything
 * - otherwise: lead-suit number cards plus every always-playable card
 */
function getPlayableCards<T extends Pick<ICard, 'type' | 'suit'>>(
  hand: readonly T[],
  leadSuit: Suit | null
): T[] {
  if (leadSuit === null || !canFollowSuit(hand, leadSuit)) return [...hand];
  return hand.filter(
    (card) =>
      (card.type === CardType.NUMBER && card.suit === leadSuit) ||
      getCardDefinition(card.type).alwaysPlayable
  );
}

/**
 * The single legality rule: the cards a player may play into a trick with this lead.
 * Pending and free leads allow every card.
 */
export function legalPlays<T extends Pick<ICard, 'type' | 'suit'>>(hand: readonly T[], lead: TrickLead): T[] {
  return getPlayableCards(hand, leadSuitOf(lead));
}
