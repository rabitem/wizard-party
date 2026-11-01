import { afterEach, describe, expect, it } from 'vitest';
import { ConnectionCloseCode, GameEventType, GamePhase, SessionRejectedError, getPauseDeadline } from '@shared/domain';
import { RECONNECT_POLICY } from '@/presentation/config/connection.config';
import { ROOM_TIMING } from '../../party/config/room-timing.config';
import type { BrowserProfile } from './support/browser-profile';
import type { FullStackTable } from './support/full-stack-table';
import { view } from './support/screen-model';
import {
  ONE_WAY_MAX_MS,
  framesTo,
  playToRoundTwoLead,
  seatOf,
  seatShownTo,
  startedTable,
  tableFacts,
} from './connection-faults.fixtures';

/** Long enough for any reconnect a client would still schedule by itself. */
const LONGEST_BACKOFF_MS = RECONNECT_POLICY.MAX_DELAY_MS;

/**
 * Level 4: who holds a seat when its sockets come and go: a second tab, a copied browser id, a
 * room restart, a player who stays away or leaves on purpose. The transport side (drops, zombie
 * sockets, stalls, the outbox) lives in connection-faults.integration.test.ts.
 *
 * Switching rooms (the previous room's table and commands are forgotten) is proven at the session
 * (game-session.outbox.test.ts): a FullStackTable hosts one room.
 */
