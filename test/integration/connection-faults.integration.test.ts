import { afterEach, describe, expect, it } from 'vitest';
import { GameEventType, GamePhase, NotYourTurnError } from '@shared/domain';
import { CONNECTION_LIVENESS, RECONNECT_POLICY } from '@/presentation/config/connection.config';
import { ROOM_TIMING } from '../../party/config/room-timing.config';
import { refusalOf } from '../../party/test-support/table-driver';
import type { TestConnection, WireMessage } from '../../party/test-support/room-harness';
import type { FullStackTable } from './support/full-stack-table';
import { view } from './support/screen-model';
import {
  ROUND_TRIP_MAX_MS,
  chatFrom,
  framesTo,
  handOf,
  handShownTo,
  playToRoundTwoLead,
  playsOfCard,
  seatOf,
  seatOnTurn,
  startedTable,
  tableFacts,
  trickInRoom,
  trickShownTo,
} from './connection-faults.fixtures';

/** Shorter than COMMAND_ANSWER_MS: the held frames arrive as a burst before any probe runs. */
const STALL_MS = CONNECTION_LIVENESS.COMMAND_ANSWER_MS / 2;
/** Moves of a two-round game for three, with room to spare. */
const MAX_MOVES = 200;

/** The acknowledgements of one command a socket was sent. */
function acknowledgementsOf(connection: TestConnection, requestId: string): WireMessage[] {
  return connection.ofType(GameEventType.COMMAND_ACK).filter((frame) => frame.requestId === requestId);
}

/**
 * Plays the seeded table to its end through the players' screens, every human move made with the
 * frames to the screens held back for `stallMs` (none when 0). Every screen ends on the room's result.
 */
async function playToTheEnd(keep: (table: FullStackTable) => void, stallMs: number) {
  const { table, ann, ben } = await startedTable(keep);
  const startedAt = Date.now();
  for (let moves = 0; table.server.game.phase !== GamePhase.GAME_END; moves++) {
    if (moves > MAX_MOVES) throw new Error(`no game end after ${MAX_MOVES} moves`);
    if (stallMs > 0) table.network.stall(stallMs);
    if (!ann.autoMove() && !ben.autoMove()) await table.advance(ROOM_TIMING.BOT_ACTION_DELAY_MS);
    await table.settle();
  }
  const room = tableFacts(table.server.game.toJSON());
  const scores = room.players.map(({ id, score }) => [id, score]);
  for (const player of [ann, ben]) {
    const screen = view(player);
    expect(screen.page).toBe(`/results/${table.roomId}`);
    expect(screen.table?.standings.players.map(({ id, score }) => [id, score])).toEqual(scores);
  }
  return { room, elapsedMs: Date.now() - startedAt };
}

/**
 * Level 4: the real outbox, seat token and trick presentation against the real room when the
 * network drops, swallows or holds frames. The seat side (other tabs, restarts, pauses, bots)
 * lives in connection-faults.seats.integration.test.ts.
 */
