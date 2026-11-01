/**
 * EPIMC Utility Functions
 */

import { Card } from '../../entities/card';
import { PlayedCard } from '../../entities/trick';
import type { ICardRules } from '../../value-objects/ruleset-config';
import type { Suit } from '../../value-objects/card-types';
import type { TrickLead } from '../../expansions/trick-lead';
import { legalCards, trickWinnerId } from '../bot-rules';
import { SearchState } from './epimc.types';

export function determineTrickWinner(
  trickCards: PlayedCard[],
  trumpSuit: Suit | null,
  ourPlayerId: string,
  cardRules: ICardRules
): string {
  if (trickCards.length === 0) return ourPlayerId;
  return trickWinnerId(trickCards, trumpSuit, cardRules);
}

export function getLegalCards(hand: Card[], lead: TrickLead): Card[] {
  return legalCards(hand, lead);
}

export function evaluateTerminal(state: SearchState): number {
  const tricksNeeded = state.bid - state.tricksWon;

  if (tricksNeeded === 0) return 1.0;
  if (tricksNeeded < 0) return 0.3;
  return Math.max(0, 0.2 - tricksNeeded * 0.05);
}

export function heuristicValue(card: Card, state: SearchState): number {
  const tricksNeeded = state.bid - state.tricksWon;

  if (card.isWizard()) return tricksNeeded > 0 ? 0.9 : 0.3;
  if (card.isJester()) return tricksNeeded <= 0 ? 0.8 : 0.2;

  const value = (card.value ?? 0) / 13;
  const isTrump = card.suit === state.trumpSuit;

  if (tricksNeeded > 0) {
    return isTrump ? 0.6 + value * 0.3 : 0.3 + value * 0.3;
  }
  return 0.5 + (1 - value) * 0.3;
}

export function getCardSortValue(card: Card): number {
  if (card.isWizard()) return 100;
  if (card.isJester()) return 0;
  return card.value ?? 0;
}

export function getHighestCard(cards: Card[]): Card {
  return cards.reduce((best, card) =>
    getCardSortValue(card) > getCardSortValue(best) ? card : best, cards[0]);
}

export function getLowestCard(cards: Card[]): Card {
  return cards.reduce((best, card) =>
    getCardSortValue(card) < getCardSortValue(best) ? card : best, cards[0]);
}

export function selectSimulationAction(legal: Card[], isOurTurn: boolean, state: SearchState): Card {
  if (Math.random() < 0.15) {
    return legal[Math.floor(Math.random() * legal.length)];
  }

  const tricksNeeded = state.bid - state.tricksWon;
  const needToWin = tricksNeeded > 0;

  if (isOurTurn) {
    return needToWin ? getHighestCard(legal) : getLowestCard(legal);
  }
  return legal[Math.floor(legal.length / 2)];
}
