/**
 * The command side of the wire protocol on the real room: input decoding, refusals, rate limits,
 * idempotent resends, liveness, commit order and the two protocol dialects a deploy has to serve.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientCommandType, GameEventType, GamePhase, ProtocolErrorCode, type IGameState } from '../../shared/domain';
import { COMMAND_RATE_LIMITS } from '../config/command-rate-limits.config';
import { PERSISTED_STATE_KEY, type PersistedState } from '../utils/types';
import {
  HARNESS_START_TIME,
  RoomHarness,
  persistentIdOf,
  type RoomHarnessOptions,
  type TestConnection,
  type Timeline,
} from '../test-support/room-harness';
import { expectRoomInvariants, playUntil, ruleset } from '../test-support/table-driver';

interface Snapshot {
  state: IGameState;
  yourPlayerId: string;
  stateVersion: number;
}

function lastSnapshot(connection: TestConnection): Snapshot {
  const message = connection.ofType(GameEventType.GAME_STATE).at(-1);
  if (!message) throw new Error(`${connection.id} was sent no snapshot`);
  return message as unknown as Snapshot;
}

function storedState(h: RoomHarness): PersistedState {
  return h.storage.data.get(PERSISTED_STATE_KEY) as PersistedState;
}

describe('GameRoom protocol: commands', () => {
  let harness: RoomHarness | null = null;

  async function room(config: RoomHarnessOptions = {}): Promise<RoomHarness> {
    harness = await RoomHarness.create(config);
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

  describe('command validation and errors', () => {
    it('refuses malformed payloads before any use case runs, correlated with the requestId', async () => {
      const timeline: Timeline = [];
      const h = await room({ timeline });
      const alice = h.join('Alice', 'alice01');
      const before = timeline.length;

      h.send(alice, { type: ClientCommandType.PLACE_BID, bid: '1', requestId: 'req-bid' });
      h.send(alice, { type: ClientCommandType.SELECT_TRUMP, suit: 'BANANAS', requestId: 'req-trump' });

      expect(alice.ofType(GameEventType.ERROR)).toEqual([
        expect.objectContaining({ code: ProtocolErrorCode.INVALID_COMMAND, requestId: 'req-bid' }),
        expect.objectContaining({ code: ProtocolErrorCode.INVALID_COMMAND, requestId: 'req-trump' }),
      ]);
      // Only the two error replies: nothing was written or broadcast.
      expect(timeline.slice(before)).toEqual(['send', 'send']);
    });

    it('reports domain refusals with their code and the requestId, and never deals a started game again', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const bob = h.join('Bob', 'bob2222');
      h.join('Clara', 'clara03');

      h.send(bob, { type: ClientCommandType.START_GAME, requestId: 'req-not-host' });
      h.send(alice, { type: ClientCommandType.START_GAME, requestId: 'req-start' });
      h.send(alice, { type: ClientCommandType.START_GAME, requestId: 'req-again' });

      expect(bob.ofType(GameEventType.ERROR)).toEqual([
        expect.objectContaining({ code: 'NOT_HOST', requestId: 'req-not-host' }),
      ]);
      expect(alice.ofType(GameEventType.ERROR)).toEqual([
        expect.objectContaining({ code: 'INVALID_PHASE', requestId: 'req-again' }),
      ]);
      // Dealt once: one GAME_STARTED reached the table.
      expect(bob.ofType(GameEventType.GAME_STARTED)).toHaveLength(1);
    });

    it('limits how fast one seat can broadcast to the table', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const bob = h.join('Bob', 'bob2222');

      for (let i = 0; i < 50; i++) h.send(alice, { type: ClientCommandType.SEND_EMOTE, emoteId: 'wizard' });

      const { burst } = COMMAND_RATE_LIMITS.social;
      expect(bob.ofType(GameEventType.EMOTE)).toHaveLength(burst);
      expect(alice.ofType(GameEventType.ERROR)).toHaveLength(50 - burst);
      expect(alice.ofType(GameEventType.ERROR)[0]).toMatchObject({ code: ProtocolErrorCode.RATE_LIMITED });
    });
  });

  describe('idempotent commands', () => {
    it('applies a resent command once and answers the resend with the current state', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const addBot = { type: ClientCommandType.ADD_BOT, difficulty: 3, requestId: 'req-bot' };

      h.send(alice, addBot);
      const statesAfterFirst = alice.ofType(GameEventType.GAME_STATE).length;
      h.send(alice, addBot);

      expect(lastSnapshot(alice).state.players.filter((player) => player.isBot)).toHaveLength(1);
      expect(alice.ofType(GameEventType.GAME_STATE)).toHaveLength(statesAfterFirst + 1);
      expect(alice.ofType(GameEventType.ERROR)).toHaveLength(0);
    });

    it('keeps the requestId of an applied command across a reconnect of the seat', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      h.send(alice, { type: ClientCommandType.ADD_BOT, requestId: 'req-bot' });

      const back = h.join('Alice', 'alice01', { sessionToken: alice.session()?.sessionToken });
      h.send(back, { type: ClientCommandType.ADD_BOT, requestId: 'req-bot' });

      expect(lastSnapshot(back).state.players.filter((player) => player.isBot)).toHaveLength(1);
    });

    it('acknowledges an applied command after its snapshot, and a resend of it again', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const addBot = { type: ClientCommandType.ADD_BOT, difficulty: 3, requestId: 'req-ack' };

      h.send(alice, addBot);
      const types = alice.messages().map((message) => message.type);
      expect(alice.ofType(GameEventType.COMMAND_ACK)).toEqual([
        expect.objectContaining({ requestId: 'req-ack', stateVersion: lastSnapshot(alice).stateVersion }),
      ]);
      expect(types.lastIndexOf(GameEventType.GAME_STATE)).toBeLessThan(types.indexOf(GameEventType.COMMAND_ACK));

      h.send(alice, addBot);
      expect(alice.ofType(GameEventType.COMMAND_ACK)).toHaveLength(2);
    });

    it('never acknowledges a refused command or a legacy connection', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const legacy = h.join('Bob', 'bob2222', { protocolVersion: null });

      h.send(alice, { type: ClientCommandType.START_GAME, requestId: 'req-refused' });
      h.send(legacy, { type: ClientCommandType.SET_READY, ready: true, requestId: 'req-legacy' });

      expect(alice.ofType(GameEventType.COMMAND_ACK)).toHaveLength(0);
      expect(legacy.ofType(GameEventType.COMMAND_ACK)).toHaveLength(0);
    });

    it('lets a refused command be sent again with the same requestId', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const start = { type: ClientCommandType.START_GAME, requestId: 'req-start' };

      h.send(alice, start);
      expect(alice.ofType(GameEventType.ERROR)).toEqual([expect.objectContaining({ requestId: 'req-start' })]);

      h.join('Bob', 'bob2222');
      h.join('Clara', 'clara03');
      h.send(alice, start);

      expect(lastSnapshot(alice).state.phase).not.toBe(GamePhase.LOBBY);
    });
  });

  describe('liveness and ordering', () => {
    it('answers PING with PONG on joined and unjoined connections, and an unjoined state request too', async () => {
      const h = await room();
      const stranger = h.connect();
      const alice = h.join('Alice', 'alice01');

      h.send(stranger, { type: ClientCommandType.PING, requestId: 'ping-1' });
      h.send(stranger, { type: ClientCommandType.REQUEST_STATE });
      h.send(alice, { type: ClientCommandType.PING });

      expect(stranger.ofType(GameEventType.PONG)).toEqual([
        expect.objectContaining({ requestId: 'ping-1' }),
        expect.not.objectContaining({ requestId: expect.anything() }),
      ]);
      expect(stranger.ofType(GameEventType.GAME_STATE)).toHaveLength(0);
      expect(alice.ofType(GameEventType.PONG)).toHaveLength(1);
    });

    it('numbers snapshots with a version that only grows, also across a restart', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      h.join('Bob', 'bob2222');
      h.send(alice, { type: ClientCommandType.SET_READY, ready: true });

      const versions = alice.ofType(GameEventType.GAME_STATE).map((message) => message.stateVersion as number);
      expect(versions.length).toBeGreaterThan(1);
      versions.slice(1).forEach((version, index) => expect(version).toBeGreaterThan(versions[index]));
      const lastSent = versions[versions.length - 1];
      expect(storedState(h).stateVersion).toBe(lastSent);

      const restarted = await h.restart();
      harness = restarted;
      const back = restarted.join('Alice', 'alice01', { sessionToken: alice.session()?.sessionToken });

      expect(lastSnapshot(back).stateVersion).toBeGreaterThan(lastSent);
    });

    it('writes the state before sending any message of the transaction', async () => {
      const timeline: Timeline = [];
      const h = await room({ timeline });
      const alice = h.join('Alice', 'alice01');
      h.join('Bob', 'bob2222');
      timeline.length = 0;

      h.send(alice, { type: ClientCommandType.SET_READY, ready: true });

      expect(timeline[0]).toBe('put');
      expect(timeline.filter((entry) => entry === 'put')).toHaveLength(1);
      expect(timeline.slice(1).every((entry) => entry === 'send')).toBe(true);
      expect(timeline.length).toBeGreaterThan(1);
    });
  });

  describe('protocol dialects', () => {
    const sharedSound = {
      id: 'shared-1',
      name: 'spell.wav',
      dataUrl: 'data:audio/wav;base64,AAAA',
      size: 128,
      duration: 1,
      category: 'custom',
      roles: { wizard: false, jester: false, trick: false, afk: false, shared: true },
    };

    it('sends shared sounds in their own message, once per change, and keeps them out of snapshots and storage', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const legacy = h.join('Dave', 'dave444', { protocolVersion: null });
      expect(alice.ofType(GameEventType.SHARED_SOUNDS)).toEqual([expect.objectContaining({ sounds: [] })]);

      h.send(alice, { type: ClientCommandType.UPDATE_SOUND_PREFERENCES, preferences: { sharedCustomSounds: [sharedSound] } });
      h.send(alice, { type: ClientCommandType.SET_READY, ready: true });

      expect(alice.ofType(GameEventType.SHARED_SOUNDS)).toEqual([
        expect.objectContaining({ sounds: [] }),
        expect.objectContaining({ sounds: [expect.objectContaining({ id: 'shared-1', ownerId: lastSnapshot(alice).yourPlayerId })] }),
      ]);
      expect(alice.ofType(GameEventType.GAME_STATE).every((message) => !('sharedCustomSounds' in message))).toBe(true);

      // A legacy client still reads them from its snapshots.
      expect(legacy.ofType(GameEventType.SHARED_SOUNDS)).toHaveLength(0);
      expect(lastSnapshot(legacy)).toMatchObject({ sharedCustomSounds: [expect.objectContaining({ id: 'shared-1' })] });

      expect(JSON.stringify(Array.from(h.storage.data.values()))).not.toContain('data:audio');
    });

    it('serves a mixed table: a protocol-1 and a protocol-2 player play a game together, each in their own dialect', async () => {
      const h = await room();
      const settings = { name: 'Mixed', isPublic: false, maxPlayers: 6, rulesetConfig: ruleset({ rounds: 1 }) };
      const lena = h.join('Lena', 'lena', { protocolVersion: null, roomSettings: settings });
      const max = h.join('Max', 'max');
      h.send(lena, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
      h.send(lena, { type: ClientCommandType.START_GAME });
      const seats = new Map([[h.seatOf(lena), lena], [h.seatOf(max), max]]);

      await playUntil({ h, seats, sockets: { Lena: lena, Max: max } }, () => h.game.phase === GamePhase.GAME_END);
      h.send(max, { type: ClientCommandType.PING, requestId: 'ping-max' });

      // Round 1 deals one card to each of the three seats; both clients saw the same three plays.
      const playsSeenBy = (socket: TestConnection) =>
        socket.ofType(GameEventType.CARD_PLAYED).map((message) => `${String(message.playerId)}:${(message.card as { id: string }).id}`);
      expect(playsSeenBy(lena)).toHaveLength(3);
      expect(playsSeenBy(max)).toEqual(playsSeenBy(lena));
      expect(lena.ofType(GameEventType.GAME_COMPLETE)).toHaveLength(1);
      expect(max.ofType(GameEventType.GAME_COMPLETE)).toHaveLength(1);
      expectRoomInvariants(h, [lena, max]);

      // Protocol 1: the persistent id is the seat, no session, sounds inside every snapshot.
      expect(lastSnapshot(lena).yourPlayerId).toBe(persistentIdOf('lena'));
      expect(lena.ofType(GameEventType.SESSION)).toHaveLength(0);
      expect(lena.ofType(GameEventType.SHARED_SOUNDS)).toHaveLength(0);
      expect(lena.ofType(GameEventType.GAME_STATE).every((message) => 'sharedCustomSounds' in message)).toBe(true);
      // Protocol 2: an opaque seat with its session, sounds in their own message, PONG for PING.
      expect(max.session()?.playerId).toBe(lastSnapshot(max).yourPlayerId);
      expect(lastSnapshot(max).yourPlayerId).not.toBe(persistentIdOf('max'));
      expect(max.ofType(GameEventType.SHARED_SOUNDS)).toHaveLength(1);
      expect(max.ofType(GameEventType.GAME_STATE).every((message) => !('sharedCustomSounds' in message))).toBe(true);
      expect(max.ofType(GameEventType.PONG)).toEqual([expect.objectContaining({ requestId: 'ping-max' })]);
    });
  });
});
