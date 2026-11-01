import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ClientCommandType, GameEventType } from '@shared/domain';
import { COMMAND_OUTBOX, CONNECTION_LIVENESS, RECONNECT_POLICY } from '@/presentation/config/connection.config';

import { setupSession } from './test-support/fake-socket';

/**
 * What the session sends on which socket: liveness probes, and the command outbox, including how
 * a command the server can no longer settle is settled as expired instead of being lost.
 */
describe('GameSession probes and commands', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should probe only a line that has been quiet for CONNECTION_LIVENESS.QUIET_MS', () => {
    const { session, sockets, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    session.checkLiveness();
    vi.advanceTimersByTime(CONNECTION_LIVENESS.QUIET_MS - 1);
    session.checkLiveness();
    expect(sockets[0].types()).toEqual(['JOIN_GAME']);

    vi.advanceTimersByTime(1);
    session.checkLiveness();
    expect(sockets[0].types()).toEqual(['JOIN_GAME', 'REQUEST_STATE']);
  });

  it('should not probe after a command the server acknowledged', () => {
    const { session, sockets, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    const bid = session.send({ type: 'PLACE_BID', bid: 1 });
    sockets[0].receive({ type: GameEventType.COMMAND_ACK, requestId: bid });
    vi.advanceTimersByTime(CONNECTION_LIVENESS.COMMAND_ANSWER_MS + CONNECTION_LIVENESS.PROBE_TIMEOUT_MS);

    expect(sockets[0].types()).toEqual(['JOIN_GAME', 'PLACE_BID']);
    expect(sockets).toHaveLength(1);
  });

  it('should send commands issued before the socket opened right after JOIN_GAME', () => {
    const { session, sockets, connect } = setupSession();
    connect();
    const bid = session.send({ type: ClientCommandType.PLACE_BID, bid: 1 });
    expect(sockets[0].sent).toEqual([]);

    sockets[0].open();

    expect(sockets[0].types()).toEqual([ClientCommandType.JOIN_GAME, ClientCommandType.PLACE_BID]);
    expect(sockets[0].sent[1].requestId).toBe(bid);
  });

  it('should keep a command whose send threw and send it on the next socket', () => {
    const { session, sockets, settled, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    sockets[0].failNextSend();
    const play = session.send({ type: ClientCommandType.PLAY_CARD, cardId: 'c1' });
    expect(sockets[0].types()).toEqual([ClientCommandType.JOIN_GAME]);
    sockets[0].drop();
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    sockets[1].open();

    expect(sockets[1].types()).toEqual([ClientCommandType.JOIN_GAME, ClientCommandType.PLAY_CARD]);
    expect(sockets[1].sent[1].requestId).toBe(play);
    expect(settled).toEqual([]);
  });

  it('should not replay an emote that was lost with its socket, and settle it as expired', () => {
    const { session, sockets, settled, connect, join } = setupSession();
    connect();
    join(sockets[0]);

    const emote = session.send({ type: ClientCommandType.SEND_EMOTE, emoteId: 'wizard' });
    sockets[0].drop();
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    sockets[1].open();

    expect(sockets[1].types()).toEqual([ClientCommandType.JOIN_GAME]);
    expect(settled).toEqual([{ requestId: emote, outcome: 'expired', code: undefined }]);
  });

  it('should settle a command kept offline for longer than COMMAND_OUTBOX.COMMAND_TTL_MS as expired instead of sending it', () => {
    const { session, sockets, settled, connect, join } = setupSession();
    connect();
    join(sockets[0]);
    sockets[0].drop();
    const bid = session.send({ type: ClientCommandType.PLACE_BID, bid: 1 });

    // The tab slept (timers held back) for longer than the command's moment.
    vi.setSystemTime(Date.now() + COMMAND_OUTBOX.COMMAND_TTL_MS + 1);
    vi.advanceTimersByTime(RECONNECT_POLICY.BASE_DELAY_MS);
    sockets[1].open();

    expect(sockets[1].types()).toEqual([ClientCommandType.JOIN_GAME]);
    expect(settled).toEqual([{ requestId: bid, outcome: 'expired', code: undefined }]);
  });

  it('should keep at most COMMAND_OUTBOX.MAX_SIZE commands, settling the oldest it drops as expired', () => {
    const { session, sockets, settled, connect } = setupSession();
    connect();
    // A play queued offline behind a burst of chat: it must not stay pending once dropped.
    const play = session.send({ type: ClientCommandType.PLAY_CARD, cardId: 'c1' });
    for (let index = 0; index < COMMAND_OUTBOX.MAX_SIZE; index += 1) {
      session.send({ type: ClientCommandType.SEND_CHAT, message: `message ${index}` });
    }

    expect(settled).toEqual([{ requestId: play, outcome: 'expired', code: undefined }]);
    sockets[0].open();
    expect(sockets[0].types()).toEqual([
      ClientCommandType.JOIN_GAME,
      ...Array.from({ length: COMMAND_OUTBOX.MAX_SIZE }, () => ClientCommandType.SEND_CHAT),
    ]);
  });

  it('should settle every pending command as expired on disconnect and send none of them later', () => {
    const { session, sockets, settled, connect, join } = setupSession();
    connect();
    join(sockets[0]);
    const bid = session.send({ type: ClientCommandType.PLACE_BID, bid: 1 });

    session.disconnect();
    expect(settled).toEqual([{ requestId: bid, outcome: 'expired', code: undefined }]);

    connect();
    sockets[1].open();
    expect(sockets[1].types()).toEqual([ClientCommandType.JOIN_GAME]);
  });

  it('should report the room change and never send a command of the previous room to the next one', () => {
    const { session, sockets, roomChanges, connect, join } = setupSession();
    connect('room-1');
    join(sockets[0]);
    sockets[0].drop();
    session.send({ type: ClientCommandType.PLAY_CARD, cardId: 'c1' });

    connect('room-2');
    expect(roomChanges).toHaveLength(1);
    sockets[1].open();

    expect(sockets[1].options.room).toBe('room-2');
    expect(sockets[1].types()).toEqual([ClientCommandType.JOIN_GAME]);
  });
});
