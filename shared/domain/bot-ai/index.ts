/**
 * Bot AI Module
 *
 * Provides intelligent bot opponents with configurable difficulty levels.
 *
 * Architecture follows SOLID principles:
 * - Single Responsibility: Each strategy handles one decision type
 * - Open/Closed: New difficulty levels extend base strategies
 * - Liskov Substitution: All strategies are interchangeable
 * - Interface Segregation: Focused interfaces for each component
 * - Dependency Inversion: BotBrain depends on abstractions
 *
 * Mathematical Foundation:
 * - Card Power Score (CPS) for evaluating card strength
 * - Expected value calculation for bidding
 * - Probability inference for opponent modeling
 * - Error injection for difficulty calibration
 */

// Core types and interfaces
export {
  BotDifficulty,
  BotPersonality,
  DEFAULT_BOT_CONFIGS,
  ERROR_RATES,
} from './types';

export type {
  BotConfig,
  CardPowerScore,
  HandEvaluation,
  GameContext,
  ITrumpStrategy,
  IBiddingStrategy,
  IPlayingStrategy,
  ICardEvaluator,
} from './types';

// Card evaluation
export { CardEvaluator } from './card-evaluator';

// Strategies
export {
  createBiddingStrategy,
  createPlayingStrategy,
  createTrumpStrategy,
} from './strategies';

// Decision time budget (anytime searches stop at the deadline)
export {
  createDecisionBudget,
  isBudgetExhausted,
  scaleIterations,
  type DecisionBudget,
} from './decision-budget';

// The shared rules as the bot simulations use them
export {
  behaviorOf,
  leadAfterCard,
  leadOfCards,
  legalCards,
  trickWinnerId,
  trickWinnerIndex,
  wouldTakeTrick,
  withSuitToFollow,
  revealsVoid,
  type BotTrickPlay,
} from './bot-rules';

// Main orchestrator
export {
  BotBrain,
  createBotBrain,
} from './bot-brain';
