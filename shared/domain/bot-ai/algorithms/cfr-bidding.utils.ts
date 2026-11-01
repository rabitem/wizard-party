/**
 * CFR Bidding Utility Functions
 */

import { HandSignature } from './cfr-bidding.types';

/**
 * Sample random hands for training
 */
export function sampleHands(numPlayers: number, round: number): HandSignature[] {
  const hands: HandSignature[] = [];

  for (let p = 0; p < numPlayers; p++) {
    hands.push({
      wizardCount: randomWizardCount(),
      jesterCount: Math.random() < 0.2 ? 1 : 0,
      trumpStrength: randomCategory(),
      offSuitStrength: randomCategory(),
      voidCount: randomVoidCount(),
      handSize: round,
    });
  }

  return hands;
}

function randomWizardCount(): number {
  if (Math.random() >= 0.2) return 0;
  return Math.random() < 0.3 ? 2 : 1;
}

function randomVoidCount(): number {
  if (Math.random() >= 0.3) return 0;
  return Math.random() < 0.3 ? 2 : 1;
}

function randomCategory(): 'weak' | 'medium' | 'strong' {
  const r = Math.random();
  if (r < 0.33) return 'weak';
  if (r < 0.66) return 'medium';
  return 'strong';
}

/**
 * Generate all possible bid combinations (limited for performance)
 */
export function generateBidCombinations(numPlayers: number, round: number): number[][] {
  const combinations: number[][] = [];
  const maxBid = Math.min(round, 5);

  if (Math.pow(maxBid + 1, numPlayers) > 1000) {
    return sampleBidCombinations(numPlayers, maxBid, 100);
  }

  generateAllCombinations(combinations, [], numPlayers, maxBid);
  return combinations;
}

function sampleBidCombinations(numPlayers: number, maxBid: number, count: number): number[][] {
  const combinations: number[][] = [];
  for (let i = 0; i < count; i++) {
    const combo: number[] = [];
    for (let p = 0; p < numPlayers; p++) {
      combo.push(Math.floor(Math.random() * (maxBid + 1)));
    }
    combinations.push(combo);
  }
  return combinations;
}

function generateAllCombinations(
  combinations: number[][],
  current: number[],
  numPlayers: number,
  maxBid: number
): void {
  if (current.length === numPlayers) {
    combinations.push([...current]);
    return;
  }

  for (let bid = 0; bid <= maxBid; bid++) {
    current.push(bid);
    generateAllCombinations(combinations, current, numPlayers, maxBid);
    current.pop();
  }
}
