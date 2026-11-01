/**
 * Extended Perfect Information Monte Carlo (EPIMC)
 */

import { Card } from '../../entities/card';
import { PlayedCard } from '../../entities/trick';
import { GameContext } from '../types';
import { InformationSet } from '../information-set';
import {
  EPIMCConfig,
  DEFAULT_EPIMC_CONFIG,
  ActionValue,
  SearchState,
} from './epimc.types';
import {
  determineTrickWinner,
  getLegalCards,
  evaluateTerminal,
  heuristicValue,
  selectSimulationAction,
} from './epimc.utils';
import { PENDING_LEAD } from '../../expansions/trick-lead';
import { isBudgetExhausted } from '../decision-budget';
import { leadAfterCard, suitToFollow } from '../bot-rules';

export type { EPIMCConfig } from './epimc.types';
export { DEFAULT_EPIMC_CONFIG } from './epimc.types';

export class EPIMC {
  private config: EPIMCConfig;
  private informationSet: InformationSet;
  private ourPlayerId: string;
  private numPlayers: number;

  constructor(
    informationSet: InformationSet,
    ourPlayerId: string,
    numPlayers: number,
    config: Partial<EPIMCConfig> = {}
  ) {
    this.config = { ...DEFAULT_EPIMC_CONFIG, ...config };
    this.informationSet = informationSet;
    this.ourPlayerId = ourPlayerId;
    this.numPlayers = numPlayers;
  }

  selectCard(context: GameContext, playableCards: Card[]): Card {
    if (playableCards.length === 0) throw new Error('No playable cards');
    if (playableCards.length === 1) return playableCards[0];

    if (context.hand.length <= this.config.pimcFallbackThreshold) {
      return this.pimcSelect(context, playableCards);
    }

    const state = this.createInitialState(context);
    const actionValues: ActionValue[] = [];

    // Anytime: actions not evaluated before the deadline get a heuristic value.
    for (const card of playableCards) {
      if (isBudgetExhausted(context.budget)) break;
      const value = this.evaluateAction(card, state, context, 0);
      actionValues.push(value);
    }

    this.fillMissingActions(playableCards, actionValues, state);
    actionValues.sort((a, b) => b.expectedValue - a.expectedValue);
    return actionValues[0].card;
  }

  private createInitialState(context: GameContext): SearchState {
    return {
      ourHand: [...context.hand],
      trickCards: [...context.currentTrickCards],
      lead: context.lead,
      trumpSuit: context.trumpSuit,
      cardRules: context.cardRules,
      currentPlayer: this.ourPlayerId,
      ourPlayerId: this.ourPlayerId,
      tricksWon: context.myTricksWon,
      bid: context.myBid ?? 0,
    };
  }

  private fillMissingActions(playableCards: Card[], actionValues: ActionValue[], state: SearchState): void {
    for (const card of playableCards) {
      if (!actionValues.find(av => av.card.id === card.id)) {
        actionValues.push({
          card,
          expectedValue: heuristicValue(card, state),
          variance: 0.5,
          sampleCount: 1,
        });
      }
    }
  }

  private evaluateAction(card: Card, state: SearchState, context: GameContext, depth: number): ActionValue {
    const newState = this.applyAction(card, state);

    if (depth >= this.config.delayDepth) {
      return this.pimcEvaluate(card, newState, context);
    }

    return this.expectimaxEvaluate(card, newState, context, depth);
  }

  private expectimaxEvaluate(card: Card, state: SearchState, context: GameContext, depth: number): ActionValue {
    if (state.currentPlayer === this.ourPlayerId) {
      return this.maximizeOurActions(card, state, context, depth);
    }
    return this.expectOverOpponentActions(card, state, context, depth);
  }

