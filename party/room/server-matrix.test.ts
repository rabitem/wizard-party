/**
 * Level 3, the server matrix: server-only behaviours the other room suites prove for one table
 * shape, swept over table sizes, decks, seat mixes and the phase they happen in:
 *
 * - turn timers: idle humans' decisions are made by the room exactly when the heckling window
 *   after their timer closes, and such a table finishes the game by itself;
 * - pause: a dropped player pauses the table beside its phase, nothing moves while it waits, and
 *   the table resumes unchanged when they return or plays on with a bot when they do not;
 * - restart: a room evicted in any phase starts again from storage on the same table, waits for
 *   its humans and plays on when they take their seats back with their tokens.
 *
 * Every row plays its game to the end, and the final scores must be what the rules give for the
 * bids and tricks the room showed at each round's end (party/test-support/score-sheet.ts). Moves
 * are the simplest legal ones (special cards included); bots play in their own time.
 *
 * Each matrix runs the all-pairs subset of its axes (party/test-support/matrix.ts); FULL_MATRIX=1
 * runs every combination.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CardType,
  ClientCommandType,
  DeclarationKind,
  EXPANSION_SETS,
  GameEventType,
  GamePhase,
  SPECIAL_CARD_TYPES,
  Suit,
  TrickEffectKind,
  getDeclarationOptions,
  getRequiredDeclaration,
  type CardForm,
  type Game,
  type ICard,
  type ICardDeclaration,
  type IExpansionSet,
  type IGameState,
  type IRulesetConfig,
  type ITurnTimerState,
  type SpecialCardType,
  type TrickEffectResponse,
} from '../../shared/domain';
import { ROOM_TIMING, TURN_TIMEOUT_POLICY } from '../config/room-timing.config';
import { matrixRows } from '../test-support/matrix';
import { HARNESS_START_TIME, RoomHarness, type TestConnection } from '../test-support/room-harness';
import { ScoreSheet, expectedRoundPlan } from '../test-support/score-sheet';
import { lobby, ruleset, type Table } from '../test-support/table-driver';

const { BOT_ACTION_DELAY_MS, DISCONNECT_DEBOUNCE_MS, RECONNECT_WINDOW_MS, ROUND_END_AUTO_ADVANCE_MS } = ROOM_TIMING;
const NAMES = ['Hana', 'Pia', 'Otto', 'Lea', 'Ines', 'Jan'];
const PLAYER_COUNTS = [3, 4, 5, 6];
const ROUNDS = 3;
const BOT_LEVEL = 2;
const MAX_STEPS = 5_000;
/** Seeds tried, in order, for a phase only some deals reach (a pending special-card effect). */
const SITUATION_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const MS_PER_SECOND = 1_000;

const CLASSIC = EXPANSION_SETS[0];
const ALL_SPECIALS = EXPANSION_SETS[EXPANSION_SETS.length - 1];

const harnesses: RoomHarness[] = [];

async function harness(seed: number): Promise<RoomHarness> {
  const h = await RoomHarness.create({ seed });
  harnesses.push(h);
  return h;
}

function rulesWith(specialCards: readonly SpecialCardType[], rounds = ROUNDS): IRulesetConfig {
  const base = ruleset({ rounds });
  return { ...base, expansions: { specialCards: [...specialCards] } };
}

// ---------------------------------------------------------------------------------------------
// Tables and moves
// ---------------------------------------------------------------------------------------------

/** Humans join (the first hosts), the host adds bots of `botLevels` and starts. */
async function seatTable(h: RoomHarness, humans: number, botLevels: number[], rules: IRulesetConfig): Promise<Table> {
  const t = await lobby(NAMES.slice(0, humans), { rulesetConfig: rules }, h);
  const host = t.sockets[NAMES[0]];
  for (const difficulty of botLevels) h.send(host, { type: ClientCommandType.ADD_BOT, difficulty });
  h.send(host, { type: ClientCommandType.START_GAME });
  expect(h.game.players, 'precondition: every seat is taken').toHaveLength(humans + botLevels.length);
  expect(h.game.phase).not.toBe(GamePhase.LOBBY);
  return t;
}

