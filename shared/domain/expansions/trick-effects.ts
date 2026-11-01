/**
 * Trick Effects
 *
 * Effects of special cards that need player input once a trick is complete
 * (Juggler: pass a card left, Cloud: change bid by one, Witch: swap with the trick).
 * They are queued in play order of resolution and resolved one at a time; play
 * resumes when the queue is empty.
 *
 * Each effect kind has a handler (strategy) so new effects plug in without touching
 * the Game aggregate. Handlers only talk to the game through ITrickEffectPort.
 */

import type { ICard } from '../entities/card';
import { CardType } from '../value-objects/card-types';
import { TrickEffectKind, hasEffect } from './card-behavior';
import type { IResolvedPlay, TrickResolution } from './trick-resolver';

// ============================================================================
// Pending effects & responses
// ============================================================================

export interface IPassLeftEffect {
  kind: TrickEffectKind.PASS_LEFT;
  /** Players passing, in seat order; each passes to the next one. */
  playerIds: string[];
  /** playerId -> chosen card id. Hidden from other players by the state projection. */
  selections: Record<string, string>;
}

export interface IAdjustBidEffect {
  kind: TrickEffectKind.ADJUST_BID;
  playerId: string;
}

export interface ISwapWithTrickEffect {
  kind: TrickEffectKind.SWAP_WITH_TRICK;
  playerId: string;
}

export type PendingTrickEffect = IPassLeftEffect | IAdjustBidEffect | ISwapWithTrickEffect;
export type InteractiveEffectKind = PendingTrickEffect['kind'];

export type BidAdjustment = 1 | -1;

export type TrickEffectResponse =
  | { kind: TrickEffectKind.PASS_LEFT; cardId: string }
  | { kind: TrickEffectKind.ADJUST_BID; delta: BidAdjustment }
  | { kind: TrickEffectKind.SWAP_WITH_TRICK; handCardId: string; trickCardId: string };

/** Public summary of a resolved effect, broadcast to every client. */
export type TrickEffectOutcome =
  | { kind: TrickEffectKind.PASS_LEFT; playerIds: string[] }
  | { kind: TrickEffectKind.ADJUST_BID; playerId: string; delta: BidAdjustment; newBid: number }
  | { kind: TrickEffectKind.SWAP_WITH_TRICK; playerId: string; givenCard: ICard; takenCard: ICard };

// ============================================================================
// Port the Game aggregate implements
// ============================================================================

export interface ITrickEffectPort {
  getHand(playerId: string): readonly ICard[];
  getBid(playerId: string): number | null;
  /** Move cards between hands at once: each entry moves cardId from `from` to `to`. */
  transferCards(transfers: readonly { cardId: string; from: string; to: string }[]): void;
  adjustBid(playerId: string, delta: BidAdjustment): number;
  /** Cards currently lying in the completed trick. */
  getTrickPile(): readonly ICard[];
  /** Put a hand card into the trick and take a trick card into the hand. */
  exchangeWithTrick(playerId: string, handCardId: string, trickCardId: string): { given: ICard; taken: ICard };
}

export interface ApplyResult {
  /** The effect with any partial progress, or null once fully resolved. */
  remaining: PendingTrickEffect | null;
  outcome: TrickEffectOutcome | null;
}

// ============================================================================
// Handlers
// ============================================================================

interface ITrickEffectHandler<E extends PendingTrickEffect> {
  /** Players whose response is still needed. */
  awaiting(effect: E): string[];
  /** A response that is the only legal one, so the effect resolves without input. */
  forcedResponse(effect: E, port: ITrickEffectPort): TrickEffectResponse | null;
  /** Error message for an illegal response, null when legal. */
  validate(effect: E, playerId: string, response: TrickEffectResponse, port: ITrickEffectPort): string | null;
  apply(effect: E, playerId: string, response: TrickEffectResponse, port: ITrickEffectPort): ApplyResult;
}

