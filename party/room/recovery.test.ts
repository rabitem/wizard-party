/**
 * What a room does when its worker starts on stored state: rooms written by older releases (schema
 * 1, kept as migration inputs) get their deadlines back, and commands applied before a restart are
 * never applied again.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientCommandType, Game, GameEventType, GamePhase, Player } from '../../shared/domain';
import { ROOM_TIMING } from '../config/room-timing.config';
import { PERSISTED_STATE_KEY, type LegacyPersistedState, type PersistedState } from '../utils/types';
import { HARNESS_START_TIME, MemoryStorage, RoomHarness, persistentIdOf } from '../test-support/room-harness';
import { lobby } from '../test-support/table-driver';

const { RECONNECT_WINDOW_MS } = ROOM_TIMING;
const ROOM_ID = 'restored-room';
const ALICE = persistentIdOf('aaaaaaa');
const BOB = persistentIdOf('bbbbbbb');
const CLARA = persistentIdOf('ccccccc');

/** Schema 1: players, host, pause and rules stored beside the game as well as inside it. */
function legacyState(game: Game): LegacyPersistedState {
  return {
    gameState: game.toJSON(),
    persistentIdToPlayerId: game.players.map((player): [string, string] => [player.id, player.id]),
    roomSettings: { name: game.id, isPublic: true, maxPlayers: 6 },
    botCounter: 0,
    players: game.players.map((player) => player.toJSON()),
    hostId: game.hostId,
    pauseState: game.pauseState,
    playerSoundPreferences: [],
    rulesetConfig: game.rulesetConfig,
  };
}

/** A lobby whose only player was in the grace period when the old release wrote it. */
function legacyGracedLobby(): LegacyPersistedState {
  const game = new Game(ROOM_ID, ALICE);
  game.addPlayer(new Player(ALICE, 'Alice'));
  game.gracePlayer(ALICE);
  return legacyState(game);
}

/** A running game of three humans, Bob to move, written before the pause sat beside the phase. */
function legacyRunningGame(): LegacyPersistedState {
  const game = new Game(ROOM_ID, ALICE);
  game.addPlayer(new Player(ALICE, 'Alice'));
  game.addPlayer(new Player(BOB, 'Bob'));
  game.addPlayer(new Player(CLARA, 'Clara'));
  game.phase = GamePhase.PLAYING;
  game.currentRound = 1;
  game.maxRounds = 1;
  game.currentPlayerIndex = 1;
  return legacyState(game);
}

function storedState(h: RoomHarness): PersistedState {
  return h.storage.data.get(PERSISTED_STATE_KEY) as PersistedState;
}

describe('GameRoom recovery', () => {
  let harness: RoomHarness | null = null;

  async function startOn(stored: LegacyPersistedState): Promise<RoomHarness> {
    const storage = new MemoryStorage();
    await storage.put(PERSISTED_STATE_KEY, stored);
    harness = await RoomHarness.create({ roomId: ROOM_ID, storage });
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

  describe('startup recovery', () => {
    it('arms the lobby grace expiry of a room written by an older release', async () => {
      const h = await startOn(legacyGracedLobby());

      expect(h.game.isPlayerGraced(ALICE)).toBe(true);
      expect(h.storage.alarm).toBe(HARNESS_START_TIME + RECONNECT_WINDOW_MS);
    });

    it('pauses a restored running game beside its phase for the player to move', async () => {
      const h = await startOn(legacyRunningGame());

      const response = await h.server.onRequest(new Request('https://example.test'));
      const body = (await response.json()) as { phase: GamePhase; isPaused: boolean };

      // The pause sits beside the phase: the table is still PLAYING, it just waits.
      expect(body).toMatchObject({ phase: GamePhase.PLAYING, isPaused: true });
      expect(h.game.pauseState?.pausedForPlayerId).toBe(BOB);
      expect(h.storage.alarm).toBe(HARNESS_START_TIME + RECONNECT_WINDOW_MS);
    });

    it('moves the pause on to the next absent human when the first one never returns', async () => {
      const h = await startOn(legacyRunningGame());

      await h.fireAlarm('room');

      const stored = storedState(h);
      expect(stored.gameState?.phase).toBe(GamePhase.PLAYING);
      expect(stored.gameState?.pauseState?.pausedForPlayerId).toBe(ALICE);
      expect(h.game.getPlayer(BOB)?.isBot).toBe(true);
      expect(h.storage.alarm).toBe(HARNESS_START_TIME + 2 * RECONNECT_WINDOW_MS);
    });
  });

  describe('idempotency over a restart', () => {
    it('does not apply a processed command again after a server restart', async () => {
      const { h, sockets } = await lobby(['Alice', 'Bob', 'Clara']);
      harness = h;
      const alice = sockets.Alice;
      const aliceSeat = h.seatOf(alice);
      const start = { type: ClientCommandType.START_GAME, requestId: 'start-before-restart' };
      h.send(alice, start);
      const round = h.game.currentRound;

      // The applied requestId is stored with the seat that sent it.
      expect(storedState(h).recentCommandIdsByPlayer).toEqual([[aliceSeat, [['start-before-restart', HARNESS_START_TIME]]]]);

      const restarted = await h.restart();
      harness = restarted;
      const back = restarted.join('Alice', 'alice', { sessionToken: alice.session()?.sessionToken });
      restarted.send(back, start);

      expect(back.ofType(GameEventType.ERROR)).toHaveLength(0);
      expect(back.ofType(GameEventType.GAME_STARTED)).toHaveLength(0);
      expect(back.ofType(GameEventType.COMMAND_ACK)).toEqual([expect.objectContaining({ requestId: 'start-before-restart' })]);
      expect(restarted.game.currentRound).toBe(round);
    });
  });
});
