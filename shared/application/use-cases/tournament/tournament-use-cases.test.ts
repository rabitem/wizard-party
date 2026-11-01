import { describe, expect, it } from 'vitest';

import { SocialError } from '../friends/social-error';
import { TOURNAMENT_LIMITS, TOURNAMENT_TIMING, isTournamentError, type Tournament, type TournamentErrorCode } from '../../../domain/tournament';
import { verifyMatchTicket, type MatchProgressReport, type MatchResultReport } from '../../../tournament';
import type { InboxItem } from '../../../domain/social';
import { DEFAULT_APPEARANCE, type CharacterAppearance } from '../../../domain/character';
import {
  CancelTournamentUseCase,
  CreateTournamentUseCase,
  ExportTournamentDataUseCase,
  FORMER_HOST_NAME,
  GetTournamentUseCase,
  GetTrophyCabinetUseCase,
  InviteToTournamentUseCase,
  IssueMatchTicketUseCase,
  ListMyTournamentsUseCase,
  ListTournamentsUseCase,
  PurgeTournamentDataUseCase,
  RecordMatchProgressUseCase,
  RecordMatchResultUseCase,
  RegisterForTournamentUseCase,
  ResolveStaleMatchUseCase,
  StartTournamentUseCase,
  TournamentEffects,
  TournamentStore,
  UpdateTournamentUseCase,
  WithdrawFromTournamentUseCase,
  tournamentInboxHandlers,
} from './index';
import {
  FakeProgressRefresher,
  FakeTournamentInbox,
  FakeTournamentPlayers,
  FakeTournamentThrottle,
  HmacTicketSigner,
  MemoryTournamentRepository,
  SequentialTournamentIds,
} from './tournament-test-fakes';

const SECRET = 'tournament-secret';
const T0 = 1_800_000_000_000;
const HOST = 'host';
const user = (index: number) => `u${String(index).padStart(2, '0')}`;

function setup() {
  const repo = new MemoryTournamentRepository();
  const inbox = new FakeTournamentInbox();
  const progress = new FakeProgressRefresher();
  const throttle = new FakeTournamentThrottle();
  const players = new FakeTournamentPlayers();
  const ids = new SequentialTournamentIds();
  const effectErrors: string[] = [];
  const time = { now: T0 };
  const clock = { now: () => time.now };
  const store = new TournamentStore(repo, new TournamentEffects(inbox, progress, (name) => effectErrors.push(name)), clock);
  players.add(HOST, { level: 30 });
  for (let i = 1; i <= 16; i++) players.add(user(i), { level: 20 - i });

  const register = new RegisterForTournamentUseCase(store, players, throttle);
  return {
    repo,
    inbox,
    progress,
    throttle,
    players,
    ids,
    effectErrors,
    time,
    store,
    create: new CreateTournamentUseCase(repo, store, players, throttle, ids, clock),
    update: new UpdateTournamentUseCase(store, ids),
    start: new StartTournamentUseCase(store),
    cancel: new CancelTournamentUseCase(store),
    resolve: new ResolveStaleMatchUseCase(store),
    register,
    withdraw: new WithdrawFromTournamentUseCase(store),
    invite: new InviteToTournamentUseCase(store, players, players, inbox, throttle),
    get: new GetTournamentUseCase(store, players),
    list: new ListTournamentsUseCase(repo, store, clock),
    mine: new ListMyTournamentsUseCase(repo, repo),
    trophies: new GetTrophyCabinetUseCase(repo),
    ticket: new IssueMatchTicketUseCase(store, new HmacTicketSigner(SECRET), throttle),
    record: new RecordMatchResultUseCase(store),
    recordProgress: new RecordMatchProgressUseCase(store),
    exportData: new ExportTournamentDataUseCase(repo, repo),
    purge: new PurgeTournamentDataUseCase(repo, store),
    handlers: tournamentInboxHandlers(register),
  };
}

type Harness = ReturnType<typeof setup>;

async function expectCode(promise: Promise<unknown>, code: TournamentErrorCode): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(isTournamentError(error, code), String(error)).toBe(true);
    return;
  }
  throw new Error(`expected TournamentError ${code}`);
}