/** The open socket of a seat a human holds. */
function humanSocket(t: Table, playerId: string | undefined): TestConnection | undefined {
  if (!playerId || t.h.game.getPlayer(playerId)?.isBot !== false) return undefined;
  const socket = t.seats.get(playerId);
  return socket && socket.closed === null ? socket : undefined;
}

function declarationFor(game: Game, card: ICard): ICardDeclaration | undefined {
  const kind = getRequiredDeclaration(card, game.getRoundContext());
  if (kind === null) return undefined;
  const [option] = getDeclarationOptions(kind);
  return kind === DeclarationKind.SUIT ? { suit: option as Suit } : { form: option as CardForm };
}

/** The first effect answer the room accepts from the seat. */
function effectAnswer(game: Game, playerId: string): TrickEffectResponse | undefined {
  const hand = game.getPlayer(playerId)?.hand ?? [];
  const pile = game.getLastCompletedTrick()?.getPile() ?? [];
  const swaps = (handCard: ICard): TrickEffectResponse[] => pile.map((trickCard) => ({
    kind: TrickEffectKind.SWAP_WITH_TRICK,
    handCardId: handCard.id,
    trickCardId: trickCard.id,
  }));
  const candidates: TrickEffectResponse[] = [
    ...hand.map((card): TrickEffectResponse => ({ kind: TrickEffectKind.PASS_LEFT, cardId: card.id })),
    { kind: TrickEffectKind.ADJUST_BID, delta: 1 },
    { kind: TrickEffectKind.ADJUST_BID, delta: -1 },
    ...hand.flatMap(swaps),
  ];
  return candidates.find((candidate) => game.getEffectResponseError(playerId, candidate) === null);
}

function send(t: Table, socket: TestConnection | undefined, command: Record<string, unknown>): boolean {
  if (socket) t.h.send(socket, command);
  return Boolean(socket);
}

/** Every human the special-card effect waits for answers in turn; false when none can. */
function effectMove(t: Table): boolean {
  const game = t.h.game;
  for (const playerId of game.getAwaitingEffectPlayerIds()) {
    const response = effectAnswer(game, playerId);
    if (response && send(t, humanSocket(t, playerId), { type: ClientCommandType.RESOLVE_EFFECT, response })) return true;
  }
  return false;
}

/** The human on turn bids the lowest bid allowed or plays their first legal card. */
function turnMove(t: Table): boolean {
  const game = t.h.game;
  const current = game.getCurrentPlayer();
  const socket = humanSocket(t, current?.id);
  if (!current || !socket) return false;
  if (game.phase === GamePhase.BIDDING) {
    return send(t, socket, { type: ClientCommandType.PLACE_BID, bid: game.getForbiddenBidFor(current.id) === 0 ? 1 : 0 });
  }
  const [card] = game.getLegalPlays(current.id);
  if (game.phase !== GamePhase.PLAYING || !card) return false;
  return send(t, socket, { type: ClientCommandType.PLAY_CARD, cardId: card.id, declaration: declarationFor(game, card) });
}

/** A human the room waits for makes the simplest legal move (the host moves a round end on); false when none. */
function legalMove(t: Table): boolean {
  const game = t.h.game;
  if (game.isPaused()) return false;
  if (game.phase === GamePhase.ROUND_END) return send(t, humanSocket(t, game.hostId), { type: ClientCommandType.NEXT_ROUND });
  if (game.phase === GamePhase.TRUMP_SELECTION) {
    return send(t, humanSocket(t, game.getTrumpChooser()?.id), { type: ClientCommandType.SELECT_TRUMP, suit: Suit.GIANTS });
  }
  if (game.phase === GamePhase.PLAYING && game.getActiveEffect()) return effectMove(t);
  return turnMove(t);
}

/** Humans move at once, bots in their own time, until `done` holds (checked before every move). */
async function playUntil(t: Table, done: () => boolean): Promise<void> {
  for (let step = 0; step < MAX_STEPS; step++) {
    if (done()) return;
    if (!legalMove(t)) await t.h.advance(BOT_ACTION_DELAY_MS);
  }
  throw new Error(`stuck in ${t.h.game.phase} (paused: ${t.h.game.isPaused()})`);
}

const gameOver = (t: Table) => () => t.h.game.phase === GamePhase.GAME_END;

