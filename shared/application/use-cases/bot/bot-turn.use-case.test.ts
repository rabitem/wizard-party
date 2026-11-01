import { describe, expect, it } from 'vitest';

import {
  BotDifficulty,
  Game,
  GamePhase,
  Player,
  Suit,
  createBotBrain,
  createManualClock,
  createSeededRandom,
  ensureRulesetConfig,
  isBidInRange,
  type DecisionBudget,
} from '../../../domain';
import { createUseCaseRegistry } from '../../use-case-registry';
import { BotTurnUseCase } from './bot-turn.use-case';
import { isLegalBotAction } from './bot-fallback';
import type { BotTurnOutput, IBotDecisionMaker } from './bot-turn.types';

const useCases = createUseCaseRegistry();

function botGame(difficulties: BotDifficulty[], rules: unknown = undefined, seed = 7): Game {
  const game = new Game('bots', 'b1', { random: createSeededRandom(seed) });
  if (rules !== undefined) game.setRulesetConfig(rules);
  difficulties.forEach((difficulty, index) => {
    game.addPlayer(new Player(`b${index + 1}`, `Bot ${index + 1}`, true, difficulty));
  });
  game.start();
  return game;
}

function apply(game: Game, action: BotTurnOutput): void {
  switch (action.type) {
    case 'SELECT_TRUMP':
      useCases.selectTrump.execute({ game, playerId: action.playerId, suit: action.suit });
      break;
    case 'PLACE_BID':
      useCases.placeBid.execute({ game, playerId: action.playerId, bid: action.bid });
      break;
    case 'PLAY_CARD':
      useCases.playCard.execute({ game, playerId: action.playerId, cardId: action.cardId, declaration: action.declaration });
      break;
    case 'RESOLVE_EFFECT':
      useCases.resolveEffect.execute({ game, playerId: action.playerId, response: action.response });
      break;
    default:
      throw new Error(`Bots stuck in ${game.phase}`);
  }
}

/** Play the game to the end with the given use case; returns every action taken. */
function playOut(game: Game, botTurn: BotTurnUseCase, maxSteps = 5000): BotTurnOutput[] {
  const actions: BotTurnOutput[] = [];
  while (game.phase !== GamePhase.GAME_END) {
    if (game.phase === GamePhase.ROUND_END) {
      game.startNextRound();
      continue;
    }
    const action = botTurn.execute({ game });
    expect(isLegalBotAction(game, action)).toBe(true);
    apply(game, action);
    actions.push(action);
    if (actions.length > maxSteps) throw new Error('Game did not finish');
  }
  return actions;
}

const failingBrain: IBotDecisionMaker = {
  chooseTrump: () => { throw new Error('trump boom'); },
  calculateBid: () => { throw new Error('bid boom'); },
  selectCard: () => { throw new Error('card boom'); },
  declareCard: () => undefined,
  respondToEffect: () => { throw new Error('effect boom'); },
};

