/**
 * Bidding Strategy Implementations
 *
 * Open/Closed Principle: Each difficulty level extends base behavior
 * Liskov Substitution: All strategies are interchangeable via IBiddingStrategy
 *
 * Mathematical Basis:
 * - Hypergeometric distribution for accurate win probabilities
 * - Card correlation modeling for improved accuracy
 * - Variance-based risk adjustment
 * - Dynamic trumping probability
 * - Position-based adjustments
 * - Strategic bid interference
 *
 * References:
 * - "Application of RL to Wizard" (IEEE 2013)
 * - "Improving State Evaluation in Trick-Based Card Games" (AAAI)
 * - "Automatic Bidding for the Game of Skat" (Keller & Kupferschmid)
 * - Wizard DQN paper (arXiv:2205.13834)
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { CardEvaluator } from '../card-evaluator';
import {
  IBiddingStrategy,
  GameContext,
  BotConfig,
  BotDifficulty,
  BotPersonality,
  ERROR_RATES,
} from '../types';
import {
  analyzeHandWithCorrelation,
  calculateRiskAdjustedBid,
  calculateAdaptiveSimulationCount,
  RiskContext,
} from '../probability-math';
import { RISK_ADJUSTMENT } from '../../constants/bot-ai.constants';
import { createMonteCarloBiddingSimulator } from '../algorithms/monte-carlo-sim';
import { createExpertBiddingStrategy } from './expert-strategies';

/**
 * Personality-based bid adjustment
 * Research shows optimal play is within ±1 of expected value
 */
const PERSONALITY_MODIFIERS: Record<BotPersonality, number> = {
  [BotPersonality.AGGRESSIVE]: 0.5,    // Tends to overbid
  [BotPersonality.CONSERVATIVE]: -0.5, // Tends to underbid
  [BotPersonality.BALANCED]: 0,        // Optimal expected value
  [BotPersonality.CHAOTIC]: 0,         // Random adjustment applied separately
};

/**
 * Abstract base class for bidding strategies
 * Template Method Pattern: defines algorithm structure
 */
abstract class BaseBiddingStrategy implements IBiddingStrategy {
  protected evaluator: CardEvaluator;

  constructor() {
    this.evaluator = new CardEvaluator();
  }

  /**
   * Template method for bid calculation
   */
  calculateBid(context: GameContext, config: BotConfig): number {
    if (this.shouldMakeError(config)) {
      // Intentional mistakes must still be legal bids, or the server rejects the move.
      return this.ensureValidBid(this.makeErrorBid(context), context);
    }

    let bid = this.calculateOptimalBid(context);
    bid = this.applyPersonalityAdjustment(bid, config);
    bid = this.ensureValidBid(bid, context);

    return bid;
  }

  /**
   * Each difficulty level implements its own optimal bid calculation
   */
  protected abstract calculateOptimalBid(context: GameContext): number;

  /**
   * Determine if bot should make an intentional error
   */
  protected shouldMakeError(config: BotConfig): boolean {
    const errorRate = ERROR_RATES[config.difficulty];
    return Math.random() < errorRate;
  }

  /**
   * Generate a suboptimal bid as an "error"
   */
  protected makeErrorBid(context: GameContext): number {
    const maxBid = context.hand.length;

    if (Math.random() < 0.5) {
      return Math.floor(Math.random() * Math.min(2, maxBid + 1));
    }
    return Math.max(0, maxBid - Math.floor(Math.random() * 2));
  }

  /**
   * Apply personality-based adjustment
   */
  protected applyPersonalityAdjustment(bid: number, config: BotConfig): number {
    const modifier = PERSONALITY_MODIFIERS[config.personality];

    if (config.personality === BotPersonality.CHAOTIC) {
      return bid + Math.floor(Math.random() * 5) - 2;
    }

    return bid + modifier;
  }

  /**
   * Ensure bid is valid (within range and not forbidden)
   */
  protected ensureValidBid(bid: number, context: GameContext): number {
    const maxBid = context.hand.length;
    let validBid = Math.round(Math.max(0, Math.min(maxBid, bid)));

    if (validBid === context.forbiddenBid) {
      if (validBid > 0 && validBid - 1 !== context.forbiddenBid) {
        validBid = validBid - 1;
      } else if (validBid < maxBid) {
        validBid = validBid + 1;
      } else {
        validBid = 0;
      }
    }

    return validBid;
  }
}

/**
 * Level 1: Novice Bidding Strategy
 *
 * Simple random bidding with slight bias toward extremes
 * Win rate target: ~30%
 */
export class NoviceBiddingStrategy extends BaseBiddingStrategy {
  protected calculateOptimalBid(context: GameContext): number {
    const maxBid = context.hand.length;
    const wizards = context.hand.filter((c) => c.isWizard()).length;
    const randomExtra = Math.floor(Math.random() * (maxBid - wizards + 1));

    return wizards + Math.floor(randomExtra * 0.5);
  }
}

/**
 * Level 2: Easy Bidding Strategy
 *
 * Basic heuristic: count Wizards + high trumps
 * Win rate target: ~35%
 */
