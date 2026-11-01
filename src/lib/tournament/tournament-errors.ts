import { AccountApiError } from '@/lib/account/account-api';

/*
 * How the tournament pages read failed API calls. Domain messages (TournamentError) are written
 * for players, so they are shown as they are; transport and infrastructure failures get copy here.
 */

const ERROR_COPY: Record<string, string> = {
  rate_limited: 'Slow down a little — try again in a few minutes.',
  unavailable: 'Tournaments are unavailable right now. Please try again later.',
  conflict: 'Someone changed the tournament at the same moment. Please try again.',
  unauthenticated: 'Please sign in first.',
};

const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_UNAVAILABLE = 503;

/** No TOURNAMENT_SECRET or no database on this deployment (the feature is switched off). */
export function isTournamentsUnavailable(error: unknown): boolean {
  return error instanceof AccountApiError && (error.status === HTTP_UNAVAILABLE || error.code === 'unavailable');
}

/** Unknown id, or a private tournament without (the right) invite code: answered alike. */
export function isNotFound(error: unknown): boolean {
  return error instanceof AccountApiError && error.status === HTTP_NOT_FOUND;
}

export function tournamentErrorMessage(error: unknown): string {
  if (error instanceof AccountApiError) {
    if (ERROR_COPY[error.code]) return ERROR_COPY[error.code];
    if (error.status === HTTP_UNAUTHORIZED) return ERROR_COPY.unauthenticated;
    if (error.status === HTTP_UNAVAILABLE) return ERROR_COPY.unavailable;
    if (error.message && error.code !== 'http_error') return error.message;
  }
  // fetch rejects with a TypeError when the network is down.
  if (error instanceof TypeError) return 'You seem to be offline. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}