/** Creates a tournament (host plays unless told otherwise) and registers u01..uN. */
async function seeded(h: Harness, entrants: number, body: Record<string, unknown> = {}): Promise<string> {
  const { tournament } = await h.create.execute(HOST, { name: 'Spring Cup', joinAsEntrant: false, ...body });
  for (let i = 1; i <= entrants; i++) await h.register.execute(user(i), tournament.id, { inviteCode: 'abcdefgh' });
  return tournament.id;
}

function stored(h: Harness, id: string): Tournament {
  return h.repo.rows.get(id)!;
}

/** The worker's report for a pending match: humans ranked by user id (lowest wins). */
function wireReport(tournament: Tournament, matchId: string, order?: string[]): MatchResultReport {
  const match = tournament.matches.find((candidate) => candidate.id === matchId)!;
  const humans = order ?? match.seats.map((seat) => seat.userId).filter((id): id is string => id !== null).sort();
  return {
    v: 1,
    tid: tournament.id,
    mid: match.id,
    room: match.roomCode,
    gameId: `game-${match.id}`,
    completedAt: T0,
    standings: humans.map((uid, index) => ({ uid, placement: index + 1, score: 100 - index * 10, rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }], noShow: false, botTakeover: false })),
  };
}

/** The worker's progress ping for a pending match. */
function wireProgress(tournament: Tournament, matchId: string, fields: Pick<MatchProgressReport, 'round' | 'maxRounds' | 'at'>): MatchProgressReport {
  const match = tournament.matches.find((candidate) => candidate.id === matchId)!;
  return { v: 1, kind: 'progress', tid: tournament.id, mid: match.id, room: match.roomCode, gameId: `game-${match.id}`, ...fields };
}

async function playAllPending(h: Harness, id: string): Promise<void> {
  const tournament = stored(h, id);
  for (const match of tournament.matches.filter((candidate) => candidate.status === 'pending')) {
    await h.record.execute(JSON.parse(JSON.stringify(wireReport(stored(h, id), match.id))));
  }
}

describe('CreateTournamentUseCase', () => {
  it('creates a tournament with the host registered by default', async () => {
    const h = setup();
    const view = await h.create.execute(HOST, { name: '  Spring   Cup ', settings: { rounds: 2 } });
    expect(view.tournament).toMatchObject({ name: 'Spring Cup', status: 'registration', entrantCount: 1, rounds: 2, formatName: 'Swiss Series' });
    expect(view.viewer).toMatchObject({ isHost: true, isEntrant: true, canEdit: true, canStart: false, canInvite: true });
    expect(stored(h, view.tournament.id).version).toBe(1);
    const spectator = await h.create.execute(user(1), { name: 'Watch Party', joinAsEntrant: false });
    expect(spectator.tournament.entrantCount).toBe(0);
  });

  it('requires an existing account, valid input and a free hosting slot', async () => {
    const h = setup();
    await expectCode(h.create.execute('missing', { name: 'Cup' }), 'not_found');
    await expectCode(h.create.execute(HOST, { name: 'x' }), 'invalid_input');
    for (let i = 0; i < TOURNAMENT_LIMITS.MAX_ACTIVE_HOSTED; i++) await h.create.execute(HOST, { name: `Cup ${i}` });
    await expectCode(h.create.execute(HOST, { name: 'One too many' }), 'invalid_state');
  });

  it('frees hosting slots of tournaments that expired while nobody looked at them', async () => {
    const h = setup();
    for (let i = 0; i < TOURNAMENT_LIMITS.MAX_ACTIVE_HOSTED; i++) await h.create.execute(HOST, { name: `Cup ${i}` });
    // Unscheduled registrations close after the maximum age; their stored rows still say open.
    h.time.now = T0 + TOURNAMENT_TIMING.REGISTRATION_MAX_AGE_MS;
    expect(await h.repo.countActiveHosted(HOST)).toBe(TOURNAMENT_LIMITS.MAX_ACTIVE_HOSTED);

    const created = await h.create.execute(HOST, { name: 'Fresh Cup' });
    expect(created.tournament.status).toBe('registration');
    expect(await h.repo.countActiveHosted(HOST)).toBe(1);
  });

  it('is rate limited and retries on an id collision', async () => {
    const h = setup();
    const first = await h.create.execute(HOST, { name: 'First' });
    h.ids.queue.push(first.tournament.id);
    const second = await h.create.execute(user(1), { name: 'Second' });
    expect(second.tournament.id).not.toBe(first.tournament.id);
    h.throttle.denied.add('create');
    await expectCode(h.create.execute(user(2), { name: 'Third' }), 'rate_limited');
  });
});