  private maximizeOurActions(card: Card, state: SearchState, context: GameContext, depth: number): ActionValue {
    const playable = getLegalCards(state.ourHand, state.lead);
    if (playable.length === 0) {
      return { card, expectedValue: evaluateTerminal(state), variance: 0, sampleCount: 1 };
    }

    let bestValue = -Infinity;
    for (const ourCard of playable) {
      const value = this.evaluateAction(ourCard, state, context, depth + 1);
      bestValue = Math.max(bestValue, value.expectedValue);
    }

    return { card, expectedValue: bestValue, variance: 0.1, sampleCount: playable.length };
  }

  private expectOverOpponentActions(card: Card, state: SearchState, context: GameContext, depth: number): ActionValue {
    const opponentActions = this.getOpponentActionProbabilities(state);

    if (opponentActions.length === 0) {
      return { card, expectedValue: evaluateTerminal(state), variance: 0, sampleCount: 1 };
    }

    let expectedValue = 0;
    let totalWeight = 0;

    for (const { action, probability } of opponentActions) {
      const newState = this.applyOpponentAction(action, state);
      const value = this.evaluateAction(card, newState, context, depth + 1);
      expectedValue += value.expectedValue * probability;
      totalWeight += probability;
    }

    if (totalWeight > 0) expectedValue /= totalWeight;

    return { card, expectedValue, variance: 0.2, sampleCount: opponentActions.length };
  }

  private getOpponentActionProbabilities(state: SearchState): { action: Card; probability: number }[] {
    const opponents = this.informationSet.getAllOpponents();
    const actions: { action: Card; probability: number }[] = [];
    const unseenCards = this.informationSet.getUnseenCards();

    const opponent = opponents[0];
    if (!opponent) return actions;

    const followSuit = suitToFollow(state.lead);
    const canPlaySuit = followSuit
      ? unseenCards.filter(c => c.suit === followSuit && !opponent.voidSuits.has(followSuit))
      : unseenCards;

    const needsToWin = opponent.tricksNeeded > 0;
    const needsToLose = opponent.isSatisfied;

    for (const card of canPlaySuit.slice(0, 5)) {
      const baseProb = 1 / Math.max(1, canPlaySuit.length);
      const prob = this.adjustCardProbability(card, baseProb, needsToWin, needsToLose);
      actions.push({ action: card, probability: prob });
    }

    const total = actions.reduce((sum, a) => sum + a.probability, 0);
    for (const action of actions) action.probability /= total || 1;

    return actions;
  }

  private adjustCardProbability(card: Card, baseProb: number, needsToWin: boolean, needsToLose: boolean): number {
    const isHighCard = (card.value ?? 0) >= 10 || card.isWizard();
    let prob = baseProb;

    if (needsToWin && isHighCard) prob *= 1.5;
    else if (needsToLose && !isHighCard) prob *= 1.5;
    else if (needsToWin && !isHighCard) prob *= 0.7;
    else if (needsToLose && isHighCard) prob *= 0.7;

    return prob;
  }

