import { afterEach, describe, expect, it } from 'vitest';
import {
  EXPANSION_SETS,
  GameEventType,
  GamePhase,
  ROOM_PLAYER_LIMITS,
  type IExpansionSet,
  type IRulesetConfig,
} from '@shared/domain';
import { createSeededRandom, hashSeed } from '@/infrastructure/sandbox/seeded-random';
import type { BotDifficulty } from '@/presentation/components/lobby/table/lobby-view.types';
import { CONNECTION_LIVENESS } from '@/presentation/config/connection.config';
import { matrixRows } from '../../party/test-support/matrix';
import { ScoreSheet, expectedRoundPlan } from '../../party/test-support/score-sheet';
import { ruleset } from '../../party/test-support/table-driver';
import { FullStackTable } from './support/full-stack-table';
import type { NetworkConditions } from './support/network';
import type { PlayerClient } from './support/player-client';
import { view } from './support/screen-model';
import { playOfferedWithBots } from './support/seeded-moves';

/**
 * Level 4, the table matrix: whole games across table sizes, decks, hidden bids, house rules, seat
 * mixes (humans and bots of every level) and network shapes. The other level-4 suites seat one or
 * two table shapes each; a projection, a bid-visibility rule, a round plan or a reconnect path that
 * breaks only for, say, five seats with hidden bids and a restart shows up here.
 *
 * Every row plays one seeded game to its end through what the screens offer (humans make seeded
 * moves among the offered ones, bots play in their own time). At every rest: I1-I6, and every
 * screen's scoreboard (scores, tricks, bids as visible to that seat) equals the room. At every
 * round end every screen's round is written to a score sheet that scores it by the rules
 * (party/test-support/score-sheet.ts); the game must end on those totals and winners on every
 * screen and in the room.
 *
 * The default run is the all-pairs subset of the axes; FULL_MATRIX=1 runs every combination.
 */
const ROUNDS = 3;
/**
 * The room restarts at the first rest of this round's bidding. With one human that rest can come
 * before any bid: settling runs every bot turn, so the next rest is the human's own turn.
 */
const RESTART_ROUND = 2;
const NAMES = ['Ann', 'Ben', 'Cid', 'Dee', 'Eve', 'Fay'];
const SLOW_NETWORK: Partial<NetworkConditions> = { latencyMs: 30, jitterMs: 20 };
/** Shorter than COMMAND_ANSWER_MS: held frames arrive as a burst before any liveness probe runs. */
const STALL_MS = CONNECTION_LIVENESS.COMMAND_ANSWER_MS / 2;

interface RulesVariant {
  label: string;
  apply(rules: IRulesetConfig): IRulesetConfig;
}

const RULES: RulesVariant[] = [
  { label: 'standard rules', apply: (rules) => rules },
  { label: 'descending rounds', apply: (rules) => ({ ...rules, structure: { ...rules.structure, descendingRounds: true } }) },
  {
    label: 'equal bids allowed, last Wizard and last Jester win',
    apply: (rules) => ({
      ...rules,
      card: { lastWizardWins: true, lastJesterWins: true },
      bidding: { ...rules.bidding, allowEqualBids: true },
    }),
  },
  {
    label: 'scoring 30 + 5 a trick, 15 a miss',
    apply: (rules) => ({ ...rules, scoring: { baseBidPoints: 30, pointsPerTrick: 5, penaltyPerMiss: 15 } }),
  },
];

interface SeatMix {
  label: string;
  humans(players: number): number;
  /** The bots' levels, given how many bot seats there are. */
  bots(count: number): BotDifficulty[];
}

const EVERY_LEVEL: BotDifficulty[] = [1, 2, 3, 4, 5];
/**
 * A bot's level only changes which legal move its brain picks (the bot-ai and bot-turn suites own
 * that); the room and the clients treat every level alike. So the mixes vary who is human, and
 * one mix seats every level.
 */
const SEATS: SeatMix[] = [
  { label: 'all humans', humans: (players) => players, bots: () => [] },
  { label: 'two humans and Medium bots', humans: () => 2, bots: (count) => Array<BotDifficulty>(count).fill(3) },
  { label: 'one human and bots of every level', humans: () => 1, bots: (count) => EVERY_LEVEL.slice(0, count) },
];

