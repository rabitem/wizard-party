/**
 * Card Inference Feature Extraction
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { PlayedCard } from '../../entities/trick';
import type { ICardRules } from '../../value-objects/ruleset-config';
import { GameContext } from '../types';
import { trickWinnerId, withSuitToFollow } from '../bot-rules';
import { InferenceFeatures } from './card-inference.types';

interface PlayPatternCounts {
  playedHigh: number;
  playedLow: number;
  trumpedIn: number;
  failedToWin: number;
}

export function computeFeaturesForPlayer(
  context: GameContext,
  playerId: string,
  bid: number
): InferenceFeatures {
  const tricksWon = context.playerTricksWon.get(playerId) || 0;
  const tricksRemaining = context.hand.length;
  const tricksNeeded = bid - tricksWon;

  const bidPosition = computeBidPosition(context, playerId);
  const bidRatio = context.currentRound > 0 ? bid / context.currentRound : 0;
  const bidAggressiveness = computeBidAggressiveness(context, bid);
  const playPatterns = countPlayPatterns(context, playerId, bid, tricksRemaining);

  return {
    bidRatio,
    bidPosition,
    bidAggressiveness,
    ...playPatterns,
    tricksNeeded,
    tricksRemaining,
    isDesparate: tricksNeeded >= tricksRemaining,
    isSatisfied: tricksNeeded <= 0,
  };
}

function computeBidPosition(context: GameContext, playerId: string): number {
  const bidders = Array.from(context.playerBids.keys());
  const position = bidders.indexOf(playerId);
  return position / Math.max(1, bidders.length - 1);
}

function computeBidAggressiveness(context: GameContext, bid: number): number {
  const allBids = Array.from(context.playerBids.values());
  const avgBid = allBids.reduce((a, b) => a + b, 0) / allBids.length;
  return avgBid > 0 ? bid / avgBid : 1;
}

function countPlayPatterns(
  context: GameContext,
  playerId: string,
  bid: number,
  tricksRemaining: number
): PlayPatternCounts {
  let playedHigh = 0;
  let playedLow = 0;
  let trumpedIn = 0;
  let failedToWin = 0;

  for (const trick of context.completedTricks) {
    const trickCounts = analyzePlayerTrickPlay(context, trick, playerId, bid, tricksRemaining);
    playedHigh += trickCounts.playedHigh;
    playedLow += trickCounts.playedLow;
    trumpedIn += trickCounts.trumpedIn;
    failedToWin += trickCounts.failedToWin;
  }

  return { playedHigh, playedLow, trumpedIn, failedToWin };
}

function analyzePlayerTrickPlay(
  context: GameContext,
  trick: PlayedCard[],
  playerId: string,
  bid: number,
  tricksRemaining: number
): PlayPatternCounts {
  const result = { playedHigh: 0, playedLow: 0, trumpedIn: 0, failedToWin: 0 };

  const played = withSuitToFollow(trick).find(({ play }) => play.playerId === playerId);
  if (!played) return result;

  const card = Card.fromJSON(played.play.card);
  updateHighLowCounts(card, result);
  updateTrumpedIn(card, played.followSuit, context.trumpSuit, result);
  updateFailedToWin({ context, trick, playerId, card, bid, tricksRemaining, result });

  return result;
}

function updateHighLowCounts(card: Card, result: PlayPatternCounts): void {
  if (card.isWizard() || (card.value ?? 0) >= 10) {
    result.playedHigh++;
  }
  if (card.isJester() || ((card.value ?? 0) <= 5 && !card.isWizard())) {
    result.playedLow++;
  }
}

function updateTrumpedIn(
  card: Card,
  leadSuit: Suit | null | undefined,
  trumpSuit: Suit | null,
  result: PlayPatternCounts
): void {
  if (leadSuit && card.suit === trumpSuit && card.suit !== leadSuit) {
    result.trumpedIn++;
  }
}

interface FailedToWinParams {
  context: GameContext;
  trick: PlayedCard[];
  playerId: string;
  card: Card;
  bid: number;
  tricksRemaining: number;
  result: PlayPatternCounts;
}

function updateFailedToWin(params: FailedToWinParams): void {
  const { context, trick, playerId, card, bid, tricksRemaining, result } = params;
  const currentTricksWon = context.playerTricksWon.get(playerId) || 0;
  const wasDesparate = (bid - currentTricksWon) >= tricksRemaining + 1;
  const didWin = didPlayerWinTrick(trick, playerId, context.trumpSuit, context.cardRules);

  if (wasDesparate && !didWin && !card.isJester()) {
    result.failedToWin++;
  }
}

export function didPlayerWinTrick(
  trick: PlayedCard[],
  playerId: string,
  trumpSuit: Suit | null,
  cardRules: ICardRules
): boolean {
  if (trick.length === 0) return false;
  return trickWinnerId(trick, trumpSuit, cardRules) === playerId;
}
