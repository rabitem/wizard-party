/**
 * What must hold for every client of a level-4 table whenever it is settled, whatever the
 * scenario did (FullStackTable.settle checks them all). Expected values come from the room, the
 * owner of the game (`createPersonalizedState` over its Game and the room settings it saved,
 * `getLegalPlays` of its Game), never from a client.
 *
 * I1 hidden information: no frame a client was sent shows another seat's hand, a `password` field,
 *    the kick list or another seat's session token; under hidden bids no snapshot shows another
 *    seat's bid while bids are collected.
 * I2 snapshot versions never go backwards on a connection.
 * I3 convergence: a connected client holds exactly the projection the room would send its seat now.
 * I4 rule agreement: a connected client offers exactly the cards the room accepts from its seat.
 * I5 no unexpected refusal: no ERROR frame and no shown error unless the scenario expected it.
 * I6 presentation integrity: no trick presented twice, no landed card flying in again in one trick.
 */
import { expect } from 'vitest';
import { GameEventType, GamePhase, type Game, type IGameState, type IRoomSettings } from '@shared/domain';
import { createPersonalizedState } from '@shared/application/projections/personalized-state';
import type { GameClientState } from '@/presentation/hooks/connection/game-client-state';
import type { TestConnection, WireMessage } from '../../../party/test-support/room-harness';

/** The room as the invariants read it: its game and the room settings it last saved. */
export interface InvariantRoom {
  readonly game: Game;
  /** Null until the room first saved; it sends no table before that. */
  readonly roomSettings: IRoomSettings | null;
}

/** A client as the invariants read it (PlayerClient satisfies it). */
export interface InvariantClient {
  readonly name: string;
  /** A closed tab keeps its wire log (I1, I2, I5) but no longer shows a table (I3, I4). */
  readonly isClosed: boolean;
  readonly connections: readonly TestConnection[];
  readonly state: GameClientState;
  readonly expectedRefusals: ReadonlySet<string>;
  readonly notices: readonly string[];
  readonly table: { readonly violations: readonly string[] };
}

/** The card the projection shows in place of another seat's card. */
const HIDDEN_CARD_ID = 'hidden';
/** Server-side fields no client may ever be sent. */
const SECRET_KEYS = ['password', 'kickedPlayerIds'] as const;

function hasKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) return value.some((item) => hasKey(item, key));
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(([name, inner]) => name === key || hasKey(inner, key));
}

/** Every session token the room issued, with the seat it belongs to. */
function issuedTokens(clients: readonly InvariantClient[]): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const client of clients) {
    for (const connection of client.connections) {
      for (const frame of connection.ofType(GameEventType.SESSION)) {
        if (typeof frame.sessionToken === 'string' && typeof frame.playerId === 'string') tokens.set(frame.sessionToken, frame.playerId);
      }
    }
  }
  return tokens;
}

function expectPrivateSnapshot(frame: WireMessage, where: string): void {
  const state = frame.state as IGameState;
  const others = state.players.filter((player) => player.id !== frame.yourPlayerId);
  const shownCards = others.flatMap((player) => player.hand.filter((card) => card.id !== HIDDEN_CARD_ID).map((card) => `${player.name}: ${card.id}`));
  expect(shownCards, `I1 ${where} shows another seat's cards`).toEqual([]);
  if (state.rulesetConfig?.bidding.hiddenBids && state.phase === GamePhase.BIDDING) {
    const shownBids = others.filter((player) => player.bid !== null).map((player) => player.name);
    expect(shownBids, `I1 ${where} shows hidden bids`).toEqual([]);
  }
}

/** I1 */
export function expectNoLeaks(clients: readonly InvariantClient[]): void {
  const tokens = issuedTokens(clients);
  for (const client of clients) {
    for (const connection of client.connections) {
      const seat = connection.session()?.playerId ?? null;
      for (const frame of connection.messages()) {
        const where = `${client.name} (${connection.id}) ${frame.type}`;
        for (const key of SECRET_KEYS) expect(hasKey(frame, key), `I1 ${where} carries ${key}`).toBe(false);
        const raw = JSON.stringify(frame);
        const foreign = [...tokens].filter(([token, owner]) => owner !== seat && raw.includes(token)).map(([, owner]) => owner);
        expect(foreign, `I1 ${where} carries the session token of another seat`).toEqual([]);
        if (frame.type === GameEventType.GAME_STATE) expectPrivateSnapshot(frame, where);
      }
    }
  }
}

