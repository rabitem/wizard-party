/**
 * Utility functions for Monte Carlo simulation
 */

import { GameContext } from '../types';

/**
 * Fallback estimate when simulations fail
 */
export function fallbackEstimate(context: GameContext): number {
  let expected = 0;

  for (const card of context.hand) {
    if (card.isWizard()) {
      expected += 1;
    } else if (card.suit === context.trumpSuit) {
      expected += 0.3 + ((card.value ?? 0) / 13) * 0.4;
    } else if (!card.isJester()) {
      expected += ((card.value ?? 0) / 13) * 0.2;
    }
  }

  return expected;
}

/**
 * Calculate variance
 */
export function calculateVariance(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get first player (dealer's left)
 */
export function getFirstPlayer<T extends { id: string }>(
  players: T[],
  dealerPosition: number
): string {
  const dealerIndex = dealerPosition % players.length;
  return players[(dealerIndex + 1) % players.length].id;
}
