import { buildTournamentOutcome, computeAwards } from './awards';
import { getTournamentFormat, type PlannedTable } from './formats';
import { isMatchActive, matchResolvableAt, matchStaleAt } from './match-activity';
import { matchesOfRound, resultPoints } from './match-records';
import { seededShuffle } from './seeded-random';
import { rankRecords } from './standings';
import { TOURNAMENT_LIMITS, TOURNAMENT_TIMING } from './tournament.constants';
import { TournamentError } from './tournament-error';
import { matchIdFor, matchRoomCode, normalizeInviteCode } from './tournament-ids';
import type { TournamentDraft } from './tournament-validation';
import type {
  Entrant,
  EntrantProfile,
  MatchPlayerResult,
  MatchReport,
  RecordResultOutcome,
  Tournament,
  TournamentHost,
  TournamentMatch,
  TournamentSettings,
} from './tournament.types';

/*
 * The Tournament state machine:
 *
 *   registration --start (host, or startsAt passed)--> running --last round--> completed
 *        |                                                |
 *        +------------------cancel (host)-----------------+--> cancelled
 *
 * Every transition is a pure function returning a new Tournament or throwing a TournamentError.
 * Nothing here bumps `version`: that is the repository's optimistic concurrency token.
 */

// ---------------------------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------------------------

export function isHost(tournament: Tournament, userId: string | null): boolean {
  return userId !== null && tournament.host.userId === userId;
}

export function findEntrant(tournament: Tournament, userId: string | null): Entrant | null {
  return userId === null ? null : (tournament.entrants.find((entrant) => entrant.userId === userId) ?? null);
}

export function findMatch(tournament: Tournament, matchId: string): TournamentMatch | null {
  return tournament.matches.find((match) => match.id === matchId) ?? null;
}

/** The player's table that still has to be played (only ever in the current round). */
export function pendingMatchFor(tournament: Tournament, userId: string): TournamentMatch | null {
  if (tournament.status !== 'running') return null;
  return (
    tournament.matches.find(
      (match) => match.status === 'pending' && match.round === tournament.currentRound && match.seats.some((seat) => seat.userId === userId)
    ) ?? null
  );
}

/** Entrants needed to start: three, or two when bots may pad the table. */
export function minimumEntrants(settings: Pick<TournamentSettings, 'fillWithBots'>): number {
  return settings.fillWithBots ? TOURNAMENT_LIMITS.MIN_ENTRANTS_WITH_BOTS : TOURNAMENT_LIMITS.MIN_ENTRANTS;
}

/**
 * The host may void a stale pending table without recent activity (see matchResolvableAt), but
 * never one they play at themselves (they could void a game they are losing); such a table is
 * voided by its deadline if it really is stuck.
 */
export function canResolveMatch(tournament: Tournament, actorId: string | null, match: TournamentMatch, now: number): boolean {
  return (
    isHost(tournament, actorId) &&
    tournament.status === 'running' &&
    match.status === 'pending' &&
    now >= matchResolvableAt(match) &&
    !match.seats.some((seat) => seat.userId === actorId)
  );
}

export function isRoundComplete(tournament: Tournament, round = tournament.currentRound): boolean {
  const matches = matchesOfRound(tournament, round);
  return matches.length > 0 && matches.every((match) => match.status !== 'pending');
}

/** Last round in a knockout, or the configured last round of a series. */
export function isFinalRound(tournament: Tournament, round: number): boolean {
  if (tournament.format === 'series') return round === tournament.settings.rounds;
  return matchesOfRound(tournament, round).length === 1;
}

/** How a round is called, e.g. "Round 2" or "Final". */
export function roundLabel(tournament: Tournament, round: number): string {
  return getTournamentFormat(tournament.format).roundLabel(tournament, round);
}

