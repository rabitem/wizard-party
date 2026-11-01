/**
 * Builds and plays tables on RoomHarness for the level-3 suites: a lobby of humans, a started
 * game, the simplest legal move of whoever the game waits for, and the invariants the room keeps
 * after every input. Not part of the worker.
 */
import { expect } from 'vitest';
import {
  ClientCommandType,
  DEFAULT_RULESET_CONFIG,
  GameEventType,
  GamePhase,
  Suit,
  type IGameState,
  type IRulesetConfig,
} from '../../shared/domain';
import { ROOM_TIMING } from '../config/room-timing.config';
import { RoomHarness, type TestConnection } from './room-harness';

export function ruleset(overrides: { rounds?: number; biddingTimerSeconds?: number } = {}): IRulesetConfig {
  return {
    ...DEFAULT_RULESET_CONFIG,
    structure: { ...DEFAULT_RULESET_CONFIG.structure, customRoundCount: overrides.rounds ?? 2 },
    turn: { ...DEFAULT_RULESET_CONFIG.turn, biddingTimerSeconds: overrides.biddingTimerSeconds ?? null },
  };
}

/** What the first joiner sends to create the room. */
export interface LobbySettings {
  name?: string;
  isPublic?: boolean;
  maxPlayers?: number;
  rulesetConfig?: IRulesetConfig;
}

export interface Table {
  h: RoomHarness;
  /** Seat id -> the socket playing it. */
  seats: Map<string, TestConnection>;
  sockets: Record<string, TestConnection>;
}

/** Humans join in order; the first creates the room with `settings` and hosts it. */
export async function lobby(humans: string[], settings: LobbySettings = {}, harness?: RoomHarness): Promise<Table> {
  const h = harness ?? await RoomHarness.create();
  const seats = new Map<string, TestConnection>();
  const sockets: Record<string, TestConnection> = {};
  const roomSettings = { name: 'Table', isPublic: false, maxPlayers: 6, rulesetConfig: ruleset(), ...settings };
  humans.forEach((name, index) => {
    const socket = h.join(name, name.toLowerCase(), index === 0 ? { roomSettings } : {});
    sockets[name] = socket;
    seats.set(h.seatOf(socket), socket);
  });
  return { h, seats, sockets };
}

/** Humans join in order (the first hosts), the host adds the bots and starts. */
export async function startedTable(humans: string[], bots: number, rules = ruleset(), harness?: RoomHarness): Promise<Table> {
  const table = await lobby(humans, { rulesetConfig: rules }, harness);
  const { h, sockets } = table;
  const host = sockets[humans[0]];
  for (let i = 0; i < bots; i++) h.send(host, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
  h.send(host, { type: ClientCommandType.START_GAME });
  expect(h.game.phase).not.toBe(GamePhase.LOBBY);
  return table;
}

/** The human whose decision the game waits for makes the simplest legal move; false when none. */
export function humanMove({ h, seats }: Table): boolean {
  const game = h.game;
  if (game.isPaused()) return false;
  if (game.phase === GamePhase.TRUMP_SELECTION) {
    const chooser = game.getTrumpChooser();
    const socket = chooser && !chooser.isBot ? seats.get(chooser.id) : undefined;
    if (!socket) return false;
    h.send(socket, { type: ClientCommandType.SELECT_TRUMP, suit: Suit.GIANTS });
    return true;
  }
  const current = game.getCurrentPlayer();
  const socket = current && !current.isBot ? seats.get(current.id) : undefined;
  if (!socket || socket.closed) return false;
  if (game.phase === GamePhase.BIDDING) {
    h.send(socket, { type: ClientCommandType.PLACE_BID, bid: game.getForbiddenBidFor(current.id) === 0 ? 1 : 0 });
    return true;
  }
  const [card] = game.getLegalPlays(current.id);
  if (game.phase !== GamePhase.PLAYING || !card) return false;
  h.send(socket, { type: ClientCommandType.PLAY_CARD, cardId: card.id });
  return true;
}

/** Humans move at once, bots in their own time, until `done`. */
export async function playUntil(table: Table, done: () => boolean, maxSteps = 600): Promise<void> {
  for (let step = 0; step < maxSteps && !done(); step++) {
    if (!humanMove(table)) await table.h.advance(ROOM_TIMING.BOT_ACTION_DELAY_MS);
  }
  if (!done()) throw new Error(`stuck in ${table.h.game.phase} (paused: ${table.h.game.isPaused()})`);
}

/**
 * Cross-cutting invariants the room keeps after every input: the host is a connected human
 * whenever one is seated (outside the lobby, whose host keeps the seat through its grace), no
 * snapshot shows anyone another player's cards, and snapshot versions never go backwards.
 */
export function expectRoomInvariants(h: RoomHarness, sockets: TestConnection[]): void {
  const game = h.game;
  if (game.phase !== GamePhase.LOBBY && game.players.some((p) => !p.isBot && p.isConnected)) {
    const host = game.getPlayer(game.hostId);
    expect(host?.isBot === false && host.isConnected).toBe(true);
  }
  for (const socket of sockets) {
    const snapshots = socket.ofType(GameEventType.GAME_STATE);
    const versions = snapshots.map((message) => Number(message.stateVersion));
    versions.slice(1).forEach((version, index) => expect(version).toBeGreaterThanOrEqual(versions[index]));
    for (const snapshot of snapshots) {
      const state = snapshot.state as IGameState;
      const others = state.players.filter((p) => p.id !== snapshot.yourPlayerId);
      expect(others.every((p) => p.hand.every((card) => card.id === 'hidden'))).toBe(true);
    }
  }
}

/** A command the room refused, as the client was told (an ERROR frame). */
export interface Refusal {
  message: string;
  code?: string;
  requestId?: string;
}

function refusalsOf(connection: TestConnection): Refusal[] {
  return connection.ofType(GameEventType.ERROR).map((frame) => ({
    message: String(frame.message),
    ...(typeof frame.code === 'string' ? { code: frame.code } : {}),
    ...(typeof frame.requestId === 'string' ? { requestId: frame.requestId } : {}),
  }));
}

/** The last refusal a connection was sent, or null when it was never refused. */
export function refusalOf(connection: TestConnection): Refusal | null {
  return refusalsOf(connection).at(-1) ?? null;
}

/** The code of every refusal a connection was sent, in order (undefined for one without a code). */
export function refusalCodesOf(connection: TestConnection): (string | undefined)[] {
  return refusalsOf(connection).map((refusal) => refusal.code);
}
