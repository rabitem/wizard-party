/**
 * Property test: random legal games played through the application use cases
 * with seeded randomness, checked after every command against an independent
 * reference oracle of the official rules (lead, legal plays, hook rule, trick
 * winner, scoring) and against the game's own invariants (card conservation,
 * dealer rotation, trick leader, round plan, persistence round trip).
 *
 * The seed counts are small so CI stays fast; raise PROPERTY_GAMES locally for
 * a deeper run.
 */

import { describe, expect, it } from 'vitest';

import {
  ALL_SUITS,
  BotDifficulty,
  Game,
  GamePhase,
  Player,
  createManualClock,
  createSeededRandom,
  ensureRulesetConfig,
  type ICard,
  type IGameState,
  type IRandom,
  type IRulesetConfig,
  type Suit,
} from '../../../domain';
import { BotTurnUseCase } from '../bot/bot-turn.use-case';
import { NextRoundUseCase } from './next-round.use-case';
import { PlaceBidUseCase } from './place-bid.use-case';
import { PlayCardUseCase } from './play-card.use-case';
import { SelectTrumpUseCase } from './select-trump.use-case';
import { StartGameUseCase } from './start-game.use-case';

// ============================================================================
// Reference oracle (written from the rule book, shares no code with the engine)
// ============================================================================

type OracleLead = { kind: 'pending' } | { kind: 'free' } | { kind: 'suit'; suit: string };

function oracleLead(trick: readonly ICard[]): OracleLead {
  for (const card of trick) {
    if (card.type === 'WIZARD') return { kind: 'free' };
    if (card.type === 'NUMBER') return { kind: 'suit', suit: String(card.suit) };
  }
  return { kind: 'pending' };
}

function oracleLegal(hand: readonly ICard[], trick: readonly ICard[]): string[] {
  const lead = oracleLead(trick);
  const all = hand.map((card) => card.id);
  if (lead.kind !== 'suit') return all;
  const canFollow = hand.some((card) => card.type === 'NUMBER' && card.suit === lead.suit);
  if (!canFollow) return all;
  return hand.filter((card) => card.type !== 'NUMBER' || card.suit === lead.suit).map((card) => card.id);
}

function oracleWinner(
  plays: readonly { playerId: string; card: ICard }[],
  trump: Suit | null,
  rules: IRulesetConfig['card']
): string {
  const wizards = plays.filter((play) => play.card.type === 'WIZARD');
  if (wizards.length > 0) return (rules.lastWizardWins ? wizards[wizards.length - 1] : wizards[0]).playerId;
  const numbers = plays.filter((play) => play.card.type === 'NUMBER');
  if (numbers.length === 0) return (rules.lastJesterWins ? plays[plays.length - 1] : plays[0]).playerId;
  const leadSuit = numbers[0].card.suit;
  const trumps = trump ? numbers.filter((play) => play.card.suit === trump) : [];
  const pool = trumps.length > 0 ? trumps : numbers.filter((play) => play.card.suit === leadSuit);
  return pool.reduce((best, play) => ((play.card.value ?? 0) > (best.card.value ?? 0) ? play : best)).playerId;
}

function oracleForbiddenBid(game: Game, bidderId: string): number | null {
  if (game.rulesetConfig.bidding.allowEqualBids) return null;
  const others = game.players.filter((player) => player.id !== bidderId);
  if (others.some((player) => player.bid === null)) return null;
  const forbidden = game.getCardsPerPlayerForCurrentRound() - others.reduce((sum, p) => sum + (p.bid ?? 0), 0);
  return forbidden >= 0 ? forbidden : null;
}

function oracleScore(bid: number, tricks: number, rules: IRulesetConfig['scoring']): number {
  return bid === tricks ? rules.baseBidPoints + tricks * rules.pointsPerTrick : -Math.abs(bid - tricks) * rules.penaltyPerMiss;
}

// ============================================================================
// Game driver
// ============================================================================

const pick = <T>(random: IRandom, items: readonly T[]): T => items[Math.floor(random.next() * items.length)];

function randomRuleset(random: IRandom, fullLength: boolean): IRulesetConfig {
  return ensureRulesetConfig({
    card: { lastWizardWins: random.next() < 0.3, lastJesterWins: random.next() < 0.3 },
    bidding: { hiddenBids: random.next() < 0.3, allowEqualBids: random.next() < 0.3 },
    scoring: { baseBidPoints: 20, pointsPerTrick: 10, penaltyPerMiss: 10 },
    structure: {
      customRoundCount: fullLength ? null : 1 + Math.floor(random.next() * 4),
      descendingRounds: random.next() < 0.3,
    },
  });
}