/** The match's caption in game, e.g. "Spring Cup · Round 2 · Table 3" or "Spring Cup · Final". */
export function matchLabel(tournament: Tournament, match: TournamentMatch): string {
  const round = roundLabel(tournament, match.round);
  const tables = matchesOfRound(tournament, match.round).length;
  return tables > 1 ? `${tournament.name} · ${round} · Table ${match.table}` : `${tournament.name} · ${round}`;
}

export function tournamentDraftOf(tournament: Tournament): TournamentDraft {
  const { name, description, format, settings, visibility, startsAt } = tournament;
  return { name, description, format, settings, visibility, startsAt };
}

// ---------------------------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------------------------

function requireHost(tournament: Tournament, actorId: string): void {
  if (!isHost(tournament, actorId)) throw new TournamentError('forbidden', 'Only the host can do that.');
}

function requireRegistration(tournament: Tournament, message = 'Registration is closed.'): void {
  if (tournament.status !== 'registration') throw new TournamentError('invalid_state', message);
}

// ---------------------------------------------------------------------------------------------
// Registration phase
// ---------------------------------------------------------------------------------------------

export interface NewTournament {
  id: string;
  /** Used when the tournament is (or later becomes) private. */
  inviteCode: string;
  host: TournamentHost & { userId: string };
  draft: TournamentDraft;
  now: number;
}

export function createTournament({ id, inviteCode, host, draft, now }: NewTournament): Tournament {
  return {
    id,
    name: draft.name,
    description: draft.description,
    host,
    format: draft.format,
    settings: draft.settings,
    visibility: draft.visibility,
    inviteCode: draft.visibility === 'private' ? inviteCode : null,
    startsAt: draft.startsAt,
    status: 'registration',
    currentRound: 0,
    version: 0,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    entrants: [],
    matches: [],
    awards: [],
  };
}

/**
 * Host edits while registration is open. Turning a tournament private issues `inviteCode` (kept
 * when it already had one); turning it public drops the code.
 */
export function updateTournament(tournament: Tournament, actorId: string, draft: TournamentDraft, inviteCode: string): Tournament {
  requireHost(tournament, actorId);
  requireRegistration(tournament, 'Settings can only change before the start.');
  if (draft.settings.maxEntrants < tournament.entrants.length) {
    throw new TournamentError('invalid_input', `${tournament.entrants.length} players are already registered.`);
  }
  return {
    ...tournament,
    ...draft,
    inviteCode: draft.visibility === 'private' ? (tournament.inviteCode ?? inviteCode) : null,
  };
}

export interface RegistrationOptions {
  now: number;
  /** Needed for private tournaments (the host never needs one). */
  inviteCode?: unknown;
}

export function registerEntrant(tournament: Tournament, profile: EntrantProfile, { now, inviteCode }: RegistrationOptions): Tournament {
  requireRegistration(tournament);
  if (findEntrant(tournament, profile.userId)) throw new TournamentError('already_registered', "You're already registered.");
  if (tournament.visibility === 'private' && !isHost(tournament, profile.userId) && normalizeInviteCode(inviteCode) !== tournament.inviteCode) {
    throw new TournamentError('forbidden', 'This tournament needs a valid invite code.');
  }
  if (tournament.entrants.length >= tournament.settings.maxEntrants) throw new TournamentError('full', 'This tournament is full.');
  const entrant: Entrant = {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    level: profile.level,
    joinedAt: now,
    seed: tournament.entrants.length + 1,
    status: 'registered',
    final: null,
  };
  return { ...tournament, entrants: [...tournament.entrants, entrant] };
}

/** Withdrawing during registration removes the entry; seeds close the gap (join order). */
export function withdrawEntrant(tournament: Tournament, userId: string): Tournament {
  requireRegistration(tournament, 'The tournament has started; you can no longer withdraw.');
  if (!findEntrant(tournament, userId)) throw new TournamentError('not_registered', "You're not registered.");
  const entrants = tournament.entrants
    .filter((entrant) => entrant.userId !== userId)
    .map((entrant, index) => ({ ...entrant, seed: index + 1 }));
  return { ...tournament, entrants };
}

