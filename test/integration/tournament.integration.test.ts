import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameEventType, GamePhase, TOURNAMENT_GAME_ERROR_CODES } from '@shared/domain';
import type { TournamentMatch } from '@shared/domain/tournament';
import {
  CreateTournamentUseCase,
  IssueMatchTicketUseCase,
  RecordMatchProgressUseCase,
  RecordMatchResultUseCase,
  RegisterForTournamentUseCase,
  StartTournamentUseCase,
  TournamentEffects,
  TournamentStore,
  type MatchTicketView,
  type RecordMatchResultOutput,
} from '@shared/application/use-cases/tournament';
import {
  FakeProgressRefresher,
  FakeTournamentInbox,
  FakeTournamentPlayers,
  FakeTournamentThrottle,
  MemoryTournamentRepository,
  SequentialTournamentIds,
} from '@shared/application/use-cases/tournament/tournament-test-fakes';
import { signMatchTicket, tournamentTicketStorageKey, verifyMatchTicket, type MatchTicketClaims } from '@shared/tournament';
import { handleMatchResultRequest, type MatchResultHandlerDeps } from '@/app/api/tournaments/match-results/match-result-handler';
import { HmacTournamentTicketSigner } from '@/infrastructure/tournament/hmac-tournament-ticket-signer';
import { saveMatchTicket } from '@/lib/tournament/match-ticket-storage';
import { RECONNECT_POLICY } from '@/presentation/config/connection.config';
import { MemoryOutboxStorage } from '../../party/test-support/memory-outbox-storage';
import { HARNESS_START_TIME } from '../../party/test-support/room-harness';
import { ruleset } from '../../party/test-support/table-driver';
import { createTournamentMatchServices } from '../../party/tournament';
import { RecordingAlarm } from '../../party/tournament/tournament-test-support';
import { FullStackTable } from './support/full-stack-table';
import type { PlayerClient } from './support/player-client';
import { view } from './support/screen-model';

/**
 * A tournament match end to end, as its players' clients see it: the app issues signed tickets
 * (HmacTournamentTicketSigner), the browser keeps them for the table's room and sends them with
 * JOIN_GAME, the worker (createTournamentMatchServices) verifies them with the shared secret and
 * posts the signed result to the app's endpoint (handleMatchResultRequest) over a running
 * tournament. The room side of match mode is owned by the level-3 suites in party/tournament.
 */
const SEED = 47;
const SECRET = 'integration-tournament-secret';
/** A key the worker does not hold: what a forged ticket is signed with. */
const FORGER_SECRET = 'not-the-tournament-secret';
const RESULT_URL = 'https://wizard-party.test/api/tournaments/match-results';
const HOST = 'host';
const MEMBERS = [
  { userId: 'u01', displayName: 'Merlin' },
  { userId: 'u02', displayName: 'Morgana' },
  { userId: 'u03', displayName: 'Nimue' },
] as const;
/** Ticket checks and result posts run on real crypto: the table waits for them in steps of fake time. */
const WAIT_STEP_MS = 100;
const WAIT_LIMIT_MS = 30_000;

type ResultEndpoint = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** The app side of one running tournament: three members seated at one table. */
interface TournamentApp {
  tournamentId: string;
  /** The table the members were seated at when the tournament started. */
  match: TournamentMatch;
  /** The match as the app stores it now. */
  storedMatch(): TournamentMatch | undefined;
  issueTicket(userId: string): Promise<MatchTicketView>;
  /** The endpoint's answer to every result it was posted. */
  outcomes: RecordMatchResultOutput['outcome'][];
  /** The match-results route as the worker's fetch reaches it. */
  resultEndpoint: ResultEndpoint;
}

interface Arrival {
  client: PlayerClient;
  claims: MatchTicketClaims;
}

/** The app runs on the table's clock, so tickets, deadlines and results share one fake time. */
function useTableClock(): void {
  vi.useFakeTimers();
  vi.setSystemTime(HARNESS_START_TIME);
}

