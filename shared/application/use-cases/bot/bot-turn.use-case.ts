/**
 * Bot Turn Use Case
 *
 * Determines the action of the bot whose decision the game waits for, using the
 * BotBrain of that seat.
 *
 * Supports 5 difficulty levels:
 * - Novice (1): Random with slight bias, ~30% win rate
 * - Easy (2): Basic heuristics, ~35% win rate
 * - Medium (3): Full hand evaluation, ~42% win rate
 * - Hard (4): Monte Carlo simulation, ~50% win rate
 * - Expert (5): Advanced inference, ~55%+ win rate
 *
 * Guarantees:
 * - every seat has its own brain (owned by this use case instance, so by one
 *   room), never one shared across seats or rooms;
 * - every decision runs against a wall-clock budget (anytime search);
 * - the answer is always legal: a failing or illegal decision is replaced by a
 *   deterministic legal fallback, so a bot can never stall the table.
 */

import {
  BOT_DECISION_BUDGET,
  BotDifficulty,
  GamePhase,
  createBotBrain,
  createDecisionBudget,
  parseBotDifficulty,
  systemClock,
  type DecisionBudget,
  type Game,
  type IClock,
  type Player,
} from '../../../domain';
import { fallbackBotAction, isLegalBotAction } from './bot-fallback';
import type {
  BotTurnInput,
  BotTurnOptions,
  BotTurnOutput,
  IBotDecisionMaker,
} from './bot-turn.types';

export type {
  BotTurnInput,
  BotTurnOptions,
  BotTurnOutput,
  BotFallbackInfo,
  IBotDecisionMaker,
} from './bot-turn.types';

interface SeatBrain {
  difficulty: BotDifficulty;
  brain: IBotDecisionMaker;
}

/**
 * Use case for determining bot actions
 * Returns the action the next bot should take based on current game state
 */
export class BotTurnUseCase {
  private readonly clock: IClock;
  private readonly decisionBudgetMs: number;
  private readonly createBrain: (difficulty: BotDifficulty) => IBotDecisionMaker;
  /** One brain per bot seat (player id). */
  private readonly brains = new Map<string, SeatBrain>();

  constructor(options: BotTurnOptions = {}) {
    this.clock = options.clock ?? systemClock;
    this.decisionBudgetMs = options.decisionBudgetMs ?? BOT_DECISION_BUDGET.DEFAULT_MS;
    this.createBrain = options.createBrain ?? ((difficulty) => createBotBrain(difficulty));
  }

  execute(input: BotTurnInput): BotTurnOutput {
    const { game } = input;
    const actor = this.getActingBot(game);
    if (!actor) {
      return { type: 'NONE' };
    }
    if (input.forceFallback) {
      return withFallbackReason(fallbackBotAction(game, actor), 'forced');
    }

    let reason: string;
    try {
      const brain = this.getBrain(game, actor, input.difficulty);
      const action = this.decide(game, actor, brain, createDecisionBudget(this.clock, this.decisionBudgetMs));
      // The game waits for this bot, so "no action" is never an answer.
      if (action.type !== 'NONE' && isLegalBotAction(game, action)) return action;
      reason = action.type === 'NONE' ? 'no decision' : `illegal ${action.type}`;
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    return withFallbackReason(fallbackBotAction(game, actor), reason);
  }

  /**
   * The bot whose decision the game is waiting for, if any:
   * the trump chooser, a bot asked by a pending special-card effect, or the current player
   */
  getActingBot(game: Game): Player | undefined {
    // Nobody acts while the table waits for a reconnect.
    if (game.isPaused()) return undefined;
    let candidate: Player | undefined;
    switch (game.phase) {
      case GamePhase.TRUMP_SELECTION:
        candidate = game.getTrumpChooser();
        break;
      case GamePhase.BIDDING:
        candidate = game.getCurrentPlayer();
        break;
      case GamePhase.PLAYING:
        candidate = game.hasPendingEffects()
          ? game.getAwaitingEffectPlayerIds().map((id) => game.getPlayer(id)).find((player) => player?.isBot)
          : game.getCurrentPlayer();
        break;
      default:
        candidate = undefined;
    }
    return candidate?.isBot ? candidate : undefined;
  }

  /**
   * The brain of a bot seat: created on first use, replaced when the seat's
   * difficulty changes, dropped when the bot left the table.
   */
  private getBrain(game: Game, bot: Player, fallbackDifficulty: BotDifficulty | undefined): IBotDecisionMaker {
    for (const seatId of this.brains.keys()) {
      if (!game.getPlayer(seatId)) this.brains.delete(seatId);
    }

    const difficulty = parseBotDifficulty(bot.botDifficulty ?? fallbackDifficulty) as BotDifficulty;
    const seat = this.brains.get(bot.id);
    if (seat && seat.difficulty === difficulty) return seat.brain;

    const brain = this.createBrain(difficulty);
    this.brains.set(bot.id, { difficulty, brain });
    return brain;
  }

  private decide(game: Game, bot: Player, brain: IBotDecisionMaker, budget: DecisionBudget): BotTurnOutput {
    switch (game.phase) {
      case GamePhase.TRUMP_SELECTION:
        return { type: 'SELECT_TRUMP', playerId: bot.id, suit: brain.chooseTrump(game, bot.id) };
      case GamePhase.BIDDING:
        return { type: 'PLACE_BID', playerId: bot.id, bid: brain.calculateBid(game, bot.id, budget) };
      case GamePhase.PLAYING:
        return game.hasPendingEffects()
          ? this.resolveEffect(game, bot, brain)
          : this.playCard(game, bot, brain, budget);
      default:
        return { type: 'NONE' };
    }
  }

  private resolveEffect(game: Game, bot: Player, brain: IBotDecisionMaker): BotTurnOutput {
    const response = brain.respondToEffect(game, bot.id);
    return response ? { type: 'RESOLVE_EFFECT', playerId: bot.id, response } : { type: 'NONE' };
  }

  private playCard(game: Game, bot: Player, brain: IBotDecisionMaker, budget: DecisionBudget): BotTurnOutput {
    const playableCards = game.getLegalPlays(bot.id);
    if (playableCards.length === 0) {
      return { type: 'NONE' };
    }

    const selectedCard = brain.selectCard(game, bot.id, playableCards, budget);
    const declaration = brain.declareCard(game, bot.id, selectedCard);
    return {
      type: 'PLAY_CARD',
      playerId: bot.id,
      cardId: selectedCard.id,
      ...(declaration ? { declaration } : {}),
    };
  }
}

function withFallbackReason(action: BotTurnOutput, reason: string): BotTurnOutput {
  return action.type === 'NONE' ? action : { ...action, fallbackReason: reason };
}
