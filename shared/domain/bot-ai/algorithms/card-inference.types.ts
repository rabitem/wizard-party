/**
 * Types for Card Inference System
 */

import { Suit } from '../../value-objects/card-types';

export interface CardProbabilityDistribution {
  playerId: string;
  cardProbabilities: Map<string, number>;
  expectedWizards: number;
  expectedHighTrumps: number;
  voidSuits: Set<Suit>;
  confidence: number;
}

export interface InferenceFeatures {
  bidRatio: number;
  bidPosition: number;
  bidAggressiveness: number;
  playedHigh: number;
  playedLow: number;
  trumpedIn: number;
  failedToWin: number;
  tricksNeeded: number;
  tricksRemaining: number;
  isDesparate: boolean;
  isSatisfied: boolean;
}

export const INFERENCE_WEIGHTS = {
  WIZARD_WEIGHTS: {
    bidRatio: 2.5,
    bidPosition: -0.3,
    bidAggressiveness: 1.2,
    playedHigh: -0.8,
    failedToWin: -1.5,
    BASE: 0.2,
  },
  HIGH_TRUMP_WEIGHTS: {
    bidRatio: 1.8,
    trumpedIn: -0.6,
    playedHigh: -0.4,
    BASE: 0.5,
  },
  CARD_STRENGTH_WEIGHTS: {
    bidRatioEffect: 0.4,
    positionEffect: 0.15,
    playPatternEffect: 0.3,
  },
} as const;

export function createDefaultFeatures(handLength: number): InferenceFeatures {
  return {
    bidRatio: 0.5,
    bidPosition: 0.5,
    bidAggressiveness: 1.0,
    playedHigh: 0,
    playedLow: 0,
    trumpedIn: 0,
    failedToWin: 0,
    tricksNeeded: 0,
    tricksRemaining: handLength,
    isDesparate: false,
    isSatisfied: false,
  };
}
