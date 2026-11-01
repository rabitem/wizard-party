/**
 * Bot Brain - Orchestrator for AI Decision Making
 *
 * Single Responsibility: Coordinate strategies and produce actions
 * Dependency Inversion: Depends on strategy interfaces, not implementations
 *
 * This is the main entry point for bot AI decisions.
 */

import { Card, type ICard } from '../entities/card';
import { Game } from '../entities/game';
import { Suit } from '../value-objects/card-types';
import { parseBotDifficulty } from '../value-objects/bot-difficulty';
import type { ICardDeclaration } from '../expansions/card-behavior';
import type { TrickEffectResponse } from '../expansions/trick-effects';
import { PENDING_LEAD, leadSuitOf } from '../expansions/trick-lead';
import { PlayerNotFoundError } from '../errors/game-errors';
import { mapToViewCards, toClassicView } from './classic-view';
import { createDecisionBudget, type DecisionBudget } from './decision-budget';
import { SpecialCardStrategy } from './strategies/special-card-strategy';
import {
  BotConfig,
  BotDifficulty,
  BotPersonality,
  DEFAULT_BOT_CONFIGS,
  GameContext,
  IBiddingStrategy,
  IPlayingStrategy,
  ITrumpStrategy,
} from './types';
import { createBiddingStrategy } from './strategies/bidding-strategy';
import { createPlayingStrategy } from './strategies/playing-strategy';
import { createTrumpStrategy } from './strategies/trump-strategy';

/**
 * Bot Brain - The intelligent decision-making core
 *
 * Coordinates:
 * - Trump selection strategy
 * - Bidding strategy
 * - Card playing strategy
 *
 * Supports difficulty levels 1-5 with personality variants.
 *
 * Expansion special cards: the strategies see a classic view of the game (each
 * special card as the classic card it behaves like); choices only special cards
 * need are made by the SpecialCardStrategy against the real game.
 */
export class BotBrain {
  private readonly config: BotConfig;
  private readonly biddingStrategy: IBiddingStrategy;
  private readonly playingStrategy: IPlayingStrategy;
  private readonly trumpStrategy: ITrumpStrategy;
  private readonly specialCardStrategy = new SpecialCardStrategy();

  /**
   * Create a new BotBrain with specified difficulty
   *
   * @param difficulty - Difficulty level 1-5
   * @param personality - Optional personality override
   */
  constructor(
    difficulty: BotDifficulty = BotDifficulty.MEDIUM,
    personality?: BotPersonality
  ) {
    // Never trust the level: an unknown one would have no configuration.
    difficulty = parseBotDifficulty(difficulty) as BotDifficulty;
    const defaultConfig = DEFAULT_BOT_CONFIGS[difficulty];
    this.config = {
      ...defaultConfig,
      personality: personality ?? defaultConfig.personality,
    };

    this.biddingStrategy = createBiddingStrategy(difficulty);
    this.playingStrategy = createPlayingStrategy(difficulty);
    this.trumpStrategy = createTrumpStrategy(difficulty);
  }

  /**
   * Get current configuration
   */
  getConfig(): BotConfig {
    return { ...this.config };
  }

  /**
   * Select trump suit when dealer has wizard trump card
   *
   * @param hand - Bot's current hand
   * @returns Selected trump suit
   */
  selectTrump(hand: Card[]): Suit {
    return this.trumpStrategy.selectTrump(hand, this.config);
  }

  /**
   * Decide trump for the player choosing it this round (dealer after a Wizard,
   * or the Werewolf holder, who may also declare no trump)
   *
   * @returns Selected suit, or null for no trump
   */
  chooseTrump(game: Game, playerId: string): Suit | null {
    const view = toClassicView(game);
    const hand = view.getPlayer(playerId)?.hand ?? [];
    const suit = this.selectTrump(hand);
    return this.specialCardStrategy.chooseTrump(hand, game.trumpChoice?.allowNoTrump ?? false, suit);
  }

