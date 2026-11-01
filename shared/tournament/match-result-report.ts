import { TOURNAMENT_LIMITS } from '../domain/tournament/tournament.constants';
import { RECORD_RESULT_OUTCOMES, type MatchReport, type RecordResultOutcome } from '../domain/tournament/tournament.types';
import { fromHex, hmacSign, hmacVerify, toHex } from './hmac';
import type { MatchProgressReport } from './match-progress-report';
import { SIGNING_CONTEXT, TOURNAMENT_RESULT_HEADERS, TOURNAMENT_WIRE_LIMITS, TOURNAMENT_WIRE_VERSION } from './tournament-wire';
import { hasConsistentIds, isGameId, isInt } from './wire-validation';

/*
 * Match results travel from the game worker to POST /api/tournaments/match-results as signed JSON:
 * HMAC-SHA256 (hex) over `tournament-result.v1.${timestamp}.${body}` in TOURNAMENT_RESULT_HEADERS.
 * Delivery is at-least-once (durable outbox); the server records each match once. Progress pings
 * (match-progress-report.ts) share the endpoint and the signature; results carry no `kind`.
 */

export interface MatchResultRound {
  bid: number;
  tricksWon: number;
  roundScore: number;
}

/** One roster member's result. Bots are not reported. */
export interface MatchResultStanding {
  uid: string;
  /** 1 = table winner, counted among every seat (bots included); no-shows rank below all present. */
  placement: number;
  score: number;
  rounds: MatchResultRound[];
  /** Never joined; a bot played the seat from the start. */
  noShow: boolean;
  /** Left mid-game; a bot finished the seat. */
  botTakeover: boolean;
}

export interface MatchResultReport {
  v: typeof TOURNAMENT_WIRE_VERSION;
  tid: string;
  mid: string;
  room: string;
  /** The worker's game id (unique per game). */
  gameId: string;
  completedAt: number;
  standings: MatchResultStanding[];
}

function parseRounds(value: unknown): MatchResultRound[] | null {
  if (!Array.isArray(value) || value.length > TOURNAMENT_WIRE_LIMITS.MAX_ROUNDS) return null;
  const rounds: MatchResultRound[] = [];
  for (const entry of value) {
    const { bid, tricksWon, roundScore } = (entry ?? {}) as Record<string, unknown>;
    const max = TOURNAMENT_WIRE_LIMITS.MAX_ROUNDS;
    const maxScore = TOURNAMENT_WIRE_LIMITS.MAX_ROUND_SCORE;
    if (!isInt(bid, 0, TOURNAMENT_WIRE_LIMITS.MAX_BID) || !isInt(tricksWon, 0, max) || !isInt(roundScore, -maxScore, maxScore)) return null;
    rounds.push({ bid, tricksWon, roundScore });
  }
  return rounds;
}

function parseStanding(value: unknown): MatchResultStanding | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const { uid, placement, score, noShow, botTakeover } = raw;
  if (typeof uid !== 'string' || uid.length === 0 || uid.length > TOURNAMENT_WIRE_LIMITS.MAX_USER_ID_LENGTH) return null;
  if (!isInt(placement, 1, TOURNAMENT_LIMITS.MAX_TABLE_SIZE)) return null;
  if (!isInt(score, -TOURNAMENT_WIRE_LIMITS.MAX_SCORE, TOURNAMENT_WIRE_LIMITS.MAX_SCORE)) return null;
  if (typeof noShow !== 'boolean' || typeof botTakeover !== 'boolean') return null;
  const rounds = parseRounds(raw.rounds);
  if (!rounds) return null;
  return { uid, placement, score, rounds, noShow, botTakeover };
}

function parseStandings(value: unknown): MatchResultStanding[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > TOURNAMENT_LIMITS.MAX_TABLE_SIZE) return null;
  const standings: MatchResultStanding[] = [];
  for (const entry of value) {
    const standing = parseStanding(entry);
    if (!standing || standings.some((existing) => existing.uid === standing.uid)) return null;
    standings.push(standing);
  }
  return standings;
}

/** Structural validation of a decoded report body; null when anything is off. */
export function parseMatchResultReport(value: unknown): MatchResultReport | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.v !== TOURNAMENT_WIRE_VERSION || !hasConsistentIds(raw)) return null;
  if (!isGameId(raw.gameId) || !isInt(raw.completedAt, 0, Number.MAX_SAFE_INTEGER)) return null;
  const standings = parseStandings(raw.standings);
  if (!standings) return null;
  return { v: TOURNAMENT_WIRE_VERSION, tid: raw.tid, mid: raw.mid, room: raw.room, gameId: raw.gameId, completedAt: raw.completedAt, standings };
}

/** The domain's view of a verified report. */
export function toMatchReport(report: MatchResultReport): MatchReport {
  return {
    matchId: report.mid,
    roomCode: report.room,
    gameId: report.gameId,
    completedAt: report.completedAt,
    players: report.standings.map((standing) => ({
      userId: standing.uid,
      placement: standing.placement,
      score: standing.score,
      rounds: standing.rounds,
      noShow: standing.noShow,
      botTakeover: standing.botTakeover,
    })),
  };
}

function signedString(timestamp: number | string, body: string): string {
  return `${SIGNING_CONTEXT.RESULT}${timestamp}.${body}`;
}

export async function signMatchResultRequest(secret: string, timestamp: number, body: string): Promise<string> {
  return toHex(await hmacSign(secret, signedString(timestamp, body)));
}

/**
 * The server's answer to a delivered result (`200 { outcome }`). Servers from before the outcome
 * was part of the contract answer without one: the result was recorded then.
 */
export function parseRecordResultOutcome(body: unknown): RecordResultOutcome {
  const outcome = typeof body === 'object' && body !== null ? (body as { outcome?: unknown }).outcome : undefined;
  return RECORD_RESULT_OUTCOMES.find((known) => known === outcome) ?? 'recorded';
}

/** Body plus headers of the worker's POST (a result or a progress ping); `now` becomes the signed timestamp. */
export async function buildMatchResultRequest(
  secret: string,
  report: MatchResultReport | MatchProgressReport,
  now: number
): Promise<{ body: string; headers: Record<string, string> }> {
  const body = JSON.stringify(report);
  return {
    body,
    headers: {
      'content-type': 'application/json',
      [TOURNAMENT_RESULT_HEADERS.SIGNATURE]: await signMatchResultRequest(secret, now, body),
      [TOURNAMENT_RESULT_HEADERS.TIMESTAMP]: String(now),
    },
  };
}

export interface VerifyMatchResultSignatureInput {
  secret: string;
  signature: string | null;
  timestamp: string | null;
  body: string;
  now: number;
  toleranceMs?: number;
}

export async function verifyMatchResultSignature(input: VerifyMatchResultSignatureInput): Promise<boolean> {
  const { secret, signature, timestamp, body, now, toleranceMs = TOURNAMENT_WIRE_LIMITS.SIGNATURE_TOLERANCE_MS } = input;
  if (!signature || !timestamp || !/^\d{1,16}$/.test(timestamp)) return false;
  const timestampMs = Number(timestamp);
  if (Math.abs(now - timestampMs) > toleranceMs) return false;
  const bytes = fromHex(signature);
  if (!bytes) return false;
  return hmacVerify(secret, signedString(timestampMs, body), bytes);
}