  private pimcEvaluate(card: Card, state: SearchState, context: GameContext): ActionValue {
    const numSamples = this.config.determinizationsPerNode;
    const values: number[] = [];

    for (let i = 0; i < numSamples; i++) {
      const det = this.informationSet.sampleDeterminization(state.ourHand.length);
      det.set(this.ourPlayerId, [...state.ourHand]);
      const value = this.simulateFromDeterminization(state, det);
      values.push(value);
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;

    return { card, expectedValue: mean, variance, sampleCount: numSamples };
  }

  private simulateFromDeterminization(state: SearchState, hands: Map<string, Card[]>): number {
    let simState = { ...state };
    let currentPlayer = state.currentPlayer;
    const playerOrder = Array.from(hands.keys());
    let depth = 0;
    const maxDepth = state.ourHand.length * this.numPlayers;

    while (depth < maxDepth) {
      const playerHand = currentPlayer === this.ourPlayerId ? simState.ourHand : hands.get(currentPlayer) || [];
      if (playerHand.length === 0) break;

      const legal = getLegalCards(playerHand, simState.lead);
      if (legal.length === 0) break;

      const action = selectSimulationAction(legal, currentPlayer === this.ourPlayerId, simState);

      if (currentPlayer === this.ourPlayerId) {
        simState = this.applyAction(action, simState);
      } else {
        simState = this.applyOpponentAction(action, simState);
        const opHand = hands.get(currentPlayer);
        if (opHand) {
          const idx = opHand.findIndex(c => c.id === action.id);
          if (idx >= 0) opHand.splice(idx, 1);
        }
      }

      const idx = playerOrder.indexOf(currentPlayer);
      currentPlayer = playerOrder[(idx + 1) % playerOrder.length];
      depth++;
    }

    return evaluateTerminal(simState);
  }

  private pimcSelect(context: GameContext, playableCards: Card[]): Card {
    const actionValues = playableCards.map(card => {
      const state: SearchState = {
        ourHand: context.hand.filter(c => c.id !== card.id),
        trickCards: [...context.currentTrickCards, { playerId: this.ourPlayerId, card }],
        lead: leadAfterCard(context.lead, card),
        trumpSuit: context.trumpSuit,
        cardRules: context.cardRules,
        currentPlayer: this.ourPlayerId,
        ourPlayerId: this.ourPlayerId,
        tricksWon: context.myTricksWon,
        bid: context.myBid ?? 0,
      };
      return this.pimcEvaluate(card, state, context);
    });

    actionValues.sort((a, b) => b.expectedValue - a.expectedValue);
    return actionValues[0].card;
  }

  private applyAction(card: Card, state: SearchState): SearchState {
    const newHand = state.ourHand.filter(c => c.id !== card.id);
    const newTrickCards: PlayedCard[] = [
      ...state.trickCards,
      { playerId: this.ourPlayerId, card }
    ];

    const newLead = leadAfterCard(state.lead, card);

    if (newTrickCards.length >= this.numPlayers) {
      const winner = determineTrickWinner(newTrickCards, state.trumpSuit, this.ourPlayerId, state.cardRules);
      const tricksWon = winner === this.ourPlayerId ? state.tricksWon + 1 : state.tricksWon;
      return { ...state, ourHand: newHand, trickCards: [], lead: PENDING_LEAD, tricksWon, currentPlayer: winner };
    }

    const nextPlayer = this.getNextPlayer(state.currentPlayer);
    return { ...state, ourHand: newHand, trickCards: newTrickCards, lead: newLead, currentPlayer: nextPlayer };
  }

  private applyOpponentAction(card: Card, state: SearchState): SearchState {
    const newTrickCards: PlayedCard[] = [
      ...state.trickCards,
      { playerId: state.currentPlayer, card }
    ];

    const newLead = leadAfterCard(state.lead, card);

    if (newTrickCards.length >= this.numPlayers) {
      const winner = determineTrickWinner(newTrickCards, state.trumpSuit, this.ourPlayerId, state.cardRules);
      const tricksWon = winner === this.ourPlayerId ? state.tricksWon + 1 : state.tricksWon;
      return { ...state, trickCards: [], lead: PENDING_LEAD, tricksWon, currentPlayer: winner };
    }

    const nextPlayer = this.getNextPlayer(state.currentPlayer);
    return { ...state, trickCards: newTrickCards, lead: newLead, currentPlayer: nextPlayer };
  }

  private getNextPlayer(currentPlayer: string): string {
    const opponents = this.informationSet.getAllOpponents();
    if (currentPlayer === this.ourPlayerId && opponents.length > 0) {
      return opponents[0].playerId;
    }
    return this.ourPlayerId;
  }
}

export function createEPIMC(
  informationSet: InformationSet,
  ourPlayerId: string,
  numPlayers: number,
  config?: Partial<EPIMCConfig>
): EPIMC {
  return new EPIMC(informationSet, ourPlayerId, numPlayers, config);
}