type Fault = 'none' | 'stall' | 'drop' | 'restart';

interface NetworkShape {
  label: string;
  conditions: Partial<NetworkConditions>;
  fault: Fault;
}

const NETWORKS: NetworkShape[] = [
  { label: 'clean network', conditions: {}, fault: 'none' },
  { label: 'slow network', conditions: SLOW_NETWORK, fault: 'none' },
  { label: 'stalled bursts before every move', conditions: SLOW_NETWORK, fault: 'stall' },
  { label: 'a player dropped mid-trick', conditions: SLOW_NETWORK, fault: 'drop' },
  { label: 'a room restart while bids are collected', conditions: SLOW_NETWORK, fault: 'restart' },
];

const AXES = {
  players: [3, 4, 5, 6],
  deck: EXPANSION_SETS,
  hiddenBids: [false, true],
  rules: RULES,
  seats: SEATS,
  network: NETWORKS,
} as const;

const ROWS = matrixRows(AXES).map((row) => ({
  ...row,
  name: [
    `${row.players} players`,
    row.deck.name,
    `hidden bids ${row.hiddenBids ? 'on' : 'off'}`,
    row.rules.label,
    row.seats.label,
    row.network.label,
  ].join(', '),
}));

type Row = (typeof ROWS)[number];

function rulesOf(row: Row): IRulesetConfig {
  const base = ruleset({ rounds: ROUNDS });
  const rules = row.rules.apply(base);
  return { ...rules, bidding: { ...rules.bidding, hiddenBids: row.hiddenBids }, expansions: { specialCards: [...(row.deck as IExpansionSet).cards] } };
}

/** The clients that show a table now (connected, seated, past the lobby). */
function liveScreens(table: FullStackTable): { client: PlayerClient; screen: ReturnType<typeof view> }[] {
  return table.players
    .filter((client) => !client.isClosed)
    .map((client) => ({ client, screen: view(client) }))
    .filter(({ screen }) => screen.status === 'connected' && screen.table !== null);
}

/**
 * Every scoreboard shows the room's scores and tricks; bids too, except that under hidden bids a
 * seat sees only its own bid while bids are collected (rules.md, "Bidding").
 */
function expectScoreboardsAgree(table: FullStackTable): void {
  const game = table.server.game;
  const hidden = game.rulesetConfig.bidding.hiddenBids && game.phase === GamePhase.BIDDING;
  for (const { client, screen } of liveScreens(table)) {
    const expected = game.players.map((player) => ({
      id: player.id,
      score: player.score,
      tricksWon: player.tricksWon,
      bid: hidden && player.id !== screen.seatId ? null : player.bid,
    }));
    const shown = screen.table?.standings.players.map(({ id, score, tricksWon, bid }) => ({ id, score, tricksWon, bid }));
    expect(shown, `${client.name}'s scoreboard in ${game.phase} of round ${game.currentRound}`).toEqual(expected);
  }
}

/** True at the first kind of rest the row's fault waits for. */
function faultIsDue(fault: Fault, table: FullStackTable): boolean {
  const game = table.server.game;
  if (fault === 'drop') return game.phase === GamePhase.PLAYING && (game.currentTrick?.cards.length ?? 0) > 0;
  if (fault === 'restart') return game.phase === GamePhase.BIDDING && game.currentRound === RESTART_ROUND;
  return false;
}

/** The network loses the last human's socket; they reconnect to the same seat. */
async function dropMidTrick(table: FullStackTable, victim: PlayerClient): Promise<void> {
  const seat = victim.seatId;
  const sockets = victim.connections.length;
  victim.dropConnection();
  await table.settle();
  expect(victim.connections.length, `precondition: ${victim.name} reconnected mid-trick`).toBe(sockets + 1);
  expect(victim.seatId, `${victim.name} keeps the seat`).toBe(seat);
}

/** The room is evicted and starts from storage; every player reconnects to it. */
async function restartWhileBidding(table: FullStackTable, humans: readonly PlayerClient[]): Promise<void> {
  const sockets = new Map(humans.map((client) => [client, client.connections.length]));
  await table.restartRoom();
  await table.settle();
  const stale = humans.filter((client) => client.connections.length <= (sockets.get(client) ?? 0)).map((client) => client.name);
  expect(stale, 'precondition: every player reconnected to the restarted room while bids were collected').toEqual([]);
}