const passLeftHandler: ITrickEffectHandler<IPassLeftEffect> = {
  awaiting: (effect) => effect.playerIds.filter((id) => !(id in effect.selections)),
  forcedResponse: () => null,
  validate(effect, playerId, response, port) {
    if (response.kind !== TrickEffectKind.PASS_LEFT) return 'Choose a card to pass';
    if (!effect.playerIds.includes(playerId)) return 'You are not passing a card';
    if (playerId in effect.selections) return 'You already chose a card to pass';
    if (!port.getHand(playerId).some((card) => card.id === response.cardId)) return 'You do not hold that card';
    return null;
  },
  apply(effect, playerId, response, port) {
    if (response.kind !== TrickEffectKind.PASS_LEFT) return { remaining: effect, outcome: null };
    const selections = { ...effect.selections, [playerId]: response.cardId };
    const next = { ...effect, selections };
    if (passLeftHandler.awaiting(next).length > 0) return { remaining: next, outcome: null };

    const ids = effect.playerIds;
    port.transferCards(ids.map((from, index) => ({
      cardId: selections[from],
      from,
      to: ids[(index + 1) % ids.length],
    })));
    return { remaining: null, outcome: { kind: TrickEffectKind.PASS_LEFT, playerIds: [...ids] } };
  },
};

const adjustBidHandler: ITrickEffectHandler<IAdjustBidEffect> = {
  awaiting: (effect) => [effect.playerId],
  // A bid of zero can only go up.
  forcedResponse: (effect, port) =>
    (port.getBid(effect.playerId) ?? 0) <= 0 ? { kind: TrickEffectKind.ADJUST_BID, delta: 1 } : null,
  validate(effect, playerId, response, port) {
    if (response.kind !== TrickEffectKind.ADJUST_BID) return 'Choose to raise or lower your bid';
    if (playerId !== effect.playerId) return 'Only the trick winner changes their bid';
    if (response.delta !== 1 && response.delta !== -1) return 'Bid can only change by one';
    if (response.delta === -1 && (port.getBid(playerId) ?? 0) <= 0) return 'Bid cannot go below zero';
    return null;
  },
  apply(effect, playerId, response, port) {
    if (response.kind !== TrickEffectKind.ADJUST_BID) return { remaining: effect, outcome: null };
    const newBid = port.adjustBid(playerId, response.delta);
    return {
      remaining: null,
      outcome: { kind: TrickEffectKind.ADJUST_BID, playerId, delta: response.delta, newBid },
    };
  },
};

const swapWithTrickHandler: ITrickEffectHandler<ISwapWithTrickEffect> = {
  awaiting: (effect) => [effect.playerId],
  forcedResponse: () => null,
  validate(effect, playerId, response, port) {
    if (response.kind !== TrickEffectKind.SWAP_WITH_TRICK) return 'Choose cards to swap';
    if (playerId !== effect.playerId) return 'Only the Witch player swaps';
    if (!port.getHand(playerId).some((card) => card.id === response.handCardId)) return 'You do not hold that card';
    const taken = port.getTrickPile().find((card) => card.id === response.trickCardId);
    if (!taken) return 'That card is not in the trick';
    if (!isSwappableTrickCard(taken)) return 'The Witch cannot take herself back';
    return null;
  },
  apply(effect, playerId, response, port) {
    if (response.kind !== TrickEffectKind.SWAP_WITH_TRICK) return { remaining: effect, outcome: null };
    const { given, taken } = port.exchangeWithTrick(playerId, response.handCardId, response.trickCardId);
    return {
      remaining: null,
      outcome: { kind: TrickEffectKind.SWAP_WITH_TRICK, playerId, givenCard: given, takenCard: taken },
    };
  },
};

const HANDLERS: { [K in InteractiveEffectKind]: ITrickEffectHandler<Extract<PendingTrickEffect, { kind: K }>> } = {
  [TrickEffectKind.PASS_LEFT]: passLeftHandler,
  [TrickEffectKind.ADJUST_BID]: adjustBidHandler,
  [TrickEffectKind.SWAP_WITH_TRICK]: swapWithTrickHandler,
};

