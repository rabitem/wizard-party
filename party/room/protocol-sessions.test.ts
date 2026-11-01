/**
 * The seat-session boundary of the wire protocol on the real room: who gets a seat's token, what
 * resumes or attests a seat, and what one player may see of another's hand.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClientCommandType,
  ConnectionCloseCode,
  GameEventType,
  PROTOCOL_VERSION,
  SEAT_PROOF_HEADER,
  type IGameState,
} from '../../shared/domain';
import { HARNESS_START_TIME, RoomHarness, persistentIdOf, type TestConnection } from '../test-support/room-harness';

interface Snapshot {
  state: IGameState;
  yourPlayerId: string;
}

function lastSnapshot(connection: TestConnection): Snapshot {
  const message = connection.ofType(GameEventType.GAME_STATE).at(-1);
  if (!message) throw new Error(`${connection.id} was sent no snapshot`);
  return message as unknown as Snapshot;
}

/** The seat-attestation endpoint as the web app calls it (header, or the older query parameter). */
async function askSeat(h: RoomHarness, proof: string, viaQuery = false): Promise<{ seat: string | null; cors: string | null }> {
  const url = `https://example.test/parties/main/${h.room.id}${viaQuery ? `?seat=${proof}` : ''}`;
  const response = await h.server.onRequest(new Request(url, viaQuery ? undefined : { headers: { [SEAT_PROOF_HEADER]: proof } }));
  const { seat } = (await response.json()) as { seat: string | null };
  return { seat, cors: response.headers.get('Access-Control-Allow-Origin') };
}

