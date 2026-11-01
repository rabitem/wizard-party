/**
 * Character looks on the real room: a verified ticket puts the look on the seat it names, every
 * player sees it in GAME_STATE, and it survives a rejoin without a ticket and a restart.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientCommandType, GameEventType, type IGameState } from '../../shared/domain';
import { DEFAULT_APPEARANCE, type CharacterAppearance } from '../../shared/domain/character';
import type { CharacterTicketClaims } from '../../shared/realtime/character-ticket';
import type { CharacterTicketVerifier } from '../session/character-tickets';
import { settle } from '../tournament/tournament-test-support';
import { HARNESS_START_TIME, RoomHarness, persistentIdOf, type TestConnection } from '../test-support/room-harness';

const FOREST: CharacterAppearance = { ...DEFAULT_APPEARANCE, palette: 'palette:forest' };

/** Tickets are opaque strings here; the codec has its own tests. */
function fakeTickets(issued: Record<string, Omit<CharacterTicketClaims, 'v' | 'exp'>>): CharacterTicketVerifier {
  return {
    verify: async (ticket) => {
      const claims = issued[ticket];
      return claims ? { v: 1, exp: HARNESS_START_TIME + 60_000, ...claims } : null;
    },
  };
}

const TICKETS = fakeTickets({ 'ticket-merlin': { name: 'Merlin', appearance: FOREST } });

function lookOf(connection: TestConnection, name: string): CharacterAppearance | undefined {
  const message = connection.ofType(GameEventType.GAME_STATE).at(-1) as { state: IGameState } | undefined;
  return message?.state.players.find((player) => player.name === name)?.appearance;
}

async function joinWithTicket(h: RoomHarness, name: string, suffix: string, ticket: string, connection = h.connect()): Promise<TestConnection> {
  h.send(connection, { type: ClientCommandType.JOIN_GAME, playerName: name, persistentId: persistentIdOf(suffix), protocolVersion: 2, appearanceTicket: ticket });
  await settle();
  return connection;
}

describe('GameRoom: character looks', () => {
  let harness: RoomHarness | null = null;

  async function room(characterTickets: CharacterTicketVerifier | null = TICKETS): Promise<RoomHarness> {
    harness = await RoomHarness.create({ options: { characterTickets } });
    return harness;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(HARNESS_START_TIME);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    harness?.dispose();
    harness = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should show a verified look on the seat it names, to everyone at the table', async () => {
    const h = await room();
    const guest = h.join('Nimue', 'nimue01');
    const merlin = await joinWithTicket(h, 'Merlin', 'merlin1', 'ticket-merlin');

    expect(lookOf(merlin, 'Merlin')).toEqual(FOREST);
    expect(lookOf(guest, 'Merlin')).toEqual(FOREST);
    expect(lookOf(guest, 'Nimue')).toBeUndefined();
  });

  it('should leave a seat without a look when the ticket names someone else or is not authentic', async () => {
    const h = await room();
    const impostor = await joinWithTicket(h, 'Morgana', 'morgana', 'ticket-merlin');
    await joinWithTicket(h, 'Vivien', 'vivien1', 'forged');

    expect(lookOf(impostor, 'Morgana')).toBeUndefined();
    expect(lookOf(impostor, 'Vivien')).toBeUndefined();
  });

  it('should ignore tickets on a worker without the secret', async () => {
    const h = await room(null);
    const merlin = await joinWithTicket(h, 'Merlin', 'merlin1', 'ticket-merlin');

    expect(lookOf(merlin, 'Merlin')).toBeUndefined();
  });

  it('should keep the look through a rejoin without a ticket and a restart', async () => {
    const h = await room();
    const merlin = await joinWithTicket(h, 'Merlin', 'merlin1', 'ticket-merlin');
    const token = merlin.session()?.sessionToken;
    h.drop(merlin);
    const back = h.join('Merlin', 'merlin1', { sessionToken: token });
    expect(lookOf(back, 'Merlin')).toEqual(FOREST);

    const restarted = await h.restart();
    harness = restarted;
    expect(restarted.game.getPlayer(h.seatOf(back))?.appearance).toEqual(FOREST);
  });
});