/** Every round snapshot (ROUND_END, or GAME_END for the last round) a socket was sent. */
function roundEnds(socket: TestConnection): IGameState[] {
  return socket.ofType(GameEventType.GAME_STATE)
    .map((frame) => frame.state as IGameState)
    .filter((state) => state.phase === GamePhase.ROUND_END || state.phase === GamePhase.GAME_END);
}

/**
 * Scores every round the room showed at its end, on every socket a human ever had, and expects
 * the room's final scores to be the sheet's.
 */
function expectRulesScores(h: RoomHarness, sockets: readonly TestConnection[], rules: IRulesetConfig): void {
  expect(h.game.phase).toBe(GamePhase.GAME_END);
  const seats = h.game.players.map((player) => player.id);
  const sheet = new ScoreSheet(rules, expectedRoundPlan(seats.length, rules), seats);
  for (const socket of sockets) {
    for (const state of roundEnds(socket)) sheet.record(state, socket.id);
  }
  sheet.expectComplete();
  const totals = sheet.totals();
  const scores = h.game.players.map((player) => [player.id, player.score]);
  expect(scores, 'the room scored by the rules').toEqual(seats.map((id) => [id, totals[id]]));
}

/** What a table is, apart from who is connected and the deadlines that run: deal, bids, tricks, effects, scores. */
function tableFacts(game: Game) {
  const state = game.toJSON();
  return {
    phase: state.phase,
    round: state.currentRound,
    dealer: state.dealerIndex,
    turn: state.currentPlayerIndex,
    trump: [state.trumpSuit, state.trumpCard?.id ?? null],
    trumpChoice: state.trumpChoice ?? null,
    trick: state.currentTrick,
    completedTricks: state.completedTricks,
    pendingEffects: state.pendingEffects ?? [],
    expansionState: state.expansionState ?? null,
    players: state.players.map(({ id, name, isBot, hand, bid, bidAdjustment, tricksWon, score, roundHistory }) => ({
      id, name, isBot, hand: hand.map((card) => card.id), bid, bidAdjustment, tricksWon, score, roundHistory,
    })),
  };
}

type Facts = ReturnType<typeof tableFacts>;

/** The facts of a table that a seat changing hands (human to bot) leaves alone. */
function dealFacts({ players, ...rest }: Facts) {
  return { ...rest, players: players.map(({ id, hand, bid, tricksWon, score }) => ({ id, hand, bid, tricksWon, score })) };
}

/** Where a row stops the game to drop a player or restart the room. */
type Moment = 'bidding' | 'mid-trick' | 'round end' | 'effect pending';

function reached(game: Game, moment: Moment): boolean {
  if (game.isPaused()) return false;
  switch (moment) {
    case 'bidding':
      return game.phase === GamePhase.BIDDING && game.getBidsPlaced() > 0;
    case 'mid-trick':
      return game.phase === GamePhase.PLAYING && !game.getActiveEffect() && (game.currentTrick?.cards.length ?? 0) > 0;
    case 'round end':
      return game.phase === GamePhase.ROUND_END;
    case 'effect pending':
      return game.phase === GamePhase.PLAYING && game.getAwaitingEffectPlayerIds().length > 0;
  }
}

// ---------------------------------------------------------------------------------------------
// Turn timers
// ---------------------------------------------------------------------------------------------

/**
 * Every special card but the Juggler: its pass waits for every player at once, so no single
 * player is timed (Game.getTimedPlayer) and idle humans hold it for good.
 */
const NO_JUGGLER = SPECIAL_CARD_TYPES.filter((type) => type !== CardType.JUGGLER);
const PLAY_SECONDS = 6;
/** What a 6 s play timer derives for bidding: 1.5 times as long, rounded up (ruleset-config.test.ts owns the rule). */
const DERIVED_BIDDING_SECONDS = 9;
const BIDDING_SECONDS = 10;

const TIMER_ROWS = matrixRows({
  players: PLAYER_COUNTS,
  seats: ['idle humans only', 'two idle humans and bots'] as const,
  deck: ['Classic', 'every special card but the Juggler'] as const,
  timers: ['a play timer (bidding timer derived)', 'separate bidding and play timers'] as const,
});

type TimerRow = (typeof TIMER_ROWS)[number];