async function startTournament(): Promise<TournamentApp> {
  const clock = { now: () => Date.now() };
  const repo = new MemoryTournamentRepository();
  const store = new TournamentStore(repo, new TournamentEffects(new FakeTournamentInbox(), new FakeProgressRefresher()), clock);
  const players = new FakeTournamentPlayers();
  const throttle = new FakeTournamentThrottle();
  players.add(HOST);
  for (const { userId, displayName } of MEMBERS) players.add(userId, { displayName });

  const settings = { rounds: 1, rulesetConfig: ruleset({ rounds: 1 }) };
  const created = await new CreateTournamentUseCase(repo, store, players, throttle, new SequentialTournamentIds(), clock)
    .execute(HOST, { name: 'Integration Cup', joinAsEntrant: false, settings });
  const tournamentId = created.tournament.id;
  const register = new RegisterForTournamentUseCase(store, players, throttle);
  for (const { userId } of MEMBERS) await register.execute(userId, tournamentId);
  await new StartTournamentUseCase(store).execute(HOST, tournamentId);
  const storedMatch = () => repo.rows.get(tournamentId)?.matches[0];
  const match = storedMatch();
  if (!match) throw new Error('the started tournament seated no table');

  const tickets = new IssueMatchTicketUseCase(store, new HmacTournamentTicketSigner(() => SECRET), throttle);
  const record = new RecordMatchResultUseCase(store);
  const outcomes: RecordMatchResultOutput['outcome'][] = [];
  const endpoint: MatchResultHandlerDeps = {
    secret: () => SECRET,
    record: {
      execute: async (body) => {
        const answer = await record.execute(body);
        outcomes.push(answer.outcome);
        return answer;
      },
    },
    progress: new RecordMatchProgressUseCase(store),
    log: () => undefined,
    now: () => Date.now(),
  };
  return {
    tournamentId,
    match,
    storedMatch,
    issueTicket: (userId) => tickets.execute(userId, tournamentId),
    outcomes,
    resultEndpoint: (input: RequestInfo | URL, init?: RequestInit) => handleMatchResultRequest(new Request(input, init), endpoint),
  };
}

async function claimsOf(ticket: string, roomCode: string): Promise<MatchTicketClaims> {
  const verified = await verifyMatchTicket({ secret: SECRET, ticket, now: Date.now(), roomCode });
  if (!verified.ok) throw new Error(`the app issued a ticket its own secret does not verify (${verified.reason})`);
  return verified.claims;
}

