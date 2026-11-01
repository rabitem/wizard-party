import type { MatchProgress } from '../domain/tournament/tournament.types';
import { TOURNAMENT_WIRE_LIMITS, TOURNAMENT_WIRE_VERSION } from './tournament-wire';
import { hasConsistentIds, isGameId, isInt } from './wire-validation';

/*
 * Progress pings travel from the game worker to the result endpoint (POST
 * /api/tournaments/match-results) when a match game starts and at every round end, signed exactly
 * like results (buildMatchResultRequest). They are the table's proof of life: a host may not void a
 * table that is being played. Pings carry `kind: 'progress'`; results carry no kind, so workers from
 * before pings keep working. A server from before pings refuses them (4xx); the worker drops them.
 */

export const MATCH_PROGRESS_KIND = 'progress';

export interface MatchProgressReport {
  v: typeof TOURNAMENT_WIRE_VERSION;
  kind: typeof MATCH_PROGRESS_KIND;
  tid: string;
  mid: string;
  room: string;
  /** The worker's game id (see MatchResultReport). */
  gameId: string;
  /** The round in play, 1..maxRounds: after round r ended the ping already names r + 1. */
  round: number;
  maxRounds: number;
  /** When the worker sent it, epoch ms. */
  at: number;
}

/** What a signed body on the result endpoint is. */
export type MatchReportKind = 'result' | 'progress';

/** Results carry no kind; null for any kind this server does not know (answered 400). */
export function matchReportKind(value: unknown): MatchReportKind | null {
  const kind = typeof value === 'object' && value !== null ? (value as { kind?: unknown }).kind : undefined;
  if (kind === undefined) return 'result';
  return kind === MATCH_PROGRESS_KIND ? 'progress' : null;
}

/** Structural validation of a decoded progress ping; null when anything is off. */
export function parseMatchProgressReport(value: unknown): MatchProgressReport | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.v !== TOURNAMENT_WIRE_VERSION || raw.kind !== MATCH_PROGRESS_KIND || !hasConsistentIds(raw) || !isGameId(raw.gameId)) return null;
  const { round, maxRounds, at } = raw;
  if (!isInt(maxRounds, 1, TOURNAMENT_WIRE_LIMITS.MAX_ROUNDS) || !isInt(round, 1, maxRounds)) return null;
  if (!isInt(at, 0, Number.MAX_SAFE_INTEGER)) return null;
  return { v: TOURNAMENT_WIRE_VERSION, kind: MATCH_PROGRESS_KIND, tid: raw.tid, mid: raw.mid, room: raw.room, gameId: raw.gameId, round, maxRounds, at };
}

/** The domain's view of a verified ping. */
export function toMatchProgress(report: MatchProgressReport): MatchProgress {
  return { matchId: report.mid, roomCode: report.room, round: report.round, maxRounds: report.maxRounds, at: report.at };
}
