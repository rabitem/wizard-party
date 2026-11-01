/**
 * Alpha-Beta Search with Determinization Sampling
 */

import { Card } from '../../entities/card';
import { GameContext } from '../types';
import { InformationSet } from '../information-set';
import {
  SearchState,
  SearchResult,
  AlphaBetaConfig,
  DEFAULT_ALPHABETA_CONFIG,
} from './alpha-beta.types';
import {
  evaluateState,
  moveOrderingScore as evalMoveOrderingScore,
  wouldWinTrick as evalWouldWinTrick,
  determineTrickWinner,
} from './alpha-beta.evaluation';
import { PENDING_LEAD } from '../../expansions/trick-lead';
import { isBudgetExhausted, type DecisionBudget } from '../decision-budget';
import { leadAfterCard, legalCards } from '../bot-rules';

export type { AlphaBetaConfig } from './alpha-beta.types';
export { DEFAULT_ALPHABETA_CONFIG } from './alpha-beta.types';

/**
 * Alpha-Beta Search Engine
 */
export class AlphaBetaSearch {
  private config: AlphaBetaConfig;
  private informationSet: InformationSet;
  private ourPlayerId: string;
  private nodesSearched: number = 0;
  private budget: DecisionBudget | undefined;
  private timeExpired: boolean = false;

  constructor(
    informationSet: InformationSet,
    ourPlayerId: string,
    config: Partial<AlphaBetaConfig> = {}
  ) {
    this.config = { ...DEFAULT_ALPHABETA_CONFIG, ...config };
    this.informationSet = informationSet;
    this.ourPlayerId = ourPlayerId;
  }

  /**
   * Find the best card to play using Alpha-Beta search
   */
  findBestCard(context: GameContext, playableCards: Card[]): SearchResult {
    if (playableCards.length === 0) {
      throw new Error('No playable cards');
    }

    if (playableCards.length === 1) {
      return {
        action: playableCards[0],
        score: 0,
        nodesSearched: 0,
        depthReached: 0,
      };
    }

    this.budget = context.budget;
    this.timeExpired = false;
    this.nodesSearched = 0;

    // Aggregate scores across multiple determinizations
    const actionScores = new Map<string, { total: number; count: number }>();

    for (const card of playableCards) {
      actionScores.set(this.cardToKey(card), { total: 0, count: 0 });
    }

    // Sample multiple determinizations
    for (let sample = 0; sample < this.config.numSamples; sample++) {
      if (this.isTimeExpired()) break;

      const state = this.createInitialState(context);

      if (this.config.iterativeDeepening) {
        // Iterative deepening
        for (let depth = 1; depth <= this.config.maxDepth; depth++) {
          if (this.isTimeExpired()) break;

          const result = this.searchRoot(state, playableCards, depth);

          // Update scores for best action at this depth
          const key = this.cardToKey(result.action);
          const scores = actionScores.get(key);
          if (scores) {
            scores.total += result.score;
            scores.count++;
          }
        }
      } else {
        // Fixed depth search
        const result = this.searchRoot(state, playableCards, this.config.maxDepth);

        const key = this.cardToKey(result.action);
        const scores = actionScores.get(key);
        if (scores) {
          scores.total += result.score;
          scores.count++;
        }
      }
    }

    // Find action with best average score
    let bestAction = playableCards[0];
    let bestAvgScore = -Infinity;

    for (const card of playableCards) {
      const key = this.cardToKey(card);
      const scores = actionScores.get(key);

      if (scores && scores.count > 0) {
        const avgScore = scores.total / scores.count;
        if (avgScore > bestAvgScore) {
          bestAvgScore = avgScore;
          bestAction = card;
        }
      }
    }

    return {
      action: bestAction,
      score: bestAvgScore,
      nodesSearched: this.nodesSearched,
      depthReached: this.config.maxDepth,
    };
  }

  /**
   * Search from root with given depth
   */
  private searchRoot(
    state: SearchState,
    playableCards: Card[],
    depth: number
  ): { action: Card; score: number } {
    let bestAction = playableCards[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;

    // Order moves for better pruning
    const orderedCards = this.config.moveOrdering
      ? this.orderMoves(playableCards, state)
      : playableCards;

    for (const card of orderedCards) {
      if (this.isTimeExpired()) break;

      // Apply action
      const newState = this.applyAction(state, card);

      // Recursive search
      const score = -this.alphaBeta(newState, depth - 1, -beta, -alpha, false);

      if (score > bestScore) {
        bestScore = score;
        bestAction = card;
      }

      alpha = Math.max(alpha, score);
    }

    return { action: bestAction, score: bestScore };
  }

  /**
   * Alpha-Beta search with negamax formulation
   */
  private alphaBeta(
    state: SearchState,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean
  ): number {
    this.nodesSearched++;

    // Check termination conditions
    if (this.isTimeExpired()) {
      return this.evaluate(state);
    }

    if (depth === 0 || this.isTerminal(state)) {
      return this.evaluate(state);
    }

    // Get legal moves
    const legalMoves = this.getLegalMoves(state);
    if (legalMoves.length === 0) {
      return this.evaluate(state);
    }

    // Order moves
    const orderedMoves = this.config.moveOrdering
      ? this.orderMoves(legalMoves, state)
      : legalMoves;

    let bestScore = -Infinity;

    for (const move of orderedMoves) {
      const newState = this.applyAction(state, move);

      // Negamax formulation
      const score = -this.alphaBeta(newState, depth - 1, -beta, -alpha, !maximizing);

      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);

      // Beta cutoff
      if (alpha >= beta) {
        break;
      }
    }

    return bestScore;
  }

