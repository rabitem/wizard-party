/**
 * Types for CFR Bidding
 */

import { CFR_CONFIG } from '../../constants/bot-ai.constants';

export interface HandSignature {
  wizardCount: number;
  jesterCount: number;
  trumpStrength: 'none' | 'weak' | 'medium' | 'strong';
  offSuitStrength: 'weak' | 'medium' | 'strong';
  voidCount: number;
  handSize: number;
}

export interface BiddingInfoSet {
  handSignature: HandSignature;
  position: number;
  numPlayers: number;
  previousBids: number[];
  round: number;
  isForbiddenBid: boolean[];
}

export interface CFRNode {
  regretSum: number[];
  strategySum: number[];
  visits: number;
}

export interface CFRConfig {
  iterations: number;
  useCFRPlus: boolean;
  discountFactor: number;
}

export const DEFAULT_CFR_CONFIG: CFRConfig = {
  iterations: CFR_CONFIG.DEFAULT_ITERATIONS,
  useCFRPlus: true, // Use CFR+ by default for faster convergence
  discountFactor: CFR_CONFIG.DISCOUNT_FACTOR,
};
