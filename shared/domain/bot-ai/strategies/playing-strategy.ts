/**
 * Playing Strategy Implementations
 *
 * Determines which card to play based on game state and difficulty level
 *
 * Key Concepts:
 * - Trick Control: Winning exactly the right number of tricks
 * - Minimum Winner: Using lowest card that still wins
 * - Duck: Intentionally losing a trick
 * - Trump Management: When to use trump cards
 * - Opponent Modeling: Track opponent behavior and adjust strategy
 * - Information Set: Use known voids and inferred holdings
 * - Dynamic Trumping Model: Context-aware trumping probability
 *
 * References:
 * - "Hybrid Multi-Agent AI/MCTS Systems for Complex Information Games"
 * - "Improving State Evaluation in Trick-Based Card Games"
 * - "Transformer Based Planning in Observation Space" (arXiv:2404.13150)
 */

import { Card } from '../../entities/card';
import { Suit } from '../../value-objects/card-types';
import { CardEvaluator } from '../card-evaluator';
import { wouldTakePlays } from '../bot-rules';
import {
  IPlayingStrategy,
  GameContext,
  BotConfig,
  BotDifficulty,
  ERROR_RATES,
} from '../types';
import { createExpertPlayingStrategy } from './expert-strategies';

/**
 * Play objective based on current trick needs
 */
enum PlayObjective {
  WIN_TRICK = 'WIN_TRICK',       // Need more tricks, try to win
  LOSE_TRICK = 'LOSE_TRICK',     // Have enough tricks, try to lose
  FLEXIBLE = 'FLEXIBLE',          // Either is acceptable
}

/**
 * Abstract base class for playing strategies
 */
abstract class BasePlayingStrategy implements IPlayingStrategy {
  protected evaluator: CardEvaluator;
  protected currentConfig: BotConfig | null = null;

  constructor() {
    this.evaluator = new CardEvaluator();
  }

  /**
   * Template method for card selection
   */
  selectCard(context: GameContext, playableCards: Card[], config: BotConfig): Card {
    this.currentConfig = config;

    if (playableCards.length === 1) {
      return playableCards[0];
    }

    if (this.shouldMakeError(config)) {
      return this.makeErrorPlay(playableCards);
    }

    const objective = this.determineObjective(context);
    return this.selectOptimalCard(context, playableCards, objective);
  }

  /**
   * Each difficulty level implements its own card selection
   */
  protected abstract selectOptimalCard(
    context: GameContext,
    playableCards: Card[],
    objective: PlayObjective
  ): Card;

  /**
   * Determine whether we need to win or lose this trick
   */
  protected determineObjective(context: GameContext): PlayObjective {
    if (context.myBid === null) {
      return PlayObjective.FLEXIBLE;
    }

    const tricksNeeded = context.myBid - context.myTricksWon;
    const tricksRemaining = context.hand.length;

    if (tricksNeeded <= 0) {
      // Made our bid, try to lose remaining
      return PlayObjective.LOSE_TRICK;
    } else if (tricksNeeded >= tricksRemaining) {
      // Need every remaining trick
      return PlayObjective.WIN_TRICK;
    } 
      // Some flexibility
      return PlayObjective.FLEXIBLE;
    
  }

  /**
   * Find the minimum card needed to win the trick
   */
  protected findMinimumWinner(
    context: GameContext,
    playableCards: Card[]
  ): Card | null {
    if (context.currentTrickCards.length === 0) {
      // We're leading - any card could "win"
      return null;
    }

    // Cards that would take the trick as it stands
    const winners = playableCards.filter((card) =>
      wouldTakePlays(context.currentTrickCards, card, context.trumpSuit, context.cardRules)
    );

    if (winners.length === 0) return null;

    // Return the lowest winning card
    return this.getLowestCard(winners, context.trumpSuit);
  }

  /**
   * Find best card to lose with (preserve high cards)
   */
  protected findBestLoser(
    context: GameContext,
    playableCards: Card[]
  ): Card {
    // Prefer Jesters (guaranteed loss, no value)
    const jesters = playableCards.filter((c) => c.isJester());
    if (jesters.length > 0) return jesters[0];

    // Otherwise play lowest card
    return this.getLowestCard(playableCards, context.trumpSuit);
  }

  /**
   * Get lowest value card, preferring non-trump
   */
  protected getLowestCard(cards: Card[], trumpSuit: Suit | null): Card {
    const sorted = [...cards].sort((a, b) => {
      if (a.isJester()) return -1;
      if (b.isJester()) return 1;
      if (a.isWizard()) return 1;
      if (b.isWizard()) return -1;

      const aIsTrump = a.suit === trumpSuit;
      const bIsTrump = b.suit === trumpSuit;
      if (!aIsTrump && bIsTrump) return -1;
      if (aIsTrump && !bIsTrump) return 1;

      return (a.value ?? 0) - (b.value ?? 0);
    });

    return sorted[0];
  }

