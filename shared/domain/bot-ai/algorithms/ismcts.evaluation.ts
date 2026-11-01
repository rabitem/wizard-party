/**
 * ISMCTS Evaluation Functions
 */

import { Card } from '../../entities/card';
import { GameContext } from '../types';
import { Determinization } from './ismcts.types';

interface BidSuccessParams {
  ourHand: Card[];
  det: Determinization;
  tricksNeeded: number;
  tricksRemaining: number;
  ourPlayerId: string;
}

export function evaluateState(det: Determinization, context: GameContext, ourPlayerId: string): number {
  const ourHand = det.hands.get(ourPlayerId) || [];
  const tricksWon = context.myTricksWon + (det.tricksWon.get(ourPlayerId) ?? 0);
  // Taking more tricks than the bid misses it as surely as taking fewer.
  if (tricksWon > (context.myBid ?? 0)) return 0;
  const tricksNeeded = (context.myBid ?? 0) - tricksWon;
  const tricksRemaining = ourHand.length;

  if (tricksRemaining === 0) {
    return tricksNeeded <= 0 ? 1.0 : 0.0;
  }

  if (tricksNeeded <= 0) {
    return evaluateLoseAllProbability(ourHand, det, context, ourPlayerId);
  }

  if (tricksNeeded > tricksRemaining) {
    const shortfall = tricksNeeded - tricksRemaining;
    return Math.max(0, 0.2 * Math.pow(0.5, shortfall));
  }

  return evaluateBidSuccess({ ourHand, det, tricksNeeded, tricksRemaining, ourPlayerId });
}

function evaluateLoseAllProbability(
  ourHand: Card[],
  det: Determinization,
  context: GameContext,
  ourPlayerId: string
): number {
  let probLoseAll = 1.0;

  for (const card of ourHand) {
    const winProb = estimateCardWinProbability(card, det, ourPlayerId);
    probLoseAll *= (1 - winProb);
  }

  return 0.5 + probLoseAll * 0.5;
}

function evaluateBidSuccess(params: BidSuccessParams): number {
  const { ourHand, det, tricksNeeded, tricksRemaining, ourPlayerId } = params;
  const cardWinProbs = ourHand.map(card => estimateCardWinProbability(card, det, ourPlayerId));
  cardWinProbs.sort((a, b) => b - a);
  return calculateBidSuccessProbability(cardWinProbs, tricksNeeded, tricksRemaining);
}

export function estimateCardWinProbability(card: Card, det: Determinization, ourPlayerId: string): number {
  if (card.isWizard()) return 0.95;
  if (card.isJester()) return 0.0;

  const value = card.value ?? 0;
  const isTrump = card.suit === det.trumpSuit;
  const numOpponents = Array.from(det.hands.entries())
    .filter(([id, hand]) => id !== ourPlayerId && hand.length > 0).length;

  if (numOpponents === 0) return 1.0;

  const normalizedValue = normalizeCardValue(value);
  let winProb = calculateBaseWinProbability(normalizedValue, isTrump, numOpponents);
  winProb *= Math.pow(0.92, numOpponents);

  return Math.max(0, Math.min(1, winProb));
}

function normalizeCardValue(value: number): number {
  if (value <= 9) {
    return (value - 1) * 0.03;
  }
  const pos = (value - 9) / 4;
  return 0.27 + Math.pow(pos, 1.5) * 0.73;
}

function calculateBaseWinProbability(normalizedValue: number, isTrump: boolean, numOpponents: number): number {
  if (isTrump) {
    return 0.35 + normalizedValue * 0.55;
  }
  const trumpRisk = 1 - Math.pow(0.7, numOpponents);
  return normalizedValue * 0.6 * (1 - trumpRisk);
}

export function calculateBidSuccessProbability(
  winProbs: number[],
  tricksNeeded: number,
  tricksRemaining: number
): number {
  if (tricksNeeded <= 0) return 1.0;
  if (tricksNeeded > tricksRemaining) return 0.0;

  const expectedWins = winProbs.reduce((sum, p) => sum + p, 0);
  const variance = winProbs.reduce((sum, p) => sum + p * (1 - p), 0);

  if (variance < 0.01) {
    return expectedWins >= tricksNeeded ? 0.95 : 0.05;
  }

  const stdDev = Math.sqrt(variance);
  const zScore = (tricksNeeded - 0.5 - expectedWins) / stdDev;
  const probSuccess = 1 / (1 + Math.exp(1.7 * zScore));

  return Math.max(0, Math.min(1, probSuccess));
}