describe('connection faults: seats', () => {
  let current: FullStackTable | null = null;
  const keep = (table: FullStackTable) => {
    current = table;
  };

  afterEach(() => {
    current?.dispose();
    current = null;
  });

  it('stops the first tab with "superseded" when the seat opens in a second tab, and "Play here" takes it back', async () => {
    // Contract: a seat is played from one socket; opening it elsewhere closes the older socket
    // with SUPERSEDED, which does not reconnect by itself, and "Play here" takes the seat back the
    // same way. Regression: the two tabs fighting over the seat (a reconnect after 4000), a second
    // seat for the second tab, or a pause while the seat changes sockets.
    const { table, ann } = await startedTable(keep);
    const annSeat = seatOf(table, 'Ann');
    const secondTab = table.open(ann.profile, 'Ann');
    await secondTab.join();

    expect(ann.connections[0].closed?.code).toBe(ConnectionCloseCode.SUPERSEDED);
    expect(ann.state.status).toBe('superseded');
    expect(secondTab.state.status).toBe('connected');
    expect(secondTab.seatId).toBe(annSeat);
    await table.advance(LONGEST_BACKOFF_MS);
    await table.settle();
    expect(ann.connections).toHaveLength(1);

    ann.playHere();
    await table.settle();
    expect(ann.state.status).toBe('connected');
    expect(ann.seatId).toBe(annSeat);
    expect(secondTab.state.status).toBe('superseded');
    await table.advance(LONGEST_BACKOFF_MS);
    await table.settle();
    expect(ann.connections).toHaveLength(2);
    expect(secondTab.connections).toHaveLength(1);
    expect(table.server.game.players).toHaveLength(3);
    expect(framesTo(ann, GameEventType.GAME_PAUSED)).toHaveLength(0);
  });

  it('stops reconnecting and forgets the room when a seat is refused for another session', async () => {
    // Contract: a browser id that maps to a token-protected seat, presented without the token, is
    // refused with SESSION_REJECTED; that client shows the refusal for good, holds no table and
    // never retries, and the seat stays with its player. Regression: a reconnect loop against a
    // refusal that cannot change, or a copied browser id taking over somebody's seat.
    const { table, ben } = await startedTable(keep);
    const benSeat = seatOf(table, 'Ben');
    // Another browser that copied Ben's reconnect id, without the seat token that proves the seat.
    const copied: BrowserProfile = { ...table.browser('copied'), persistentId: ben.profile.persistentId };
    const copy = table.open(copied, 'Ben');
    const rejected = new SessionRejectedError();
    copy.expectRefusal(rejected.code);
    await copy.join();

    expect(copy.state.status).toBe('rejected');
    expect(view(copy)).toMatchObject({ error: rejected.message, seatId: null, table: null, lobby: null });
    expect(copied.seatTokens.load(table.roomId)).toBeUndefined();
    await table.advance(LONGEST_BACKOFF_MS);
    await table.settle();
    expect(copy.connections).toHaveLength(1);

    expect(ben.state.status).toBe('connected');
    expect(ben.connections).toHaveLength(1);
    expect(ben.seatId).toBe(benSeat);
  });

  it('reconnects every client by itself after the room restarts from storage, and the round continues where it stopped', async () => {
    // Contract: a room evicted mid-trick starts again from its storage; every client reconnects
    // after the close by itself, takes its seat back with its token, and the table resumes with
    // the same deal, trick, hands and scores. Regression: state lost on restart, clients stuck
    // after the close, or a table left paused for players who are back.
    const { table, ann, ben } = await startedTable(keep);
    const seats = new Map([[ann, seatOf(table, 'Ann')], [ben, seatOf(table, 'Ben')]]);
    await playToRoundTwoLead(table);
    const before = tableFacts(table.server.game.toJSON());

    await table.restartRoom();
    await table.settle();

    for (const [player, seat] of seats) {
      expect(player.connections[0].closed).not.toBeNull(); // the evicted room's socket
      expect(player.connections).toHaveLength(2);
      expect(player.state.status).toBe('connected');
      expect(player.seatId).toBe(seat);
    }
    expect(table.server.game.isPaused()).toBe(false);
    expect(tableFacts(table.server.game.toJSON())).toEqual(before);

    await table.playUntil(() => table.server.game.phase === GamePhase.GAME_END);
    for (const player of seats.keys()) expect(view(player).page).toBe(`/results/${table.roomId}`);
  });

  it('pauses the table for everyone while one player is away, names who is awaited, and resumes on their return', async () => {
    // Contract: a seat whose last socket stays closed past the disconnect debounce pauses the
    // running game, every other screen names the awaited player, and their return (same browser,
    // seat token) resumes it. Regression: a table that plays on without them, a pause that names
    // somebody else, or one that outlasts their return.
    const { table, ann, ben } = await startedTable(keep);
    const benSeat = seatOf(table, 'Ben');
    ben.closeTab();
    await table.advance(ROOM_TIMING.DISCONNECT_DEBOUNCE_MS + ONE_WAY_MAX_MS);
    await table.settle();

    expect(table.server.game.pauseState?.pausedForPlayerId).toBe(benSeat);
    expect(view(ann).table?.game.pauseState?.pausedForPlayerName).toBe('Ben');

    const back = table.open(ben.profile, 'Ben');
    await back.join();
    expect(back.seatId).toBe(benSeat);
    expect(table.server.game.isPaused()).toBe(false);
    expect(view(ann).table?.game.pauseState ?? null).toBeNull();
    expect(seatShownTo(ann, benSeat)?.isConnected).toBe(true);
  });

  it("hands an absent player's seat to a bot after the reconnect window, and lets them take it back later", async () => {
    // Contract: the pause lasts RECONNECT_WINDOW_MS; then a bot plays the seat (hand and score
    // kept) and the table goes on; the player's token still opens the seat, which turns human
    // again. Regression: a bot before the window ends, a table paused for good, or a returning
    // player refused or seated anew.
    const { table, ann, ben } = await startedTable(keep);
    const benSeat = seatOf(table, 'Ben');
    ben.closeTab();
    await table.advance(ROOM_TIMING.DISCONNECT_DEBOUNCE_MS + ONE_WAY_MAX_MS);
    const pause = table.server.game.pauseState;
    expect(pause?.timeoutDuration).toBe(ROOM_TIMING.RECONNECT_WINDOW_MS);
    const deadline = getPauseDeadline(pause);
    if (deadline === null) throw new Error('the table did not pause for Ben');

    await table.advance(deadline - Date.now() - 1);
    expect(table.server.game.getPlayer(benSeat)?.isBot).toBe(false);
    await table.advance(1);
    await table.settle();
    expect(table.server.game.getPlayer(benSeat)?.isBot).toBe(true);
    expect(table.server.game.isPaused()).toBe(false);
    expect(seatShownTo(ann, benSeat)?.isBot).toBe(true);

    const back = table.open(ben.profile, 'Ben');
    await back.join();
    expect(back.seatId).toBe(benSeat);
    expect(table.server.game.getPlayer(benSeat)).toMatchObject({ isBot: false, name: 'Ben' });
    expect(seatShownTo(ann, benSeat)).toMatchObject({ isBot: false, name: 'Ben' });
  });

  it("hands the seat of a player who leaves on purpose to a bot at once; the leaver's client forgets the room and goes home", async () => {
    // Contract: LEAVE_GAME in a running game gives the seat to a bot without pausing anyone; the
    // leaver's client drops the table, goes to the home page and does not reconnect.
    // Regression: a deliberate leave treated as a drop (everyone paused for the reconnect
    // window), or a client that keeps the table or reconnects after leaving.
    const { table, ann, ben } = await startedTable(keep);
    const benSeat = seatOf(table, 'Ben');
    await ben.leave();

    expect(table.server.game.getPlayer(benSeat)?.isBot).toBe(true);
    expect(framesTo(ann, GameEventType.GAME_PAUSED)).toHaveLength(0);
    expect(seatShownTo(ann, benSeat)?.isBot).toBe(true);
    expect(view(ben)).toMatchObject({ page: '/', status: 'idle', seatId: null, table: null, lobby: null });
    await table.advance(LONGEST_BACKOFF_MS);
    await table.settle();
    expect(ben.connections).toHaveLength(1);
  });
});