/** The row's rules and the bidding timer they give (a play timer alone derives one: rules.md, "Turn timers"). */
function timedRules(row: TimerRow): { rules: IRulesetConfig; biddingSeconds: number } {
  const base = rulesWith(row.deck === 'Classic' ? [] : NO_JUGGLER);
  if (row.timers === 'separate bidding and play timers') {
    const turn = { ...base.turn, playTimerSeconds: PLAY_SECONDS, biddingTimerSeconds: BIDDING_SECONDS };
    return { rules: { ...base, turn }, biddingSeconds: BIDDING_SECONDS };
  }
  // The bidding timer is left out on the wire, as a client that only set a play timer sends it.
  const turn = { playTimerSeconds: PLAY_SECONDS, timeoutSoundVolume: base.turn.timeoutSoundVolume };
  return { rules: { ...base, turn } as IRulesetConfig, biddingSeconds: DERIVED_BIDDING_SECONDS };
}

/** The lowest bid the hook rule allows the timed bidder (rules.md, "Bidding"). */
function lowestAllowedBid(game: Game, playerId: string): number {
  const others = game.players.filter((player) => player.id !== playerId);
  const cards = game.getCardsPerPlayerForCurrentRound();
  const otherBids = others.reduce((sum, player) => sum + (player.bid ?? 0), 0);
  const isLast = others.every((player) => player.bid !== null);
  const forbidden = isLast && otherBids <= cards ? cards - otherBids : null;
  return forbidden === 0 ? 1 : 0;
}

/** Fires the timed seat's deadline: the timer runs out (heckling opens), or the room moves for them. Returns true for a move. */
async function fireTimer(h: RoomHarness, watcher: TestConnection, timer: ITurnTimerState): Promise<boolean> {
  if (!timer.expired) {
    expect(h.storage.alarm, 'the alarm waits for the timer').toBe(timer.startedAt + timer.durationMs);
    const expiries = watcher.ofType(GameEventType.TURN_TIMER_EXPIRED).length;
    await h.fireAlarm('room');
    expect(watcher.ofType(GameEventType.TURN_TIMER_EXPIRED), 'heckling opens').toHaveLength(expiries + 1);
    return false;
  }
  expect(h.storage.alarm, 'the room moves once the heckling window closed').toBe(timer.expiresAt + TURN_TIMEOUT_POLICY.autoActAfterMs);
  const expectedBid = h.game.phase === GamePhase.BIDDING ? lowestAllowedBid(h.game, timer.playerId) : null;
  await h.fireAlarm('room');
  expect(h.game.turnTimerState?.sequence, 'the timed decision was made').not.toBe(timer.sequence);
  if (expectedBid !== null) expect(h.game.getPlayer(timer.playerId)?.bid, 'the lowest allowed bid').toBe(expectedBid);
  return true;
}

async function timerRow(row: TimerRow): Promise<void> {
  const { rules, biddingSeconds } = timedRules(row);
  const humans = row.seats === 'idle humans only' ? row.players : 2;
  const h = await harness(row.players * 10 + humans);
  const t = await seatTable(h, humans, Array(row.players - humans).fill(BOT_LEVEL), rules);
  const watcher = t.sockets[NAMES[0]];
  let movedFor = 0;

  // No human ever sends a move: bots play in their own time, the room's alarm does the rest.
  for (let step = 0; h.game.phase !== GamePhase.GAME_END; step++) {
    if (step > MAX_STEPS) throw new Error(`stuck in ${h.game.phase}`);
    const game = h.game;
    const timer = game.turnTimerState;
    if (h.server.isBotTurnScheduled) {
      await h.advance(BOT_ACTION_DELAY_MS);
    } else if (game.phase === GamePhase.ROUND_END) {
      const round = game.currentRound;
      expect(h.storage.alarm, 'the round end moves on by itself').toBe((game.roundEndedAt ?? NaN) + ROUND_END_AUTO_ADVANCE_MS);
      await h.fireAlarm('room');
      expect(h.game.currentRound).toBe(round + 1);
    } else if (timer && game.getPlayer(timer.playerId)?.isBot === false) {
      const seconds = timer.phase === GamePhase.PLAYING ? PLAY_SECONDS : biddingSeconds;
      expect(timer.durationMs, `the ${timer.phase} timer`).toBe(seconds * MS_PER_SECOND);
      if (await fireTimer(h, watcher, timer)) movedFor += 1;
    } else {
      throw new Error(`nobody is timed in ${game.phase}`);
    }
  }

  expect(movedFor, 'precondition: the humans were moved for').toBeGreaterThan(0);
  expect(watcher.ofType(GameEventType.ERROR)).toEqual([]);
  expectRulesScores(h, Object.values(t.sockets), rules);
}

