/**
 * Types for Alpha-Beta Search
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { PlayedCard } from '../../entities/trick';
import type { ICardRules } from '../../value-objects/ruleset-config';
import type { TrickLead } from '../../expansions/trick-lead';

/**
 * Game state for search
 */
export interface SearchState {
  /** Current hands (determinized) */
  hands: Map<string, Card[]>;

  /** Current trick cards */
  trickCards: PlayedCard[];

  /** Lead of the trick being played (pending, free or a suit) */
  lead: TrickLead;

  /** Trump suit */
  trumpSuit: Suit | null;

  /** The room's card rules */
  cardRules: ICardRules;

  /** Tricks won by each player */
  tricksWon: Map<string, number>;

  /** Bids by each player */
  bids: Map<string, number>;

  /** Current player to act */
  currentPlayer: string;

  /** Player order */
  playerOrder: string[];

  /** Current player index in order */
  currentPlayerIndex: number;
}

/**
 * Search result
 */
export interface SearchResult {
  /** Best action found */
  action: Card;

  /** Evaluation score */
  score: number;

  /** Number of nodes searched */
  nodesSearched: number;

  /** Depth reached */
  depthReached: number;
}

/**
 * Configuration for Alpha-Beta search
 */
export interface AlphaBetaConfig {
  /** Maximum search depth (ply) */
  maxDepth: number;

  /** Number of determinization samples */
  numSamples: number;

  /** Use iterative deepening */
  iterativeDeepening: boolean;

  /** Use move ordering heuristics */
  moveOrdering: boolean;

  /** Use transposition table */
  transpositionTable: boolean;
}

/**
 * Default Alpha-Beta configuration
 */
export const DEFAULT_ALPHABETA_CONFIG: AlphaBetaConfig = {
  maxDepth: 4,
  numSamples: 20,
  iterativeDeepening: true,
  moveOrdering: true,
  transpositionTable: false,
};
