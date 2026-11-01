/**
 * Types for EPIMC Algorithm
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { PlayedCard } from '../../entities/trick';
import type { ICardRules } from '../../value-objects/ruleset-config';
import type { TrickLead } from '../../expansions/trick-lead';
import { EPIMC_CONFIG } from '../../constants/bot-ai.constants';

export interface EPIMCConfig {
  delayDepth: number;
  determinizationsPerNode: number;
  pimcFallbackThreshold: number;
  epimcWeight: number;
}

export const DEFAULT_EPIMC_CONFIG: EPIMCConfig = {
  delayDepth: EPIMC_CONFIG.DELAY_DEPTH,
  determinizationsPerNode: EPIMC_CONFIG.DETERMINIZATIONS_PER_NODE,
  pimcFallbackThreshold: EPIMC_CONFIG.PIMC_FALLBACK_THRESHOLD,
  epimcWeight: EPIMC_CONFIG.EPIMC_WEIGHT,
};

export interface ActionValue {
  card: Card;
  expectedValue: number;
  variance: number;
  sampleCount: number;
}

export interface SearchState {
  ourHand: Card[];
  trickCards: PlayedCard[];
  /** Lead of the trick being played (pending, free or a suit). */
  lead: TrickLead;
  trumpSuit: Suit | null;
  cardRules: ICardRules;
  currentPlayer: string;
  ourPlayerId: string;
  tricksWon: number;
  bid: number;
}