  /**
   * Get highest value card, preferring trump
   */
  protected getHighestCard(cards: Card[], trumpSuit: Suit | null): Card {
    const sorted = [...cards].sort((a, b) => {
      if (a.isWizard()) return -1;
      if (b.isWizard()) return 1;
      if (a.isJester()) return 1;
      if (b.isJester()) return -1;

      const aIsTrump = a.suit === trumpSuit;
      const bIsTrump = b.suit === trumpSuit;
      if (aIsTrump && !bIsTrump) return -1;
      if (!aIsTrump && bIsTrump) return 1;

      return (b.value ?? 0) - (a.value ?? 0);
    });

    return sorted[0];
  }

  /**
   * Determine if error should occur
   */
  protected shouldMakeError(config: BotConfig): boolean {
    const errorRate = ERROR_RATES[config.difficulty];
    return Math.random() < errorRate;
  }

  /**
   * Make a random suboptimal play
   */
  protected makeErrorPlay(playableCards: Card[]): Card {
    return playableCards[Math.floor(Math.random() * playableCards.length)];
  }
}

/**
 * Level 1: Novice Playing Strategy
 *
 * Nearly random with slight bias toward high cards when winning
 */
export class NovicePlayingStrategy extends BasePlayingStrategy {
  protected selectOptimalCard(
    context: GameContext,
    playableCards: Card[],
    objective: PlayObjective
  ): Card {
    if (Math.random() < 0.7) {
      return playableCards[Math.floor(Math.random() * playableCards.length)];
    }

    if (objective === PlayObjective.WIN_TRICK) {
      return this.getHighestCard(playableCards, context.trumpSuit);
    }
    return this.getLowestCard(playableCards, context.trumpSuit);
  }
}

/**
 * Level 2: Easy Playing Strategy
 *
 * Simple rules: play high to win, low to lose
 */
export class EasyPlayingStrategy extends BasePlayingStrategy {
  protected selectOptimalCard(
    context: GameContext,
    playableCards: Card[],
    objective: PlayObjective
  ): Card {
    switch (objective) {
      case PlayObjective.WIN_TRICK:
        // Play highest card to win
        return this.getHighestCard(playableCards, context.trumpSuit);

      case PlayObjective.LOSE_TRICK:
        // Play lowest card to lose
        return this.getLowestCard(playableCards, context.trumpSuit);

      case PlayObjective.FLEXIBLE:
      default:
        // Default: play middle card
        const sorted = this.sortByStrength(playableCards, context.trumpSuit);
        return sorted[Math.floor(sorted.length / 2)];
    }
  }

  private sortByStrength(cards: Card[], trumpSuit: Suit | null): Card[] {
    return [...cards].sort((a, b) => {
      const scoreA = this.evaluator.evaluateCard(a, trumpSuit, null);
      const scoreB = this.evaluator.evaluateCard(b, trumpSuit, null);
      return scoreA.absoluteScore - scoreB.absoluteScore;
    });
  }
}

/**
 * Level 3: Medium Playing Strategy
 *
 * Uses minimum winner strategy and considers trick position
 */
export class MediumPlayingStrategy extends BasePlayingStrategy {
  protected selectOptimalCard(
    context: GameContext,
    playableCards: Card[],
    objective: PlayObjective
  ): Card {
    const isLeading = context.currentTrickCards.length === 0;
    const isLast = context.currentTrickCards.length === context.numPlayers - 1;

    switch (objective) {
      case PlayObjective.WIN_TRICK:
        if (isLeading) {
          return this.selectLeadForWin(context, playableCards);
        }
        // Use minimum winner if possible
        const minWinner = this.findMinimumWinner(context, playableCards);
        if (minWinner) return minWinner;
        // Otherwise highest card
        return this.getHighestCard(playableCards, context.trumpSuit);

      case PlayObjective.LOSE_TRICK:
        if (isLeading) {
          return this.selectLeadForLose(context, playableCards);
        }
        return this.findBestLoser(context, playableCards);

      case PlayObjective.FLEXIBLE:
      default:
        if (isLast) {
          // Last to play: can make informed decision
          const tricksNeeded = (context.myBid ?? 0) - context.myTricksWon;
          if (tricksNeeded > 0) {
            const winner = this.findMinimumWinner(context, playableCards);
            if (winner) return winner;
          }
          return this.findBestLoser(context, playableCards);
        }
        // Middle position: moderate approach
        return this.selectModerateCard(context, playableCards);
    }
  }

