import { vi } from 'vitest';

import { Card } from '../entities/card';
import { Game, GamePhase } from '../entities/game';
import { Player } from '../entities/player';
import type { PlayedCard } from '../entities/trick';
import type { Suit } from '../value-objects/card-types';
import { DEFAULT_CARD_RULES, ensureRulesetConfig, type ICardRules } from '../value-objects/ruleset-config';
import { createManualClock } from '../ports/clock.port';
import { createSeededRandom } from '../ports/random.port';
import { leadOfCards, suitToFollow } from './bot-rules';
import { createBotBrain, type BotBrain } from './bot-brain';
import { createDecisionBudget, type DecisionBudget } from './decision-budget';
import type { BotDifficulty, GameContext } from './types';

/* Shared setup for the bot AI tests: seeded chance, frozen clocks, positions as a seat sees them. */

export const n = (suit: Suit, value: number): Card => Card.createNumberCard(suit, value);
export const wizard = (index: number): Card => Card.createWizard(index);
export const jester = (index: number): Card => Card.createJester(index);

/**
 * Run `task` with Math.random replaced by a seeded generator. The bots still read
 * Math.random directly (see random.port.ts), so this is what makes a decision repeatable.
 */
export function withSeededMath<T>(seed: number, task: () => T): T {
  const random = createSeededRandom(seed);
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => random.next());
  try {
    return task();
  } finally {
    spy.mockRestore();
  }
}

/** A budget on a clock that never moves: searches run every iteration they are allowed. */
function frozenBudget(): DecisionBudget {
  return createDecisionBudget(createManualClock(0), 100);
}

export interface PositionSpec {
  hand: Card[];
  /** Every seat in table order; the bot is `me`. */
  playerIds?: string[];
  me?: string;
  trumpSuit?: Suit | null;
  trumpCard?: Card | null;
  /** The current trick in play order. */
  trick?: PlayedCard[];
  completedTricks?: PlayedCard[][];
  bids?: Record<string, number>;
  tricksWon?: Record<string, number>;
  forbiddenBid?: number | null;
  cardRules?: ICardRules;
  budget?: DecisionBudget;
}

const SEATS = ['p1', 'p2', 'me'];

/**
 * The decision context of one seat. The lead is derived with the shared rules
 * (bot-rules), so it is what the server would report for the same trick.
 */
export function positionContext(spec: PositionSpec): GameContext {
  const playerIds = spec.playerIds ?? SEATS;
  const me = spec.me ?? 'me';
  const trick = spec.trick ?? [];
  const lead = leadOfCards(trick.map((played) => played.card));
  const bids = new Map(Object.entries(spec.bids ?? {}));
  const tricksWon = new Map(playerIds.map((id) => [id, spec.tricksWon?.[id] ?? 0]));
  return {
    hand: spec.hand,
    trumpSuit: spec.trumpSuit ?? null,
    trumpCard: spec.trumpCard ?? null,
    currentRound: spec.hand.length,
    numPlayers: playerIds.length,
    playerIds,
    playerPosition: playerIds.indexOf(me),
    dealerPosition: playerIds.length - 1,
    currentTrickCards: trick,
    lead,
    leadSuit: suitToFollow(lead),
    completedTricks: spec.completedTricks ?? [],
    playerBids: bids,
    playerTricksWon: tricksWon,
    myBid: bids.get(me) ?? null,
    myTricksWon: tricksWon.get(me) ?? 0,
    forbiddenBid: spec.forbiddenBid ?? null,
    playerId: me,
    cardRules: spec.cardRules ?? DEFAULT_CARD_RULES,
    budget: spec.budget ?? frozenBudget(),
  };
}

export const play = (playerId: string, card: Card): PlayedCard => ({ playerId, card });

// ============================================================================
// Whole tables of bots, driven through the Game aggregate
// ============================================================================

export function botTable(seed: number, difficulties: BotDifficulty[], rules?: unknown): Game {
  const game = new Game('bots', 'b1', { random: createSeededRandom(seed), clock: createManualClock(0) });
  if (rules !== undefined) game.setRulesetConfig(ensureRulesetConfig(rules));
  difficulties.forEach((difficulty, index) => {
    game.addPlayer(new Player(`b${index + 1}`, `Bot ${index + 1}`, true, difficulty));
  });
  game.start();
  return game;
}

/** One bot decision as the aggregate received it. */
export type BotStep =
  | { kind: 'trump'; playerId: string; suit: Suit | null }
  | { kind: 'bid'; playerId: string; bid: number; forbidden: number | null; cards: number }
  | { kind: 'card'; playerId: string; cardId: string; legal: string[] }
  | { kind: 'effect'; playerId: string };

/**
 * Let each seat's own brain take every decision until the game ends or `maxSteps`
 * decisions were made. The aggregate rejects any illegal decision by throwing, so
 * no fallback can hide a wrong answer.
 */
export function playWithBrains(game: Game, maxSteps: number): BotStep[] {
  const brains = new Map<string, BotBrain>(
    game.players.map((player) => [player.id, createBotBrain(player.botDifficulty as BotDifficulty)])
  );
  const brainOf = (playerId: string): BotBrain => {
    const brain = brains.get(playerId);
    if (!brain) throw new Error(`No brain for ${playerId}`);
    return brain;
  };
  const steps: BotStep[] = [];

  while (game.phase !== GamePhase.GAME_END && steps.length < maxSteps) {
    switch (game.phase) {
      case GamePhase.ROUND_END:
        game.startNextRound();
        break;
      case GamePhase.TRUMP_SELECTION: {
        const chooser = game.getTrumpChooser();
        if (!chooser) throw new Error('No trump chooser');
        const suit = brainOf(chooser.id).chooseTrump(game, chooser.id);
        game.selectTrump(chooser.id, suit);
        steps.push({ kind: 'trump', playerId: chooser.id, suit });
        break;
      }
      case GamePhase.BIDDING: {
        const bidder = game.getCurrentPlayer();
        const forbidden = game.getForbiddenBidFor(bidder.id);
        const bid = brainOf(bidder.id).calculateBid(game, bidder.id, frozenBudget());
        steps.push({ kind: 'bid', playerId: bidder.id, bid, forbidden, cards: bidder.hand.length });
        game.placeBid(bidder.id, bid);
        break;
      }
      case GamePhase.PLAYING:
        steps.push(playOneTurn(game, brainOf));
        break;
      default:
        throw new Error(`Unexpected phase ${game.phase}`);
    }
  }
  return steps;
}

function playOneTurn(game: Game, brainOf: (playerId: string) => BotBrain): BotStep {
  if (game.hasPendingEffects()) {
    const playerId = game.getAwaitingEffectPlayerIds()[0];
    const response = brainOf(playerId).respondToEffect(game, playerId);
    if (!response) throw new Error(`No effect response from ${playerId}`);
    game.resolveEffect(playerId, response);
    return { kind: 'effect', playerId };
  }
  const player = game.getCurrentPlayer();
  const legal = game.getLegalPlays(player.id);
  const brain = brainOf(player.id);
  const card = brain.selectCard(game, player.id, legal, frozenBudget());
  game.playCard(player.id, card.id, brain.declareCard(game, player.id, card));
  return { kind: 'card', playerId: player.id, cardId: card.id, legal: legal.map((c) => c.id) };
}
