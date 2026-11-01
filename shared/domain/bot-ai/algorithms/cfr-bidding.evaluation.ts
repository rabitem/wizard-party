/**
 * CFR Bidding Evaluation Functions
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import {
  CFR_CONFIG,
  RISK_ADJUSTMENT,
} from '../../constants/bot-ai.constants';
import { HandSignature } from './cfr-bidding.types';

/**
 * Evaluate bidding outcome utility for each player
 */
export function evaluateBiddingOutcome(
  hands: HandSignature[],
  bids: number[],
  round: number,
  numPlayers: number
): number[] {
  const utilities: number[] = [];
  const totalBids = bids.reduce((a, b) => a + b, 0);

  for (let p = 0; p < numPlayers; p++) {
    const hand = hands[p];
    const bid = bids[p];

    const expectedTricks = estimateExpectedTricks(hand, round, numPlayers);
    const bidDiff = Math.abs(bid - expectedTricks);
    const makeProb = Math.exp(-bidDiff * CFR_CONFIG.MAKE_PROB_DECAY);

    const makeScore = RISK_ADJUSTMENT.POINTS_PER_CORRECT_BID +
      bid * RISK_ADJUSTMENT.POINTS_PER_TRICK;
    const missScore = -RISK_ADJUSTMENT.PENALTY_PER_MISS * Math.ceil(bidDiff);

    let utility = makeProb * makeScore + (1 - makeProb) * missScore;
    utility = adjustForBidBalance(utility, totalBids, round, bid, numPlayers);

    utilities.push(utility);
  }

  return utilities;
}

function adjustForBidBalance(
  utility: number,
  totalBids: number,
  round: number,
  bid: number,
  numPlayers: number
): number {
  if (totalBids > round) {
    const overbidAmount = totalBids - round;
    return utility - overbidAmount * 2;
  }
  if (totalBids < round) {
    const underbidAmount = round - totalBids;
    if (bid > 0) {
      return utility + underbidAmount * 3 / numPlayers;
    }
    return utility - underbidAmount * 2;
  }
  return utility;
}

/**
 * Estimate expected tricks from hand signature
 */
export function estimateExpectedTricks(
  hand: HandSignature,
  round: number,
  numPlayers: number
): number {
  let expected = hand.wizardCount;

  // Trump strength contribution
  const trumpBonus: Record<string, number> = {
    strong: 0.25,
    medium: 0.15,
    weak: 0.05,
    none: 0,
  };
  expected += round * (trumpBonus[hand.trumpStrength] ?? 0);

  // Off-suit strength contribution
  const offSuitBonus: Record<string, number> = {
    strong: 0.15,
    medium: 0.08,
    weak: 0.02,
  };
  expected += round * (offSuitBonus[hand.offSuitStrength] ?? 0);

  // Void bonus
  expected += hand.voidCount * 0.2;

  // Adjust for player count
  expected *= (4 / numPlayers);

  return Math.min(round, Math.max(0, expected));
}

/**
 * Create hand signature from actual cards
 */
export function createHandSignature(hand: Card[], trumpSuit: Suit | null): HandSignature {
  const wizardCount = hand.filter(c => c.isWizard()).length;
  const jesterCount = hand.filter(c => c.isJester()).length;

  const trumpStrength = calculateTrumpStrength(hand, trumpSuit);
  const offSuitStrength = calculateOffSuitStrength(hand, trumpSuit);
  const voidCount = calculateVoidCount(hand, trumpSuit);

  return {
    wizardCount,
    jesterCount,
    trumpStrength,
    offSuitStrength,
    voidCount,
    handSize: hand.length,
  };
}

function calculateTrumpStrength(
  hand: Card[],
  trumpSuit: Suit | null
): 'none' | 'weak' | 'medium' | 'strong' {
  if (!trumpSuit) return 'none';

  const trumpCards = hand.filter(c => c.suit === trumpSuit);
  const trumpHighCards = trumpCards.filter(c => (c.value ?? 0) >= 10).length;

  if (trumpCards.length >= 4 || trumpHighCards >= 2) return 'strong';
  if (trumpCards.length >= 2 || trumpHighCards >= 1) return 'medium';
  if (trumpCards.length >= 1) return 'weak';
  return 'none';
}

function calculateOffSuitStrength(
  hand: Card[],
  trumpSuit: Suit | null
): 'weak' | 'medium' | 'strong' {
  const offSuitCards = hand.filter(c =>
    !c.isWizard() && !c.isJester() && c.suit !== trumpSuit
  );
  const offSuitHigh = offSuitCards.filter(c => (c.value ?? 0) >= 11).length;

  if (offSuitHigh >= 3) return 'strong';
  if (offSuitHigh >= 1) return 'medium';
  return 'weak';
}

function calculateVoidCount(hand: Card[], trumpSuit: Suit | null): number {
  const suits: Suit[] = [Suit.GIANTS, Suit.ELVES, Suit.DWARVES, Suit.HUMANS];
  return suits.filter(suit =>
    suit !== trumpSuit && !hand.some(c => c.suit === suit)
  ).length;
}