  private evaluate(state: SearchState): number {
    return evaluateState(state, this.ourPlayerId);
  }

  /**
   * Check if state is terminal
   */
  private isTerminal(state: SearchState): boolean {
    // Check if all hands are empty
    for (const hand of state.hands.values()) {
      if (hand.length > 0) return false;
    }
    return true;
  }

  /**
   * Get legal moves for current player
   */
  private getLegalMoves(state: SearchState): Card[] {
    const hand = state.hands.get(state.currentPlayer);
    if (!hand || hand.length === 0) return [];
    return legalCards(hand, state.lead);
  }

  private orderMoves(moves: Card[], state: SearchState): Card[] {
    const wouldWinFn = (card: Card) => evalWouldWinTrick(card, state.trickCards, state.trumpSuit, state.cardRules);
    const scoredMoves = moves.map(card => ({
      card,
      score: evalMoveOrderingScore(card, state, this.ourPlayerId, wouldWinFn),
    }));
    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves.map(m => m.card);
  }

  /**
   * Apply an action to create new state
   */
  private applyAction(state: SearchState, card: Card): SearchState {
    // Deep copy state
    const newState = this.copyState(state);

    // Remove card from hand
    const hand = newState.hands.get(state.currentPlayer);
    if (hand) {
      const idx = hand.findIndex(c => this.cardToKey(c) === this.cardToKey(card));
      if (idx >= 0) {
        hand.splice(idx, 1);
      }
    }

    // Add to trick
    newState.trickCards.push({
      playerId: state.currentPlayer,
      card,
    });
    newState.lead = leadAfterCard(state.lead, card);

    // Check if trick is complete
    if (newState.trickCards.length === state.playerOrder.length) {
      // Determine winner
      const winnerId = this.determineTrickWinnerFromState(newState);
      const wins = newState.tricksWon.get(winnerId) ?? 0;
      newState.tricksWon.set(winnerId, wins + 1);

      // Clear trick
      newState.trickCards = [];
      newState.lead = PENDING_LEAD;

      // Winner leads next
      newState.currentPlayerIndex = state.playerOrder.indexOf(winnerId);
      newState.currentPlayer = winnerId;
    } else {
      // Next player
      newState.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.playerOrder.length;
      newState.currentPlayer = state.playerOrder[newState.currentPlayerIndex];
    }

    return newState;
  }

  /**
   * Determine winner of completed trick
   */
  private determineTrickWinnerFromState(state: SearchState): string {
    return determineTrickWinner(state.trickCards, state.trumpSuit, state.cardRules);
  }

  /**
   * Create initial state from game context
   */
  private createInitialState(context: GameContext): SearchState {
    // Sample opponent hands
    const hands = this.informationSet.sampleDeterminization(context.hand.length);
    hands.set(this.ourPlayerId, [...context.hand]);

    // Build player order (every seat, not only the bids this seat can see)
    const playerOrder = [...context.playerIds];

    // Find current player index
    const currentPlayerIndex = Math.max(0, playerOrder.indexOf(this.ourPlayerId));

    // Copy tricks won
    const tricksWon = new Map<string, number>();
    for (const [playerId, tricks] of context.playerTricksWon) {
      tricksWon.set(playerId, tricks);
    }

    // Copy bids
    const bids = new Map<string, number>();
    for (const [playerId, bid] of context.playerBids) {
      bids.set(playerId, bid);
    }

    return {
      hands,
      trickCards: [...context.currentTrickCards],
      lead: context.lead,
      trumpSuit: context.trumpSuit,
      cardRules: context.cardRules,
      tricksWon,
      bids,
      currentPlayer: this.ourPlayerId,
      playerOrder,
      currentPlayerIndex,
    };
  }

  private copyState(state: SearchState): SearchState {
    return {
      hands: new Map(Array.from(state.hands, ([k, v]) => [k, [...v]])),
      trickCards: [...state.trickCards],
      lead: state.lead,
      trumpSuit: state.trumpSuit,
      cardRules: state.cardRules,
      tricksWon: new Map(state.tricksWon),
      bids: new Map(state.bids),
      currentPlayer: state.currentPlayer,
      playerOrder: [...state.playerOrder],
      currentPlayerIndex: state.currentPlayerIndex,
    };
  }

  private isTimeExpired(): boolean {
    if (this.timeExpired) return true;
    if (isBudgetExhausted(this.budget)) {
      this.timeExpired = true;
      return true;
    }
    return false;
  }

  private cardToKey(card: Card): string {
    return card.id;
  }
}

export function createAlphaBetaSearch(
  informationSet: InformationSet,
  ourPlayerId: string,
  config?: Partial<AlphaBetaConfig>
): AlphaBetaSearch {
  return new AlphaBetaSearch(informationSet, ourPlayerId, config);
}