/** I2 */
export function expectOrderedSnapshots(clients: readonly InvariantClient[]): void {
  for (const client of clients) {
    for (const connection of client.connections) {
      const versions = connection.ofType(GameEventType.GAME_STATE).map((frame) => Number(frame.stateVersion));
      const backwards = versions.filter((version, index) => index > 0 && version < versions[index - 1]);
      expect(backwards, `I2 ${client.name} (${connection.id}) got older snapshots after newer ones: ${versions.join(',')}`).toEqual([]);
    }
  }
}

/** The seat of a client that is connected and shows a table; null otherwise. */
function liveSeat({ state, isClosed }: InvariantClient): string | null {
  return !isClosed && state.status === 'connected' && state.playerId && state.serverState ? state.playerId : null;
}

/** The projection as compared: the server clock stamp of the turn timer differs per send. */
function comparable(state: IGameState | null): IGameState | null {
  if (!state) return null;
  const copy = JSON.parse(JSON.stringify(state)) as IGameState;
  if (copy.turnTimerState) delete copy.turnTimerState.serverNow;
  return copy;
}

/** I3 */
export function expectConvergence(room: InvariantRoom, clients: readonly InvariantClient[]): void {
  for (const client of clients) {
    const seat = liveSeat(client);
    if (!seat) continue;
    expect(room.game.getPlayer(seat), `I3 ${client.name} shows seat ${seat}, which the room no longer has`).toBeDefined();
    const settings = room.roomSettings;
    if (!settings) throw new Error(`I3 ${client.name} holds a table the room never saved`);
    const owner = createPersonalizedState(room.game, seat, settings);
    expect(comparable(client.state.serverState), `I3 ${client.name} holds another table than the room`).toEqual(comparable(owner));
  }
}

/** I4 */
export function expectRuleAgreement(room: InvariantRoom, clients: readonly InvariantClient[]): void {
  for (const client of clients) {
    const seat = liveSeat(client);
    if (!seat) continue;
    const accepted = room.game.getLegalPlays(seat).map((card) => card.id).sort();
    expect([...client.state.legalCardIds].sort(), `I4 ${client.name} offers other cards than the room accepts`).toEqual(accepted);
  }
}

/** I5 */
export function expectNoUnexpectedRefusals(clients: readonly InvariantClient[]): void {
  for (const client of clients) {
    const expected = client.expectedRefusals;
    const refusals = client.connections.flatMap((connection) => connection.ofType(GameEventType.ERROR));
    const refusedMessages = new Set(refusals.map((frame) => String(frame.message)));
    const unexpectedFrames = refusals
      .filter((frame) => !expected.has(String(frame.code)) && !expected.has(String(frame.message)))
      .map((frame) => `${String(frame.code)}: ${String(frame.message)}`);
    expect(unexpectedFrames, `I5 ${client.name} was refused`).toEqual([]);
    const unexpectedNotices = client.notices.filter((notice) => !expected.has(notice) && !refusedMessages.has(notice));
    expect(unexpectedNotices, `I5 ${client.name} was shown an error`).toEqual([]);
  }
}

/** I6 */
export function expectPresentationIntegrity(clients: readonly InvariantClient[]): void {
  for (const client of clients) expect(client.table.violations, `I6 ${client.name}`).toEqual([]);
}

/** I1-I6. */
export function expectInvariants(room: InvariantRoom, clients: readonly InvariantClient[]): void {
  expectNoLeaks(clients);
  expectOrderedSnapshots(clients);
  expectConvergence(room, clients);
  expectRuleAgreement(room, clients);
  expectNoUnexpectedRefusals(clients);
  expectPresentationIntegrity(clients);
}
