/**
 * Trump Selection Strategy Implementations
 *
 * When a Wizard is revealed as trump card, dealer chooses trump suit
 * Strategy: Select suit where we have the strongest holding
 */

import { Card } from '../../entities/card';
import { Suit, ALL_SUITS } from '../../value-objects/card-types';
import { CardEvaluator } from '../card-evaluator';
import {
  ITrumpStrategy,
  BotConfig,
  BotDifficulty,
  BotPersonality,
  ERROR_RATES,
} from '../types';

/**
 * Abstract base class for trump selection
 */
abstract class BaseTrumpStrategy implements ITrumpStrategy {
  protected evaluator: CardEvaluator;
  protected currentConfig: BotConfig | null = null;

  constructor() {
    this.evaluator = new CardEvaluator();
  }

  selectTrump(hand: Card[], config: BotConfig): Suit {
    this.currentConfig = config;

    if (this.shouldMakeError(config)) {
      return this.makeErrorSelection();
    }

    return this.selectOptimalTrump(hand);
  }

  protected abstract selectOptimalTrump(hand: Card[]): Suit;

  protected shouldMakeError(config: BotConfig): boolean {
    const errorRate = ERROR_RATES[config.difficulty];
    return Math.random() < errorRate;
  }

  protected makeErrorSelection(): Suit {
    return ALL_SUITS[Math.floor(Math.random() * ALL_SUITS.length)];
  }

  /**
   * Calculate strength of each suit in hand
   */
  protected calculateSuitStrengths(hand: Card[]): Map<Suit, number> {
    const strengths = new Map<Suit, number>();

    for (const suit of ALL_SUITS) {
      let strength = 0;
      const suitCards = hand.filter((c) => c.suit === suit);

      for (const card of suitCards) {
        const value = card.value ?? 0;
        strength += value;
        if (value >= 11) strength += 5;
        if (value === 13) strength += 5;
      }

      strength += suitCards.length * 3;

      strengths.set(suit, strength);
    }

    return strengths;
  }
}

/**
 * Level 1: Novice - Random selection
 */
export class NoviceTrumpStrategy extends BaseTrumpStrategy {
  protected selectOptimalTrump(): Suit {
    return ALL_SUITS[Math.floor(Math.random() * ALL_SUITS.length)];
  }
}

/**
 * Level 2: Easy - Count cards per suit
 */
export class EasyTrumpStrategy extends BaseTrumpStrategy {
  protected selectOptimalTrump(hand: Card[]): Suit {
    const counts = new Map<Suit, number>();

    for (const suit of ALL_SUITS) {
      counts.set(suit, hand.filter((c) => c.suit === suit).length);
    }

    let bestSuit = ALL_SUITS[0];
    let maxCount = 0;

    counts.forEach((count, suit) => {
      if (count > maxCount) {
        maxCount = count;
        bestSuit = suit;
      }
    });

    return bestSuit;
  }
}

/**
 * Level 3+: Medium/Hard/Expert - Full strength calculation
 */
export class AdvancedTrumpStrategy extends BaseTrumpStrategy {
  protected selectOptimalTrump(hand: Card[]): Suit {
    const strengths = this.calculateSuitStrengths(hand);

    // Find strongest suit
    let bestSuit = ALL_SUITS[0];
    let maxStrength = 0;

    strengths.forEach((strength, suit) => {
      if (strength > maxStrength) {
        maxStrength = strength;
        bestSuit = suit;
      }
    });

    // Personality adjustment
    if (this.currentConfig?.personality === BotPersonality.CHAOTIC) {
      // Sometimes pick second-best for unpredictability
      if (Math.random() < 0.3) {
        const sorted = ALL_SUITS.sort(
          (a, b) => (strengths.get(b) ?? 0) - (strengths.get(a) ?? 0)
        );
        return sorted[1] || sorted[0];
      }
    }

    return bestSuit;
  }
}

/**
 * Factory function for trump strategies
 */
export function createTrumpStrategy(difficulty: BotDifficulty): ITrumpStrategy {
  switch (difficulty) {
    case BotDifficulty.NOVICE:
      return new NoviceTrumpStrategy();
    case BotDifficulty.EASY:
      return new EasyTrumpStrategy();
    case BotDifficulty.MEDIUM:
    case BotDifficulty.HARD:
    case BotDifficulty.EXPERT:
      return new AdvancedTrumpStrategy();
    default:
      return new AdvancedTrumpStrategy();
  }
}