function handlerFor(effect: PendingTrickEffect): ITrickEffectHandler<PendingTrickEffect> {
  return HANDLERS[effect.kind] as ITrickEffectHandler<PendingTrickEffect>;
}

// ============================================================================
// Public API
// ============================================================================

/** The Witch may take any trick card except the Witch herself. */
export function isSwappableTrickCard(card: Pick<ICard, 'type'>): boolean {
  return card.type !== CardType.WITCH;
}

export function getAwaitingPlayerIds(effect: PendingTrickEffect): string[] {
  return handlerFor(effect).awaiting(effect);
}

export function getForcedResponse(effect: PendingTrickEffect, port: ITrickEffectPort): TrickEffectResponse | null {
  return handlerFor(effect).forcedResponse(effect, port);
}

export function validateEffectResponse(
  effect: PendingTrickEffect,
  playerId: string,
  response: TrickEffectResponse,
  port: ITrickEffectPort
): string | null {
  if (response.kind !== effect.kind) return 'That choice does not match the pending effect';
  return handlerFor(effect).validate(effect, playerId, response, port);
}

export function applyEffectResponse(
  effect: PendingTrickEffect,
  playerId: string,
  response: TrickEffectResponse,
  port: ITrickEffectPort
): ApplyResult {
  return handlerFor(effect).apply(effect, playerId, response, port);
}

/**
 * Effects triggered by a completed trick, in resolution order
 * (publisher's rules FAQ: Juggler first, then Cloud, then Witch).
 *
 * - Juggler: skipped after the round's last trick (nothing left to pass).
 * - Cloud: the trick winner adjusts; a voided (Bomb) trick has no winner.
 * - Witch: skipped after the last trick (no hand card left to swap).
 */
export function deriveTrickEffects(
  plays: readonly IResolvedPlay[],
  resolution: TrickResolution,
  seatOrder: readonly string[],
  isLastTrick: boolean
): PendingTrickEffect[] {
  const effects: PendingTrickEffect[] = [];

  if (!isLastTrick && plays.some((play) => hasEffect(play.behavior, TrickEffectKind.PASS_LEFT))) {
    effects.push({ kind: TrickEffectKind.PASS_LEFT, playerIds: [...seatOrder], selections: {} });
  }

  if (resolution.winnerId !== null) {
    for (const play of plays) {
      if (hasEffect(play.behavior, TrickEffectKind.ADJUST_BID)) {
        effects.push({ kind: TrickEffectKind.ADJUST_BID, playerId: resolution.winnerId });
      }
    }
  }

  if (!isLastTrick) {
    for (const play of plays) {
      if (hasEffect(play.behavior, TrickEffectKind.SWAP_WITH_TRICK)) {
        effects.push({ kind: TrickEffectKind.SWAP_WITH_TRICK, playerId: play.playerId });
      }
    }
  }

  return effects;
}

export function parseEffectResponse(value: unknown): TrickEffectResponse | null {
  if (typeof value !== 'object' || value === null) return null;
  const source = value as Record<string, unknown>;
  switch (source.kind) {
    case TrickEffectKind.PASS_LEFT:
      return typeof source.cardId === 'string' ? { kind: TrickEffectKind.PASS_LEFT, cardId: source.cardId } : null;
    case TrickEffectKind.ADJUST_BID:
      return source.delta === 1 || source.delta === -1
        ? { kind: TrickEffectKind.ADJUST_BID, delta: source.delta }
        : null;
    case TrickEffectKind.SWAP_WITH_TRICK:
      return typeof source.handCardId === 'string' && typeof source.trickCardId === 'string'
        ? { kind: TrickEffectKind.SWAP_WITH_TRICK, handCardId: source.handCardId, trickCardId: source.trickCardId }
        : null;
    default:
      return null;
  }
}