function stateWithoutTimer(state: IGameState): string {
  return JSON.stringify({ ...state, turnTimerState: null });
}

function cardsInPlay(game: Game): string[] {
  const ids = game.players.flatMap((player) => player.hand.map((card) => card.id));
  const lastCompleted = game.getLastCompletedTrick();
  if (game.currentTrick && game.currentTrick !== lastCompleted) {
    ids.push(...game.currentTrick.cards.map((played) => played.card.id));
  }
  for (const trick of game.completedTricks) ids.push(...trick.cards.map((played) => played.card.id));
  return ids;
}

function checkInvariants(game: Game, context: string): void {
  const playerCount = game.players.length;
  const cards = game.getCardsPerPlayerForCurrentRound();
  const ids = cardsInPlay(game);

  expect(new Set(ids).size, `${context}: duplicate card`).toBe(ids.length);
  expect(ids.length, `${context}: card conservation`).toBe(cards * playerCount);
  if (game.trumpCard) expect(ids, `${context}: trump card dealt`).not.toContain(game.trumpCard.id);
  expect(game.dealerIndex, `${context}: dealer rotation`).toBe((game.currentRound - 1) % playerCount);

  if (game.phase === GamePhase.PLAYING) {
    expect(game.players.every((player) => player.bid !== null), `${context}: missing bid`).toBe(true);
    if (!game.rulesetConfig.bidding.allowEqualBids) {
      expect(game.getTotalBids(), `${context}: hook rule`).not.toBe(cards);
    }
  }

  const snapshot = game.toJSON();
  const restored = Game.fromJSON(JSON.parse(JSON.stringify(snapshot)) as IGameState);
  expect(stateWithoutTimer(restored.toJSON()), `${context}: persistence round trip`).toBe(stateWithoutTimer(snapshot));
}

interface DriverOptions {
  seed: number;
  fullLength: boolean;
  /** Bots decide (through BotTurnUseCase) instead of the random policy. */
  bots: boolean;
}

interface GameReport {
  commands: number;
  rounds: number;
  fallbacks: number;
}

