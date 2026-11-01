import { describe, expect, it } from 'vitest';

import { AccountApiError } from '@/lib/account/account-api';

import { isNotFound, isTournamentsUnavailable, tournamentErrorMessage } from './tournament-errors';

describe('tournament errors', () => {
  it('should recognise unavailable and not found answers', () => {
    expect(isTournamentsUnavailable(new AccountApiError(503, 'unavailable', 'x'))).toBe(true);
    expect(isTournamentsUnavailable(new AccountApiError(409, 'conflict', 'x'))).toBe(false);
    expect(isNotFound(new AccountApiError(404, 'not_found', 'x'))).toBe(true);
    expect(isNotFound(new Error('x'))).toBe(false);
  });

  it('should prefer friendly copy, then the server message', () => {
    expect(tournamentErrorMessage(new AccountApiError(429, 'rate_limited', 'Too many'))).toMatch(/slow down/i);
    expect(tournamentErrorMessage(new AccountApiError(401, 'http_error', 'Unauthorized'))).toMatch(/sign in/i);
    expect(tournamentErrorMessage(new AccountApiError(409, 'full', 'The tournament is full.'))).toBe('The tournament is full.');
    expect(tournamentErrorMessage(new AccountApiError(500, 'http_error', 'Internal Server Error'))).toMatch(/something went wrong/i);
    expect(tournamentErrorMessage(new TypeError('Failed to fetch'))).toMatch(/offline/i);
  });
});