/** The fault of the row, injected once at the first rest that fits it. */
function faultInjector(table: FullStackTable, humans: PlayerClient[], fault: Fault) {
  let injected = false;
  return {
    get injected(): boolean {
      return injected;
    },
    async inject(): Promise<void> {
      if (injected || !faultIsDue(fault, table)) return;
      injected = true;
      if (fault === 'drop') await dropMidTrick(table, humans[humans.length - 1]);
      else await restartWhileBidding(table, humans);
    },
  };
}

describe('table matrix: every screen agrees with the room at every rest, and the game ends on the scores of the rules', () => {
  let table: FullStackTable | null = null;

  afterEach(() => {
    table?.dispose();
    table = null;
  });

  for (const row of ROWS) it(row.name, { timeout: 120_000 }, async () => {
    const seed = hashSeed('table-matrix', row.name);
    const created = await FullStackTable.create({ seed, network: row.network.conditions });
    table = created;
    const rules = rulesOf(row);
    const humanCount = row.seats.humans(row.players);
    const humans = NAMES.slice(0, humanCount).map((name) => created.open(created.browser(), name));
    const [host, ...guests] = humans;
    await host.join({ name: 'Matrix table', isPublic: false, maxPlayers: ROOM_PLAYER_LIMITS.MAX, rulesetConfig: rules });
    for (const guest of guests) await guest.join();
    for (const level of row.seats.bots(row.players - humanCount)) host.addBot(level);
    await created.settle();
    const seats = created.server.game.players;
    expect(seats.length, 'precondition: the table is full').toBe(row.players);
    expect(seats.filter((seat) => seat.isBot).map((seat) => seat.botDifficulty)).toEqual(row.seats.bots(row.players - humanCount));

    const plan = expectedRoundPlan(row.players, rules);
    const sheet = new ScoreSheet(rules, plan, seats.map((seat) => seat.id));
    const fault = faultInjector(created, humans, row.network.fault);
    host.start();
    await playOfferedWithBots(created, createSeededRandom(hashSeed('moves', seed)), {
      atRest: async () => {
        expectScoreboardsAgree(created);
        const phase = created.server.game.phase;
        if (phase === GamePhase.ROUND_END || phase === GamePhase.GAME_END) {
          for (const { client, screen } of liveScreens(created)) if (screen.table) sheet.record(screen.table.game, `${client.name}'s screen`);
        }
        await fault.inject();
      },
      beforeMove: () => {
        if (row.network.fault === 'stall') created.network.stall(STALL_MS);
      },
    });

    if (row.network.fault === 'drop' || row.network.fault === 'restart') expect(fault.injected, `precondition: ${row.network.label}`).toBe(true);
    expect(created.server.game.maxRounds, 'the round count of the rules').toBe(plan.length);
    sheet.expectComplete();
    const totals = sheet.totals();
    const finalScores = created.server.game.players.map((player) => ({ playerId: player.id, score: totals[player.id] }));
    expect(created.server.game.players.map((player) => ({ playerId: player.id, score: player.score })), 'the room scored by the rules').toEqual(finalScores);
    const totalTricks = plan.reduce((sum, cards) => sum + cards, 0);
    for (const client of humans) {
      const screen = view(client);
      expect(screen.page, `${client.name}'s page`).toBe(`/results/${created.roomId}`);
      expect(screen.table?.standings.players.map(({ id, score }) => ({ playerId: id, score })), `${client.name}'s results`).toEqual(finalScores);
      const ends = client.connections.flatMap((connection) => connection.ofType(GameEventType.GAME_COMPLETE));
      expect(ends.length, `${client.name} was told the game ended`).toBeGreaterThan(0);
      for (const end of ends) expect({ winnerIds: end.winnerIds, finalScores: end.finalScores }).toEqual({ winnerIds: sheet.winners(), finalScores });
      expect(client.table.presentedTricks, `${client.name} presented every trick once`).toBe(totalTricks);
    }
  });
});
