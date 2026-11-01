/**
 * Drives a tournament match room on RoomHarness for the match-mode suites: ticketed joins, the
 * match controller's alarm, and members who bid low and play their first legal card. Not part of
 * the worker.
 */
import { vi } from 'vitest';
import { ClientCommandType, GameEventType, GamePhase, Suit, type Player } from '../../shared/domain';
import type { IUseCaseRegistry } from '../../shared/application';
import type { TournamentMatchRoomState } from '../../shared/domain/tournament';
import type { MatchTicketClaims } from '../../shared/tournament';
import { ROOM_TIMING } from '../config/room-timing.config';
import type { TournamentMatchServices } from '../tournament';
import {
  TEST_NOW,
  TEST_ROOM,
  fakeTournamentServices,
  settle,
  type FakeTicketVerifier,
  type RecordingResultSink,
} from '../tournament/tournament-test-support';
import { RoomHarness, persistentIdOf, seatToldTo, type TestConnection } from './room-harness';

/** Above the server's disconnect debounce: a closed socket has become a leave. */
export const DISCONNECT_SETTLE_MS = ROOM_TIMING.DISCONNECT_DEBOUNCE_MS + 500;
const MAX_PLAY_STEPS = 400;

export interface MatchRoom {
  h: RoomHarness;
  /** Issues the tickets this room's verifier accepts. */
  tickets: FakeTicketVerifier;
  /** What the room reported to the tournament. */
  results: RecordingResultSink;
}

export interface MatchRoomOptions {
  roomId?: string;
  /** Default: fake ticket verification and a recording result sink. */
  services?: Omit<TournamentMatchServices, 'alarm'>;
  useCases?: IUseCaseRegistry;
}

/** A match room (TEST_ROOM unless told otherwise); fake timers must already be installed. */
export async function matchRoom(options: MatchRoomOptions = {}): Promise<MatchRoom> {
  const fakes = fakeTournamentServices();
  const h = await RoomHarness.create({
    roomId: options.roomId ?? TEST_ROOM,
    useCases: options.useCases,
    tournament: options.services ?? fakes.services,
  });
  return { h, tickets: fakes.tickets, results: fakes.results };
}

/** The object is evicted and starts again on its storage, with the services of a new worker instance. */
export async function restartMatchRoom({ h }: MatchRoom): Promise<MatchRoom> {
  const fakes = fakeTournamentServices();
  return { h: await h.restart({ tournament: fakes.services }), tickets: fakes.tickets, results: fakes.results };
}

/** A browser's reconnect id created at the tournament suites' clock. */
export function matchPersistentId(suffix: string): string {
  return persistentIdOf(suffix, TEST_NOW);
}

/** JOIN_GAME as the browser sends it after the tournament page stored a ticket (legacy protocol). */
export async function ticketJoin(h: RoomHarness, connection: TestConnection, persistentSuffix: string, ticket?: string): Promise<void> {
  h.send(connection, {
    type: ClientCommandType.JOIN_GAME,
    playerName: 'Typed In The Browser',
    persistentId: matchPersistentId(persistentSuffix),
    ...(ticket === undefined ? {} : { tournamentTicket: ticket }),
  });
  await settle();
}

/** Connects and joins with a freshly issued ticket for `claims`. */
export async function seat({ h, tickets }: MatchRoom, persistentSuffix: string, claims: MatchTicketClaims): Promise<TestConnection> {
  const connection = h.connect();
  await ticketJoin(h, connection, persistentSuffix, tickets.issue(claims));
  return connection;
}

/** The match room state sent beside the last GAME_STATE, where the client reads it. */
export function matchStateOf(connection: TestConnection): TournamentMatchRoomState | null {
  const message = connection.ofType(GameEventType.GAME_STATE).at(-1);
  return (message?.tournamentMatch as TournamentMatchRoomState | undefined) ?? null;
}

/**
 * The open socket the room last told it plays the seat. The newest one wins: a socket that left
 * keeps the last seat it was told, but a later join of that seat is a newer socket.
 */
function socketOf(h: RoomHarness, playerId: string): TestConnection | undefined {
  let found: TestConnection | undefined;
  for (const connection of h.room.connections.values()) {
    if (connection.closed === null && seatToldTo(connection) === playerId) found = connection;
  }
  return found;
}

/** Lets the bots (and any other in-memory timers) act; alarms fire only through `fireAlarm`. */
async function letTimePass(): Promise<void> {
  vi.advanceTimersByTime(ROOM_TIMING.BOT_ACTION_DELAY_MS * 4);
  await settle();
}

async function finishRound(h: RoomHarness): Promise<void> {
  const host = socketOf(h, h.game.hostId);
  if (host) h.send(host, { type: ClientCommandType.NEXT_ROUND });
  else await h.fireAlarm('tournament');
}

async function selectTrump(h: RoomHarness): Promise<void> {
  // Only the player entitled to choose succeeds; the others are refused.
  for (const player of h.game.players) {
    const socket = player.isBot ? undefined : socketOf(h, player.id);
    if (socket && h.game.phase === GamePhase.TRUMP_SELECTION) h.send(socket, { type: ClientCommandType.SELECT_TRUMP, suit: Suit.GIANTS });
  }
  if (h.game.phase === GamePhase.TRUMP_SELECTION) await letTimePass();
}

function isTurnOf(h: RoomHarness, playerId: string, phase: GamePhase): boolean {
  return h.game.phase === phase && h.game.players[h.game.currentPlayerIndex]?.id === playerId;
}

/** The member to act bids low or plays their first legal card. */
function moveOf(h: RoomHarness, player: Player, socket: TestConnection): void {
  const game = h.game;
  if (game.phase === GamePhase.BIDDING) {
    h.send(socket, { type: ClientCommandType.PLACE_BID, bid: 0 });
    // The last bid may not make the total match the round ("hook" rule): bid one instead.
    if (isTurnOf(h, player.id, GamePhase.BIDDING)) h.send(socket, { type: ClientCommandType.PLACE_BID, bid: 1 });
  } else if (game.phase === GamePhase.PLAYING) {
    const [card] = game.getLegalPlays(player.id);
    h.send(socket, { type: ClientCommandType.PLAY_CARD, cardId: card.id });
  }
}

/** One move of whoever is to act: members through their sockets, bots and timeouts through time. */
export async function step(h: RoomHarness): Promise<void> {
  const game = h.game;
  if (game.isPaused()) return h.fireAlarm('room');
  if (game.phase === GamePhase.ROUND_END) return finishRound(h);
  if (game.phase === GamePhase.TRUMP_SELECTION) return selectTrump(h);
  const current = game.players[game.currentPlayerIndex];
  const socket = current && !current.isBot ? socketOf(h, current.id) : undefined;
  if (!current || !socket) return letTimePass();
  moveOf(h, current, socket);
  await settle();
}

/** Plays until the game is over (the members always bid low and play their first legal card). */
export async function playToEnd(h: RoomHarness): Promise<void> {
  for (let steps = 0; steps < MAX_PLAY_STEPS && h.game.phase !== GamePhase.GAME_END; steps++) await step(h);
  if (h.game.phase !== GamePhase.GAME_END) throw new Error(`game stuck in ${h.game.phase}`);
}
