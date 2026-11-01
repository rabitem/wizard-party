import { Card, ICard } from './card';
import { Suit } from '../value-objects/card-types';
import {
  type ICardRules,
  DEFAULT_CARD_RULES,
} from '../value-objects/ruleset-config';
import type { ICardDeclaration } from '../expansions/card-behavior';
import {
  EMPTY_ROUND_CONTEXT,
  getTrickLead,
  resolveCardBehavior,
  type ICardRoundContext,
} from '../expansions/card-rules';
import { resolveTrick, type IResolvedPlay, type TrickResolution } from '../expansions/trick-resolver';
import { leadSuitOf, type TrickLead } from '../expansions/trick-lead';

/**
 * Represents a card played in a trick with player attribution
 */
export interface PlayedCard {
  playerId: string;
  card: ICard;
  /** Choice announced with the card (Cloud/Juggler suit, Shapeshifter form). */
  declaration?: ICardDeclaration;
}

/**
 * A Witch swap: a hand card was put into the completed trick and a trick card taken.
 */
export interface ITrickExchange {
  playerId: string;
  givenCard: ICard;
  takenCard: ICard;
}

/**
 * Trick data transfer object interface
 */
export interface ITrick {
  cards: PlayedCard[];
  /**
   * Suit to follow (wire format of the trick's lead): null both while the lead is
   * still pending (empty trick, only Jesters) and when a Wizard freed the trick.
   */
  leadSuit: Suit | null;
  /** Player credited with the trick; null while open or when voided by a Bomb. */
  winnerId: string | null;
  /** Player leading the next trick (the would-be winner of a voided trick). */
  leaderId?: string | null;
  /** True when a Bomb destroyed the trick. */
  voided?: boolean;
  exchanges?: ITrickExchange[];
}

/**
 * Trick entity representing a single trick (one card from each player)
 *
 * The lead (see expansions/trick-lead.ts) is derived from the cards: Jesters are
 * skipped, a Wizard (or Dragon) led before any suit card frees everyone from
 * following suit, otherwise the first suited card sets the suit to follow.
 */
export class Trick implements ITrick {
  public cards: PlayedCard[] = [];
  /** Wire copy of the lead suit; the lead itself is always derived from `cards`. */
  public leadSuit: Suit | null = null;
  public winnerId: string | null = null;
  public leaderId: string | null = null;
  public voided: boolean = false;
  public exchanges: ITrickExchange[] = [];

  constructor(
    private readonly trumpSuit: Suit | null,
    private readonly context: ICardRoundContext = EMPTY_ROUND_CONTEXT
  ) {}

  /**
   * Play a card into this trick
   */
  playCard(playerId: string, card: Card | ICard, declaration?: ICardDeclaration): void {
    const json = card instanceof Card ? card.toJSON() : { ...card };
    const hasDeclaration = declaration && (declaration.suit !== undefined || declaration.form !== undefined);
    const played: PlayedCard = hasDeclaration
      ? { playerId, card: json, declaration: { ...declaration } }
      : { playerId, card: json };
    this.cards.push(played);
    this.leadSuit = this.getLeadSuit();
  }

  /**
   * Behaviours of the played cards, in play order
   */
  getResolvedPlays(): IResolvedPlay[] {
    return this.cards.map((played) => ({
      playerId: played.playerId,
      behavior: resolveCardBehavior(played.card, played.declaration, this.context),
    }));
  }

  /**
   * Check if all players have played
   */
  isComplete(playerCount: number): boolean {
    return this.cards.length === playerCount;
  }

  /**
   * Resolve the complete trick: winner (null when voided), next leader and voiding
   */
  resolve(cardRules: ICardRules = DEFAULT_CARD_RULES): TrickResolution {
    const resolution = resolveTrick(this.getResolvedPlays(), this.trumpSuit, cardRules);
    this.winnerId = resolution.winnerId;
    this.leaderId = resolution.leaderId;
    this.voided = resolution.voided;
    return resolution;
  }

  /**
   * Cards lying in the trick now: played cards adjusted by Witch swaps
   */
  getPile(): ICard[] {
    let pile = this.cards.map((played) => played.card);
    for (const exchange of this.exchanges) {
      pile = [...pile.filter((card) => card.id !== exchange.takenCard.id), exchange.givenCard];
    }
    return pile;
  }

  /**
   * Record a Witch swap. The given card lies in the trick without any effect.
   */
  recordExchange(exchange: ITrickExchange): void {
    this.exchanges.push(exchange);
  }

  /**
   * The explicit lead: pending, free (a Wizard came first) or a suit to follow
   */
  getLead(): TrickLead {
    return getTrickLead(this.cards, this.context);
  }

  /**
   * Get the lead suit for this trick (null while pending or free)
   */
  getLeadSuit(): Suit | null {
    return leadSuitOf(this.getLead());
  }

  /**
   * Get the trump suit for this trick
   */
  getTrumpSuit(): Suit | null {
    return this.trumpSuit;
  }

  /**
   * Serialize to plain object
   */
  toJSON(): ITrick {
    return {
      cards: this.cards.map(copyPlayedCard),
      leadSuit: this.getLeadSuit(),
      winnerId: this.winnerId,
      leaderId: this.leaderId,
      voided: this.voided,
      exchanges: this.exchanges.map(copyExchange),
    };
  }

  /**
   * Deserialize from plain object. The lead is re-derived from the cards, so a
   * trick stored with a stale lead suit is repaired on load.
   */
  static fromJSON(data: ITrick, trumpSuit: Suit | null, context: ICardRoundContext = EMPTY_ROUND_CONTEXT): Trick {
    const trick = new Trick(trumpSuit, context);
    trick.restoreCards(data.cards);
    trick.winnerId = data.winnerId;
    trick.leaderId = data.leaderId ?? data.winnerId ?? null;
    trick.voided = data.voided ?? false;
    trick.exchanges = (data.exchanges ?? []).map(copyExchange);
    return trick;
  }

  /**
   * Replace the played cards (restoring a stored or staged trick) and re-derive the lead
   */
  restoreCards(cards: readonly PlayedCard[]): void {
    this.cards = cards.map(copyPlayedCard);
    this.leadSuit = this.getLeadSuit();
  }
}

function copyPlayedCard(played: PlayedCard): PlayedCard {
  return played.declaration
    ? { playerId: played.playerId, card: { ...played.card }, declaration: { ...played.declaration } }
    : { playerId: played.playerId, card: { ...played.card } };
}

function copyExchange(exchange: ITrickExchange): ITrickExchange {
  return { ...exchange, givenCard: { ...exchange.givenCard }, takenCard: { ...exchange.takenCard } };
}
