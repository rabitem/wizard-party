import { isDatabaseConfigured } from '../db/neon';

/** Tuning of the tournament adapters (not game rules: those live in TOURNAMENT_LIMITS/TIMING). */
export const TOURNAMENT_INFRASTRUCTURE = {
  /**
   * Public lists are the same for everyone: a few seconds of CDN caching absorb traffic spikes
   * while a new or finished tournament still shows up almost at once.
   */
  LIST_CACHE_CONTROL: 'public, max-age=0, s-maxage=5, stale-while-revalidate=25',
  /** Body limit of create / edit requests (the ruleset is the largest field). */
  MAX_REQUEST_BODY_BYTES: 32 * 1024,
  /** Body limit of the small actions (registration code, up to MAX_INVITES_PER_REQUEST user ids). */
  MAX_ACTION_BODY_BYTES: 4 * 1024,
  /** Redis key namespace of the per-user budgets (TOURNAMENT_RATE_LIMITS). */
  RATE_LIMIT_PREFIX: 'ratelimit:tournament',
} as const;

/**
 * Shared secret of the Next.js server and the game worker: signs match tickets and result reports
 * (docs/accounts/tournaments.md#configuration). Read on every use, so tests and rotations need no restart
 * of the composition root.
 */
export function tournamentSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.TOURNAMENT_SECRET?.trim();
  return secret ? secret : null;
}

/** Tournaments need the database and the shared secret; without either the UI shows "unavailable". */
export function isTournamentsAvailable(): boolean {
  return tournamentSecret() !== null && isDatabaseConfigured();
}