// ---------------------------------------------------------------------------------------------
// Start, rounds and completion
// ---------------------------------------------------------------------------------------------

/** Strength order: higher level first, earlier registration breaks ties. */
function seedEntrants(entrants: readonly Entrant[]): Entrant[] {
  return [...entrants]
    .sort((a, b) => b.level - a.level || a.joinedAt - b.joinedAt || (a.userId < b.userId ? -1 : 1))
    .map((entrant, index) => ({ ...entrant, seed: index + 1, status: 'active' as const }));
}

function createMatch(tournament: Tournament, round: number, index: number, planned: PlannedTable, now: number): TournamentMatch {
  const id = matchIdFor(tournament.id, round, index + 1);
  const slots: (string | null)[] = [...planned.userIds, ...Array.from({ length: planned.bots }, () => null)];
  // Seat order decides who deals first; shuffle it so the top seed is not always seat 0.
  const seats = seededShuffle(slots, `${id}:seats`).map((userId, seat) => ({ seat, userId }));
  return {
    id,
    round,
    table: index + 1,
    roomCode: matchRoomCode(id),
    seats,
    status: 'pending',
    createdAt: now,
    deadlineAt: now + TOURNAMENT_TIMING.MATCH_HARD_TIMEOUT_MS,
    live: null,
    result: null,
  };
}

function complete(tournament: Tournament, now: number): Tournament {
  const ranking = rankRecords(tournament);
  const finals = new Map(
    ranking.map((record, index) => [
      record.entrant.userId,
      {
        rank: index + 1,
        points: record.points,
        tableWins: record.tableWins,
        matchesPlayed: record.matchesPlayed,
        roundsPlayed: record.roundsPlayed,
        totalScore: record.totalScore,
        flawless: record.roundsPlayed > 0 && record.tableWins === record.roundsPlayed,
      },
    ])
  );
  const finished: Tournament = {
    ...tournament,
    status: 'completed',
    completedAt: now,
    entrants: tournament.entrants.map((entrant) => ({ ...entrant, final: finals.get(entrant.userId) ?? null })),
  };
  return { ...finished, awards: computeAwards(buildTournamentOutcome(finished, ranking), now) };
}

/** Lets the format decide what follows the current round: the next tables, or the end. */
function advance(tournament: Tournament, now: number): Tournament {
  const decision = getTournamentFormat(tournament.format).decideNextRound(tournament);
  const eliminated = new Set(decision.eliminated);
  const entrants = eliminated.size
    ? tournament.entrants.map((entrant) => (eliminated.has(entrant.userId) ? { ...entrant, status: 'eliminated' as const } : entrant))
    : tournament.entrants;
  const next = { ...tournament, entrants };
  if (decision.kind === 'complete') return complete(next, now);

  const round = tournament.currentRound + 1;
  const matches = decision.tables.map((table, index) => createMatch(next, round, index, table, now));
  return { ...next, currentRound: round, matches: [...tournament.matches, ...matches] };
}

/** Seeds the field and seats round 1. Shared by the host's start and the scheduled auto-start. */
function begin(tournament: Tournament, now: number): Tournament {
  const minimum = minimumEntrants(tournament.settings);
  if (tournament.entrants.length < minimum) {
    throw new TournamentError('too_few_entrants', `At least ${minimum} players must be registered to start.`);
  }
  const started: Tournament = { ...tournament, status: 'running', startedAt: now, currentRound: 0, entrants: seedEntrants(tournament.entrants) };
  return advance(started, now);
}

export function startTournament(tournament: Tournament, actorId: string, now: number): Tournament {
  requireHost(tournament, actorId);
  requireRegistration(tournament, 'The tournament has already started.');
  return begin(tournament, now);
}

