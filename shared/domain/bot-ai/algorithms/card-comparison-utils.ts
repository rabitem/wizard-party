/**
 * Card Comparison Utilities
 * Helpers for the Monte Carlo playouts. Every rule question (who takes the trick,
 * which cards are legal) is answered by bot-rules.ts, i.e. by the domain's single
 * rules policy, including the room's card rules.
 */

import { Card } from '../../entities/card';
import type { ICardRules } from '../../value-objects/ruleset-config';
import type { Suit } from '../../value-objects/card-types';
import { wouldTakeTrick } from '../bot-rules';

/**
 * Cards that would take the current trick
 */
export function getWinningCards(
  playableCards: Card[],
  currentTrick: { playerId: string; card: Card }[],
  trumpSuit: Suit | null,
  cardRules: ICardRules
): Card[] {
  if (currentTrick.length === 0) {
    return playableCards;
  }
  const trickCards = currentTrick.map((played) => played.card);
  return playableCards.filter((card) => wouldTakeTrick(trickCards, card, trumpSuit, cardRules));
}

/**
 * Cards that would NOT take the current trick
 */
export function getLosingCards(
  playableCards: Card[],
  currentTrick: { playerId: string; card: Card }[],
  trumpSuit: Suit | null,
  cardRules: ICardRules
): Card[] {
  if (currentTrick.length === 0) {
    // When leading, jester is the safest "losing" card
    return playableCards.filter(c => c.isJester());
  }
  const trickCards = currentTrick.map((played) => played.card);
  return playableCards.filter((card) => !wouldTakeTrick(trickCards, card, trumpSuit, cardRules));
}

/**
 * Get card value for comparison (Wizard = high, Jester = low)
 */
export function getCardValue(card: Card): number {
  if (card.isWizard()) {
    return 100;
  }
  if (card.isJester()) {
    return 0;
  }
  return card.value ?? 0;
}

/**
 * Get highest card from list
 */
export function getHighestCard(cards: Card[]): Card {
  let highest = cards[0];
  let highestValue = getCardValue(highest);

  for (let i = 1; i < cards.length; i++) {
    const value = getCardValue(cards[i]);
    if (value > highestValue) {
      highestValue = value;
      highest = cards[i];
    }
  }

  return highest;
}

/**
 * Get lowest card from list
 */
export function getLowestCard(cards: Card[]): Card {
  let lowest = cards[0];
  let lowestValue = getCardValue(lowest);

  for (let i = 1; i < cards.length; i++) {
    const value = getCardValue(cards[i]);
    if (value < lowestValue) {
      lowestValue = value;
      lowest = cards[i];
    }
  }

  return lowest;
}

/**
 * Order players starting from leader
 */
export function orderPlayersFromLeader<T extends { id: string }>(
  players: T[],
  leaderId: string
): T[] {
  const leaderIndex = players.findIndex(p => p.id === leaderId);
  if (leaderIndex === -1) {
    return players;
  }

  return [
    ...players.slice(leaderIndex),
    ...players.slice(0, leaderIndex),
  ];
}
