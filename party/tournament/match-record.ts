import { MATCH_REPORT_OUTCOMES, TOURNAMENT_TIMING, type MatchReportOutcome } from '../../shared/domain/tournament';
import { parseMatchTicketClaims, type MatchDescriptor, type MatchTicketClaims } from '../../shared/tournament';
import { TOURNAMENT_MATCH_RECORD_VERSION } from './match-room.constants';

/**
 * The lock of a tournament match room, persisted next to the game state. It is created from the
 * first valid ticket and never changes match afterwards. Account ids stay on the worker: nothing
 * of this record except the names reaches the browsers (see toMatchRoomState).
 *
 * Records are immutable values; every change returns a new record, so the controller can tell by
 * reference whether there is something to persist.
 */

export interface MatchSeatRecord {
  uid: string;
  /** Seat name from the ticket (unique at the table). */
  name: string;
  /** Deal order index. */
  seat: number;
  /** Game player holding the seat: the member's own player or, for a no-show, the bot that replaced them. */
  playerId: string | null;
  /** Not seated when the match started; a bot played the seat and it ranks last. */
  noShow: boolean;
  /** A bot played the seat for part of the game (disconnect timeout). Sticky. */
  botTakeover: boolean;
}

export interface TournamentMatchRecord {
  v: typeof TOURNAMENT_MATCH_RECORD_VERSION;
  tid: string;
  mid: string;
  room: string;
  /** The descriptor every roster member's ticket carries (round, table, roster, bots, rules, label). */
  match: MatchDescriptor;
  seats: MatchSeatRecord[];
  lockedAt: number;
  /** First time a roster member took a seat; starts the no-show clock. */
  firstJoinAt: number | null;
  /** Everyone is seated: the match starts at this time unless someone leaves first. */
  autoStartAt: number | null;
  startedAt: number | null;
  /** The game sits at the end of this round since `since` (drives the auto advance). */
  roundEnd: { round: number; since: number } | null;
  /** The result was handed to the outbox. */
  reportedAt: number | null;
  /** The server's answer once the result was delivered (superseded: the table was voided first; rejected: refused for good). */
  reportOutcome: MatchReportOutcome | null;
  /** The match deadline passed before the game started: the server voided the table, it never starts. */
  expiredAt: number | null;
}

export function lockMatchRecord(claims: MatchTicketClaims, now: number): TournamentMatchRecord {
  return {
    v: TOURNAMENT_MATCH_RECORD_VERSION,
    tid: claims.tid,
    mid: claims.mid,
    room: claims.room,
    match: claims.match,
    seats: [...claims.match.roster]
      .sort((a, b) => a.seat - b.seat)
      .map((entry) => ({ uid: entry.uid, name: entry.name, seat: entry.seat, playerId: null, noShow: false, botTakeover: false })),
    lockedAt: now,
    firstJoinAt: null,
    autoStartAt: null,
    startedAt: null,
    roundEnd: null,
    reportedAt: null,
    reportOutcome: null,
    expiredAt: null,
  };
}

/** Table size: roster plus the bots the descriptor asks for. */
export function matchTableSize(record: Pick<TournamentMatchRecord, 'match'>): number {
  return record.match.roster.length + record.match.bots;
}

export function seatOfUser(record: TournamentMatchRecord, uid: string): MatchSeatRecord | undefined {
  return record.seats.find((seat) => seat.uid === uid);
}

export function seatOfPlayer(record: TournamentMatchRecord, playerId: string): MatchSeatRecord | undefined {
  return record.seats.find((seat) => seat.playerId === playerId);
}

/** When absent members become no-shows; null before anyone joined, once the match started or expired. */
export function noShowDeadline(record: TournamentMatchRecord): number | null {
  if (record.startedAt !== null || record.expiredAt !== null || record.firstJoinAt === null) return null;
  return record.firstJoinAt + TOURNAMENT_TIMING.NO_SHOW_GRACE_MS;
}

/** The server's deadline of the match (from the ticket); null for tickets issued before it was sent. */
export function matchDeadline(record: Pick<TournamentMatchRecord, 'match'>): number | null {
  return record.match.deadlineAt ?? null;
}

/** The server has voided the match by now if it is still unfinished. */
export function isPastDeadline(record: Pick<TournamentMatchRecord, 'match'>, now: number): boolean {
  const deadline = matchDeadline(record);
  return deadline !== null && now >= deadline;
}