// ---------------------------------------------------------------------------------------------
// Pause
// ---------------------------------------------------------------------------------------------

/**
 * Who drops and whether they return, as one axis, so that every phase meets all four: who drops
 * decides the host handover, the outcome the seat handover, and the phase what both must keep.
 */
const DROPS = (['the host', 'a guest'] as const).flatMap((who) => (['returns', 'never returns'] as const).map((outcome) => ({ who, outcome })));

const PAUSE_ROWS = matrixRows({
  players: PLAYER_COUNTS,
  moment: ['bidding', 'mid-trick', 'round end'] as const,
  drop: DROPS,
});

async function pauseRow(row: (typeof PAUSE_ROWS)[number]): Promise<void> {
  const rules = rulesWith([]);
  const h = await harness(row.players);
  const t = await seatTable(h, 2, Array(row.players - 2).fill(BOT_LEVEL), rules);
  const [hostName, guestName] = NAMES;
  const [victimName, stayerName] = row.drop.who === 'the host' ? [hostName, guestName] : [guestName, hostName];
  const victim = t.sockets[victimName];
  const stayer = t.sockets[stayerName];
  const victimSeat = h.seatOf(victim);
  const token = victim.session()?.sessionToken;
  const sockets = [victim, stayer];

  await playUntil(t, () => reached(h.game, row.moment));
  const phase = h.game.phase;
  h.drop(victim);
  // Bots may still move during the debounce: a blip is not a pause yet.
  await h.advance(DISCONNECT_DEBOUNCE_MS);
  const before = tableFacts(h.game);
  const pause = h.game.pauseState;
  const pauseEnds = (pause?.pausedAt ?? NaN) + RECONNECT_WINDOW_MS;
  expect(pause, 'the table waits for the dropped player').toMatchObject({ pausedForPlayerId: victimSeat, previousPhase: phase });
  expect(before.phase, 'a pause is not a phase').toBe(phase);
  expect(h.storage.alarm).toBe(pauseEnds);
  expect(stayer.ofType(GameEventType.GAME_PAUSED).at(-1)).toMatchObject({ pausedForPlayerId: victimSeat });
  expect(h.game.hostId, 'the host is a connected human').toBe(h.seatOf(stayer));
  await h.advance(pauseEnds - 1 - Date.now());
  expect(h.game.isPaused(), 'still waiting at the last moment of the window').toBe(true);
  expect(tableFacts(h.game), 'nothing moved while the table waited').toEqual(before);

  if (row.drop.outcome === 'returns') {
    const back = h.join(victimName, victimName.toLowerCase(), { sessionToken: token });
    t.seats.set(victimSeat, back);
    sockets.push(back);
    expect(h.seatOf(back)).toBe(victimSeat);
    expect(h.game.isPaused()).toBe(false);
    expect(stayer.ofType(GameEventType.GAME_RESUMED)).toHaveLength(1);
    expect(tableFacts(h.game), 'the table resumes as it was').toEqual(before);
  } else {
    await h.advance(1);
    expect(h.game.isPaused()).toBe(false);
    expect(h.game.getPlayer(victimSeat)).toMatchObject({ isBot: true, name: `Bot ${victimName}` });
    expect(dealFacts(tableFacts(h.game)), 'the bot takes over the table as it was').toEqual(dealFacts(before));
  }

  await playUntil(t, gameOver(t));
  expect(stayer.ofType(GameEventType.ERROR)).toEqual([]);
  expectRulesScores(h, sockets, rules);
}

// ---------------------------------------------------------------------------------------------
// Restart from storage
// ---------------------------------------------------------------------------------------------

/** Deals many cards at once, so a Juggler, Cloud or Witch trick comes up early. */
const EFFECT_ROUNDS = 6;