describe('GameRoom protocol: seat sessions', () => {
  let harness: RoomHarness | null = null;

  async function room(): Promise<RoomHarness> {
    harness = await RoomHarness.create();
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

  describe('session tokens', () => {
    it('gives a protocol-2 seat an opaque id and a token that only its own connection receives', async () => {
      const h = await room();
      const broadcast = vi.spyOn(h.room, 'broadcast');
      const alice = h.join('Alice', 'alice01');
      const bob = h.join('Bob', 'bob2222');

      const session = alice.session();
      expect(alice.ofType(GameEventType.SESSION)).toEqual([
        expect.objectContaining({ playerId: 'p_seat0001', protocolVersion: PROTOCOL_VERSION }),
      ]);
      expect(lastSnapshot(alice).yourPlayerId).toBe('p_seat0001');

      expect(broadcast).toHaveBeenCalled();
      const everythingBobSaw = JSON.stringify(bob.messages());
      const everythingBroadcast = broadcast.mock.calls.map(([message]) => message).join('\n');
      for (const secret of [session?.sessionToken ?? 'missing', persistentIdOf('alice01')]) {
        expect(everythingBobSaw).not.toContain(secret);
        expect(everythingBroadcast).not.toContain(secret);
      }
    });

    it('does not hand a seat to someone who only knows its public id or its browser id', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const aliceSeat = lastSnapshot(alice).yourPlayerId;
      h.join('Bob', 'bob2222');

      const mallory = h.connect();
      h.send(mallory, { type: ClientCommandType.JOIN_GAME, playerName: 'Mallory', persistentId: aliceSeat, sessionToken: aliceSeat, protocolVersion: PROTOCOL_VERSION });
      h.send(mallory, { type: ClientCommandType.JOIN_GAME, playerName: 'Mallory', persistentId: persistentIdOf('alice01'), protocolVersion: PROTOCOL_VERSION, requestId: 'req-steal' });
      h.send(mallory, { type: ClientCommandType.JOIN_GAME, playerName: 'Mallory', persistentId: persistentIdOf('alice01') });

      expect(mallory.ofType(GameEventType.GAME_STATE)).toHaveLength(0);
      expect(mallory.ofType(GameEventType.SESSION)).toHaveLength(0);
      expect(mallory.ofType(GameEventType.ERROR)).toEqual([
        expect.objectContaining({ code: 'INVALID_PERSISTENT_ID' }),
        expect.objectContaining({ code: 'SESSION_REJECTED', requestId: 'req-steal' }),
        expect.objectContaining({ code: 'SESSION_REJECTED' }),
      ]);
      expect(alice.closed).toBeNull();
    });

    it('resumes the seat from a new connection with its token and closes the old one as superseded', async () => {
      const h = await room();
      const first = h.join('Alice', 'alice01');
      const { playerId, sessionToken } = first.session() ?? { playerId: '', sessionToken: '' };

      const second = h.join('Alice', 'alice01', { sessionToken });

      expect(lastSnapshot(second).yourPlayerId).toBe(playerId);
      expect(second.session()?.sessionToken).toBe(sessionToken);
      expect(first.closed).toEqual({ code: ConnectionCloseCode.SUPERSEDED, reason: 'superseded' });
    });

    it('does not broadcast room events to a superseded connection after reconnect takeover', async () => {
      const h = await room();
      const first = h.join('Alice', 'alice01');
      const sessionToken = first.session()?.sessionToken;
      first.clear();

      // The old socket stays in the room until the platform reports its close.
      const second = h.join('Alice', 'alice01', { sessionToken });
      h.join('Bob', 'bob2222');

      expect(first.closed).toEqual({ code: ConnectionCloseCode.SUPERSEDED, reason: 'superseded' });
      expect(first.ofType(GameEventType.PLAYER_JOINED)).toHaveLength(0);
      expect(second.ofType(GameEventType.PLAYER_JOINED)).toHaveLength(1);
    });

    it('upgrades a legacy seat on its first protocol-2 join, after which its persistent id alone is refused', async () => {
      const h = await room();
      const legacy = h.join('Carol', 'carol03', { protocolVersion: null });
      expect(legacy.session()).toBeNull();
      expect(lastSnapshot(legacy).yourPlayerId).toBe(persistentIdOf('carol03'));

      const upgraded = h.join('Carol', 'carol03');
      const session = upgraded.session();
      expect(session?.playerId).toBe(persistentIdOf('carol03'));

      const oldTab = h.join('Carol', 'carol03', { protocolVersion: null });
      expect(oldTab.ofType(GameEventType.ERROR)).toEqual([expect.objectContaining({ code: 'SESSION_REJECTED' })]);

      const sameBrowser = h.join('Carol', 'carol03', { sessionToken: session?.sessionToken });
      expect(lastSnapshot(sameBrowser).yourPlayerId).toBe(persistentIdOf('carol03'));
    });

    it('attests a seat for its token (header or legacy query), never for its public id, and never to a browser', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const { playerId, sessionToken } = alice.session() ?? { playerId: '', sessionToken: '' };
      const legacy = h.join('Dave', 'dave444', { protocolVersion: null });

      // Server-to-server only: no answer is readable cross-origin.
      expect(await askSeat(h, sessionToken)).toEqual({ seat: playerId, cors: null });
      expect(await askSeat(h, sessionToken, true)).toEqual({ seat: playerId, cors: null });
      expect((await askSeat(h, playerId)).seat).toBeNull();
      expect((await askSeat(h, persistentIdOf('alice01'))).seat).toBeNull();
      expect((await askSeat(h, persistentIdOf('zzzzzzz'))).seat).toBeNull();
      // A seat that never received a token is still attested by its persistent id.
      expect((await askSeat(h, persistentIdOf('dave444'))).seat).toBe(lastSnapshot(legacy).yourPlayerId);
    });

    it('keeps tokens across a restart, so the seat resumes with the same token', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const { playerId, sessionToken } = alice.session() ?? { playerId: '', sessionToken: '' };

      const restarted = await h.restart();
      harness = restarted;
      const back = restarted.join('Alice', 'alice01', { sessionToken });

      expect(lastSnapshot(back).yourPlayerId).toBe(playerId);
    });
  });

  describe('projections', () => {
    it('announces the game start without any hand, and never shows another player their cards', async () => {
      const h = await room();
      const alice = h.join('Alice', 'alice01');
      const bob = h.join('Bob', 'bob2222');
      h.join('Clara', 'clara03');

      h.send(alice, { type: ClientCommandType.START_GAME });

      const started = bob.ofType(GameEventType.GAME_STARTED);
      expect(started).toHaveLength(1);
      expect(started[0]).not.toHaveProperty('state');
      expect(started[0].playerIds).toEqual(lastSnapshot(alice).state.players.map((player) => player.id));

      const aliceView = lastSnapshot(alice);
      const aliceHand = aliceView.state.players.find((player) => player.id === aliceView.yourPlayerId)?.hand ?? [];
      expect(aliceHand.length).toBeGreaterThan(0);
      const everythingBobSaw = JSON.stringify(bob.messages());
      for (const card of aliceHand) expect(everythingBobSaw).not.toContain(`"${card.id}"`);
    });
  });
});
