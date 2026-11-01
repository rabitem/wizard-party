import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionCloseCode, ConnectionCloseReason, GameEventType, PROTOCOL_VERSION } from '@shared/domain';
import { COMMAND_OUTBOX, CONNECTION_LIVENESS, CONNECTION_TIMING, RECONNECT_POLICY } from '@/presentation/config/connection.config';

import { LOBBY_STATE, setupSession, type FakeSocket } from './test-support/fake-socket';

/** The server's SESSION frame: the seat's player id and its secret token, protocol 2. */
function grantSeat(socket: FakeSocket, sessionToken: string): void {
  socket.receive({ type: GameEventType.SESSION, playerId: 'player-1', sessionToken, protocolVersion: PROTOCOL_VERSION });
}

describe('GameSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should stop after a superseded close and reconnect only when the player takes the seat back', () => {
    const { session, sockets, statuses, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    // PartySocket hands the server's close event over nested in `reason`.
    sockets[0].dropNested(ConnectionCloseCode.SUPERSEDED, ConnectionCloseReason.SUPERSEDED);
    vi.advanceTimersByTime(60_000);

    expect(statuses.at(-1)).toBe('superseded');
    expect(sockets).toHaveLength(1);

    session.takeOver();
    expect(sockets).toHaveLength(2);
    expect(statuses.at(-1)).toBe('connecting');
  });

  it('should treat a kick close as terminal and forget the seat token', () => {
    const { sockets, tokens, statuses, connect, join } = setupSession();
    connect();
    join(sockets[0]);
    grantSeat(sockets[0], 'seat-token');
    expect(tokens.get('room-1')).toBe('seat-token');

    sockets[0].drop(ConnectionCloseCode.KICKED);
    vi.advanceTimersByTime(60_000);

    expect(statuses.at(-1)).toBe('kicked');
    expect(tokens.has('room-1')).toBe(false);
    expect(sockets).toHaveLength(1);
  });

  it('should keep backing off when the socket opens but the server never answers the join', () => {
    const { sockets, connect } = setupSession();
    connect();
    sockets[0].open();
    sockets[0].drop();
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    sockets[1].open();
    sockets[1].drop();

    // The second retry waits longer than the first: no message reset the backoff.
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    expect(sockets).toHaveLength(3);
  });

  it('should start the retry budget over once the server answers the join on the new socket', () => {
    const { sockets, statuses, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    // More outages than the budget allows, each answered: every retry comes within the first
    // delay (a second attempt would wait longer), and the connection never fails.
    for (let outage = 1; outage <= RECONNECT_POLICY.MAX_ATTEMPTS + 1; outage += 1) {
      sockets[outage - 1].drop();
      vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
      expect(sockets).toHaveLength(outage + 1);
      join(sockets[outage]);
    }

    expect(statuses).not.toContain('failed');
    expect(statuses.at(-1)).toBe('connected');
  });

  it('should retry at once when the network comes back instead of waiting out the backoff', () => {
    const { session, sockets, connect, join } = setupSession();
    connect();
    join(sockets[0]);
    sockets[0].drop();

    session.wake();
    expect(sockets).toHaveLength(2);
    // The retry that was waiting for its backoff does not run as well.
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    expect(sockets).toHaveLength(2);
  });

  it('should give up after RECONNECT_POLICY.MAX_ATTEMPTS retries and still retry at once when the network comes back', () => {
    const { session, sockets, statuses, connect, join } = setupSession();
    connect();
    join(sockets[0]);
    sockets[0].drop();
    for (let attempt = 1; attempt <= RECONNECT_POLICY.MAX_ATTEMPTS; attempt += 1) {
      vi.advanceTimersToNextTimer();
      sockets.at(-1)?.drop();
    }

    expect(statuses.at(-1)).toBe('failed');
    expect(sockets).toHaveLength(1 + RECONNECT_POLICY.MAX_ATTEMPTS);
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1 + RECONNECT_POLICY.MAX_ATTEMPTS);

    session.wake();
    expect(sockets).toHaveLength(2 + RECONNECT_POLICY.MAX_ATTEMPTS);
    sockets.at(-1)?.open();
    expect(statuses.at(-1)).toBe('connected');
  });

  it('should retry a socket that never opens instead of staying down', () => {
    const { sockets, statuses, connect } = setupSession();
    connect();

    vi.advanceTimersByTime(CONNECTION_TIMING.CONNECT_TIMEOUT_MS);
    expect(sockets[0].closed).toBe(true);
    expect(statuses.at(-1)).toBe('reconnecting');
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    expect(sockets).toHaveLength(2);
  });

  it('should hold a command on a quiet line until the probe is answered, and keep the answered line', () => {
    const { session, sockets, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    vi.advanceTimersByTime(CONNECTION_LIVENESS.QUIET_MS);
    session.send({ type: 'ADD_BOT', difficulty: 3 });
    expect(sockets[0].types()).toEqual(['JOIN_GAME', 'REQUEST_STATE']);
    sockets[0].receive({ type: GameEventType.GAME_STATE, yourPlayerId: 'player-1', state: LOBBY_STATE });

    expect(sockets[0].types()).toEqual(['JOIN_GAME', 'REQUEST_STATE', 'ADD_BOT']);
    vi.advanceTimersByTime(CONNECTION_LIVENESS.PROBE_TIMEOUT_MS);
    expect(sockets).toHaveLength(1);
  });

  it('should probe with PING once the server announced protocol 2', () => {
    const { session, sockets, connect } = setupSession();
    connect();
    sockets[0].open();
    sockets[0].receive({ type: GameEventType.SESSION, playerId: 'p_1', sessionToken: 't'.repeat(43), protocolVersion: PROTOCOL_VERSION });
    sockets[0].receive({ type: GameEventType.GAME_STATE, yourPlayerId: 'p_1', state: LOBBY_STATE });

    session.wake();
    expect(sockets[0].types().at(-1)).toBe('PING');
  });

  it('should settle commands by acknowledgement or refusal, and never resend a settled one', () => {
    const { session, sockets, settled, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    const bid = session.send({ type: 'PLACE_BID', bid: 1 });
    const play = session.send({ type: 'PLAY_CARD', cardId: 'c1' });
    sockets[0].receive({ type: GameEventType.COMMAND_ACK, requestId: bid, stateVersion: 3 });
    sockets[0].receive({ type: GameEventType.ERROR, message: 'Not your turn', code: 'NOT_YOUR_TURN', requestId: play });
    sockets[0].drop();
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    sockets[1].open();

    expect(settled).toEqual([
      { requestId: bid, outcome: 'acknowledged', code: undefined },
      { requestId: play, outcome: 'rejected', code: 'NOT_YOUR_TURN' },
    ]);
    expect(sockets[1].types()).toEqual(['JOIN_GAME']);
  });

  it('should take an uncorrelated refusal of a pre-protocol-2 server as the refusal of the newest command', () => {
    const { session, sockets, settled, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    session.send({ type: 'PLACE_BID', bid: 1 });
    const play = session.send({ type: 'PLAY_CARD', cardId: 'c1' });
    sockets[0].receive({ type: GameEventType.ERROR, message: 'Not your turn' });

    expect(settled).toEqual([{ requestId: play, outcome: 'rejected', code: undefined }]);
  });

  it('should leave commands unsettled on an uncorrelated error of a protocol-2 server', () => {
    const { session, sockets, settled, connect } = setupSession();
    connect();
    sockets[0].open();
    sockets[0].receive({ type: GameEventType.SESSION, playerId: 'p_1', sessionToken: 't'.repeat(43), protocolVersion: PROTOCOL_VERSION });

    session.send({ type: 'PLAY_CARD', cardId: 'c1' });
    sockets[0].receive({ type: GameEventType.ERROR, message: 'Too many requests' });

    expect(settled).toEqual([]);
  });

  it('should expire a command a server never answers, even on a live socket', () => {
    const { session, sockets, settled, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    const bid = session.send({ type: 'PLACE_BID', bid: 1 });
    // The line stays alive (an older server answers state, never COMMAND_ACK).
    for (let elapsed = 0; elapsed <= COMMAND_OUTBOX.COMMAND_TTL_MS; elapsed += CONNECTION_LIVENESS.CHECK_INTERVAL_MS) {
      vi.advanceTimersByTime(CONNECTION_LIVENESS.CHECK_INTERVAL_MS);
      sockets[0].receive({ type: GameEventType.GAME_STATE, yourPlayerId: 'player-1', state: LOBBY_STATE });
      session.checkLiveness();
    }

    expect(settled).toEqual([{ requestId: bid, outcome: 'expired', code: undefined }]);
  });

  it('should drop snapshots older than the one applied, and start over on a new socket', () => {
    const { sockets, events, connect } = setupSession();
    connect();
    sockets[0].open();
    const snapshot = (socket: FakeSocket, stateVersion: number) =>
      socket.receive({ type: GameEventType.GAME_STATE, yourPlayerId: 'p', state: LOBBY_STATE, stateVersion });
    snapshot(sockets[0], 5);
    snapshot(sockets[0], 4);
    // A direct answer (a state request, a resent command) repeats the version: it is not stale.
    snapshot(sockets[0], 5);
    expect(events).toHaveLength(2);

    sockets[0].drop();
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    sockets[1].open();
    snapshot(sockets[1], 1);
    expect(events).toHaveLength(3);
  });

  it('should close on purpose without reconnecting and resume a connection a strict-mode unmount interrupted', () => {
    const { session, sockets, statuses, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    session.suspend();
    session.resume();
    expect(sockets).toHaveLength(2);

    session.disconnect();
    vi.advanceTimersByTime(60_000);
    expect(statuses.at(-1)).toBe('idle');
    expect(sockets).toHaveLength(2);
  });
});
