import { describe, expect, it } from 'vitest';

import {
  ALL_SUITS,
  BotDifficulty,
  Game,
  GamePhase,
  Player,
  SPECIAL_CARD_TYPES,
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
import { fallbackBotAction, isLegalBotAction } from './bot-fallback';
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

  // The fallback must also answer the declarations (Cloud, Juggler, Shapeshifter), the trump choice
  // of a Werewolf holder and every after-trick effect (Juggler pass, Cloud bid change, Witch swap).
  it.each([3, 14, 30])('keeps a table with every special card moving when the brain fails (seed %i)', (seed) => {
    const botTurn = new BotTurnUseCase({ createBrain: () => failingBrain });
    const game = botGame(
      [BotDifficulty.MEDIUM, BotDifficulty.MEDIUM, BotDifficulty.MEDIUM, BotDifficulty.MEDIUM],
      ensureRulesetConfig({ expansions: { specialCards: SPECIAL_CARD_TYPES } }),
      seed
    );

    const actions = playOut(game, botTurn);

    expect(game.phase).toBe(GamePhase.GAME_END);
    expect(actions.some((action) => action.type === 'RESOLVE_EFFECT')).toBe(true);
    expect(actions.some((action) => action.type === 'PLAY_CARD' && action.declaration !== undefined)).toBe(true);
    expect(actions.every((action) => action.type === 'NONE' || action.fallbackReason !== undefined)).toBe(true);
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

describe('fallbackBotAction', () => {
  /** Three bots in the one-card first round, waiting for the first bid (trump chosen if needed). */
  function firstRoundBidding(seed: number): Game {
    const game = botGame([BotDifficulty.MEDIUM, BotDifficulty.MEDIUM, BotDifficulty.MEDIUM], undefined, seed);
    const chooser = game.getTrumpChooser();
    if (game.phase === GamePhase.TRUMP_SELECTION && chooser) game.selectTrump(chooser.id, Suit.ELVES);
    return game;
  }

  /** The first seed whose turned-up trump card is a Wizard, so the dealer must name trump. */
  function dealerChoosesTrump(): Game {
    for (let seed = 1; seed < 500; seed++) {
      const game = botGame([BotDifficulty.MEDIUM, BotDifficulty.MEDIUM, BotDifficulty.MEDIUM], ensureRulesetConfig({
        structure: { customRoundCount: 5, descendingRounds: true },
      }), seed);
      if (game.phase === GamePhase.TRUMP_SELECTION) return game;
    }
    throw new Error('no seed turns up a Wizard');
  }

  // Hook rule with one card each: the last bidder may not make the bids add up to 1.
  it.each([
    { otherBids: [], expected: 0, situation: 'the first bidder' },
    { otherBids: [0, 0], expected: 0, situation: 'the last bidder when 1 is forbidden' },
    { otherBids: [1, 0], expected: 1, situation: 'the last bidder when 0 is forbidden' },
    { otherBids: [1, 1], expected: 0, situation: 'the last bidder when the others overbid' },
  ])('bids the lowest allowed number for $situation', ({ otherBids, expected }) => {
    const game = firstRoundBidding(5);
    for (const bid of otherBids) game.placeBid(game.getCurrentPlayer().id, bid);
    const bot = game.getCurrentPlayer();

    const action = fallbackBotAction(game, bot);

    expect(action).toEqual({ type: 'PLACE_BID', playerId: bot.id, bid: expected });
    useCases.placeBid.execute({ game, playerId: bot.id, bid: expected });
  });

  it('names the suit the dealer holds most of when a Wizard is turned up', () => {
    const game = dealerChoosesTrump();
    const dealer = game.getTrumpChooser();
    if (!dealer) throw new Error('nobody chooses trump');
    const held = (suit: Suit) => dealer.hand.filter((card) => card.suit === suit).length;

    const action = fallbackBotAction(game, dealer);

    expect(action.type).toBe('SELECT_TRUMP');
    if (action.type !== 'SELECT_TRUMP' || action.suit === null) throw new Error('no suit named');
    expect(held(action.suit)).toBe(Math.max(...ALL_SUITS.map(held)));
    useCases.selectTrump.execute({ game, playerId: dealer.id, suit: action.suit });
    expect(game.trumpSuit).toBe(action.suit);
  });

  it('has nothing to do while the table waits between rounds', () => {
    const game = firstRoundBidding(5);
    while (game.phase !== GamePhase.ROUND_END) {
      const actor = game.phase === GamePhase.BIDDING || game.phase === GamePhase.PLAYING ? game.getCurrentPlayer() : undefined;
      if (!actor) throw new Error(`unexpected phase ${game.phase}`);
      apply(game, fallbackBotAction(game, actor));
    }

    expect(game.players.map((player) => fallbackBotAction(game, player))).toEqual([
      { type: 'NONE' },
      { type: 'NONE' },
      { type: 'NONE' },
    ]);
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