describe('registration', () => {
  it('registers, withdraws and edits during registration', async () => {
    const h = setup();
    const id = await seeded(h, 2);
    const view = await h.register.execute(user(3), id);
    expect(view.viewer).toMatchObject({ isEntrant: true, canWithdraw: true, registrationBlocker: 'registered' });
    expect(view.entrants.map((e) => e.userId)).toEqual([user(1), user(2), user(3)]);
    await expectCode(h.register.execute(user(3), id), 'already_registered');
    await expectCode(h.register.execute('missing', id), 'not_found');
    const after = await h.withdraw.execute(user(3), id);
    expect(after.entrants).toHaveLength(2);
    await expectCode(h.withdraw.execute(user(3), id), 'not_registered');
    const edited = await h.update.execute(HOST, id, { name: 'Summer Cup', settings: { maxEntrants: 8 } });
    expect(edited.tournament).toMatchObject({ name: 'Summer Cup', maxEntrants: 8 });
    await expectCode(h.update.execute(user(1), id, { name: 'Hijack' }), 'forbidden');
  });

  it('keeps private tournaments private', async () => {
    const h = setup();
    const id = await seeded(h, 0, { visibility: 'private' });
    await expectCode(h.get.execute(null, id), 'not_found');
    await expectCode(h.get.execute(user(1), id, 'wrongcod'), 'not_found');
    const withCode = await h.get.execute(user(1), id, 'ABCDEFGH');
    expect(withCode.tournament.inviteCode).toBeNull();
    await expectCode(h.register.execute(user(1), id, { inviteCode: 'wrongcod' }), 'forbidden');
    const entrant = await h.register.execute(user(1), id, { inviteCode: 'abcdefgh' });
    expect(entrant.tournament.inviteCode).toBe('abcdefgh');
    expect((await h.get.execute(user(1), id)).viewer.isEntrant).toBe(true);
    expect((await h.list.execute({ status: 'open' })).items).toEqual([]);
  });

  it('throttles registrations', async () => {
    const h = setup();
    const id = await seeded(h, 0);
    h.throttle.denied.add('register');
    await expectCode(h.register.execute(user(1), id), 'rate_limited');
  });

  it('rejects malformed ids like unknown ones', async () => {
    const h = setup();
    await expectCode(h.get.execute(null, '../etc'), 'not_found');
    await expectCode(h.get.execute(null, 'abcdefghjk23'), 'not_found');
  });
});

