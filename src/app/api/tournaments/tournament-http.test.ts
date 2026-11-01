import { describe, expect, it } from 'vitest';

import { TOURNAMENT_ERROR_CODES, TournamentError, type TournamentErrorCode } from '@shared/domain/tournament';

import { inviteCodeOf, isMutation, listQueryOf, readJsonObject, tournamentProblem } from './tournament-http';

const ENDPOINT = 'https://wizardparty.fun/api/tournaments';

function post(body: string | undefined): Request {
  return new Request(ENDPOINT, { method: 'POST', body });
}

async function rejectionCode(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof TournamentError ? error.code : 'unexpected';
  }
}

describe('tournament-http', () => {
  describe('tournamentProblem', () => {
    /** docs/accounts/tournaments.md#http-api */
    const DOCUMENTED_STATUS: [TournamentErrorCode, number][] = [
      ['invalid_input', 422],
      ['not_found', 404],
      ['forbidden', 403],
      ['invalid_state', 409],
      ['full', 409],
      ['already_registered', 409],
      ['not_registered', 409],
      ['too_few_entrants', 409],
      ['conflict', 409],
      ['rate_limited', 429],
      ['unavailable', 503],
    ];

    it('should document a status for every TournamentError code', () => {
      expect(DOCUMENTED_STATUS.map(([code]) => code).sort()).toEqual([...TOURNAMENT_ERROR_CODES].sort());
    });

    it.each(DOCUMENTED_STATUS)('should answer %s with %i and the documented error body', async (code, status) => {
      const response = tournamentProblem(new TournamentError(code, 'm'));
      expect(response?.status).toBe(status);
      expect(response?.headers.get('Cache-Control')).toBe('no-store');
      expect(await response?.json()).toEqual({ error: { code, message: 'm' } });
    });

    it('should leave other errors to the caller', () => {
      expect(tournamentProblem(new Error('boom'))).toBeNull();
    });
  });

  describe('isMutation', () => {
    it('should treat reads as reads and everything else as a mutation', () => {
      expect(isMutation('GET')).toBe(false);
      expect(isMutation('HEAD')).toBe(false);
      for (const method of ['POST', 'PATCH', 'DELETE', 'PUT']) expect(isMutation(method)).toBe(true);
    });
  });

  describe('query parsing', () => {
    it('should pass the list query through and leave missing parameters undefined', () => {
      expect(listQueryOf(`${ENDPOINT}?status=live&cursor=1.abc&limit=5`)).toEqual({ status: 'live', cursor: '1.abc', limit: '5' });
      expect(listQueryOf(ENDPOINT)).toEqual({ status: undefined, cursor: undefined, limit: undefined });
    });

    it('should read the invite code of a private link', () => {
      expect(inviteCodeOf(`${ENDPOINT}/abcdefghjk12?code=k3m4n5p6`)).toBe('k3m4n5p6');
      expect(inviteCodeOf(`${ENDPOINT}/abcdefghjk12`)).toBeUndefined();
    });
  });

  describe('readJsonObject', () => {
    it('should read a JSON object', async () => {
      await expect(readJsonObject(post('{"name":"Spring Cup"}'), { maxBytes: 1024 })).resolves.toEqual({ name: 'Spring Cup' });
    });

    it('should reject arrays, scalars and invalid JSON as invalid_input', async () => {
      const codes = await Promise.all(['[1]', '"text"', 'null', '{oops'].map((body) => rejectionCode(readJsonObject(post(body), { maxBytes: 1024 }))));
      expect(codes).toEqual(['invalid_input', 'invalid_input', 'invalid_input', 'invalid_input']);
    });

    it('should reject a body over the limit as invalid_input', async () => {
      expect(await rejectionCode(readJsonObject(post(JSON.stringify({ name: 'x'.repeat(64) })), { maxBytes: 32 }))).toBe('invalid_input');
    });

    it('should accept an empty body as {} only when every field is optional', async () => {
      await expect(readJsonObject(post(undefined), { maxBytes: 1024, optional: true })).resolves.toEqual({});
      await expect(readJsonObject(post('  '), { maxBytes: 1024, optional: true })).resolves.toEqual({});
      expect(await rejectionCode(readJsonObject(post(undefined), { maxBytes: 1024 }))).toBe('invalid_input');
    });
  });
});