export function cancelTournament(tournament: Tournament, actorId: string, now: number): Tournament {
  requireHost(tournament, actorId);
  if (tournament.status !== 'registration' && tournament.status !== 'running') {
    throw new TournamentError('invalid_state', 'This tournament is already over.');
  }
  return { ...tournament, status: 'cancelled', cancelledAt: now };
}

// ---------------------------------------------------------------------------------------------
// Match results
// ---------------------------------------------------------------------------------------------

/**
 * Results are kept for entrants only: a seat whose account was deleted meanwhile still has to be
 * reported (the roster check), but its result is not stored.
 */
function entrantsOnly<T extends { userId: string }>(tournament: Tournament, players: readonly T[]): T[] {
  return players.filter((player) => findEntrant(tournament, player.userId) !== null);
}

/** Everyone at the table forfeits: last place, no points. */
function voidMatch(tournament: Tournament, match: TournamentMatch, now: number): TournamentMatch {
  const size = match.seats.length;
  const seated = match.seats.filter((seat): seat is { seat: number; userId: string } => seat.userId !== null);
  const players: MatchPlayerResult[] = entrantsOnly(tournament, seated)
    .map((seat) => ({ userId: seat.userId, placement: size, score: 0, points: 0, rounds: [], noShow: false, botTakeover: false }));
  return { ...match, status: 'void', result: { outcome: 'void', gameId: null, completedAt: now, players } };
}

function replaceMatch(tournament: Tournament, match: TournamentMatch): Tournament {
  return { ...tournament, matches: tournament.matches.map((existing) => (existing.id === match.id ? match : existing)) };
}

/**
 * Seats the next round once the current one is complete. A field the format can no longer seat
 * (accounts deleted mid-tournament) ends the tournament with the standings so far: a round that can
 * never be planned must not block every later read and write.
 */
function advanceIfRoundComplete(tournament: Tournament, now: number): Tournament {
  if (tournament.status !== 'running' || !isRoundComplete(tournament)) return tournament;
  try {
    return advance(tournament, now);
  } catch (error) {
    if (!(error instanceof TournamentError)) throw error;
    return complete(tournament, now);
  }
}

function validateReport(match: TournamentMatch, report: MatchReport): void {
  if (report.roomCode !== match.roomCode) throw new TournamentError('invalid_input', 'The result is for a different room.');
  const seated = match.seats.map((seat) => seat.userId).filter((id): id is string => id !== null).sort();
  const reported = report.players.map((player) => player.userId).sort();
  if (seated.length !== reported.length || seated.some((id, index) => id !== reported[index])) {
    throw new TournamentError('invalid_input', 'The reported players do not match the table.');
  }
  const size = match.seats.length;
  for (const player of report.players) {
    if (!Number.isInteger(player.placement) || player.placement < 1 || player.placement > size) {
      throw new TournamentError('invalid_input', `Placement ${player.placement} is impossible at a table of ${size}.`);
    }
  }
}

/**
 * Records a worker-attested result. Idempotent: a match already completed answers 'duplicate'
 * without changes; a match voided before its result arrived (deadline, or resolved by the host)
 * answers 'superseded', so a late result is never mistaken for a re-delivery; a result for a
 * tournament that ended meanwhile is 'ignored'. Completing the last table of a round seats the
 * next round (or completes the tournament).
 */
export function recordMatchResult(
  tournament: Tournament,
  report: MatchReport,
  now: number
): { tournament: Tournament; outcome: RecordResultOutcome } {
  const match = findMatch(tournament, report.matchId);
  if (!match) throw new TournamentError('not_found', 'No such match.');
  if (match.status === 'void') return { tournament, outcome: 'superseded' };
  if (match.status !== 'pending') return { tournament, outcome: 'duplicate' };
  if (tournament.status !== 'running') return { tournament, outcome: 'ignored' };
  validateReport(match, report);

  const size = match.seats.length;
  const completed: TournamentMatch = {
    ...match,
    status: 'completed',
    result: {
      outcome: 'played',
      gameId: report.gameId,
      completedAt: Math.min(report.completedAt, now),
      players: entrantsOnly(tournament, report.players).map((player) => ({ ...player, rounds: [...player.rounds], points: resultPoints(player, size) })),
    },
  };
  return { tournament: advanceIfRoundComplete(replaceMatch(tournament, completed), now), outcome: 'recorded' };
}