describe('BotTurnUseCase', () => {
  it('gives every bot seat its own brain and keeps it between decisions', () => {
    const created: { difficulty: BotDifficulty; brain: IBotDecisionMaker }[] = [];
    const botTurn = new BotTurnUseCase({
      createBrain: (difficulty) => {
        const brain = createBotBrain(difficulty);
        created.push({ difficulty, brain });
        return brain;
      },
    });
    const game = botGame([BotDifficulty.EXPERT, BotDifficulty.EXPERT, BotDifficulty.EASY]);

    for (let i = 0; i < 9 && game.phase !== GamePhase.GAME_END; i++) {
      if (game.phase === GamePhase.ROUND_END) game.startNextRound();
      else apply(game, botTurn.execute({ game }));
    }

    expect(created).toHaveLength(3);
    expect(new Set(created.map((entry) => entry.brain)).size).toBe(3);
    expect(created.map((entry) => entry.difficulty).sort()).toEqual([
      BotDifficulty.EASY,
      BotDifficulty.EXPERT,
      BotDifficulty.EXPERT,
    ].sort());
  });

  it('replaces a failing brain with a legal fallback, so the table never stalls', () => {
    const botTurn = new BotTurnUseCase({ createBrain: () => failingBrain });
    const game = botGame([BotDifficulty.MEDIUM, BotDifficulty.MEDIUM, BotDifficulty.MEDIUM], ensureRulesetConfig({
      structure: { customRoundCount: 3 },
    }));

    const actions = playOut(game, botTurn);

    expect(game.phase).toBe(GamePhase.GAME_END);
    expect(actions.every((action) => action.type === 'NONE' || action.fallbackReason !== undefined)).toBe(true);
    expect(actions.some((action) => action.type !== 'NONE' && /boom/.test(action.fallbackReason ?? ''))).toBe(true);
  });

  it('replaces an illegal decision with a legal one', () => {
    const botTurn = new BotTurnUseCase({
      createBrain: () => ({ ...failingBrain, chooseTrump: () => null, calculateBid: () => 99 }),
    });
    const game = botGame([BotDifficulty.MEDIUM, BotDifficulty.MEDIUM, BotDifficulty.MEDIUM]);
    if (game.phase === GamePhase.TRUMP_SELECTION) apply(game, botTurn.execute({ game }));

    const action = botTurn.execute({ game });

    expect(action.type).toBe('PLACE_BID');
    if (action.type !== 'PLACE_BID') return;
    expect(action.fallbackReason).toBe('illegal PLACE_BID');
    expect(isBidInRange(action.bid, game.getCardsPerPlayerForCurrentRound())).toBe(true);
    expect(isLegalBotAction(game, action)).toBe(true);
  });

  it('takes the deterministic fallback when asked to', () => {
    const game = botGame([BotDifficulty.EXPERT, BotDifficulty.EXPERT, BotDifficulty.EXPERT]);
    const action = new BotTurnUseCase().execute({ game, forceFallback: true });

    expect(action.type).not.toBe('NONE');
    if (action.type === 'NONE') return;
    expect(action.fallbackReason).toBe('forced');
    expect(isLegalBotAction(game, action)).toBe(true);
  });

  it('hands every decision a deadline from the injected clock', () => {
    const clock = createManualClock(10_000);
    const budgets: DecisionBudget[] = [];
    const botTurn = new BotTurnUseCase({
      clock,
      decisionBudgetMs: 50,
      createBrain: (difficulty) => {
        const brain = createBotBrain(difficulty);
        return {
          chooseTrump: (game, playerId) => brain.chooseTrump(game, playerId),
          calculateBid: (game, playerId, budget) => {
            if (budget) budgets.push(budget);
            return brain.calculateBid(game, playerId, budget);
          },
          selectCard: (game, playerId, cards, budget) => brain.selectCard(game, playerId, cards, budget),
          declareCard: (game, playerId, card) => brain.declareCard(game, playerId, card),
          respondToEffect: (game, playerId) => brain.respondToEffect(game, playerId),
        };
      },
    });
    const game = botGame([BotDifficulty.HARD, BotDifficulty.HARD, BotDifficulty.HARD]);
    if (game.phase === GamePhase.TRUMP_SELECTION) apply(game, botTurn.execute({ game }));

    apply(game, botTurn.execute({ game }));

    expect(budgets).toHaveLength(1);
    expect(budgets[0].clock).toBe(clock);
    expect(budgets[0].deadline).toBe(10_050);
  });

  it('keeps Hard and Expert decisions legal and fast when the budget is already spent', () => {
    // A frozen clock with a zero budget: every search stops before its first iteration.
    const botTurn = new BotTurnUseCase({ clock: createManualClock(0), decisionBudgetMs: 0 });
    const game = botGame(
      [BotDifficulty.EXPERT, BotDifficulty.HARD, BotDifficulty.EXPERT],
      ensureRulesetConfig({ structure: { customRoundCount: 20, descendingRounds: true } })
    );
    expect(game.players[0].hand).toHaveLength(20);

    for (let step = 0; step < 12; step++) {
      const started = performance.now();
      const action = botTurn.execute({ game });
      const elapsedMs = performance.now() - started;

      expect(action.type === 'NONE' ? undefined : action.fallbackReason).toBeUndefined();
      expect(elapsedMs).toBeLessThan(1500);
      apply(game, action);
    }
  });

  it('keeps Expert decisions of its own after completed tricks (beliefs rebuilt per decision)', () => {
    const botTurn = new BotTurnUseCase({ clock: createManualClock(0), decisionBudgetMs: 0 });
    const game = botGame(
      [BotDifficulty.EXPERT, BotDifficulty.EXPERT, BotDifficulty.EXPERT],
      ensureRulesetConfig({ structure: { customRoundCount: 4, descendingRounds: true } }),
      11
    );

    const actions = playOut(game, botTurn);

    expect(game.phase).toBe(GamePhase.GAME_END);
    expect(actions.filter((action) => action.type !== 'NONE' && action.fallbackReason)).toEqual([]);
  });
});

describe('BotBrain information', () => {
  it('does not let a bot read bids that hidden bids hide from its seat', () => {
    const game = new Game('hidden', 'b1', { random: createSeededRandom(3) });
    game.setRulesetConfig(ensureRulesetConfig({ bidding: { hiddenBids: true } }));
    for (let i = 1; i <= 4; i++) game.addPlayer(new Player(`b${i}`, `Bot ${i}`, true, BotDifficulty.EXPERT));
    game.start();
    if (game.phase === GamePhase.TRUMP_SELECTION) {
      const chooser = game.getTrumpChooser();
      if (chooser) useCases.selectTrump.execute({ game, playerId: chooser.id, suit: Suit.ELVES });
    }
    // Everyone but the last bidder bids.
    for (let i = 0; i < 3; i++) {
      const bidder = game.getCurrentPlayer();
      game.placeBid(bidder.id, game.getForbiddenBid() === 0 ? 1 : 0);
    }

    const brain = createBotBrain(BotDifficulty.EXPERT);
    const lastBidder = game.getCurrentPlayer();
    const firstBidder = game.players[(game.dealerIndex + 1) % 4];
    const lastContext = brain.buildGameContext(game, lastBidder.id);
    const firstContext = brain.buildGameContext(game, firstBidder.id);

    expect(lastContext.playerBids.size).toBe(0);
    expect(lastContext.forbiddenBid).toBe(game.getForbiddenBid());
    expect([...firstContext.playerBids.keys()]).toEqual([firstBidder.id]);
    expect(firstContext.forbiddenBid).toBeNull();
    expect(firstContext.playerIds).toEqual(game.players.map((p) => p.id));
  });
});
