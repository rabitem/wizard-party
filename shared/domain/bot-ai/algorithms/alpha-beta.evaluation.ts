/**
 * Evaluation functions for Alpha-Beta Search
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { PlayedCard } from '../../entities/trick';
import type { ICardRules } from '../../value-objects/ruleset-config';
import { trickWinnerId, wouldTakePlays } from '../bot-rules';
import { SearchState } from './alpha-beta.types';

/**
 * Evaluate a state for a player
 */
export function evaluateState(
  state: SearchState,
  ourPlayerId: string
): number {
  const ourTricksWon = state.tricksWon.get(ourPlayerId) ?? 0;
  const ourBid = state.bids.get(ourPlayerId) ?? 0;
  const ourHand = state.hands.get(ourPlayerId) ?? [];

  const tricksNeeded = ourBid - ourTricksWon;
  const tricksRemaining = ourHand.length;

  let score = 0;

  if (tricksNeeded <= 0) {
    score = 100;
    const extraTrickRisk = estimateExtraTrickRisk(ourHand, state);
    score -= extraTrickRisk * 20;
  } else if (tricksNeeded > tricksRemaining) {
    score = -100 - (tricksNeeded - tricksRemaining) * 30;
  } else {
    const makeProb = estimateMakeProbability(ourHand, tricksNeeded, state);
    score = makeProb * 100 - (1 - makeProb) * 50;
  }

  for (const [playerId, tricksWon] of state.tricksWon) {
    if (playerId === ourPlayerId) continue;
    const oppBid = state.bids.get(playerId) ?? 0;
    const oppNeeded = oppBid - tricksWon;
    const oppHand = state.hands.get(playerId) ?? [];
    if (oppNeeded > oppHand.length) {
      score += 10;
    }
  }

  return score;
}

/**
 * Estimate probability of making bid
 */
export function estimateMakeProbability(
  hand: Card[],
  tricksNeeded: number,
  state: SearchState
): number {
  if (tricksNeeded <= 0) return 1;
  if (tricksNeeded > hand.length) return 0;

  let strongCards = 0;
  for (const card of hand) {
    if (card.isWizard()) {
      strongCards += 1;
    } else if (card.suit === state.trumpSuit && (card.value ?? 0) >= 10) {
      strongCards += 0.7;
    } else if (card.suit === state.trumpSuit) {
      strongCards += 0.4;
    } else if ((card.value ?? 0) >= 12) {
      strongCards += 0.3;
    }
  }

  const ratio = strongCards / tricksNeeded;
  return Math.min(1, Math.max(0, ratio));
}

/**
 * Estimate risk of winning extra tricks
 */
export function estimateExtraTrickRisk(hand: Card[], state: SearchState): number {
  let risk = 0;
  for (const card of hand) {
    if (card.isWizard()) {
      risk += 0.9;
    } else if (card.suit === state.trumpSuit && (card.value ?? 0) >= 10) {
      risk += 0.6;
    } else if ((card.value ?? 0) >= 12) {
      risk += 0.3;
    }
  }
  return risk;
}

/**
 * Heuristic score for move ordering
 */
export function moveOrderingScore(
  card: Card,
  state: SearchState,
  ourPlayerId: string,
  wouldWinFn: (card: Card) => boolean
): number {
  const ourBid = state.bids.get(ourPlayerId) ?? 0;
  const ourTricksWon = state.tricksWon.get(ourPlayerId) ?? 0;
  const tricksNeeded = ourBid - ourTricksWon;

  let score = 0;

  if (tricksNeeded > 0) {
    if (card.isWizard()) score += 100;
    else if (card.suit === state.trumpSuit) score += 50 + (card.value ?? 0);
    else score += card.value ?? 0;

    if (wouldWinFn(card)) score += 30;
  } else {
    if (card.isJester()) score += 100;
    else if (card.isWizard()) score -= 50;
    else score += 13 - (card.value ?? 0);

    if (!wouldWinFn(card)) score += 30;
  }

  return score;
}

/**
 * Check if card would win current trick (a lead card holds it for now)
 */
export function wouldWinTrick(
  card: Card,
  trickCards: PlayedCard[],
  trumpSuit: Suit | null,
  cardRules: ICardRules
): boolean {
  if (trickCards.length === 0) return true;
  return wouldTakePlays(trickCards, card, trumpSuit, cardRules);
}

/**
 * Determine the winner of a completed trick
 */
export function determineTrickWinner(
  trickCards: PlayedCard[],
  trumpSuit: Suit | null,
  cardRules: ICardRules
): string {
  if (trickCards.length === 0) {
    throw new Error('Cannot determine winner of empty trick');
  }
  return trickWinnerId(trickCards, trumpSuit, cardRules);
}