/** The host voids a match that has been pending for too long without activity (see canResolveMatch). */
export function resolveStaleMatch(tournament: Tournament, actorId: string, matchId: string, now: number): Tournament {
  requireHost(tournament, actorId);
  if (tournament.status !== 'running') throw new TournamentError('invalid_state', 'The tournament is not running.');
  const match = findMatch(tournament, matchId);
  if (!match) throw new TournamentError('not_found', 'No such match.');
  if (match.status !== 'pending') throw new TournamentError('invalid_state', 'This match is already decided.');
  if (now < matchStaleAt(match)) throw new TournamentError('invalid_state', 'Give the table more time before resolving it.');
  if (isMatchActive(match, now)) {
    throw new TournamentError('invalid_state', 'This table is still playing. It can be resolved once it has been quiet for a while.');
  }
  if (!canResolveMatch(tournament, actorId, match, now)) {
    throw new TournamentError('forbidden', 'You play at this table, so you cannot resolve it. It is voided by itself at its deadline.');
  }
  return advanceIfRoundComplete(replaceMatch(tournament, voidMatch(tournament, match, now)), now);
}

// ---------------------------------------------------------------------------------------------
// Lazy transitions
// ---------------------------------------------------------------------------------------------

/**
 * When a tournament in registration next has something due (its scheduled start, or the expiry of
 * a registration nobody started); null for any other status. Lists use it to bring stale rows up
 * to date without loading every tournament.
 */
export function registrationDueAt(tournament: Pick<Tournament, 'status' | 'startsAt' | 'createdAt'>): number | null {
  if (tournament.status !== 'registration') return null;
  return tournament.startsAt ?? tournament.createdAt + TOURNAMENT_TIMING.REGISTRATION_MAX_AGE_MS;
}

function dueInRegistration(tournament: Tournament, now: number): Tournament {
  if (tournament.startsAt !== null) {
    if (now < tournament.startsAt) return tournament;
    try {
      return begin(tournament, now);
    } catch (error) {
      if (!(error instanceof TournamentError)) throw error;
      // Not enough (or unseatable) entrants: keep registration open for a grace period.
      return now >= tournament.startsAt + TOURNAMENT_TIMING.UNSTARTED_GRACE_MS ? { ...tournament, status: 'cancelled', cancelledAt: now } : tournament;
    }
  }
  return now >= tournament.createdAt + TOURNAMENT_TIMING.REGISTRATION_MAX_AGE_MS ? { ...tournament, status: 'cancelled', cancelledAt: now } : tournament;
}

function dueWhileRunning(tournament: Tournament, now: number): Tournament {
  const overdue = tournament.matches.filter((match) => match.status === 'pending' && match.deadlineAt <= now);
  if (overdue.length === 0) return tournament;
  const voided = overdue.reduce((state, match) => replaceMatch(state, voidMatch(state, match, now)), tournament);
  return advanceIfRoundComplete(voided, now);
}

/**
 * Applies everything that became due by `now`: the scheduled start (or expiry of a registration
 * nobody started) and voiding of matches past their deadline, advancing rounds as they complete.
 * Called before every read and write, so no cron is needed. Returns the same object when nothing
 * was due, so callers can skip the save.
 */
export function applyDueTransitions(tournament: Tournament, now: number): Tournament {
  if (tournament.status === 'registration') return dueInRegistration(tournament, now);
  if (tournament.status === 'running') return dueWhileRunning(tournament, now);
  return tournament;
}