export function updateSeat(
  record: TournamentMatchRecord,
  uid: string,
  patch: Partial<Pick<MatchSeatRecord, 'playerId' | 'noShow' | 'botTakeover'>>
): TournamentMatchRecord {
  const seat = seatOfUser(record, uid);
  if (!seat || Object.entries(patch).every(([key, value]) => seat[key as keyof MatchSeatRecord] === value)) return record;
  return { ...record, seats: record.seats.map((entry) => (entry.uid === uid ? { ...entry, ...patch } : entry)) };
}

/** A roster member took (or took back) their seat with the given game player. */
export function bindSeat(record: TournamentMatchRecord, uid: string, playerId: string, now: number): TournamentMatchRecord {
  const bound = updateSeat(record, uid, { playerId });
  return bound.firstJoinAt === null ? { ...bound, firstJoinAt: now } : bound;
}

function isSeatRecord(value: unknown): value is MatchSeatRecord {
  if (typeof value !== 'object' || value === null) return false;
  const seat = value as Record<string, unknown>;
  return typeof seat.uid === 'string' && typeof seat.name === 'string' && typeof seat.seat === 'number' &&
    (seat.playerId === null || typeof seat.playerId === 'string') &&
    typeof seat.noShow === 'boolean' && typeof seat.botTakeover === 'boolean';
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}

/** Fields added after the first records were stored: absent means not yet. */
function parseReportOutcome(value: unknown): MatchReportOutcome | null {
  return MATCH_REPORT_OUTCOMES.find((outcome) => outcome === value) ?? null;
}

function isRoundEnd(value: unknown): value is TournamentMatchRecord['roundEnd'] {
  if (value === null) return true;
  const roundEnd = value as { round?: unknown; since?: unknown } | undefined;
  return typeof roundEnd?.round === 'number' && typeof roundEnd.since === 'number';
}

/** The stored descriptor, re-validated by the ticket parser on behalf of its first roster member. */
function parseStoredMatch(raw: Record<string, unknown>): MatchTicketClaims | null {
  const holder = (raw.match as { roster?: { uid: string; name: string }[] } | undefined)?.roster?.[0];
  if (!holder) return null;
  return parseMatchTicketClaims({ v: 1, tid: raw.tid, mid: raw.mid, room: raw.room, uid: holder.uid, name: holder.name, exp: 0, match: raw.match });
}

/** One seat per roster member, at the roster's seat index. */
function seatsMatchRoster(seats: MatchSeatRecord[], claims: MatchTicketClaims): boolean {
  const { roster } = claims.match;
  return seats.length === roster.length && roster.every((entry) => seats.some((seat) => seat.uid === entry.uid && seat.seat === entry.seat));
}

/**
 * Restores a persisted record. The descriptor is re-validated with the ticket parser (it was
 * signed when stored, but storage outlives code versions); anything unexpected drops the lock.
 */
export function parseMatchRecord(value: unknown): TournamentMatchRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.v !== TOURNAMENT_MATCH_RECORD_VERSION || !Array.isArray(raw.seats) || !raw.seats.every(isSeatRecord)) return null;
  const claims = parseStoredMatch(raw);
  const seats = raw.seats;
  if (!claims || !seatsMatchRoster(seats, claims)) return null;
  const { lockedAt, firstJoinAt, autoStartAt, startedAt, reportedAt, roundEnd, expiredAt = null } = raw;
  if (typeof lockedAt !== 'number' || ![firstJoinAt, autoStartAt, startedAt, reportedAt, expiredAt].every(isNullableNumber)) return null;
  if (!isRoundEnd(roundEnd)) return null;
  return {
    v: TOURNAMENT_MATCH_RECORD_VERSION,
    tid: claims.tid,
    mid: claims.mid,
    room: claims.room,
    match: claims.match,
    seats: seats.map((seat) => ({ ...seat })),
    lockedAt,
    firstJoinAt: firstJoinAt as number | null,
    autoStartAt: autoStartAt as number | null,
    startedAt: startedAt as number | null,
    roundEnd,
    reportedAt: reportedAt as number | null,
    reportOutcome: parseReportOutcome(raw.reportOutcome),
    expiredAt: expiredAt as number | null,
  };
}