  /**
   * Calculate optimal bid for current round
   *
   * @param game - Current game state
   * @param playerId - Bot's player ID
   * @param budget - Time budget for the decision (default: BOT_DECISION_BUDGET.DEFAULT_MS from now)
   * @returns Bid value
   */
  calculateBid(game: Game, playerId: string, budget: DecisionBudget = createDecisionBudget()): number {
    const context = this.buildGameContext(toClassicView(game), playerId, budget);
    return this.biddingStrategy.calculateBid(context, this.config);
  }

  /**
   * Select card to play
   *
   * @param game - Current game state
   * @param playerId - Bot's player ID
   * @param playableCards - Cards that can legally be played
   * @param budget - Time budget for the decision (default: BOT_DECISION_BUDGET.DEFAULT_MS from now)
   * @returns Selected card
   */
  selectCard(
    game: Game,
    playerId: string,
    playableCards: Card[],
    budget: DecisionBudget = createDecisionBudget()
  ): Card {
    const view = toClassicView(game);
    const context = this.buildGameContext(view, playerId, budget);
    const choice = this.playingStrategy.selectCard(context, mapToViewCards(view, playerId, playableCards), this.config);
    return playableCards.find((card) => card.id === choice.id) ?? choice;
  }

  /**
   * Choice to announce with a card (Cloud/Juggler suit, Shapeshifter form)
   */
  declareCard(game: Game, playerId: string, card: ICard): ICardDeclaration | undefined {
    return this.specialCardStrategy.declare(game, playerId, card);
  }

  /**
   * Answer to the special-card effect waiting for this bot (Juggler, Cloud, Witch)
   */
  respondToEffect(game: Game, playerId: string): TrickEffectResponse | null {
    const effect = game.getActiveEffect();
    return effect ? this.specialCardStrategy.respond(game, playerId, effect) : null;
  }

  /**
   * Build the decision context from the game as the bot's seat sees it: bids the
   * hidden-bids rule hides from this seat stay hidden, and the forbidden bid is
   * only the bot's own. Public so the information a bot decides on can be audited.
   */
  buildGameContext(game: Game, playerId: string, budget: DecisionBudget = createDecisionBudget()): GameContext {
    const player = game.getPlayer(playerId);
    if (!player) {
      throw new PlayerNotFoundError(playerId);
    }

    const visibility = game.getBidVisibility(playerId);
    const playerBids = new Map<string, number>();
    const playerTricksWon = new Map<string, number>();

    for (const p of game.players) {
      if (p.bid !== null && visibility.canSeeBid(p.id)) {
        playerBids.set(p.id, p.bid);
      }
      playerTricksWon.set(p.id, p.tricksWon);
    }

    const currentTrickCards = game.currentTrick?.cards ?? [];
    const completedTricks = game.completedTricks.map((trick) => trick.cards);
    const lead = game.currentTrick?.getLead() ?? PENDING_LEAD;

    const dealerIndex = game.dealerIndex;
    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    const firstPlayerIndex = (dealerIndex + 1) % game.players.length;

    let playerPosition = playerIndex - firstPlayerIndex;
    if (playerPosition < 0) playerPosition += game.players.length;

    return {
      hand: player.hand,
      trumpSuit: game.trumpSuit,
      trumpCard: game.trumpCard,
      currentRound: player.hand.length,
      numPlayers: game.players.length,
      playerIds: game.players.map((p) => p.id),
      playerPosition,
      dealerPosition: dealerIndex,
      currentTrickCards,
      lead,
      leadSuit: leadSuitOf(lead),
      completedTricks,
      playerBids,
      playerTricksWon,
      myBid: player.bid,
      myTricksWon: player.tricksWon,
      forbiddenBid: game.getForbiddenBidFor(playerId),
      playerId,
      cardRules: game.rulesetConfig.card,
      budget,
    };
  }
}

/**
 * Factory function to create BotBrain with difficulty level
 *
 * @param difficulty - 1 (Novice) to 5 (Expert)
 * @param personality - Optional personality override
 */
export function createBotBrain(
  difficulty: BotDifficulty = BotDifficulty.MEDIUM,
  personality?: BotPersonality
): BotBrain {
  return new BotBrain(difficulty, personality);
}