describe('a full series', () => {
  it('starts, issues tickets, records results and completes with awards', async () => {
    const h = setup();
    const id = await seeded(h, 7, { settings: { rounds: 2, maxTableSize: 4 } });
    await expectCode(h.start.execute(user(1), id), 'forbidden');
    await expectCode(h.ticket.execute(user(1), id), 'invalid_state');

    const started = await h.start.execute(HOST, id);
    expect(started.tournament.status).toBe('running');
    expect(started.rounds).toHaveLength(1);
    expect(started.rounds[0].matches.map((m) => m.seats.length)).toEqual([4, 3]);
    expect(h.inbox.ofKind('tournament_table_ready').map((d) => d.userId).sort()).toEqual(Array.from({ length: 7 }, (_, i) => user(i + 1)).sort());
    expect(started.viewer.myMatch).toBeNull();

    const view = await h.get.execute(user(1), id);
    expect(view.viewer.myMatch).toMatchObject({ round: 1, roomCode: expect.stringMatching(/^t-/) });

    // Tickets: valid for the room, identical descriptors for every roster member.
    const match = stored(h, id).matches[0];
    const humans = match.seats.map((s) => s.userId).filter((u): u is string => u !== null);
    const tickets = await Promise.all(humans.map((uid) => h.ticket.execute(uid, id)));
    const verified = await Promise.all(tickets.map((t) => verifyMatchTicket({ secret: SECRET, ticket: t.ticket, now: T0, roomCode: match.roomCode })));
    const descriptors = verified.map((v) => (v.ok ? JSON.stringify(v.claims.match) : 'invalid'));
    expect(new Set(descriptors).size).toBe(1);
    expect(verified.every((v) => v.ok)).toBe(true);
    expect(tickets[0].expiresAt).toBeLessThanOrEqual(match.deadlineAt);
    const [first] = verified;
    expect(first.ok ? first.claims.match.deadlineAt : null).toBe(match.deadlineAt);
    expect(tickets[0].label).toBe('Spring Cup · Round 1 · Table 1');

    await playAllPending(h, id);
    expect(stored(h, id).currentRound).toBe(2);
    await playAllPending(h, id);

    const done = await h.get.execute(null, id);
    expect(done.tournament.status).toBe('completed');
    expect(done.tournament.champion).not.toBeNull();
    expect(done.standings.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(done.awards.find((a) => a.awardId === 'champion')?.player.userId).toBe(done.standings[0].userId);

    // Everyone involved (7 entrants and the host) hears about it and gets progress refreshed.
    const finished = h.inbox.ofKind('tournament_finished');
    expect(finished).toHaveLength(8);
    expect(finished.find((d) => d.userId === HOST)?.payload.rank).toBeNull();
    expect(finished.find((d) => d.userId === done.standings[0].userId)?.payload.awards).toContain('champion');
    expect(h.progress.refreshed).toEqual([[HOST, ...Array.from({ length: 7 }, (_, i) => user(i + 1))].sort()]);

    const mine = await h.mine.execute(done.standings[0].userId);
    expect(mine.past).toHaveLength(1);
    expect(mine.trophies.map((t) => t.awardId)).toContain('champion');
    expect(mine.trophies[0]).toMatchObject({ name: expect.any(String), icon: expect.any(String) });
    expect((await h.trophies.execute(done.standings[0].userId)).length).toBe(mine.trophies.length);
    const participations = await h.repo.participations(HOST);
    expect(participations).toEqual([expect.objectContaining({ wasHost: true, wasEntrant: false })]);
  });

  it('records results idempotently and validates the body', async () => {
    const h = setup();
    const id = await seeded(h, 4, { settings: { rounds: 1 } });
    await h.start.execute(HOST, id);
    const report = wireReport(stored(h, id), stored(h, id).matches[0].id);
    await expectCode(h.record.execute({ ...report, v: 9 }), 'invalid_input');
    await expectCode(h.record.execute({ ...report, standings: report.standings.slice(1) }), 'invalid_input');
    expect(await h.record.execute(report)).toEqual({ outcome: 'recorded', tournamentStatus: 'completed' });
    expect(await h.record.execute(report)).toEqual({ outcome: 'duplicate', tournamentStatus: 'completed' });
    expect(h.inbox.ofKind('tournament_finished')).toHaveLength(5);
    expect(h.progress.refreshed).toHaveLength(1);
  });

  it('gives the standings of a finished tournament each account look, for the podium', async () => {
    const h = setup();
    const look: CharacterAppearance = { ...DEFAULT_APPEARANCE, palette: 'palette:ember' };
    h.players.add(user(1), { appearance: look });
    const id = await seeded(h, 4, { settings: { rounds: 1 } });
    await h.start.execute(HOST, id);
    // A running tournament's polled page reads no looks.
    expect((await h.get.execute(null, id)).standings.map((s) => s.appearance)).toEqual([undefined, undefined, undefined, undefined]);

    h.players.players.delete(user(2)); // a deleted account
    await h.record.execute(wireReport(stored(h, id), stored(h, id).matches[0].id));
    const looks = new Map((await h.get.execute(null, id)).standings.map((s) => [s.userId, s.appearance]));
    expect(looks.get(user(1))).toEqual(look);
    expect(looks.get(user(2))).toBeUndefined();
    expect(looks.get(user(3))).toEqual(DEFAULT_APPEARANCE);
  });

  it('ignores a result for an unknown tournament with not_found', async () => {
    const h = setup();
    const id = await seeded(h, 3, { settings: { rounds: 1 } });
    await h.start.execute(HOST, id);
    const report = wireReport(stored(h, id), stored(h, id).matches[0].id);
    h.repo.rows.delete(id);
    await expectCode(h.record.execute(report), 'not_found');
  });
});

describe('match progress', () => {
  it('shows a table in play and keeps the host from resolving it until it went quiet', async () => {
    const h = setup();
    const id = await seeded(h, 3, { settings: { rounds: 2 } });
    await h.start.execute(HOST, id);
    const match = stored(h, id).matches[0];
    const lastPing = T0 + TOURNAMENT_TIMING.MATCH_STALE_AFTER_MS - 60_000;
    h.time.now = lastPing;

    const ping = wireProgress(stored(h, id), match.id, { round: 5, maxRounds: 20, at: lastPing });
    expect(await h.recordProgress.execute(JSON.parse(JSON.stringify(ping)))).toEqual({ outcome: 'recorded' });

    h.time.now = T0 + TOURNAMENT_TIMING.MATCH_STALE_AFTER_MS;
    const view = await h.get.execute(HOST, id);
    expect(view.rounds[0].matches[0]).toMatchObject({
      live: { round: 5, maxRounds: 20, lastActivityAt: lastPing },
      resolvableAt: lastPing + TOURNAMENT_TIMING.MATCH_ACTIVITY_GRACE_MS,
    });
    expect(view.viewer.resolvableMatchIds).toEqual([]);
    await expectCode(h.resolve.execute(HOST, id, match.id), 'invalid_state');

    h.time.now = lastPing + TOURNAMENT_TIMING.MATCH_ACTIVITY_GRACE_MS;
    expect((await h.get.execute(HOST, id)).viewer.resolvableMatchIds).toEqual([match.id]);
    expect((await h.resolve.execute(HOST, id, match.id)).rounds[0].matches[0]).toMatchObject({ status: 'void', live: null });
  });

  it('saves nothing for stale pings and validates the body', async () => {
    const h = setup();
    const id = await seeded(h, 3, { settings: { rounds: 2 } });
    await h.start.execute(HOST, id);
    const match = stored(h, id).matches[0];
    await h.recordProgress.execute(wireProgress(stored(h, id), match.id, { round: 2, maxRounds: 20, at: T0 + 5000 }));
    const version = stored(h, id).version;

    const stale = wireProgress(stored(h, id), match.id, { round: 1, maxRounds: 20, at: T0 + 4000 });
    expect(await h.recordProgress.execute(stale)).toEqual({ outcome: 'ignored' });
    expect(stored(h, id).version).toBe(version);

    await expectCode(h.recordProgress.execute({ ...stale, kind: undefined }), 'invalid_input');
    await expectCode(h.recordProgress.execute({ ...stale, round: 21 }), 'invalid_input');
    await expectCode(h.recordProgress.execute(wireReport(stored(h, id), match.id)), 'invalid_input');
    await expectCode(h.recordProgress.execute({ ...stale, tid: 'zzzzzzzzzz22', mid: 'zzzzzzzzzz22-1-1', room: 't-otherroom2345' }), 'invalid_input');
  });
});

describe('concurrency', () => {
  it('records simultaneous results of two tables without losing either', async () => {
    const h = setup();
    const id = await seeded(h, 8, { settings: { rounds: 2, maxTableSize: 4 } });
    await h.start.execute(HOST, id);
    const [a, b] = stored(h, id).matches;
    const reports = [wireReport(stored(h, id), a.id), wireReport(stored(h, id), b.id)];
    const results = await Promise.all(reports.map((report) => h.record.execute(report)));
    expect(results.map((r) => r.outcome)).toEqual(['recorded', 'recorded']);
    expect(h.repo.conflicts).toBeGreaterThan(0);
    const tournament = stored(h, id);
    expect(tournament.matches.filter((m) => m.round === 1).every((m) => m.status === 'completed')).toBe(true);
    // Round 2 was seated exactly once.
    expect(tournament.matches.filter((m) => m.round === 2)).toHaveLength(2);
    expect(h.inbox.ofKind('tournament_table_ready').filter((d) => d.payload.round === 2)).toHaveLength(8);
  });

  it('retries after a concurrent writer and gives up after too many conflicts', async () => {
    const h = setup();
    const id = await seeded(h, 2);
    h.repo.beforeNextSave = async () => {
      // Someone else registers in between.
      await h.register.execute(user(9), id);
    };
    await h.register.execute(user(3), id);
    expect(stored(h, id).entrants.map((e) => e.userId)).toEqual([user(1), user(2), user(9), user(3)]);

    const always = h.repo;
    const realSave = always.save.bind(always);
    always.save = async () => 'conflict';
    await expectCode(h.register.execute(user(4), id), 'conflict');
    always.save = realSave;
  });
});

describe('lifecycle', () => {
  it('auto-starts a scheduled tournament on read', async () => {
    const h = setup();
    const id = await seeded(h, 3, { startsAt: T0 + 3_600_000 });
    h.time.now = T0 + 3_600_000;
    const view = await h.get.execute(null, id);
    expect(view.tournament.status).toBe('running');
    expect(h.inbox.ofKind('tournament_table_ready')).toHaveLength(3);
  });

  it('moves nothing while tournaments are unavailable', async () => {
    const h = setup();
    const id = await seeded(h, 3, { startsAt: T0 + 3_600_000 });
    h.time.now = T0 + 3_600_000;
    const frozen = new TournamentStore(h.repo, new TournamentEffects(h.inbox, h.progress), { now: () => h.time.now }, () => false);

    // Due, but nothing starts that the game worker could not play.
    expect((await frozen.read(id)).tournament.status).toBe('registration');
    expect(stored(h, id).status).toBe('registration');
    await expectCode(frozen.mutate(id, (tournament) => tournament), 'unavailable');
    expect(h.inbox.ofKind('tournament_table_ready')).toHaveLength(0);
  });

  it('lets the host resolve a stale match and cancel', async () => {
    const h = setup();
    const id = await seeded(h, 3, { settings: { rounds: 2 } });
    await h.start.execute(HOST, id);
    const match = stored(h, id).matches[0];
    await expectCode(h.resolve.execute(HOST, id, match.id), 'invalid_state');
    h.time.now = T0 + TOURNAMENT_TIMING.MATCH_STALE_AFTER_MS;
    expect((await h.get.execute(HOST, id)).viewer.resolvableMatchIds).toEqual([match.id]);
    const resolved = await h.resolve.execute(HOST, id, match.id);
    expect(resolved.rounds[0].matches[0].status).toBe('void');
    expect(resolved.tournament.currentRound).toBe(2);
    const cancelled = await h.cancel.execute(HOST, id);
    expect(cancelled.tournament.status).toBe('cancelled');
    await expectCode(h.cancel.execute(HOST, id), 'invalid_state');
  });

  it('reports failing side effects without failing the use case', async () => {
    const h = setup();
    const id = await seeded(h, 3);
    h.inbox.failWith = new Error('inbox down');
    const view = await h.start.execute(HOST, id);
    expect(view.tournament.status).toBe('running');
    expect(h.effectErrors).toEqual(['tournament_table_ready', 'tournament_table_ready', 'tournament_table_ready']);
  });
});

describe('lists', () => {
  it('pages public tournaments by status with a keyset cursor', async () => {
    const h = setup();
    for (let i = 1; i <= 3; i++) {
      h.time.now = T0 + i;
      await h.create.execute(user(i), { name: `Cup ${i}` });
    }
    const first = await h.list.execute({ status: 'open', limit: 2 });
    expect(first.items.map((item) => item.name)).toEqual(['Cup 3', 'Cup 2']);
    const second = await h.list.execute({ status: 'open', limit: 2, cursor: first.nextCursor });
    expect(second.items.map((item) => item.name)).toEqual(['Cup 1']);
    expect(second.nextCursor).toBeNull();
    expect((await h.list.execute({ status: 'live' })).items).toEqual([]);
    await expectCode(h.list.execute({ status: 'all' }), 'invalid_input');
    await expectCode(h.list.execute({ cursor: 'garbage' }), 'invalid_input');
    // Beyond what a Date can hold: refused, never a RangeError in the repository.
    await expectCode(h.list.execute({ cursor: '9000000000000000.abcdefghjk12' }), 'invalid_input');
    await expectCode(h.list.execute({ limit: '0' }), 'invalid_input');
  });

  it('never lists a tournament as open once its scheduled start has passed', async () => {
    const h = setup();
    const id = await seeded(h, 3, { startsAt: T0 + 3_600_000 });
    h.time.now = T0 + 3_600_000;

    expect((await h.list.execute({ status: 'open' })).items).toEqual([]);
    expect(stored(h, id).status).toBe('running');
    expect((await h.list.execute({ status: 'live' })).items.map((item) => item.id)).toEqual([id]);
    expect(h.inbox.ofKind('tournament_table_ready')).toHaveLength(3);
  });

  it('drops an expired registration from the open list', async () => {
    const h = setup();
    const id = await seeded(h, 1);
    h.time.now = T0 + TOURNAMENT_TIMING.REGISTRATION_MAX_AGE_MS;

    expect((await h.list.execute({ status: 'open' })).items).toEqual([]);
    expect(stored(h, id).status).toBe('cancelled');
  });

  it('keeps a due tournament open while it waits for more players', async () => {
    const h = setup();
    const id = await seeded(h, 1, { startsAt: T0 + 3_600_000 });
    h.time.now = T0 + 3_600_000;

    expect((await h.list.execute({ status: 'open' })).items.map((item) => item.id)).toEqual([id]);
  });

  it('lists recent champions', async () => {
    const h = setup();
    const id = await seeded(h, 3, { settings: { rounds: 1 } });
    await h.start.execute(HOST, id);
    await playAllPending(h, id);
    const champions = await h.list.champions();
    expect(champions).toEqual([expect.objectContaining({ tournamentId: id, champion: expect.objectContaining({ userId: user(1) }) })]);
    expect((await h.list.execute({ status: 'finished' })).items[0].champion?.userId).toBe(user(1));
  });

  it('groups my tournaments', async () => {
    const h = setup();
    const open = await seeded(h, 3);
    const live = await seeded(h, 3);
    await h.start.execute(HOST, live);
    const mine = await h.mine.execute(HOST);
    expect(mine.upcoming.map((t) => t.id)).toEqual([open]);
    expect(mine.live.map((t) => t.id)).toEqual([live]);
    expect(mine.upcoming[0]).toMatchObject({ isHost: true, entry: null });
    const entrant = await h.mine.execute(user(1));
    expect(entrant.upcoming[0].entry).toMatchObject({ status: 'registered', seed: 1 });
  });
});

describe('InviteToTournamentUseCase', () => {
  it('invites eligible players and reports the rest as skipped', async () => {
    const h = setup();
    const id = await seeded(h, 1, { visibility: 'private' });
    h.players.settings.set(user(3), { ...(await h.players.getSettings(user(3))), invitePolicy: 'friends' });
    h.players.blocks.add(`${user(4)}->${HOST}`);
    h.players.settings.set(user(5), { ...(await h.players.getSettings(user(5))), invitePolicy: 'friends' });
    h.players.friends.add(`${HOST}:${user(5)}`);
    const result = await h.invite.execute(HOST, id, { userIds: [user(1), user(2), user(3), user(4), user(5), HOST, 'nobody', user(2)] });
    expect(result.invited).toEqual([user(2), user(5)]);
    expect(result.skipped).toEqual([
      { userId: user(1), reason: 'already_registered' },
      { userId: user(3), reason: 'not_allowed' },
      { userId: user(4), reason: 'not_allowed' },
      { userId: HOST, reason: 'self' },
      { userId: 'nobody', reason: 'not_found' },
    ]);
    const [delivery] = h.inbox.ofKind('tournament_invite');
    expect(delivery).toMatchObject({ userId: user(2), actorId: HOST, payload: { tournamentId: id, name: 'Spring Cup', inviteCode: 'abcdefgh' } });
  });

  it('is host only, registration only and throttled', async () => {
    const h = setup();
    const id = await seeded(h, 3);
    await expectCode(h.invite.execute(user(1), id, { userIds: [user(9)] }), 'forbidden');
    await expectCode(h.invite.execute(HOST, id, { userIds: [] }), 'invalid_input');
    h.throttle.denied.add('invite_pair');
    expect((await h.invite.execute(HOST, id, { userIds: [user(9)] })).skipped).toEqual([{ userId: user(9), reason: 'recently_invited' }]);
    await h.start.execute(HOST, id);
    await expectCode(h.invite.execute(HOST, id, { userIds: [user(9)] }), 'invalid_state');
  });
});

describe('inbox handlers', () => {
  const inviteItem = (tournamentId: string, inviteCode: string | null): InboxItem => ({
    id: '00000000-0000-4000-8000-000000000000',
    kind: 'tournament_invite',
    actor: null,
    payload: { tournamentId, name: 'Spring Cup', inviteCode },
    createdAt: T0,
    readAt: null,
    expiresAt: null,
    resolvedAt: null,
    resolution: null,
  });

  it('registers on accept (with the invite code) and is idempotent', async () => {
    const h = setup();
    const id = await seeded(h, 0, { visibility: 'private' });
    const accept = h.handlers.tournament_invite!;
    expect(await accept(user(1), inviteItem(id, 'abcdefgh'), 'accept')).toEqual({ navigateTo: `/tournaments/${id}` });
    expect(stored(h, id).entrants.map((e) => e.userId)).toEqual([user(1)]);
    expect(await accept(user(1), inviteItem(id, 'abcdefgh'), 'accept')).toEqual({ navigateTo: `/tournaments/${id}` });
    expect(await accept(user(2), inviteItem(id, 'abcdefgh'), 'decline')).toEqual({});
    await expect(accept(user(2), inviteItem('zzzzzzzzzz22', null), 'accept')).rejects.toBeInstanceOf(SocialError);
    await expect(accept(user(2), inviteItem(id, null), 'accept')).rejects.toMatchObject({ code: 'conflict' });
  });

  it('opens the table on "join"', async () => {
    const h = setup();
    const item: InboxItem = {
      ...inviteItem('abcdefghjk23', null),
      kind: 'tournament_table_ready',
      payload: { tournamentId: 'abcdefghjk23', name: 'Cup', matchId: 'abcdefghjk23-1-1', round: 1, roundLabel: 'Round 1' },
    };
    expect(await h.handlers.tournament_table_ready!(user(1), item, 'accept')).toEqual({ navigateTo: '/tournaments/abcdefghjk23?join=1' });
  });
});

describe('account data', () => {
  it('exports tournament data and cancels open hosted tournaments on purge', async () => {
    const h = setup();
    const open = await seeded(h, 2);
    const running = await seeded(h, 3);
    await h.start.execute(HOST, running);
    const exported = await h.exportData.execute(HOST);
    expect(exported.tournaments.map((row) => row.summary.id).sort()).toEqual([open, running].sort());
    expect(await h.purge.execute(HOST)).toEqual({ cancelled: 1 });
    expect(stored(h, open).status).toBe('cancelled');
    expect(stored(h, running).status).toBe('running');
    // The deleted host's handle and name are gone from every tournament they hosted.
    for (const id of [open, running]) expect(stored(h, id).host).toMatchObject({ username: null, displayName: FORMER_HOST_NAME });
  });

  it("exports the player's entries and every stored per-table result", async () => {
    const h = setup();
    const id = await seeded(h, 3);
    await h.start.execute(HOST, id);
    const [match] = stored(h, id).matches;
    await h.record.execute(JSON.parse(JSON.stringify(wireReport(stored(h, id), match.id))));

    const exported = await h.exportData.execute(user(1));
    expect(exported.entries.map((entry) => entry.tournamentId)).toEqual([id]);
    expect(exported.matchResults).toHaveLength(1);
    expect(exported.matchResults[0]).toMatchObject({ tournamentId: id, matchId: match.id, matchStatus: 'completed' });
    expect(exported.matchResults[0].rounds.length).toBeGreaterThan(0);
  });
});
