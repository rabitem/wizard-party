import {
  MATCH_REPORT_OUTCOMES,
  TOURNAMENT_LIMITS,
  isTournamentId,
  type MatchReportOutcome,
  type TournamentMatchRoomSeat,
  type TournamentMatchRoomState,
} from '@shared/domain/tournament';
import { TOURNAMENT_WIRE_LIMITS } from '@shared/tournament/tournament-wire';

/*
 * The match-room state the game worker sends with every GAME_STATE of a tournament table
 * (`tournamentMatch`, see docs/accounts/tournaments.md "Game worker: match mode"). Validated here because a
 * malformed value must never break the table UI, and moved onto this device's clock so lobby
 * countdowns agree with the worker's deadlines even when the device clock is off.
 */

/** Differences below this between two messages' converted times are latency noise, not a new deadline. */
const CLOCK_JITTER_MS = 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isTimeOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function parseSeat(value: unknown): TournamentMatchRoomSeat | null {
  if (!isRecord(value)) return null;
  const { name, seat, joined, noShow } = value;
  if (typeof name !== 'string' || name.length === 0 || typeof seat !== 'number' || !Number.isInteger(seat) || seat < 0) return null;
  if (typeof joined !== 'boolean' || typeof noShow !== 'boolean') return null;
  return { name, seat, joined, noShow };
}

/** The tournament's answer to the result; null until it arrived (and from workers that never send it). */
function parseReportOutcome(value: unknown): MatchReportOutcome | null {
  return MATCH_REPORT_OUTCOMES.find((outcome) => outcome === value) ?? null;
}

/** A worker time (epoch ms on its clock) on this device's clock. */
const toLocalTime = (serverTime: number | null, clockOffsetMs: number) => (serverTime === null ? null : serverTime - clockOffsetMs);

type MatchIdentity = Pick<TournamentMatchRoomState, 'tournamentId' | 'matchId' | 'label' | 'round' | 'table'>;

function parseIdentity({ tournamentId, matchId, label, round, table }: Record<string, unknown>): MatchIdentity | null {
  if (!isTournamentId(tournamentId) || typeof matchId !== 'string' || matchId.length === 0) return null;
  if (typeof label !== 'string' || label.length === 0 || label.length > TOURNAMENT_WIRE_LIMITS.MAX_LABEL_LENGTH) return null;
  if (!isPositiveInt(round) || !isPositiveInt(table)) return null;
  return { tournamentId, matchId, label, round, table };
}

/** Roster seats in deal order, or null when the roster is empty, too large or malformed. */
function parseRoster(roster: unknown): TournamentMatchRoomSeat[] | null {
  if (!Array.isArray(roster) || roster.length === 0 || roster.length > TOURNAMENT_LIMITS.MAX_TABLE_SIZE) return null;
  const seats = roster.map(parseSeat);
  if (seats.some((seat) => seat === null)) return null;
  return (seats as TournamentMatchRoomSeat[]).sort((a, b) => a.seat - b.seat);
}

/**
 * The tournament match of a GAME_STATE message, or null for casual rooms and malformed values.
 * `clockOffsetMs` is the worker's clock minus this device's (message timestamp - receive time).
 */
export function readTournamentMatch(message: unknown, clockOffsetMs = 0): TournamentMatchRoomState | null {
  const raw = isRecord(message) ? message.tournamentMatch : undefined;
  if (!isRecord(raw)) return null;
  const identity = parseIdentity(raw);
  const roster = parseRoster(raw.roster);
  // Fields workers from before the match deadline do not send default to "unknown".
  const { bots, autoStartAt, noShowDeadlineAt, deadlineAt = null } = raw;
  if (!identity || !roster || typeof bots !== 'number' || !Number.isInteger(bots) || bots < 0) return null;
  if (!isTimeOrNull(autoStartAt) || !isTimeOrNull(noShowDeadlineAt)) return null;
  const offset = Number.isFinite(clockOffsetMs) ? clockOffsetMs : 0;
  return {
    ...identity,
    roster,
    bots,
    autoStartAt: toLocalTime(autoStartAt, offset),
    noShowDeadlineAt: toLocalTime(noShowDeadlineAt, offset),
    reported: raw.reported === true,
    reportOutcome: parseReportOutcome(raw.reportOutcome),
    deadlineAt: toLocalTime(isTimeOrNull(deadlineAt) ? deadlineAt : null, offset),
    expired: raw.expired === true,
  };
}

/** Worker clock minus device clock for a message stamped `serverTimestamp` and received at `receivedAt`. */
export function clockOffsetOf(serverTimestamp: unknown, receivedAt: number): number {
  return typeof serverTimestamp === 'number' && Number.isFinite(serverTimestamp) ? serverTimestamp - receivedAt : 0;
}

/**
 * Keeps the previous object while nothing changed, so the many GAME_STATE messages of a match do
 * not re-render the lobby roster or HUD badge. Countdown times count as changed only beyond a
 * second of clock jitter between messages.
 */
export function sameTournamentMatch(a: TournamentMatchRoomState | null, b: TournamentMatchRoomState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const sameTime = (x: number | null, y: number | null) => x === y || (x !== null && y !== null && Math.abs(x - y) < CLOCK_JITTER_MS);
  return (
    a.tournamentId === b.tournamentId &&
    a.matchId === b.matchId &&
    a.label === b.label &&
    a.round === b.round &&
    a.table === b.table &&
    a.bots === b.bots &&
    a.reported === b.reported &&
    a.reportOutcome === b.reportOutcome &&
    a.expired === b.expired &&
    sameTime(a.autoStartAt, b.autoStartAt) &&
    sameTime(a.noShowDeadlineAt, b.noShowDeadlineAt) &&
    sameTime(a.deadlineAt, b.deadlineAt) &&
    a.roster.length === b.roster.length &&
    a.roster.every((seat, index) => {
      const other = b.roster[index];
      return seat.name === other.name && seat.seat === other.seat && seat.joined === other.joined && seat.noShow === other.noShow;
    })
  );
}
