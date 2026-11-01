import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientCommandType, GameEventType, GamePhase, getTrickPresentationMs } from '../../shared/domain';
import { createUseCaseRegistry } from '../../shared/application';
import { ROOM_TIMING, TURN_TIMEOUT_POLICY } from '../config/room-timing.config';
import { HARNESS_START_TIME, RoomHarness, type TestConnection } from '../test-support/room-harness';
import { expectRoomInvariants, playUntil, ruleset, startedTable, type Table } from '../test-support/table-driver';
import { PERSISTED_STATE_KEY, type PersistedState } from '../utils/types';

const { BOT_ACTION_DELAY_MS, DISCONNECT_DEBOUNCE_MS, RECONNECT_WINDOW_MS } = ROOM_TIMING;

function eventsOf(socket: TestConnection, type: GameEventType) {
  return socket.ofType(type);
}

describe('GameRoom', () => {
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

  async function table(humans: string[], bots: number, rules = ruleset()): Promise<Table> {
    const created = await startedTable(humans, bots, rules);
    harness = created.h;
    return created;
  }

  describe('pause', () => {
    it('pauses beside the phase: the other players keep their table, legacy clients see PAUSED', async () => {
      const h = await RoomHarness.create();
      harness = h;
      const settings = { name: 'Table', isPublic: false, maxPlayers: 6, rulesetConfig: ruleset() };
      const hana = h.join('Hana', 'hana', { roomSettings: settings });
      const pia = h.join('Pia', 'pia');
      const lea = h.join('Lea', 'lea', { protocolVersion: null });
      h.send(hana, { type: ClientCommandType.START_GAME });
      const phase = h.game.phase;
      const piaSeat = h.seatOf(pia);

      h.drop(pia);
      await h.advance(DISCONNECT_DEBOUNCE_MS);

      const seen = hana.lastState();
      expect(eventsOf(hana, GameEventType.GAME_PAUSED)).toHaveLength(1);
      expect(eventsOf(hana, GameEventType.GAME_PAUSED)[0]).toMatchObject({
        pausedForPlayerId: piaSeat,
        reason: 'player_disconnected',
        timeoutDuration: RECONNECT_WINDOW_MS,
      });
      expect(seen?.phase).toBe(phase);
      expect(seen?.pauseState?.pausedForPlayerId).toBe(piaSeat);
      // The client's pause overlay counts down from this.
      expect(seen?.pauseState?.timeoutDuration).toBe(RECONNECT_WINDOW_MS);
      expect(seen?.players.find((p) => p.id === h.seatOf(hana))?.hand.length).toBeGreaterThan(0);
      expect(lea.lastState()?.phase).toBe(GamePhase.PAUSED);
      expect(lea.lastState()?.pauseState?.previousPhase).toBe(phase);
      expect(h.storage.alarm).toBe(Date.now() + RECONNECT_WINDOW_MS);
    });

    it('never pauses for a blip shorter than the disconnect debounce', async () => {
      const t = await table(['Hana', 'Pia'], 1);
      const token = t.sockets.Pia.session()?.sessionToken;

      t.h.drop(t.sockets.Pia);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS / 2);
      t.h.join('Pia', 'pia', { sessionToken: token });
      await t.h.advance(DISCONNECT_DEBOUNCE_MS * 2);

      expect(eventsOf(t.sockets.Hana, GameEventType.GAME_PAUSED)).toHaveLength(0);
      expect(t.h.game.isPaused()).toBe(false);
    });

    it('resumes when the awaited player comes back', async () => {
      const t = await table(['Hana', 'Pia'], 1);
      const token = t.sockets.Pia.session()?.sessionToken;
      t.h.drop(t.sockets.Pia);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);
      expect(t.h.game.isPaused()).toBe(true);

      t.h.join('Pia', 'pia', { sessionToken: token });

      expect(t.h.game.isPaused()).toBe(false);
      expect(eventsOf(t.sockets.Hana, GameEventType.GAME_RESUMED)).toHaveLength(1);
    });

    it('never acts on an early or stale alarm', async () => {
      const t = await table(['Hana', 'Pia'], 1);
      const pia = t.h.seatOf(t.sockets.Pia);
      t.h.drop(t.sockets.Pia);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);

      await t.h.server.onAlarm();

      expect(t.h.game.getPlayer(pia)?.isBot).toBe(false);
      expect(t.h.game.isPaused()).toBe(true);
    });

    it('hands the seat to a bot once the pause runs out, and the table plays on', async () => {
      const t = await table(['Hana', 'Pia'], 1);
      const pia = t.h.seatOf(t.sockets.Pia);
      t.h.drop(t.sockets.Pia);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS + RECONNECT_WINDOW_MS);

      expect(t.h.game.isPaused()).toBe(false);
      expect(t.h.game.getPlayer(pia)).toMatchObject({ isBot: true, name: 'Bot Pia' });
      await playUntil(t, () => t.h.game.phase === GamePhase.ROUND_END || t.h.game.phase === GamePhase.GAME_END);
    });
  });

  describe('host', () => {
    it('moves the host to a connected human when the host drops, so the round can go on', async () => {
      const t = await table(['Hana', 'Pia', 'Otto'], 0);
      const pia = t.h.seatOf(t.sockets.Pia);

      // The audit case: Otto drops, then the host drops while the table waits for Otto.
      t.h.drop(t.sockets.Otto);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);
      t.h.drop(t.sockets.Hana);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);

      expect(t.h.game.hostId).toBe(pia);
      expect(eventsOf(t.sockets.Pia, GameEventType.HOST_CHANGED).at(-1)).toMatchObject({ hostId: pia });

      await playUntil(t, () => t.h.game.phase === GamePhase.ROUND_END);
      t.h.send(t.sockets.Pia, { type: ClientCommandType.NEXT_ROUND });
      expect(t.h.game.currentRound).toBe(2);
    });
  });

  describe('invariants', () => {
    it('hold through a host drop, a deliberate leave, a return and the rest of the round', async () => {
      const t = await table(['Hana', 'Pia', 'Otto'], 1);
      const all = () => [...Object.values(t.sockets), ...t.seats.values()];
      const hanaToken = t.sockets.Hana.session()?.sessionToken;
      const [hana, pia, otto] = [t.sockets.Hana, t.sockets.Pia, t.sockets.Otto].map((socket) => t.h.seatOf(socket));
      expectRoomInvariants(t.h, all());

      t.h.drop(t.sockets.Hana);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);
      expect(t.h.game.pauseState?.pausedForPlayerId).toBe(hana);
      expect(t.h.game.hostId).toBe(pia);
      expectRoomInvariants(t.h, all());

      t.h.send(t.sockets.Pia, { type: ClientCommandType.LEAVE_GAME });
      expect(t.h.game.hostId).toBe(otto);
      expect(t.h.game.pauseState?.pausedForPlayerId).toBe(hana);
      expectRoomInvariants(t.h, all());

      const back = t.h.join('Hana', 'hana', { sessionToken: hanaToken });
      t.seats.set(t.h.seatOf(back), back);
      expect(t.h.game.isPaused()).toBe(false);
      expectRoomInvariants(t.h, all());

      await playUntil(t, () => {
        expectRoomInvariants(t.h, all());
        return t.h.game.phase === GamePhase.ROUND_END || t.h.game.phase === GamePhase.GAME_END;
      });
    });
  });

  describe('bot scheduling', () => {
    function botMoveGaps(socket: TestConnection, botIds: Set<string>): number[] {
      const moves = socket.sent
        .filter(({ message }) => message.type === GameEventType.BID_PLACED || message.type === GameEventType.CARD_PLAYED)
        .map(({ at, message }) => ({ at, bot: botIds.has(String(message.playerId)) }));
      return moves.slice(1).flatMap((move, index) => (move.bot ? [move.at - moves[index].at] : []));
    }

    it('lets bots answer one delay after every change, from a single chain, also after a pause', async () => {
      const t = await table(['Hana', 'Otto'], 2);
      const bots = new Set(t.h.game.players.filter((p) => p.isBot).map((p) => p.id));
      const token = t.sockets.Otto.session()?.sessionToken;

      t.h.drop(t.sockets.Otto);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);
      const back = t.h.join('Otto', 'otto', { sessionToken: token });
      t.seats.set(t.h.seatOf(back), back);
      expect(t.h.game.isPaused()).toBe(false);

      await playUntil(t, () => t.h.game.phase === GamePhase.ROUND_END || t.h.game.phase === GamePhase.GAME_END);

      const gaps = botMoveGaps(t.sockets.Hana, bots);
      expect(gaps.length).toBeGreaterThan(0);
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(BOT_ACTION_DELAY_MS);
    });

    it('lets a bot lead only a full delay after the tables have landed and collected the last trick', async () => {
      const t = await table(['Hana'], 3, ruleset({ rounds: 3 }));
      const bots = new Set(t.h.game.players.filter((p) => p.isBot).map((p) => p.id));

      await playUntil(t, () => t.h.game.phase === GamePhase.GAME_END);

      const { sent } = t.sockets.Hana;
      const leadWaits = sent.flatMap(({ at, message }, index) => {
        if (message.type !== GameEventType.TRICK_COMPLETE) return [];
        const lead = sent.slice(index + 1).find((later) => later.message.type === GameEventType.CARD_PLAYED);
        return lead && bots.has(String(lead.message.playerId)) ? [lead.at - at] : [];
      });
      expect(leadWaits.length).toBeGreaterThan(0);
      expect(Math.min(...leadWaits)).toBeGreaterThanOrEqual(getTrickPresentationMs(4) + BOT_ACTION_DELAY_MS);
    });

    it('retries a bot that could not move with backoff instead of stalling the table', async () => {
      const useCases = createUseCaseRegistry();
      const execute = vi.spyOn(useCases.botTurn, 'execute');
      const h = await RoomHarness.create({ useCases });
      harness = h;
      const t = await startedTable(['Hana'], 2, ruleset(), h);
      // Wait until a bot is to act, then make its brain and its fallback fail once.
      await playUntil(t, () => useCases.botTurn.getActingBot(h.game) !== undefined);
      const version = h.game.toJSON();
      execute.mockImplementationOnce(() => { throw new Error('brain crashed'); })
        .mockImplementationOnce(() => { throw new Error('fallback crashed'); });

      await h.advance(BOT_ACTION_DELAY_MS);
      expect(h.game.toJSON()).toEqual(version);
      expect(h.server.isBotTurnScheduled).toBe(true);

      await h.advance(ROOM_TIMING.BOT_RETRY_BASE_MS);
      expect(h.game.toJSON()).not.toEqual(version);
    });
  });

  describe('turn timer', () => {
    it('runs on the durable alarm and moves for an idle connected player once the heckling window is over', async () => {
      const t = await table(['Hana', 'Pia'], 1, ruleset({ biddingTimerSeconds: 5 }));
      // Bots move; the humans stay idle.
      await playUntil(t, () => {
        const timer = t.h.game.turnTimerState;
        return Boolean(timer && !t.h.game.getPlayer(timer.playerId)?.isBot);
      });
      const timer = t.h.game.turnTimerState;
      if (!timer) throw new Error('expected a running timer');
      const autoActAt = timer.expiresAt + TURN_TIMEOUT_POLICY.autoActAfterMs;
      // On the storage alarm, not an in-memory timer, so an evicted room still keeps the deadline.
      expect(t.h.storage.alarm).toBe(timer.expiresAt);

      await t.h.advance(autoActAt - 1 - Date.now());
      expect(eventsOf(t.sockets.Hana, GameEventType.TURN_TIMER_EXPIRED)).toHaveLength(1);
      expect(t.h.game.turnTimerState?.sequence).toBe(timer.sequence);
      const saved = t.h.storage.data.get(PERSISTED_STATE_KEY) as PersistedState;
      expect(saved.gameState?.turnTimerState?.expired).toBe(true);
      expect(t.h.storage.alarm).toBe(autoActAt);

      await t.h.advance(1);
      expect(t.h.game.turnTimerState?.sequence).not.toBe(timer.sequence);
    });
  });

  describe('round end', () => {
    it('deals the next round by itself when the host does not', async () => {
      const t = await table(['Hana'], 2);
      await playUntil(t, () => t.h.game.phase === GamePhase.ROUND_END);
      const endedAt = t.h.game.roundEndedAt;
      if (endedAt === null) throw new Error('expected the round end to be recorded');

      await t.h.advance(endedAt + ROOM_TIMING.ROUND_END_AUTO_ADVANCE_MS - 1 - Date.now());
      expect(t.h.game.phase).toBe(GamePhase.ROUND_END);

      await t.h.advance(1);
      expect(t.h.game.currentRound).toBe(2);
    });
  });

  describe('rematch', () => {
    it('keeps the house rules and bot levels, and graces a human who is gone', async () => {
      const t = await table(['Hana', 'Pia'], 1, ruleset({ rounds: 1 }));
      const pia = t.h.seatOf(t.sockets.Pia);
      await playUntil(t, () => t.h.game.phase === GamePhase.GAME_END);
      t.h.drop(t.sockets.Pia);
      await t.h.advance(DISCONNECT_DEBOUNCE_MS);

      t.h.send(t.sockets.Hana, { type: ClientCommandType.REQUEST_REMATCH });

      expect(t.h.game.phase).toBe(GamePhase.LOBBY);
      expect(t.h.game.rulesetConfig.structure.customRoundCount).toBe(1);
      expect(t.h.game.players.find((p) => p.isBot)?.botDifficulty).toBe(2);
      expect(t.h.game.isPlayerGraced(pia)).toBe(true);
      // Pia never hosted: coming back must not hand her the host seat.
      expect(t.h.game.getGraceState(pia)?.wasHost).toBe(false);

      await t.h.advance(RECONNECT_WINDOW_MS);
      expect(t.h.game.getPlayer(pia)).toBeUndefined();
      t.h.send(t.sockets.Hana, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
      t.h.send(t.sockets.Hana, { type: ClientCommandType.START_GAME });
      expect(t.h.game.phase).not.toBe(GamePhase.LOBBY);
    });
  });
});