export class EasyBiddingStrategy extends BaseBiddingStrategy {
  protected calculateOptimalBid(context: GameContext): number {
    let expectedTricks = 0;

    for (const card of context.hand) {
      if (card.isWizard()) {
        expectedTricks += 1;
      } else if (card.suit === context.trumpSuit) {
        const value = card.value ?? 0;
        if (value >= 10) expectedTricks += 0.8;
        else if (value >= 7) expectedTricks += 0.4;
      } else {
        const value = card.value ?? 0;
        if (value >= 12) expectedTricks += 0.3;
      }
    }

    return Math.round(expectedTricks);
  }
}

/**
 * Level 3: Medium Bidding Strategy
 *
 * Uses correlation-aware probability model with:
 * - Card correlation modeling (A-K of same suit increases K's value)
 * - Hypergeometric distribution for win probabilities
 * - Void suit analysis for trumping potential
 * - Position-based adjustments
 *
 * Win rate target: ~45%
 */
export class MediumBiddingStrategy extends BaseBiddingStrategy {
  protected calculateOptimalBid(context: GameContext): number {
    const handData = context.hand.map(card => ({
      value: card.value,
      suit: card.suit,
      isWizard: card.isWizard(),
      isJester: card.isJester(),
    }));

    const analysis = analyzeHandWithCorrelation(
      handData,
      context.trumpSuit,
      context.numPlayers,
      context.playerPosition
    );

    let bid = analysis.expectedTricks;

    if (context.trumpSuit) {
      const trumpCount = context.hand.filter(c => c.suit === context.trumpSuit).length;
      const trumpStrength = this.calculateTrumpStrength(context.hand, context.trumpSuit);

      if (trumpStrength > 0.6) {
        bid += 0.3;
      } else if (trumpStrength < 0.3 && trumpCount < 2) {
        bid -= 0.2;
      }
    }

    if (analysis.confidence < RISK_ADJUSTMENT.LOW_CONFIDENCE_THRESHOLD) {
      bid *= 0.9;
    }

    return Math.round(Math.max(0, bid));
  }

  /**
   * Calculate strength of trump holding
   */
  private calculateTrumpStrength(hand: Card[], trumpSuit: Suit): number {
    const trumps = hand.filter(c => c.suit === trumpSuit);
    if (trumps.length === 0) return 0;

    let strength = 0;
    for (const card of trumps) {
      const value = card.value ?? 0;
      strength += value / 13;
      if (value >= 10) strength += 0.2;
      if (value === 13) strength += 0.15;
    }

    return Math.min(1, strength / Math.max(1, trumps.length));
  }
}

/**
 * Level 4: Hard Bidding Strategy
 *
 * Uses Monte Carlo simulation with risk-adjusted bidding:
 * - Correlation-aware hand analysis for expected tricks AND variance
 * - Risk adjustment based on game state
 * - Monte Carlo for verification
 *
 * Win rate target: ~52%
 */
export class HardBiddingStrategy extends BaseBiddingStrategy {
  protected calculateOptimalBid(context: GameContext): number {
    const handData = context.hand.map(card => ({
      value: card.value,
      suit: card.suit,
      isWizard: card.isWizard(),
      isJester: card.isJester(),
    }));

    const analysis = analyzeHandWithCorrelation(
      handData,
      context.trumpSuit,
      context.numPlayers,
      context.playerPosition
    );

    const wizardCount = context.hand.filter(c => c.isWizard()).length;
    const jesterCount = context.hand.filter(c => c.isJester()).length;
    const numSimulations = calculateAdaptiveSimulationCount(
      wizardCount,
      jesterCount,
      context.hand.length
    );

    const simulator = createMonteCarloBiddingSimulator({
      numSimulations,
      useSmartPolicy: true,
      trimPercent: 0.1,
    });

    const mcResult = simulator.estimateBid(context);

    const mcWeight = mcResult.confidence;
    const probWeight = analysis.confidence;
    const totalWeight = mcWeight + probWeight;

    const blendedExpected = (
      mcResult.expectedTricks * mcWeight +
      analysis.expectedTricks * probWeight
    ) / totalWeight;

    const riskContext: RiskContext = {
      currentScore: 0,
      targetScore: 100,
      roundsRemaining: 10,
      otherPlayerScores: [],
    };

    const riskAdjusted = calculateRiskAdjustedBid(
      blendedExpected,
      analysis.variance,
      riskContext
    );

    return riskAdjusted.bid;
  }
}

/**
 * Factory function to create bidding strategy by difficulty
 */
export function createBiddingStrategy(
  difficulty: BotDifficulty
): IBiddingStrategy {
  switch (difficulty) {
    case BotDifficulty.NOVICE:
      return new NoviceBiddingStrategy();
    case BotDifficulty.EASY:
      return new EasyBiddingStrategy();
    case BotDifficulty.MEDIUM:
      return new MediumBiddingStrategy();
    case BotDifficulty.HARD:
      return new HardBiddingStrategy();
    case BotDifficulty.EXPERT:
      return createExpertBiddingStrategy();
    default:
      return new MediumBiddingStrategy();
  }
}
