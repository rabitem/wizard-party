/**
 * Seats across sockets on the real GameRoom: joining again, leaving on purpose, a pause that
 * waits for several dropped players in turn, restarts and lobby grace. Pauses for one player,
 * the host and the invariants are in game-room.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientCommandType, GameEventType, GamePhase } from '../../shared/domain';
import { ROOM_TIMING } from '../config/room-timing.config';
import { HARNESS_START_TIME, RoomHarness } from '../test-support/room-harness';
import { lobby, playUntil, ruleset, startedTable, type Table } from '../test-support/table-driver';

const { DISCONNECT_DEBOUNCE_MS, RECONNECT_WINDOW_MS } = ROOM_TIMING;

describe('GameRoom reconnects', () => {
  let harness: RoomHarness | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(HARNESS_START_TIME);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function table(humans: string[], bots: number): Promise<Table> {
    const created = await startedTable(humans, bots);
    harness = created.h;
    return created;
  }

  async function lobbyOf(humans: string[]): Promise<Table> {
    const created = await lobby(humans);
    harness = created.h;
    return created;
  }

  describe('rejoin', () => {
    it.each([
      ['at once', 0],
      ['a reconnect window later', RECONNECT_WINDOW_MS],
    ])('does not announce a seat that joins again from a new socket %s as a new player', async (_when, delay) => {
      const t = await lobbyOf(['Hana', 'Pia']);
      const pia = t.h.seatOf(t.sockets.Pia);
      const announced = t.sockets.Hana.ofType(GameEventType.PLAYER_JOINED).length;

      await t.h.advance(delay);
      const second = t.h.join('Pia', 'pia', { sessionToken: t.sockets.Pia.session()?.sessionToken });

      expect(t.h.seatOf(second)).toBe(pia);
      expect(t.sockets.Hana.ofType(GameEventType.PLAYER_JOINED)).toHaveLength(announced);
      expect(t.sockets.Hana.lastState()?.players.map((p) => p.name)).toEqual(['Hana', 'Pia']);
    });

    it('seats a player who left the lobby on purpose again when they join straight back', async () => {
      const t = await lobbyOf(['Hana', 'Pia']);
      const token = t.sockets.Pia.session()?.sessionToken;
      t.h.send(t.sockets.Pia, { type: ClientCommandType.LEAVE_GAME });
      expect(t.h.game.players.map((p) => p.name)).toEqual(['Hana']);

      const back = t.h.join('Pia', 'pia', { sessionToken: token });

      expect(t.h.game.getPlayer(t.h.seatOf(back))).toMatchObject({ name: 'Pia', isConnected: true });
      expect(t.sockets.Hana.ofType(GameEventType.PLAYER_JOINED).at(-1)).toMatchObject({ playerId: t.h.seatOf(back) });
    });
  });

  describe('pause queue', () => {
    /** Three humans; Pia drops (the table waits for her), then Otto drops too. */
    async function bothAway() {
      const t = await table(['Hana', 'Pia', 'Otto'], 0);
      const tokens = { Pia: t.sockets.Pia.session()?.sessionToken, Otto: t.sockets.Otto.session()?.sessionToken };
      const [pia, otto] = [t.h.seatOf(t.sockets.Pia), t.h.seatOf(t.sockets.Otto)];
      const phase = t.h.game.phase;
      t.h.drop(t.sockets.Pia);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);
      t.h.drop(t.sockets.Otto);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);
      expect(t.h.game.pauseState?.pausedForPlayerId).toBe(pia);
      t.sockets.Hana.clear();
      return { t, tokens, pia, otto, phase };
    }

    it('waits for the next dropped player when the awaited one returns, instead of resuming', async () => {
      const { t, tokens, pia, otto, phase } = await bothAway();

      t.h.join('Pia', 'pia', { sessionToken: tokens.Pia });

      expect(t.h.game.pauseState).toMatchObject({ pausedForPlayerId: otto, pausedAt: Date.now() });
      expect(t.h.storage.alarm).toBe(Date.now() + RECONNECT_WINDOW_MS);
      expect(t.h.game.phase).toBe(phase);
      expect(t.h.game.getPlayer(pia)?.isConnected).toBe(true);
      expect(t.sockets.Hana.ofType(GameEventType.GAME_PAUSED)).toEqual([expect.objectContaining({ pausedForPlayerId: otto })]);
      expect(t.sockets.Hana.ofType(GameEventType.GAME_RESUMED)).toHaveLength(0);
    });

    it('lets a dropped player who is not awaited return while the table goes on waiting for the other', async () => {
      const { t, tokens, pia, otto } = await bothAway();
      const pause = { ...t.h.game.pauseState };

      t.h.join('Otto', 'otto', { sessionToken: tokens.Otto });

      expect(t.h.game.pauseState).toEqual(pause);
      expect(t.h.game.pauseState?.pausedForPlayerId).toBe(pia);
      expect(t.h.game.getPlayer(otto)?.isConnected).toBe(true);
      expect(t.sockets.Hana.ofType(GameEventType.GAME_RESUMED)).toHaveLength(0);
    });
  });

  describe('leaving on purpose', () => {
    it('hands the seat to a bot at once instead of pausing everyone for the reconnect window', async () => {
      const t = await table(['Hana', 'Pia'], 1);
      const pia = t.h.seatOf(t.sockets.Pia);

      t.h.send(t.sockets.Pia, { type: ClientCommandType.LEAVE_GAME });

      expect(t.h.game.isPaused()).toBe(false);
      expect(t.sockets.Hana.ofType(GameEventType.GAME_PAUSED)).toHaveLength(0);
      expect(t.h.game.getPlayer(pia)).toMatchObject({ isBot: true, isConnected: true });
      t.sockets.Pia.clear();
      await playUntil(t, () => t.h.game.phase === GamePhase.ROUND_END || t.h.game.phase === GamePhase.GAME_END);
      expect(t.sockets.Pia.sent).toHaveLength(0);
    });

    it('lets the player take the seat back from its bot, also moments after they left', async () => {
      const t = await table(['Hana', 'Pia'], 1);
      const pia = t.h.seatOf(t.sockets.Pia);
      const token = t.sockets.Pia.session()?.sessionToken;
      t.h.send(t.sockets.Pia, { type: ClientCommandType.LEAVE_GAME });

      const back = t.h.join('Pia', 'pia', { sessionToken: token });

      expect(t.h.seatOf(back)).toBe(pia);
      expect(t.h.game.getPlayer(pia)).toMatchObject({ name: 'Pia', isBot: false, isConnected: true });
    });

    it('never pauses for the seat its bot holds when the socket that left closes late', async () => {
      const t = await table(['Hana', 'Pia', 'Otto'], 0);
      const pia = t.h.seatOf(t.sockets.Pia);
      t.h.drop(t.sockets.Otto);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);
      t.h.send(t.sockets.Pia, { type: ClientCommandType.LEAVE_GAME });
      const pause = { ...t.h.game.pauseState };

      t.h.drop(t.sockets.Pia);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);

      expect(t.h.game.pauseState).toEqual(pause);
      expect(t.h.game.getPlayer(pia)).toMatchObject({ isBot: true, isConnected: true });
    });
  });

  describe('restart', () => {
    it('restores a running game paused for its humans, who take their seats back with their tokens', async () => {
      const t = await table(['Hana', 'Pia'], 1);
      const tokens = { Hana: t.sockets.Hana.session()?.sessionToken, Pia: t.sockets.Pia.session()?.sessionToken };
      const phase = t.h.game.phase;
      const round = t.h.game.currentRound;

      const restarted = await t.h.restart();
      harness = restarted;
      expect(restarted.game.isPaused()).toBe(true);
      expect(restarted.game.phase).toBe(phase);

      restarted.join('Hana', 'hana', { sessionToken: tokens.Hana });
      restarted.join('Pia', 'pia', { sessionToken: tokens.Pia });

      expect(restarted.game.isPaused()).toBe(false);
      expect(restarted.game.currentRound).toBe(round);
      expect(restarted.game.players.filter((p) => !p.isBot).every((p) => p.isConnected)).toBe(true);
    });

    it('keeps lobby seats for the reconnect window, so one who never returns cannot block the start', async () => {
      const h = await RoomHarness.create();
      const settings = { name: 'Table', isPublic: false, maxPlayers: 6, rulesetConfig: ruleset() };
      const hana = h.join('Hana', 'hana', { roomSettings: settings });
      const pia = h.join('Pia', 'pia');
      const hanaToken = hana.session()?.sessionToken;
      const piaSeat = h.seatOf(pia);

      const restarted = await h.restart();
      harness = restarted;
      expect(restarted.game.isPlayerGraced(piaSeat)).toBe(true);
      expect(restarted.storage.alarm).toBe(Date.now() + RECONNECT_WINDOW_MS);

      const back = restarted.join('Hana', 'hana', { sessionToken: hanaToken });
      await restarted.advance(RECONNECT_WINDOW_MS);
      expect(restarted.game.getPlayer(piaSeat)).toBeUndefined();

      restarted.send(back, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
      restarted.send(back, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
      restarted.send(back, { type: ClientCommandType.START_GAME });
      expect(restarted.game.phase).not.toBe(GamePhase.LOBBY);
    });
  });

  describe('lobby grace', () => {
    it('arms the earliest grace expiry and re-arms the other when one player returns', async () => {
      const h = await RoomHarness.create();
      harness = h;
      const host = h.join('Hana', 'hana');
      const alice = h.join('Alice', 'alice');
      const bob = h.join('Bob', 'bob');
      const aliceToken = alice.session()?.sessionToken;
      const bobSeat = h.seatOf(bob);

      h.drop(alice);
      await h.advance(DISCONNECT_DEBOUNCE_MS);
      const aliceExpiry = Date.now() + RECONNECT_WINDOW_MS;
      await h.advance(1_000);
      h.drop(bob);
      await h.advance(DISCONNECT_DEBOUNCE_MS);
      const bobExpiry = Date.now() + RECONNECT_WINDOW_MS;
      expect(h.storage.alarm).toBe(aliceExpiry);

      h.join('Alice', 'alice', { sessionToken: aliceToken });
      expect(h.storage.alarm).toBe(bobExpiry);

      await h.advance(RECONNECT_WINDOW_MS);
      expect(h.game.getPlayer(bobSeat)).toBeUndefined();
      expect(host.ofType(GameEventType.PLAYER_GRACE_EXPIRED)).toHaveLength(1);
    });
  });
});
