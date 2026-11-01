/**
 * What the room records about connections and refused commands, through the real recorder: device
 * facts, session attribution, every rejection exactly once, and the bound on what one sender can
 * make the room record.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientCommandType, ConnectionCloseCode, GameEventType } from '../../shared/domain';
import {
  CommandRejectionCode,
  DeviceType,
  TelemetryEventType,
  type TelemetryClientInfo,
  type TelemetryPayloads,
} from '../../shared/telemetry';
import { ServerTrigger, TELEMETRY_RATE_LIMITS, TELEMETRY_RATE_LIMIT_WINDOW_MS, type ConnectionCloseInfo } from '../telemetry';
import { HARNESS_START_TIME, RoomHarness, TestConnection } from '../test-support/room-harness';
import { RecordingTelemetry } from '../test-support/recording-telemetry';

const ROOM_ID = 'telemetry-room';
const SENDER_REJECTION_LIMIT = TELEMETRY_RATE_LIMITS[TelemetryEventType.COMMAND_REJECTED]?.perSender ?? 0;
const GOING_AWAY: ConnectionCloseInfo = { code: 1001, reason: 'going away', wasClean: true };

const IPHONE: TelemetryClientInfo = {
  browserName: 'Safari',
  browserVersion: '18.1',
  osName: 'iOS',
  osVersion: '18.1',
  deviceType: DeviceType.MOBILE,
  userAgent: 'Mozilla/5.0 (iPhone)',
  language: 'de-DE',
  country: 'DE',
  colo: 'FRA',
  clientVersion: null,
};

const { userAgent: _userAgent, ...IPHONE_DEVICE } = IPHONE;

function sessionSummary({ connectionId, isReconnect, deviceType }: TelemetryPayloads['session.started']) {
  return { connectionId, isReconnect, deviceType };
}

describe('GameRoom telemetry: connections and refusals', () => {
  let harness: RoomHarness | null = null;
  let telemetry = new RecordingTelemetry(ROOM_ID);
  let devices = 0;

  async function room(): Promise<RoomHarness> {
    telemetry = new RecordingTelemetry(ROOM_ID);
    harness = await RoomHarness.create({ roomId: ROOM_ID, telemetry: telemetry.recorder });
    return harness;
  }

  /** A socket whose upgrade request the hosting adapter described as `client`. */
  function connectFrom(h: RoomHarness, client: TelemetryClientInfo): TestConnection {
    const connection = new TestConnection(`device-${++devices}`);
    h.room.connections.set(connection.id, connection);
    h.server.onConnect(connection, client);
    return connection;
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

  describe('connections and devices', () => {
    it('records connect, session start with device info, and disconnect', async () => {
      const h = await room();
      const alice = connectFrom(h, IPHONE);
      h.rejoin(alice, 'Alice', 'aaaaaaa');
      const aliceSeat = h.seatOf(alice);
      await h.advance(5_000);
      h.drop(alice, GOING_AWAY);

      expect(telemetry.ofType(TelemetryEventType.CLIENT_CONNECTED)).toEqual([
        expect.objectContaining({ commandType: ServerTrigger.CONNECT, payload: { connectionId: alice.id, ...IPHONE } }),
      ]);
      expect(telemetry.ofType(TelemetryEventType.SESSION_STARTED)).toEqual([
        expect.objectContaining({
          actorId: aliceSeat,
          commandType: ClientCommandType.JOIN_GAME,
          payload: { playerId: aliceSeat, connectionId: alice.id, isReconnect: false, ...IPHONE_DEVICE },
        }),
      ]);
      expect(telemetry.ofType(TelemetryEventType.CLIENT_DISCONNECTED)[0].payload).toEqual({
        connectionId: alice.id,
        playerId: aliceSeat,
        durationMs: 5_000,
        closeCode: GOING_AWAY.code,
        closeReason: GOING_AWAY.reason,
        wasClean: true,
      });
    });

    it('marks a rejoin from a new connection as a reconnect and attributes superseded sockets', async () => {
      const h = await room();
      const first = connectFrom(h, IPHONE);
      h.rejoin(first, 'Alice', 'aaaaaaa');
      const aliceSeat = h.seatOf(first);
      const second = h.connect();
      h.rejoin(second, 'Alice', 'aaaaaaa', { sessionToken: first.session()?.sessionToken });
      h.drop(first, { code: ConnectionCloseCode.SUPERSEDED, reason: 'superseded', wasClean: true });

      expect(telemetry.payloadsOf(TelemetryEventType.SESSION_STARTED).map(sessionSummary)).toEqual([
        { connectionId: first.id, isReconnect: false, deviceType: DeviceType.MOBILE },
        { connectionId: second.id, isReconnect: true, deviceType: DeviceType.UNKNOWN },
      ]);
      expect(telemetry.ofType(TelemetryEventType.CLIENT_DISCONNECTED)[0].payload).toMatchObject({
        connectionId: first.id,
        playerId: aliceSeat,
        closeCode: ConnectionCloseCode.SUPERSEDED,
      });
    });

    it('does not start a second session when the same connection joins again', async () => {
      const h = await room();
      const alice = h.join('Alice', 'aaaaaaa');
      await h.advance(10_000);
      h.rejoin(alice, 'Alice', 'aaaaaaa', { sessionToken: alice.session()?.sessionToken });

      expect(telemetry.ofType(TelemetryEventType.SESSION_STARTED)).toHaveLength(1);
    });
  });

  describe('rejected commands', () => {
    async function lobbyOfOne(): Promise<{ h: RoomHarness; alice: TestConnection }> {
      const h = await room();
      return { h, alice: h.join('Alice', 'aaaaaaa') };
    }

    it('records a domain error once, correlated with the request', async () => {
      const { h, alice } = await lobbyOfOne();
      h.send(alice, { type: ClientCommandType.START_GAME, requestId: 'req-start' });

      expect(telemetry.ofType(TelemetryEventType.COMMAND_REJECTED)).toEqual([
        expect.objectContaining({
          source: 'player',
          actorId: h.seatOf(alice),
          correlationId: 'req-start',
          commandType: ClientCommandType.START_GAME,
          payload: expect.objectContaining({
            commandType: ClientCommandType.START_GAME,
            requestId: 'req-start',
            errorCode: 'NOT_ENOUGH_PLAYERS',
            notifiedClient: true,
          }),
        }),
      ]);
      expect(alice.ofType(GameEventType.ERROR)).toHaveLength(1);
    });

    it('records the real message of plain errors while the client sees a generic one', async () => {
      const { h } = await lobbyOfOne();
      const bob = h.join('Bob', 'bbbbbbb');
      h.send(bob, { type: ClientCommandType.SET_ROOM_SETTINGS, roomSettings: { name: 'x', isPublic: true, maxPlayers: 6 } });

      expect(telemetry.payloadsOf(TelemetryEventType.COMMAND_REJECTED)).toEqual([
        {
          commandType: ClientCommandType.SET_ROOM_SETTINGS,
          requestId: null,
          errorCode: null,
          errorName: 'Error',
          message: 'Only host can change room settings',
          notifiedClient: true,
        },
      ]);
      expect(bob.ofType(GameEventType.ERROR)).toEqual([expect.objectContaining({ message: 'Unknown error' })]);
    });

    it('records join failures reported by the handler exactly once', async () => {
      const { h } = await lobbyOfOne();
      const impostor = h.join('Alice', 'bbbbbbb');

      expect(telemetry.payloadsOf(TelemetryEventType.COMMAND_REJECTED)).toEqual([
        expect.objectContaining({ commandType: ClientCommandType.JOIN_GAME, errorCode: 'PLAYER_NAME_TAKEN', notifiedClient: true }),
      ]);
      expect(impostor.ofType(GameEventType.ERROR)).toHaveLength(1);
      expect(telemetry.ofType(TelemetryEventType.SESSION_STARTED)).toHaveLength(1);
    });

    it('records malformed messages and silently ignored unknown commands', async () => {
      const { h, alice } = await lobbyOfOne();
      h.send(alice, '{not json');
      h.send(alice, 'null');
      h.send(alice, { type: 'TELEPORT', requestId: 'req-x' });

      expect(telemetry.payloadsOf(TelemetryEventType.COMMAND_REJECTED)).toEqual([
        expect.objectContaining({ commandType: null, errorCode: CommandRejectionCode.INVALID_JSON, notifiedClient: true }),
        expect.objectContaining({ commandType: null, errorCode: CommandRejectionCode.INVALID_COMMAND, notifiedClient: true }),
        expect.objectContaining({ commandType: 'TELEPORT', requestId: 'req-x', errorCode: CommandRejectionCode.UNKNOWN_COMMAND, notifiedClient: false }),
      ]);
      expect(alice.ofType(GameEventType.ERROR)).toHaveLength(2);
    });

    it('records binary frames refused by the hosting adapter', async () => {
      const { h, alice } = await lobbyOfOne();
      h.server.onInvalidFrame(alice);

      expect(telemetry.ofType(TelemetryEventType.COMMAND_REJECTED)).toEqual([
        expect.objectContaining({
          actorId: h.seatOf(alice),
          payload: expect.objectContaining({ commandType: null, errorCode: CommandRejectionCode.INVALID_FRAME, notifiedClient: false }),
        }),
      ]);
      expect(alice.ofType(GameEventType.ERROR)).toHaveLength(0);
    });

    it('bounds what a spamming connection can record and reports the rest on close', async () => {
      const h = await room();
      const spammer = h.connect();
      const junkMessages = SENDER_REJECTION_LIMIT + 30;
      for (let i = 0; i < junkMessages; i++) h.send(spammer, 'x');
      h.drop(spammer, GOING_AWAY);

      expect(telemetry.ofType(TelemetryEventType.COMMAND_REJECTED)).toHaveLength(SENDER_REJECTION_LIMIT);
      expect(telemetry.payloadsOf(TelemetryEventType.TELEMETRY_SUPPRESSED)).toEqual([
        {
          factType: TelemetryEventType.COMMAND_REJECTED,
          scope: 'sender',
          senderKey: spammer.id,
          suppressedCount: junkMessages - SENDER_REJECTION_LIMIT,
          windowMs: TELEMETRY_RATE_LIMIT_WINDOW_MS,
        },
      ]);
      // The client is still told about every rejection; only telemetry is bounded.
      expect(spammer.ofType(GameEventType.ERROR)).toHaveLength(junkMessages);
    });

    it('records nothing for successful commands', async () => {
      const { h, alice } = await lobbyOfOne();
      h.send(alice, { type: ClientCommandType.SEND_CHAT, message: 'hi' });
      expect(telemetry.ofType(TelemetryEventType.COMMAND_REJECTED)).toHaveLength(0);
    });
  });
});
