/**
 * Bot turn types: the use case's input, options and the action a bot takes.
 */

import type {
  BotDifficulty,
  Card,
  DecisionBudget,
  Game,
  ICard,
  ICardDeclaration,
  IClock,
  Suit,
  TrickEffectResponse,
} from '../../../domain';

export interface BotTurnInput {
  game: Game;
  /** Fallback difficulty; each bot's own difficulty is used when set. */
  difficulty?: BotDifficulty;
  /** Skip the brain and take the deterministic legal fallback (recovery after a failure). */
  forceFallback?: boolean;
}

/**
 * Set when the bot did not take the brain's decision but the safety-net action
 * (the brain threw, answered something illegal, or a fallback was forced).
 */
export interface BotFallbackInfo {
  fallbackReason?: string;
}

/** Every action names the bot taking it. */
export type BotTurnOutput =
  | ({ type: 'SELECT_TRUMP'; playerId: string; suit: Suit | null } & BotFallbackInfo)
  | ({ type: 'PLACE_BID'; playerId: string; bid: number } & BotFallbackInfo)
  | ({ type: 'PLAY_CARD'; playerId: string; cardId: string; declaration?: ICardDeclaration } & BotFallbackInfo)
  | ({ type: 'RESOLVE_EFFECT'; playerId: string; response: TrickEffectResponse } & BotFallbackInfo)
  | { type: 'NONE' };

/**
 * The decisions a bot seat makes (BotBrain implements it; tests inject others).
 */
export interface IBotDecisionMaker {
  chooseTrump(game: Game, playerId: string): Suit | null;
  calculateBid(game: Game, playerId: string, budget?: DecisionBudget): number;
  selectCard(
    game: Game,
    playerId: string,
    playableCards: Card[],
    budget?: DecisionBudget
  ): Card;
  declareCard(game: Game, playerId: string, card: ICard): ICardDeclaration | undefined;
  respondToEffect(game: Game, playerId: string): TrickEffectResponse | null;
}

export interface BotTurnOptions {
  /** Time source for decision deadlines (default: system clock). */
  clock?: IClock;
  /** Wall-clock budget per decision in ms (default: BOT_DECISION_BUDGET.DEFAULT_MS). */
  decisionBudgetMs?: number;
  /** Creates the decision maker for one bot seat (default: a BotBrain). */
  createBrain?: (difficulty: BotDifficulty) => IBotDecisionMaker;
}