describe('connection faults: transport', () => {
  let current: FullStackTable | null = null;
  const keep = (table: FullStackTable) => {
    current = table;
  };
  const release = () => {
    current?.dispose();
    current = null;
  };

  afterEach(release);

  it('reconnects a player dropped mid-trick with their seat token; they keep the table and see no landed card fly again', async () => {
    // Contract: a dropped socket rejoins its seat by token within the room's disconnect debounce,
    // and the reconnect snapshot continues the trick on the table. Regression: a reconnect that
    // takes a new seat or pauses the table, or a snapshot that throws landed cards in again (I6).
    const { table, ann, ben } = await startedTable(keep);
    const benSeat = seatOf(table, 'Ben');
    await playToRoundTwoLead(table);
    expect(seatOnTurn(table)).toBe(seatOf(table, 'Ann'));
    expect(trickShownTo(ben)).toEqual(trickInRoom(table));

    ben.dropConnection();
    ann.play(); // a card Ben's socket never gets
    await table.settle();

    expect(ben.connections).toHaveLength(2);
    expect(ben.seatId).toBe(benSeat);
    expect(trickShownTo(ben)).toEqual(trickInRoom(table));
    expect(trickInRoom(table)).toHaveLength(2);
    expect(ben.table.violations).toEqual([]);
    expect(framesTo(ann, GameEventType.GAME_PAUSED)).toHaveLength(0);

    ben.play();
    await table.settle();
    expect(ben.table.presentedTricks).toBe(framesTo(ann, GameEventType.TRICK_COMPLETE).length);
  });

  it('presents a trick that completed while the player was offline once, then the next trick', async () => {
    // Contract: a TRICK_COMPLETE lost with the socket is recovered from the reconnect snapshot and
    // presented exactly once; the next trick is presented as usual. Regression: a missed trick
    // never shown, or shown twice (once recovered, once again).
    const { table, ann, ben } = await startedTable(keep);
    await table.playUntil(() => table.server.game.phase === GamePhase.PLAYING && trickInRoom(table).length === 2);
    expect(seatOnTurn(table)).toBe(seatOf(table, 'Ann')); // her card completes round 1's only trick

    ben.dropConnection();
    ann.play();
    await table.settle();

    expect(table.server.game.phase).toBe(GamePhase.ROUND_END);
    expect(ben.connections).toHaveLength(2);
    // The room never repeats the event: the trick can only come from the snapshot.
    expect(ben.connections[1].ofType(GameEventType.TRICK_COMPLETE)).toHaveLength(0);
    expect(framesTo(ann, GameEventType.TRICK_COMPLETE)).toHaveLength(1);
    expect(ben.table.presentedTricks).toBe(1);

    await table.playUntil(() => framesTo(ann, GameEventType.TRICK_COMPLETE).length === 2);
    expect(ben.table.presentedTricks).toBe(2);
  });

  it('resends a card played on a zombie socket once on the new socket, and the room applies it once', async () => {
    // Contract: a card that reached the room but whose answers were swallowed (a zombie socket)
    // is noticed by the liveness probe within COMMAND_ANSWER_MS + PROBE_TIMEOUT_MS, resent with the
    // same requestId on a new socket, and the room's processed-command log answers it without
    // playing it again. Regression: a double play, a lost play, or a hand blocked by a pending play.
    const { table, ann, ben } = await startedTable(keep);
    const benSeat = seatOf(table, 'Ben');
    await table.playUntil(() => table.server.game.phase === GamePhase.PLAYING);
    expect(seatOnTurn(table)).toBe(benSeat);

    const playedAt = Date.now();
    ben.play();
    const pending = ben.state.pendingPlay;
    if (!pending) throw new Error('the play did not leave the hand');
    ben.blackholeConnection(); // the card is on its way; nothing gets through after it
    await table.settle();

    const [zombie, fresh] = ben.connections;
    expect(ben.connections).toHaveLength(2);
    expect(acknowledgementsOf(zombie, pending.requestId)).toHaveLength(1);
    expect(acknowledgementsOf(fresh, pending.requestId)).toHaveLength(1);
    const detectionLimit = CONNECTION_LIVENESS.COMMAND_ANSWER_MS + CONNECTION_LIVENESS.PROBE_TIMEOUT_MS + ROUND_TRIP_MAX_MS;
    expect(fresh.sent[0].at - playedAt).toBeLessThanOrEqual(detectionLimit);

    expect(playsOfCard(ann, pending.cardId)).toBe(1);
    expect(handOf(table, benSeat)).not.toContain(pending.cardId);
    expect(ben.state.pendingPlay).toBeNull();
  });

  it("puts a card the room refuses back in that player's hand and shows nobody else anything", async () => {
    // Contract: an optimistic play the room refuses is settled by the ERROR with its requestId:
    // the card leaves the table and returns to the hand, the player is told, and the others get
    // no frame at all. Regression: a card stuck on the table (pending play never settled), a hand
    // blocked for the rest of the trick, or a refusal that reaches the other players.
    const { table, ann, ben } = await startedTable(keep);
    const annSeat = seatOf(table, 'Ann');
    await table.playUntil(() => table.server.game.phase === GamePhase.PLAYING);
    expect(seatOnTurn(table)).toBe(seatOf(table, 'Ben'));
    const [annCard] = handOf(table, annSeat);
    const outOfTurn = new NotYourTurnError('play');
    ann.expectRefusal(outOfTurn.code);
    const framesToBen = ben.connections[0].sent.length;

    // A screen that is behind still offers the card: the UI's own command, sent out of turn.
    ann.commands.playCard(annCard);
    const requestId = ann.state.pendingPlay?.requestId;
    expect(trickShownTo(ann)).toContain(annCard);
    expect(handShownTo(ann)).not.toContain(annCard);
    await table.settle();

    expect(refusalOf(ann.connections[0])).toEqual({ message: outOfTurn.message, code: outOfTurn.code, requestId });
    expect(ann.notices).toContain(outOfTurn.message);
    expect(ann.state.pendingPlay).toBeNull();
    expect(trickShownTo(ann)).not.toContain(annCard);
    expect(handShownTo(ann)).toContain(annCard);
    expect(ben.connections[0].sent).toHaveLength(framesToBen);
    expect(handOf(table, annSeat)).toContain(annCard);

    // Her turn comes, and the same card plays.
    await table.playUntil(() => table.server.game.phase !== GamePhase.PLAYING);
    expect(playsOfCard(ben, annCard)).toBe(1);
  });

  it('delivers commands sent while reconnecting after the join, in order, exactly once', async () => {
    // Contract: the outbox keeps commands while no socket is open and sends them right after
    // JOIN_GAME on the next one, oldest first; a command whose acknowledgement was lost is resent
    // with its requestId and not applied again. Regression: commands lost, sent before the join
    // (refused as not seated), reordered, or a resend broadcast twice.
    const { table, ann, ben } = await startedTable(keep);
    const benSeat = seatOf(table, 'Ben');

    ben.chat('one'); // reaches the room; its acknowledgement is lost with the socket
    ben.dropConnection();
    await table.advance(1);
    expect(ben.state.status).toBe('reconnecting');
    ben.chat('two');
    ben.chat('three');
    await table.settle();

    expect(ben.connections).toHaveLength(2);
    const lostAcknowledgement = ben.connections[0].ofType(GameEventType.COMMAND_ACK).at(-1)?.requestId;
    expect(lostAcknowledgement).toBeDefined();
    expect(ben.connections[1].ofType(GameEventType.COMMAND_ACK).map((frame) => frame.requestId)).toContain(lostAcknowledgement);
    expect(chatFrom(ann, benSeat)).toEqual(['one', 'two', 'three']);
    const shown = view(ann).feeds.chatMessages.filter((line) => line.playerId === benSeat).map((line) => line.message);
    expect(shown).toEqual(['one', 'two', 'three']);
  });

  it('ends with the same table after a stalled burst as after live delivery', async () => {
    // Contract: frames held back and delivered as one burst change nothing the players end up
    // with: the same seed, played through the same screens, ends on the same table, and every
    // screen shows the room's result. Regression: a burst that loses, reorders or applies an
    // update twice (a snapshot dropped as stale, a move offered from a state the room left).
    const live = await playToTheEnd(keep, 0);
    release();
    const stalled = await playToTheEnd(keep, STALL_MS);
    expect(stalled.elapsedMs).toBeGreaterThan(live.elapsedMs); // the stalls held frames back
    expect(stalled.room).toEqual(live.room);
  });

  it('rejoins at once when the network comes back instead of waiting out the backoff', async () => {
    // Contract: a reconnecting client retries the moment the network is reported back, also after
    // a failed attempt, instead of after its pending backoff (never shorter than MIN_DELAY_MS).
    // Regression: wake() that only probes, or that waits for the scheduled retry.
    const { table, ben } = await startedTable(keep);
    const benSeat = seatOf(table, 'Ben');

    ben.dropConnection();
    await table.advance(1); // the close reaches the client: a retry is scheduled
    table.network.failNextConnects(1);
    ben.wake(); // the page is shown again while the host is still unreachable: this try fails
    await table.advance(1);
    expect(ben.state.status).toBe('reconnecting'); // and the next one waits out a fresh backoff
    expect(ben.connections).toHaveLength(1);

    ben.wake(); // the network is back
    await table.advance(ROUND_TRIP_MAX_MS + 1);
    // Any automatic retry waits at least MIN_DELAY_MS, so a seat back within one round trip came from the wake.
    expect(ROUND_TRIP_MAX_MS + 1).toBeLessThan(RECONNECT_POLICY.MIN_DELAY_MS);
    expect(ben.connections).toHaveLength(2);
    expect(ben.connections[1].ofType(GameEventType.GAME_STATE).length).toBeGreaterThan(0);

    await table.settle();
    expect(ben.seatId).toBe(benSeat);
  });
});
