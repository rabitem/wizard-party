/**
 * Types for ISMCTS Algorithm
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { PlayedCard } from '../../entities/trick';
import type { ICardRules } from '../../value-objects/ruleset-config';
import type { TrickLead } from '../../expansions/trick-lead';

export interface ISMCTSNode {
  action: Card | null;
  parent: ISMCTSNode | null;
  children: Map<string, ISMCTSNode>;
  visits: number;
  totalReward: number;
  availabilityCount: number;
  playerToMove: string;
}

export interface Determinization {
  hands: Map<string, Card[]>;
  trickCards: PlayedCard[];
  /** Tricks each seat has taken since the search started. */
  tricksWon: Map<string, number>;
  /** Lead of the trick being played (pending, free or a suit). */
  lead: TrickLead;
  trumpSuit: Suit | null;
  /** Cards in a complete trick (one per seat). */
  numPlayers: number;
  cardRules: ICardRules;
}

export interface ISMCTSConfig {
  iterations: number;
  explorationConstant: number;
  maxDepth: number;
  informedSampler?: () => Map<string, Card[]>;
}

export const DEFAULT_ISMCTS_CONFIG: ISMCTSConfig = {
  iterations: 1000,
  explorationConstant: 1.414,
  maxDepth: 20,
  informedSampler: undefined,
};

export function createNode(
  action: Card | null,
  parent: ISMCTSNode | null,
  playerToMove: string
): ISMCTSNode {
  return {
    action,
    parent,
    children: new Map(),
    visits: 0,
    totalReward: 0,
    availabilityCount: 0,
    playerToMove,
  };
}