const RESTART_SEATS = ['humans only', 'one human and bots'] as const;

interface RestartRow {
  players: number;
  moment: Moment;
  deck: IExpansionSet;
  seats: (typeof RESTART_SEATS)[number];
}

const RESTART_ROWS: RestartRow[] = [
  ...matrixRows({
    players: PLAYER_COUNTS,
    moment: ['bidding', 'mid-trick', 'round end'] as const,
    deck: [CLASSIC, ALL_SPECIALS],
    seats: RESTART_SEATS,
  }),
  // Only special cards leave an effect pending.
  ...matrixRows({ players: PLAYER_COUNTS, moment: ['effect pending'] as const, deck: [ALL_SPECIALS], seats: RESTART_SEATS }),
];

function restartRules(row: RestartRow): IRulesetConfig {
  if (row.moment !== 'effect pending') return rulesWith(row.deck.cards);
  const rules = rulesWith(row.deck.cards, EFFECT_ROUNDS);
  return { ...rules, structure: { ...rules.structure, descendingRounds: true } };
}

/** A seeded table of the row played to the moment; for a pending effect the first seed whose deal gets there. */
async function tableAt(row: RestartRow, rules: IRulesetConfig): Promise<Table> {
  const humans = row.seats === 'humans only' ? row.players : 1;
  const seeds = row.moment === 'effect pending' ? SITUATION_SEEDS : [row.players];
  for (const seed of seeds) {
    const t = await seatTable(await harness(seed), humans, Array(row.players - humans).fill(BOT_LEVEL), rules);
    await playUntil(t, () => reached(t.h.game, row.moment) || t.h.game.phase === GamePhase.GAME_END);
    if (reached(t.h.game, row.moment)) return t;
  }
  throw new Error(`no seed of ${seeds.join(', ')} reaches ${row.moment}`);
}

async function restartRow(row: RestartRow): Promise<void> {
  const rules = restartRules(row);
  const evicted = await tableAt(row, rules);
  const humans = Object.entries(evicted.sockets).map(([name, socket]) => ({
    name,
    seat: evicted.h.seatOf(socket),
    token: socket.session()?.sessionToken,
  }));
  const sockets = Object.values(evicted.sockets);
  const before = tableFacts(evicted.h.game);

  const h = await evicted.h.restart();
  harnesses.push(h);
  const t: Table = { h, seats: new Map(), sockets: {} };
  expect(tableFacts(h.game), 'the room starts again on the stored table').toEqual(before);
  expect(h.game.pauseState?.pausedForPlayerId, 'it waits for a human').toBeOneOf(humans.map((human) => human.seat));

  for (const human of humans) {
    const back = h.join(human.name, human.name.toLowerCase(), { sessionToken: human.token });
    expect(h.seatOf(back), `${human.name} takes the seat back`).toBe(human.seat);
    t.seats.set(human.seat, back);
    t.sockets[human.name] = back;
    sockets.push(back);
  }
  expect(h.game.isPaused(), 'every human is back').toBe(false);
  expect(tableFacts(h.game), 'and the table is as it was').toEqual(before);

  await playUntil(t, gameOver(t));
  for (const socket of sockets) expect(socket.ofType(GameEventType.ERROR), socket.id).toEqual([]);
  expectRulesScores(h, sockets, rules);
}

// ---------------------------------------------------------------------------------------------

describe('server matrix', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(HARNESS_START_TIME);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const h of harnesses.splice(0)) h.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('turn timers: idle humans are moved for exactly when the heckling window closes, and the table finishes the game', () => {
    for (const row of TIMER_ROWS) it(`${row.players} players, ${row.seats}, ${row.deck}, ${row.timers}`, () => timerRow(row));
  });

  describe('pause: a dropped player stops the table unchanged, which resumes when they return or plays on with a bot', () => {
    for (const row of PAUSE_ROWS) it(`${row.players} players, ${row.drop.who} drops at ${row.moment} and ${row.drop.outcome}`, () => pauseRow(row));
  });

  describe('restart: a room evicted in any phase starts on the same table, waits for its humans and plays on', () => {
    for (const row of RESTART_ROWS) it(`${row.players} players, ${row.seats}, ${row.deck.name}, evicted at ${row.moment}`, () => restartRow(row));
  });
});
