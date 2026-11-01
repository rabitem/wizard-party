/**
 * Bidding Service
 * Single responsibility: bid validation over a list of players.
 *
 * Thin facade over expansions/round-rules.ts (isBidInRange, computeForbiddenBid),
 * which holds the only implementation of the bidding rules. The Game aggregate
 * enforces them itself; this service answers the same questions for callers that
 * only have players.
 */

import type { IPlayer } from '../entities/player';
import { computeForbiddenBid, isBidInRange } from '../expansions/round-rules';
import {
  DEFAULT_BIDDING_RULES,
  type IBiddingRules,
} from '../value-objects/ruleset-config';

type BiddingPlayer = Pick<IPlayer, 'id' | 'bid'>;

export interface BidValidationResult {
  isValid: boolean;
  forbiddenBid: number | null;
  errorMessage?: string;
}

export interface BidContext {
  players: readonly BiddingPlayer[];
  /** Cards dealt to each player this round. */
  currentRound: number;
  currentPlayerId: string;
  currentPlayerIndex: number;
  biddingRules?: IBiddingRules;
}

/**
 * Bidding domain service - stateless functions for bid logic
 */
export class BiddingService {
  /**
   * The forbidden bid of the last player still to bid (hook rule), or null while
   * more than one player has not bid
   */
  static getForbiddenBid(
    players: readonly BiddingPlayer[],
    currentRound: number,
    rules: IBiddingRules = DEFAULT_BIDDING_RULES
  ): number | null {
    const waiting = players.filter((p) => p.bid === null);
    if (waiting.length !== 1) return null;
    return BiddingService.getForbiddenBidFor(players, waiting[0].id, currentRound, rules);
  }

  /**
   * The forbidden bid for one player: only the last player without a bid has one
   */
  static getForbiddenBidFor(
    players: readonly BiddingPlayer[],
    playerId: string,
    currentRound: number,
    rules: IBiddingRules = DEFAULT_BIDDING_RULES
  ): number | null {
    const bidder = players.find((p) => p.id === playerId);
    if (!bidder || bidder.bid !== null) return null;
    const otherBids = players.filter((p) => p !== bidder).map((p) => p.bid);
    return computeForbiddenBid(otherBids, currentRound, rules);
  }

  /**
   * Validate a bid before placing it
   */
  static validateBid(context: BidContext, playerId: string, bid: unknown): BidValidationResult {
    const { players, currentRound, currentPlayerIndex, biddingRules = DEFAULT_BIDDING_RULES } = context;
    const bidder = players[currentPlayerIndex];

    if (!bidder || bidder.id !== playerId) {
      return { isValid: false, forbiddenBid: null, errorMessage: 'Not your turn to bid' };
    }
    if (bidder.bid !== null) {
      return { isValid: false, forbiddenBid: null, errorMessage: 'You have already bid this round' };
    }
    if (!isBidInRange(bid, currentRound)) {
      return {
        isValid: false,
        forbiddenBid: null,
        errorMessage: `Bid must be a whole number between 0 and ${currentRound}`,
      };
    }

    const forbiddenBid = BiddingService.getForbiddenBidFor(players, playerId, currentRound, biddingRules);
    if (forbiddenBid !== null && bid === forbiddenBid) {
      return {
        isValid: false,
        forbiddenBid,
        errorMessage: `Cannot bid ${forbiddenBid} - total bids cannot equal ${currentRound}`,
      };
    }
    return { isValid: true, forbiddenBid };
  }

  static getTotalBids(players: readonly BiddingPlayer[]): number {
    return players.reduce((sum, p) => sum + (p.bid ?? 0), 0);
  }

  static getBidsPlaced(players: readonly BiddingPlayer[]): number {
    return players.filter((p) => p.bid !== null).length;
  }

  static allPlayersBid(players: readonly BiddingPlayer[]): boolean {
    return players.every((p) => p.bid !== null);
  }
}