function playRandomGame({ seed, fullLength, bots }: DriverOptions): GameReport {
  const policy = createSeededRandom(seed * 7919 + 1);
  const playerCount = 3 + Math.floor(policy.next() * 4);
  const game = new Game(`property-${seed}`, 'p0', { random: createSeededRandom(seed), clock: createManualClock(0) });
  for (let i = 0; i < playerCount; i++) {
    game.addPlayer(bots
      ? new Player(`p${i}`, `Bot ${i}`, true, 1 + (i % 3) as BotDifficulty)
      : new Player(`p${i}`, `Player ${i}`));
  }
  const rules = randomRuleset(policy, fullLength);
  game.setRulesetConfig(rules);

  new StartGameUseCase().execute({ game, playerId: 'p0' });
  const expectedRounds = Math.min(rules.structure.customRoundCount ?? Infinity, Math.floor(60 / playerCount));
  expect(game.maxRounds).toBe(expectedRounds);

  const botTurn = new BotTurnUseCase();
  const selectTrump = new SelectTrumpUseCase();
  const placeBid = new PlaceBidUseCase();
  const playCard = new PlayCardUseCase();
  const nextRound = new NextRoundUseCase();

  const report: GameReport = { commands: 0, rounds: 0, fallbacks: 0 };
  let scoresBefore = game.players.map((player) => player.score);
  let expectedLeader = (game.dealerIndex + 1) % playerCount;

  while (game.phase !== GamePhase.GAME_END) {
    const context = `seed=${seed} round=${game.currentRound}/${game.maxRounds} phase=${game.phase}`;
    checkInvariants(game, context);
    expect(report.commands, `${context}: no progress`).toBeLessThan(5000);
    const cards = game.getCardsPerPlayerForCurrentRound();
    expect(cards, `${context}: round plan`).toBe(
      rules.structure.descendingRounds ? game.maxRounds - game.currentRound + 1 : game.currentRound
    );

    if (game.phase === GamePhase.ROUND_END) {
      nextRound.execute({ game, playerId: game.hostId });
      scoresBefore = game.players.map((player) => player.score);
      expectedLeader = (game.dealerIndex + 1) % playerCount;
      continue;
    }

    const action = bots ? botTurn.execute({ game }) : null;
    if (action && action.type !== 'NONE' && action.fallbackReason) report.fallbacks++;

    if (game.phase === GamePhase.TRUMP_SELECTION) {
      const chooser = game.getTrumpChooser();
      if (!chooser) throw new Error(`${context}: no trump chooser`);
      const suit = action?.type === 'SELECT_TRUMP' ? action.suit : pick(policy, ALL_SUITS);
      selectTrump.execute({ game, playerId: chooser.id, suit });
    } else if (game.phase === GamePhase.BIDDING) {
      const bidder = game.getCurrentPlayer();
      const forbidden = oracleForbiddenBid(game, bidder.id);
      expect(game.getForbiddenBid(), `${context}: forbidden bid`).toBe(forbidden);
      const options = Array.from({ length: cards + 1 }, (_, bid) => bid).filter((bid) => bid !== forbidden);
      const bid = action?.type === 'PLACE_BID' ? action.bid : pick(policy, options);
      expect(options, `${context}: bot bid`).toContain(bid);
      placeBid.execute({ game, playerId: bidder.id, bid });
    } else {
      const trick = game.currentTrick;
      if (!trick) throw new Error(`${context}: no trick`);
      const actor = game.getCurrentPlayer();
      if (trick.cards.length === 0) {
        expect(game.currentPlayerIndex, `${context}: trick leader`).toBe(expectedLeader);
      }

      const trickCards = trick.cards.map((played) => played.card);
      const legal = oracleLegal(actor.hand.map((card) => card.toJSON()), trickCards);
      expect(game.getLegalPlays(actor.id).map((card) => card.id).sort(), `${context}: legal plays`).toEqual([...legal].sort());

      const cardId = action?.type === 'PLAY_CARD' ? action.cardId : pick(policy, legal);
      const playsBefore = trick.cards.map((played) => ({ playerId: played.playerId, card: played.card }));
      const output = playCard.execute({ game, playerId: actor.id, cardId });

      if (output.trickCompleteEvent) {
        const plays = [...playsBefore, { playerId: actor.id, card: output.card }];
        expect(output.trickCompleteEvent.winnerId, `${context}: trick winner`).toBe(
          oracleWinner(plays, game.trumpSuit, rules.card)
        );
        expectedLeader = game.players.findIndex((player) => player.id === output.trickCompleteEvent?.winnerId);
      }

      if (output.roundCompleteEvent) {
        report.rounds++;
        expect(game.players.reduce((sum, p) => sum + p.tricksWon, 0), `${context}: tricks`).toBe(cards);
        game.players.forEach((player, index) => {
          expect(player.score - scoresBefore[index], `${context}: score of ${player.id}`).toBe(
            oracleScore(player.bid ?? 0, player.tricksWon, rules.scoring)
          );
          expect(player.roundHistory, `${context}: history`).toHaveLength(game.currentRound);
        });
      }
    }
    report.commands++;
  }

  expect(game.currentRound).toBe(game.maxRounds);
  const best = Math.max(...game.players.map((player) => player.score));
  expect(game.getWinnerIds()).toEqual(game.players.filter((p) => p.score === best).map((p) => p.id));
  return report;
}

const SHORT_GAMES = Number(process.env.PROPERTY_GAMES ?? 24);

describe('random games through the use cases (property test)', () => {
  it('match the reference rules in short games with random variants', () => {
    let rounds = 0;
    for (let seed = 1; seed <= SHORT_GAMES; seed++) {
      rounds += playRandomGame({ seed, fullLength: false, bots: false }).rounds;
    }
    expect(rounds).toBeGreaterThan(SHORT_GAMES);
  });

  it('match the reference rules over a few full-length games', () => {
    for (const seed of [101, 202]) {
      const report = playRandomGame({ seed, fullLength: true, bots: false });
      expect(report.rounds).toBeGreaterThanOrEqual(10);
    }
  });

  it('let bots finish games with only legal decisions of their own', () => {
    for (const seed of [11, 12]) {
      const report = playRandomGame({ seed, fullLength: false, bots: true });
      expect(report.fallbacks).toBe(0);
    }
  }, 60_000);
});
