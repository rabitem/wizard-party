/**
 * ISMCTS Utility Functions
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { PlayedCard } from '../../entities/trick';
import type { ICardRules } from '../../value-objects/ruleset-config';
import { PENDING_LEAD } from '../../expansions/trick-lead';
import { leadAfterCard, legalCards, trickWinnerId, wouldTakePlays } from '../bot-rules';
import { Determinization } from './ismcts.types';

export function getCardValue(card: Card): number {
  if (card.isJester()) return 0;
  if (card.isWizard()) return 100;
  return card.value ?? 0;
}

export function getLowestCard(cards: Card[]): Card {
  return cards.reduce((lowest, card) =>
    getCardValue(card) < getCardValue(lowest) ? card : lowest, cards[0]);
}

export function getHighestCard(cards: Card[]): Card {
  return cards.reduce((highest, card) =>
    getCardValue(card) > getCardValue(highest) ? card : highest, cards[0]);
}

/**
 * Whether the card would take the trick as it stands (a lead card holds it for now).
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

export function copyDeterminization(det: Determinization): Determinization {
  const handsCopy = new Map<string, Card[]>();
  for (const [playerId, hand] of det.hands) {
    handsCopy.set(playerId, [...hand]);
  }
  return {
    hands: handsCopy,
    trickCards: [...det.trickCards],
    tricksWon: new Map(det.tricksWon),
    lead: det.lead,
    trumpSuit: det.trumpSuit,
    numPlayers: det.numPlayers,
    cardRules: det.cardRules,
  };
}

export function cardToKey(card: Card): string {
  return card.id;
}

export function getLegalActionsForPlayer(
  det: Determinization,
  playerId: string
): Card[] {
  const hand = det.hands.get(playerId);
  if (!hand || hand.length === 0) return [];
  return legalCards(hand, det.lead);
}

/**
 * Play a card in the determinization. A complete trick is credited to its winner
 * and cleared so the next one starts with a pending lead.
 */
export function applyAction(det: Determinization, card: Card, playerId: string): void {
  const hand = det.hands.get(playerId);
  if (hand) {
    const idx = hand.findIndex(c => cardToKey(c) === cardToKey(card));
    if (idx >= 0) hand.splice(idx, 1);
  }

  det.trickCards.push({ playerId, card });
  det.lead = leadAfterCard(det.lead, card);

  if (det.trickCards.length >= det.numPlayers) {
    const winnerId = trickWinnerId(det.trickCards, det.trumpSuit, det.cardRules);
    det.tricksWon.set(winnerId, (det.tricksWon.get(winnerId) ?? 0) + 1);
    det.trickCards = [];
    det.lead = PENDING_LEAD;
  }
}
