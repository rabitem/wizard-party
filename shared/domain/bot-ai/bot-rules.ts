/**
 * Bot Rules
 *
 * The rule questions the bot heuristics and search algorithms ask (what is the
 * lead, which cards are legal, who takes the trick), answered by the domain's
 * single rules policy: expansions/trick-lead.ts, expansions/card-rules.ts and
 * expansions/trick-resolver.ts. Simulations therefore play exactly the game the
 * server enforces, including the room's card rules (last Wizard / last Jester wins).
 *
 * Bots reason about the classic view of the game (see classic-view.ts), so every
 * card here is a plain classic card without a declaration.
 */

import type { ICard } from '../entities/card';
import type { PlayedCard } from '../entities/trick';
import { CardType, type Suit } from '../value-objects/card-types';
import { DEFAULT_CARD_RULES, type ICardRules } from '../value-objects/ruleset-config';
import type { CardBehavior } from '../expansions/card-behavior';
import { legalPlays, resolveCardBehavior } from '../expansions/card-rules';
import { PENDING_LEAD, advanceLead, leadSuitOf, type TrickLead } from '../expansions/trick-lead';
import { resolveTrick, type IResolvedPlay } from '../expansions/trick-resolver';

/** A card in a trick with the player who played it. */
export interface BotTrickPlay {
  readonly playerId: string;
  readonly card: ICard;
}

/**
 * Behaviours are pure functions of the card, so they are cached per card object:
 * simulations ask for the same hand cards thousands of times.
 */
const behaviorCache = new WeakMap<ICard, CardBehavior>();

export function behaviorOf(card: ICard): CardBehavior {
  let behavior = behaviorCache.get(card);
  if (!behavior) {
    behavior = resolveCardBehavior(card, undefined);
    behaviorCache.set(card, behavior);
  }
  return behavior;
}

// ============================================================================
// Lead and legality
// ============================================================================

/** The lead after one more card. */
export function leadAfterCard(lead: TrickLead, card: ICard): TrickLead {
  return advanceLead(lead, behaviorOf(card));
}

/** The lead of a (partial) trick from its cards in play order. */
export function leadOfCards(cards: readonly ICard[]): TrickLead {
  let lead = PENDING_LEAD;
  for (const card of cards) lead = leadAfterCard(lead, card);
  return lead;
}

/** The suit to follow (null while the lead is pending or free). */
export function suitToFollow(lead: TrickLead): Suit | null {
  return leadSuitOf(lead);
}

/** A play of a trick together with the suit its player had to follow. */
export interface PlayWithSuitToFollow<T> {
  readonly play: T;
  /** Suit to follow when the card was played (null: any card was allowed). */
  readonly followSuit: Suit | null;
}

/** Every play of a trick with the suit its player had to follow at that moment. */
export function withSuitToFollow<T extends Pick<PlayedCard, 'card'>>(
  plays: readonly T[]
): PlayWithSuitToFollow<T>[] {
  let lead = PENDING_LEAD;
  return plays.map((play) => {
    const followSuit = leadSuitOf(lead);
    lead = leadAfterCard(lead, play.card);
    return { play, followSuit };
  });
}

/**
 * Whether playing `card` when `followSuit` had to be followed shows the player
 * has no card of that suit (only number cards oblige).
 */
export function revealsVoid(card: ICard, followSuit: Suit | null): followSuit is Suit {
  return followSuit !== null && card.type === CardType.NUMBER && card.suit !== followSuit;
}

/** Cards of a hand that may be played into a trick with this lead. */
export function legalCards<T extends ICard>(hand: readonly T[], lead: TrickLead): T[] {
  return legalPlays(hand, lead);
}

// ============================================================================
// Trick winner
// ============================================================================

function toResolvedPlays(cards: readonly ICard[]): IResolvedPlay[] {
  return cards.map((card, index) => ({ playerId: String(index), behavior: behaviorOf(card) }));
}

/**
 * Index of the card that takes the (partial) trick so far.
 */
export function trickWinnerIndex(
  cards: readonly ICard[],
  trumpSuit: Suit | null,
  cardRules: ICardRules = DEFAULT_CARD_RULES
): number {
  return resolveTrick(toResolvedPlays(cards), trumpSuit, cardRules).decidingIndex;
}

/**
 * The player who takes the (partial) trick so far (and leads the next one).
 */
export function trickWinnerId(
  plays: readonly BotTrickPlay[],
  trumpSuit: Suit | null,
  cardRules: ICardRules = DEFAULT_CARD_RULES
): string {
  return plays[trickWinnerIndex(plays.map((play) => play.card), trumpSuit, cardRules)].playerId;
}

/**
 * Whether `candidate`, added to the trick now, would take it (a lead card always
 * holds the trick for the moment).
 */
export function wouldTakeTrick(
  trickCards: readonly ICard[],
  candidate: ICard,
  trumpSuit: Suit | null,
  cardRules: ICardRules = DEFAULT_CARD_RULES
): boolean {
  return trickWinnerIndex([...trickCards, candidate], trumpSuit, cardRules) === trickCards.length;
}

/** `wouldTakeTrick` for a trick given as plays. */
export function wouldTakePlays(
  plays: readonly Pick<PlayedCard, 'card'>[],
  candidate: ICard,
  trumpSuit: Suit | null,
  cardRules: ICardRules = DEFAULT_CARD_RULES
): boolean {
  return wouldTakeTrick(plays.map((played) => played.card), candidate, trumpSuit, cardRules);
}
