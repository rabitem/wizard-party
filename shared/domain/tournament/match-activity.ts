import { TOURNAMENT_TIMING } from './tournament.constants';
import { TournamentError } from './tournament-error';
import type { MatchProgress, Tournament, TournamentMatch } from './tournament.types';

/*
 * Proof of life of pending tables. The game worker pings when a match game starts and at every
 * round end; a table with recent activity is being played, so the host may not void it as stale
 * (it is still voided at its hard deadline like any other).
 */

/** When the host may resolve a pending match that seems stuck (before any activity counts). */
export function matchStaleAt(match: Pick<TournamentMatch, 'createdAt'>): number {
  return match.createdAt + TOURNAMENT_TIMING.MATCH_STALE_AFTER_MS;
}

/** Until when the table counts as being played; null when the worker never reported it. */
export function matchActiveUntil(match: Pick<TournamentMatch, 'live'>): number | null {
  return match.live === null ? null : match.live.lastActivityAt + TOURNAMENT_TIMING.MATCH_ACTIVITY_GRACE_MS;
}

/** The worker reported activity within MATCH_ACTIVITY_GRACE_MS. */
export function isMatchActive(match: Pick<TournamentMatch, 'live'>, now: number): boolean {
  const activeUntil = matchActiveUntil(match);
  return activeUntil !== null && now < activeUntil;
}

/** The earliest time the host may resolve the match: stale, and no recent activity. */
export function matchResolvableAt(match: Pick<TournamentMatch, 'createdAt' | 'live'>): number {
  return Math.max(matchStaleAt(match), matchActiveUntil(match) ?? 0);
}

export type RecordProgressOutcome = 'recorded' | 'ignored';

/**
 * Records a worker progress ping on its pending match. Pings of decided matches, of a tournament
 * that is no longer running and pings older than the stored state are 'ignored' (the same object
 * comes back, so nothing is saved). The time is capped at `now`, so a worker clock running ahead
 * can't keep a table "active" beyond what the server saw.
 */
export function recordMatchProgress(
  tournament: Tournament,
  progress: MatchProgress,
  now: number
): { tournament: Tournament; outcome: RecordProgressOutcome } {
  const match = tournament.matches.find((candidate) => candidate.id === progress.matchId);
  if (!match) throw new TournamentError('not_found', 'No such match.');
  const ignored = { tournament, outcome: 'ignored' as const };
  if (match.status !== 'pending' || tournament.status !== 'running') return ignored;
  if (progress.roomCode !== match.roomCode) throw new TournamentError('invalid_input', 'The progress is for a different room.');
  if (progress.round > progress.maxRounds) throw new TournamentError('invalid_input', `Round ${progress.round} of ${progress.maxRounds} is impossible.`);

  const lastActivityAt = Math.min(progress.at, now);
  if (match.live !== null && (lastActivityAt <= match.live.lastActivityAt || progress.round < match.live.round)) return ignored;
  const live = { round: progress.round, maxRounds: progress.maxRounds, lastActivityAt };
  return {
    tournament: { ...tournament, matches: tournament.matches.map((existing) => (existing.id === match.id ? { ...match, live } : existing)) },
    outcome: 'recorded',
  };
}