  /**
   * Select lead card when trying to win
   */
  private selectLeadForWin(context: GameContext, playableCards: Card[]): Card {
    // Wizards guarantee win when leading
    const wizards = playableCards.filter((c) => c.isWizard());
    if (wizards.length > 0) return wizards[0];

    // High trump is next best
    const trumpCards = playableCards
      .filter((c) => c.suit === context.trumpSuit)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (trumpCards.length > 0 && (trumpCards[0].value ?? 0) >= 10) {
      return trumpCards[0];
    }

    // High card in strong suit
    return this.getHighestCard(playableCards, context.trumpSuit);
  }

  /**
   * Select lead card when trying to lose
   */
  private selectLeadForLose(context: GameContext, playableCards: Card[]): Card {
    // Jesters can't win when led (subsequent cards determine winner)
    const jesters = playableCards.filter((c) => c.isJester());
    if (jesters.length > 0) return jesters[0];

    // Lead low in weak suit (likely to be trumped)
    const nonTrump = playableCards.filter(
      (c) => c.suit !== context.trumpSuit && !c.isWizard() && !c.isJester()
    );
    if (nonTrump.length > 0) {
      return this.getLowestCard(nonTrump, context.trumpSuit);
    }

    return this.getLowestCard(playableCards, context.trumpSuit);
  }

  /**
   * Select moderate card when flexible
   */
  private selectModerateCard(context: GameContext, playableCards: Card[]): Card {
    // Avoid extremes: no wizards, no high trumps, no jesters
    const moderate = playableCards.filter(
      (c) =>
        !c.isWizard() &&
        !c.isJester() &&
        !(c.suit === context.trumpSuit && (c.value ?? 0) >= 10)
    );

    if (moderate.length > 0) {
      // Pick middle card
      const sorted = moderate.sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
      return sorted[Math.floor(sorted.length / 2)];
    }

    return playableCards[0];
  }
}

/**
 * Level 4: Hard Playing Strategy
 *
 * Considers opponent bids and cards played for inference
 * Uses 1-ply lookahead
 */
export class HardPlayingStrategy extends BasePlayingStrategy {
  protected selectOptimalCard(
    context: GameContext,
    playableCards: Card[],
    objective: PlayObjective
  ): Card {
    // Evaluate each card with full context
    const scores = playableCards.map((card) => ({
      card,
      score: this.evaluatePlay(card, context, objective),
    }));

    // Sort by score (higher is better for our objective)
    scores.sort((a, b) => b.score - a.score);

    return scores[0].card;
  }

  /**
   * Evaluate how good a card play is
   */
  private evaluatePlay(
    card: Card,
    context: GameContext,
    objective: PlayObjective
  ): number {
    const cardScore = this.evaluator.evaluateCard(
      card,
      context.trumpSuit,
      context.leadSuit
    );

    let score = 0;
    const winsThisTrick = this.wouldWinTrick(card, context);

    switch (objective) {
      case PlayObjective.WIN_TRICK:
        if (winsThisTrick) {
          // Reward winning, penalize using high cards
          score = 100 - cardScore.absoluteScore * 30;
        } else {
          // Still need to win - penalize not winning
          score = -50;
        }
        break;

      case PlayObjective.LOSE_TRICK:
        if (!winsThisTrick) {
          // Reward losing, prefer low cards
          score = 100 - cardScore.absoluteScore * 20;
        } else {
          // Accidentally winning is bad
          score = -100 + (1 - cardScore.absoluteScore) * 30;
        }
        break;

      case PlayObjective.FLEXIBLE:
        // Neutral: preserve strong cards
        score = 50 - cardScore.absoluteScore * 10;
        if (winsThisTrick) score += 10;
        break;
    }

    // Bonus for playing in long suits (maintain control)
    const suitCards = context.hand.filter((c) => c.suit === card.suit).length;
    score += suitCards * 2;

    return score;
  }

  /**
   * Determine if this card would currently win the trick
   */
  private wouldWinTrick(card: Card, context: GameContext): boolean {
    if (context.currentTrickCards.length === 0) {
      // Leading - unknown if we'll win
      return card.isWizard();
    }

    return wouldTakePlays(context.currentTrickCards, card, context.trumpSuit, context.cardRules);
  }
}

/**
 * Factory function to create playing strategy by difficulty
 */
export function createPlayingStrategy(
  difficulty: BotDifficulty
): IPlayingStrategy {
  switch (difficulty) {
    case BotDifficulty.NOVICE:
      return new NovicePlayingStrategy();
    case BotDifficulty.EASY:
      return new EasyPlayingStrategy();
    case BotDifficulty.MEDIUM:
      return new MediumPlayingStrategy();
    case BotDifficulty.HARD:
      return new HardPlayingStrategy();
    case BotDifficulty.EXPERT:
      return createExpertPlayingStrategy();
    default:
      return new MediumPlayingStrategy();
  }
}
