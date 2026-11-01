/**
 * Round Rules
 *
 * The single implementation of the round-level rules every engine shares:
 * the round plan (how many rounds, how many cards each), the hook rule
 * (forbidden bid of the last bidder) and round scoring. Like card-rules.ts and
 * trick-resolver.ts these are pure functions of the ruleset, so the server, the
 * client, the bots and the tests can never disagree about them.
 */

import {
  DEFAULT_BIDDING_RULES,
  DEFAULT_SCORING_RULES,
  DEFAULT_STRUCTURE_RULES,
  type IBiddingRules,
  type IGameStructureRules,
  type IScoringRules,
} from '../value-objects/ruleset-config';
import { CLASSIC_DECK_SIZE } from './deck-composition';

// ============================================================================
// Round plan
// ============================================================================

/**
 * Number of rounds for a player count. Special cards never add rounds: the count
 * always comes from the classic 60-card deck.
 */
export function getRoundCount(
  playerCount: number,
  rules: IGameStructureRules = DEFAULT_STRUCTURE_RULES
): number {
  if (!Number.isInteger(playerCount) || playerCount <= 0) return 0;
  const deckLimit = Math.floor(CLASSIC_DECK_SIZE / playerCount);
  const custom = rules.customRoundCount;
  if (custom === null || !Number.isFinite(custom)) return deckLimit;
  return Math.max(1, Math.min(Math.trunc(custom), deckLimit));
}

/**
 * Cards dealt to each player in a round (1-indexed round number).
 */
export function getCardsForRound(
  roundNumber: number,
  roundCount: number,
  rules: IGameStructureRules = DEFAULT_STRUCTURE_RULES
): number {
  return rules.descendingRounds ? roundCount - roundNumber + 1 : roundNumber;
}

/**
 * The whole round plan as data: cards per player for every round.
 */
export function getRoundPlan(
  playerCount: number,
  rules: IGameStructureRules = DEFAULT_STRUCTURE_RULES
): number[] {
  const roundCount = getRoundCount(playerCount, rules);
  return Array.from({ length: roundCount }, (_, index) => getCardsForRound(index + 1, roundCount, rules));
}

// ============================================================================
// Bidding
// ============================================================================

/** True for a whole number of tricks a player can bid with this many cards. */
export function isBidInRange(bid: unknown, cardsPerPlayer: number): bid is number {
  return typeof bid === 'number' && Number.isInteger(bid) && bid >= 0 && bid <= cardsPerPlayer;
}

/**
 * The hook rule: the last player to bid may not make the bids add up to the
 * number of tricks. `otherBids` are the bids of everyone else at the table
 * (null while a player has not bid); the restriction applies only to the player
 * who bids once all the others have.
 *
 * @returns the forbidden bid, or null when every bid is allowed
 */
export function computeForbiddenBid(
  otherBids: readonly (number | null)[],
  cardsPerPlayer: number,
  rules: IBiddingRules = DEFAULT_BIDDING_RULES
): number | null {
  if (rules.allowEqualBids) return null;
  if (otherBids.some((bid) => bid === null)) return null;

  const total = otherBids.reduce<number>((sum, bid) => sum + (bid ?? 0), 0);
  const forbidden = cardsPerPlayer - total;
  return forbidden >= 0 && forbidden <= cardsPerPlayer ? forbidden : null;
}

// ============================================================================
// Scoring
// ============================================================================

/**
 * Points for one round: an exact bid scores the base points plus points per
 * trick, a missed bid loses the penalty for every trick off.
 */
export function scoreRound(
  bid: number,
  tricksWon: number,
  rules: IScoringRules = DEFAULT_SCORING_RULES
): number {
  if (tricksWon === bid) {
    return rules.baseBidPoints + tricksWon * rules.pointsPerTrick;
  }
  return -Math.abs(tricksWon - bid) * rules.penaltyPerMiss;
}
