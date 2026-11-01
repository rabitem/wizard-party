/**
 * What the room records about what players do, through the real recorder: chat and emotes,
 * settings and rules, sound preferences, rematches and lobby graces; and what it refuses from
 * older clients (the retired mute commands, a room password).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientCommandType, DEFAULT_RULESET_CONFIG, GameEventType, GamePhase } from '../../shared/domain';
import { CommandRejectionCode, TelemetryEventType, type AnyTelemetryEnvelope } from '../../shared/telemetry';
import { ROOM_TIMING } from '../config/room-timing.config';
import { ServerTrigger, type ConnectionCloseInfo } from '../telemetry';
import { HARNESS_START_TIME, RoomHarness, type TestConnection } from '../test-support/room-harness';
import { RecordingTelemetry } from '../test-support/recording-telemetry';
import { playUntil, ruleset, startedTable } from '../test-support/table-driver';

const ROOM_ID = 'telemetry-room';
const { DISCONNECT_DEBOUNCE_MS, RECONNECT_WINDOW_MS } = ROOM_TIMING;
const GOING_AWAY: ConnectionCloseInfo = { code: 1001, reason: 'going away', wasClean: true };

const isRematchFact = (event: AnyTelemetryEnvelope): boolean => event.type.startsWith('rematch.');
const typeCorrelationPayload = (event: AnyTelemetryEnvelope): unknown[] => [event.type, event.correlationId, event.payload];

describe('GameRoom telemetry: player activity', () => {
  let harness: RoomHarness | null = null;
  let telemetry = new RecordingTelemetry(ROOM_ID);

  async function room(): Promise<RoomHarness> {
    telemetry = new RecordingTelemetry(ROOM_ID);
    harness = await RoomHarness.create({ roomId: ROOM_ID, telemetry: telemetry.recorder });
    return harness;
  }

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

  describe('social, settings and sound', () => {
    it('records chat as sent, emotes, settings and sound preference changes', async () => {
      const h = await room();
      const alice = h.join('Alice', 'aaaaaaa');
      const bob = h.join('Bob', 'bbbbbbb');
      const aliceSeat = h.seatOf(alice);
      const bobSeat = h.seatOf(bob);

      h.send(alice, { type: ClientCommandType.SEND_CHAT, message: 'good luck', requestId: 'req-chat' });
      h.send(alice, { type: ClientCommandType.SEND_CHAT, message: 'hello <b>' });
      h.send(bob, { type: ClientCommandType.SEND_EMOTE, emoteId: 'thumbs_up' });
      // An older client may still send a room password: the room drops it, it is never recorded.
      h.send(alice, { type: ClientCommandType.SET_ROOM_SETTINGS, roomSettings: { name: 'Friday', isPublic: false, maxPlayers: 6, password: 'secret' } });
      h.send(alice, { type: ClientCommandType.UPDATE_SOUND_PREFERENCES, preferences: { trickWinSound: 'not-a-sound' } });

      // Chat is recorded as the table saw it (sanitized), with its length.
      expect(telemetry.ofType(TelemetryEventType.CHAT_SENT)).toEqual([
        expect.objectContaining({ correlationId: 'req-chat', payload: { playerId: aliceSeat, message: 'good luck', length: 9 } }),
        expect.objectContaining({ payload: { playerId: aliceSeat, message: 'hello b', length: 7 } }),
      ]);
      expect(telemetry.ofType(TelemetryEventType.EMOTE_SENT)[0].payload).toEqual({ playerId: bobSeat, emoteId: 'thumbs_up' });

      const [settings] = telemetry.ofType(TelemetryEventType.ROOM_SETTINGS_CHANGED).slice(-1);
      expect(settings.payload.changedKeys).toEqual(expect.arrayContaining(['isPublic', 'name']));
      expect(settings.payload.changedKeys).not.toContain('password');
      expect(settings.payload.settings).toMatchObject({ name: 'Friday', isPublic: false });
      expect(JSON.stringify(telemetry.events)).not.toContain('secret');
      // An invalid sound name normalizes to an empty update, which is not a change.
      expect(telemetry.ofType(TelemetryEventType.SOUND_PREFERENCES_CHANGED)).toHaveLength(0);
    });

    it('refuses the retired mute commands like any unknown command: silently, recorded only', async () => {
      const h = await room();
      const alice = h.join('Alice', 'aaaaaaa');
      const bobSeat = h.seatOf(h.join('Bob', 'bbbbbbb'));

      h.send(alice, { type: 'MUTE_PLAYER', targetPlayerId: bobSeat, requestId: 'req-mute' });
      h.send(alice, { type: 'UNMUTE_PLAYER', targetPlayerId: bobSeat });

      expect(telemetry.payloadsOf(TelemetryEventType.COMMAND_REJECTED)).toEqual([
        expect.objectContaining({ commandType: 'MUTE_PLAYER', requestId: 'req-mute', errorCode: CommandRejectionCode.UNKNOWN_COMMAND, notifiedClient: false }),
        expect.objectContaining({ commandType: 'UNMUTE_PLAYER', errorCode: CommandRejectionCode.UNKNOWN_COMMAND, notifiedClient: false }),
      ]);
      expect(alice.ofType(GameEventType.ERROR)).toHaveLength(0);
    });
  });

  describe('rematch requests', () => {
    /** Alice hosts Bob and a bot through a one-round game to its end. */
    async function finishedGame(): Promise<{ h: RoomHarness; alice: TestConnection; bob: TestConnection }> {
      const h = await room();
      const table = await startedTable(['Alice', 'Bob'], 1, ruleset({ rounds: 1 }), h);
      await playUntil(table, () => h.game.phase === GamePhase.GAME_END);
      return { h, alice: table.sockets.Alice, bob: table.sockets.Bob };
    }

    it('records a refused request from a non-host', async () => {
      const { h, bob } = await finishedGame();
      h.send(bob, { type: ClientCommandType.REQUEST_REMATCH, requestId: 'req-rematch' });

      expect(telemetry.ofType(TelemetryEventType.REMATCH_REQUESTED)).toEqual([
        expect.objectContaining({ correlationId: 'req-rematch', payload: { playerId: h.seatOf(bob), isHost: false } }),
      ]);
      expect(telemetry.ofType(TelemetryEventType.REMATCH_STARTED)).toHaveLength(0);
      expect(
        telemetry.payloadsOf(TelemetryEventType.COMMAND_REJECTED).filter((payload) => payload.commandType === ClientCommandType.REQUEST_REMATCH)
      ).toEqual([expect.objectContaining({ errorName: 'NotHostError', errorCode: 'NOT_HOST' })]);
    });

    it("records the host's request followed by the rematch start of the same seats", async () => {
      const { h, alice, bob } = await finishedGame();
      const aliceSeat = h.seatOf(alice);
      const botSeat = alice.lastState()?.players.find((player) => player.isBot)?.id;
      h.send(alice, { type: ClientCommandType.REQUEST_REMATCH, requestId: 'req-rematch' });

      expect(telemetry.events.filter(isRematchFact).map(typeCorrelationPayload)).toEqual([
        [TelemetryEventType.REMATCH_REQUESTED, 'req-rematch', { playerId: aliceSeat, isHost: true }],
        [TelemetryEventType.REMATCH_STARTED, 'req-rematch', { hostId: aliceSeat, playerIds: [aliceSeat, h.seatOf(bob), botSeat] }],
      ]);
      // The start is recorded against the new lobby.
      expect(telemetry.ofType(TelemetryEventType.REMATCH_STARTED)[0]).toMatchObject({ phase: GamePhase.LOBBY, actorId: aliceSeat });
    });
  });

  describe('ruleset history', () => {
    const CUSTOM_RULESET = {
      ...DEFAULT_RULESET_CONFIG,
      turn: { ...DEFAULT_RULESET_CONFIG.turn, biddingTimerSeconds: 7 },
    };

    it('records the ruleset chosen when the room is created', async () => {
      const h = await room();
      const alice = h.join('Alice', 'aaaaaaa', {
        roomSettings: { name: 'Friday', isPublic: true, maxPlayers: 6, rulesetConfig: CUSTOM_RULESET },
      });

      expect(telemetry.payloadsOf(TelemetryEventType.RULESET_CHANGED)).toEqual([
        expect.objectContaining({ playerId: h.seatOf(alice), changedKeys: ['turn'] }),
      ]);
    });

    it('records ruleset changes made through room settings', async () => {
      const h = await room();
      const alice = h.join('Alice', 'aaaaaaa');
      h.send(alice, {
        type: ClientCommandType.SET_ROOM_SETTINGS,
        roomSettings: { name: 'Friday', isPublic: true, maxPlayers: 6, rulesetConfig: CUSTOM_RULESET },
      });

      expect(telemetry.payloadsOf(TelemetryEventType.RULESET_CHANGED)).toEqual([
        expect.objectContaining({ playerId: h.seatOf(alice), changedKeys: ['turn'] }),
      ]);
      expect(telemetry.payloadsOf(TelemetryEventType.ROOM_SETTINGS_CHANGED).at(-1)?.changedKeys).toContain('rulesetConfig');
    });
  });

  describe('lobby grace periods', () => {
    it('records grace, restore and expiry once each', async () => {
      const h = await room();
      h.join('Alice', 'aaaaaaa');
      const bob = h.join('Bob', 'bbbbbbb');
      const bobSeat = h.seatOf(bob);
      const bobToken = bob.session()?.sessionToken;

      h.drop(bob, GOING_AWAY);
      await h.advance(DISCONNECT_DEBOUNCE_MS);
      expect(telemetry.ofType(TelemetryEventType.PLAYER_GRACED)).toEqual([
        expect.objectContaining({
          actorId: bobSeat,
          commandType: ServerTrigger.DISCONNECT,
          payload: expect.objectContaining({ playerId: bobSeat, wasHost: false }),
        }),
      ]);

      const bobAgain = h.join('Bob', 'bbbbbbb', { sessionToken: bobToken });
      expect(telemetry.ofType(TelemetryEventType.PLAYER_GRACE_RESTORED)).toEqual([
        expect.objectContaining({ payload: { playerId: bobSeat, isHost: false } }),
      ]);

      h.drop(bobAgain, GOING_AWAY);
      await h.advance(DISCONNECT_DEBOUNCE_MS + RECONNECT_WINDOW_MS);

      expect(telemetry.ofType(TelemetryEventType.PLAYER_GRACED)).toHaveLength(2);
      expect(telemetry.ofType(TelemetryEventType.PLAYER_GRACE_EXPIRED)).toEqual([
        expect.objectContaining({ commandType: ServerTrigger.ALARM, payload: { playerId: bobSeat, newHostId: null } }),
      ]);
      expect(telemetry.ofType(TelemetryEventType.PLAYER_LEFT)).toHaveLength(1);
    });
  });
});