describe('tournament match', () => {
  let table: FullStackTable | null = null;

  afterEach(() => {
    table?.dispose();
    table = null;
    vi.useRealTimers();
  });

  /** The worker of the match's room: tickets verified with the secret, results posted to the app. */
  async function matchTable(app: TournamentApp): Promise<FullStackTable> {
    const { services } = createTournamentMatchServices({
      secret: SECRET,
      resultUrl: RESULT_URL,
      storage: new MemoryOutboxStorage(),
      matchAlarm: new RecordingAlarm(),
      resultsAlarm: new RecordingAlarm(),
      fetch: app.resultEndpoint,
    });
    const created = await FullStackTable.create({
      seed: SEED,
      roomId: app.match.roomCode,
      tournament: { tickets: services.tickets, results: services.results },
    });
    table = created;
    return created;
  }

  /** Lets fake time pass until `done`; the real crypto of ticket checks and result posts completes meanwhile. */
  async function until(created: FullStackTable, done: () => boolean, what: string): Promise<void> {
    for (let waited = 0; !done(); waited += WAIT_STEP_MS) {
      if (waited >= WAIT_LIMIT_MS) throw new Error(`${what}: not within ${WAIT_LIMIT_MS} ms`);
      await created.advance(WAIT_STEP_MS);
    }
    await created.settle();
  }

  /** The tournament page stored the member's ticket in their browser; they open the table under a name they typed. */
  async function arrive(created: FullStackTable, app: TournamentApp, userId: string): Promise<Arrival> {
    const issued = await app.issueTicket(userId);
    const profile = created.browser(userId);
    saveMatchTicket(issued.roomCode, { ticket: issued.ticket, tournamentId: app.tournamentId, expiresAt: issued.expiresAt }, profile.tickets);
    const client = created.open(profile, `typed by ${userId}`);
    await client.join();
    return { client, claims: await claimsOf(issued.ticket, issued.roomCode) };
  }

  it('seats a ticket holder in the match room under the ticket name, starts with the roster, and shows the attested result', async () => {
    useTableClock();
    const app = await startTournament();
    expect(app.match.seats.map((seat) => seat.userId).sort(), 'one table of the three members, no bots').toEqual(MEMBERS.map(({ userId }) => userId));
    const created = await matchTable(app);
    const members: Arrival[] = [];
    for (const { userId } of MEMBERS) members.push(await arrive(created, app, userId));
    await until(created, () => members.every(({ client }) => client.seatId !== null), 'every ticket holder holds a seat');

    for (const { client, claims } of members) {
      expect(created.server.game.getPlayer(client.seatId ?? '')?.name, `${client.name}'s seat`).toBe(claims.name);
      expect(view(client).feeds.tournamentMatch?.roster.every((seat) => seat.joined), `${client.name}'s waiting roster`).toBe(true);
    }

    await created.playUntil(() => created.server.game.phase !== GamePhase.LOBBY);
    const roster = [...members[0].claims.match.roster].sort((a, b) => a.seat - b.seat).map((entry) => entry.name);
    expect(created.server.game.players.map((player) => player.name)).toEqual(roster);

    await created.playUntil(() => created.server.game.phase === GamePhase.GAME_END);
    const attested = () => members.every(({ client }) => (view(client).feeds.tournamentMatch?.reportOutcome ?? null) !== null);
    await until(created, attested, 'every member sees the attested result');

    expect(app.outcomes, 'the app recorded the result once').toEqual(['recorded']);
    const stored = app.storedMatch();
    expect(stored?.status).toBe('completed');
    const finalScores = new Map(created.server.game.players.map((player) => [player.name, player.score]));
    for (const { client, claims } of members) {
      const result = stored?.result?.players.find((player) => player.userId === claims.uid);
      expect(result?.score, `${claims.name}'s recorded score`).toBe(finalScores.get(claims.name));
      expect(view(client).feeds.tournamentMatch, `${client.name}'s match banner`).toMatchObject({ matchId: app.match.id, reported: true, reportOutcome: 'recorded' });
    }
  });

  it('shows a refused ticket as a lasting refusal and stops reconnecting', async () => {
    useTableClock();
    const app = await startTournament();
    const created = await matchTable(app);
    const [{ userId }] = MEMBERS;
    const genuine = await app.issueTicket(userId);
    const forged = await signMatchTicket(FORGER_SECRET, await claimsOf(genuine.ticket, genuine.roomCode));
    const profile = created.browser(userId);
    saveMatchTicket(genuine.roomCode, { ticket: forged, tournamentId: app.tournamentId, expiresAt: genuine.expiresAt }, profile.tickets);
    const client = created.open(profile, 'Merlin');
    client.expectRefusal(TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID);

    await client.join();
    await until(created, () => view(client).feeds.tournamentRejection !== null, 'the refusal reaches the lobby');

    const refusals = client.connections.flatMap((connection) => connection.ofType(GameEventType.ERROR));
    expect(refusals.map((frame) => frame.code)).toEqual([TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID]);
    expect(view(client).feeds.tournamentRejection).toEqual({
      code: TOURNAMENT_GAME_ERROR_CODES.TICKET_INVALID,
      message: refusals[0].message,
      roomId: created.roomId,
      tournamentId: app.tournamentId,
    });
    expect(client.state.status).toBe('rejected');
    expect(created.server.game.players).toEqual([]);
    expect(profile.tickets.getItem(tournamentTicketStorageKey(created.roomId)), 'the refused ticket is dropped').toBeNull();

    const sockets = client.connections.length;
    await created.advance(RECONNECT_POLICY.MAX_DELAY_MS * 2);
    await created.settle();
    expect(client.connections).toHaveLength(sockets);
    expect(client.state.status).toBe('rejected');
  });
});
