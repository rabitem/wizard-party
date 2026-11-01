/**
 * Bot AI Types and Interfaces
 *
 * Following Interface Segregation Principle (ISP):
 * Small, focused interfaces for each responsibility
 */

import { Card } from '../entities/card';
import { Suit } from '../value-objects/card-types';
import { PlayedCard } from '../entities/trick';
import type { ICardRules } from '../value-objects/ruleset-config';
import type { TrickLead } from '../expansions/trick-lead';
import type { DecisionBudget } from './decision-budget';

/**
 * Bot difficulty levels with mathematical basis
 *
 * Error rates derived from research on Dynamic Difficulty Adjustment:
 * - Novice: 40% suboptimal (random+ with bias)
 * - Easy: 25% suboptimal (basic heuristics)
 * - Medium: 10% suboptimal (advanced heuristics)
 * - Hard: 2% suboptimal (Monte Carlo sampling)
 * - Expert: <1% suboptimal (full MCTS with inference)
 */
export enum BotDifficulty {
  NOVICE = 1,
  EASY = 2,
  MEDIUM = 3,
  HARD = 4,
  EXPERT = 5,
}

/**
 * Bot personality affects risk tolerance and play style
 */
export enum BotPersonality {
  AGGRESSIVE = 'AGGRESSIVE',   // Overbids, plays to win tricks
  CONSERVATIVE = 'CONSERVATIVE', // Underbids, plays safe
  BALANCED = 'BALANCED',       // Optimal expected value
  CHAOTIC = 'CHAOTIC',         // Unpredictable, bluffs
}

/**
 * Configuration for bot behavior
 */
export interface BotConfig {
  difficulty: BotDifficulty;
  personality: BotPersonality;
  name?: string;
}

/**
 * Default configurations for each difficulty
 */
export const DEFAULT_BOT_CONFIGS: Record<BotDifficulty, Omit<BotConfig, 'name'>> = {
  [BotDifficulty.NOVICE]: { difficulty: BotDifficulty.NOVICE, personality: BotPersonality.CHAOTIC },
  [BotDifficulty.EASY]: { difficulty: BotDifficulty.EASY, personality: BotPersonality.BALANCED },
  [BotDifficulty.MEDIUM]: { difficulty: BotDifficulty.MEDIUM, personality: BotPersonality.BALANCED },
  [BotDifficulty.HARD]: { difficulty: BotDifficulty.HARD, personality: BotPersonality.BALANCED },
  [BotDifficulty.EXPERT]: { difficulty: BotDifficulty.EXPERT, personality: BotPersonality.AGGRESSIVE },
};

/**
 * Error rate by difficulty level
 * Formula: errorRate = max(0, 0.5 - difficulty × 0.1)
 */
export const ERROR_RATES: Record<BotDifficulty, number> = {
  [BotDifficulty.NOVICE]: 0.40,
  [BotDifficulty.EASY]: 0.25,
  [BotDifficulty.MEDIUM]: 0.10,
  [BotDifficulty.HARD]: 0.02,
  [BotDifficulty.EXPERT]: 0.005,
};

/**
 * Card Power Score - normalized value [0, 1]
 */
export interface CardPowerScore {
  card: Card;
  absoluteScore: number;      // Raw power (Wizard=1, Jester=0)
  contextualScore: number;    // Adjusted for trump/position
  winProbability: number;     // P(card wins trick)
}

/**
 * Hand evaluation result
 */
export interface HandEvaluation {
  cards: CardPowerScore[];
  expectedTricks: number;
  confidence: number;         // How certain we are (0-1)
  strongSuits: Suit[];
  weakSuits: Suit[];
}

/**
 * Game context for decision making: exactly what a human in the bot's seat could
 * know (hidden bids stay hidden), plus the room's card rules and the time budget
 * for this decision.
 */
export interface GameContext {
  hand: Card[];
  trumpSuit: Suit | null;
  trumpCard: Card | null;
  /** Cards in the bot's hand (the number of tricks still to play this round). */
  currentRound: number;
  numPlayers: number;
  /** Every seat in table order (independent of who has bid yet). */
  playerIds: string[];
  playerPosition: number;     // 0 = first to act
  dealerPosition: number;
  currentTrickCards: PlayedCard[];
  /** The explicit lead of the current trick (pending, free or a suit). */
  lead: TrickLead;
  /** Suit to follow (null while the lead is pending or free). */
  leadSuit: Suit | null;
  completedTricks: PlayedCard[][];
  /** Bids the bot is allowed to see (hidden-bids rule applies). */
  playerBids: Map<string, number>;
  playerTricksWon: Map<string, number>;
  myBid: number | null;
  myTricksWon: number;
  /** The bot's own forbidden bid (hook rule), null when unrestricted. */
  forbiddenBid: number | null;
  playerId: string;
  /** The room's card rules (which Wizard / Jester takes a trick). */
  cardRules: ICardRules;
  /** Wall-clock budget for this decision; searches stop when it runs out. */
  budget: DecisionBudget;
}

/**
 * Strategy for selecting trump suit (SRP: only trump selection)
 */
export interface ITrumpStrategy {
  selectTrump(hand: Card[], config: BotConfig): Suit;
}

/**
 * Strategy for placing bids (SRP: only bidding)
 */
export interface IBiddingStrategy {
  calculateBid(context: GameContext, config: BotConfig): number;
}

/**
 * Strategy for playing cards (SRP: only card play)
 */
export interface IPlayingStrategy {
  selectCard(context: GameContext, playableCards: Card[], config: BotConfig): Card;
}

/**
 * Card evaluator for scoring cards (SRP: only evaluation)
 */
export interface ICardEvaluator {
  evaluateCard(card: Card, trumpSuit: Suit | null, leadSuit: Suit | null): CardPowerScore;
  evaluateHand(hand: Card[], trumpSuit: Suit | null, numPlayers: number): HandEvaluation;
  calculateWinProbability(card: Card, context: GameContext): number;
}
