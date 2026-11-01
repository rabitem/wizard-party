import { describe, expect, it, vi } from 'vitest';

import { AccountError } from '@shared/application/use-cases/account';

import { readJson } from './account-route';

vi.mock('server-only', () => ({}));
// readJson needs none of the wrapper's adapters; keep their modules (Better Auth, Neon, Redis) out.
vi.mock('@/infrastructure/auth/auth', () => ({ getSessionUser: vi.fn() }));
vi.mock('@/infrastructure/db/neon', () => ({ isDatabaseConfigured: vi.fn() }));
vi.mock('@/infrastructure/account/account-container', () => ({ getAccountServices: () => ({}) }));
vi.mock('@/infrastructure/social/social-container', () => ({ getSocialServices: () => ({}) }));

/** 10 two-byte characters: 21 UTF-16 code units, 31 UTF-8 bytes. */
const UMLAUT_BODY = JSON.stringify({ name: 'ü'.repeat(10) });
const UMLAUT_BODY_BYTES = 31;

function post(body: string | undefined): Request {
  return new Request('https://wizardparty.fun/api/account', { method: 'POST', body });
}

async function rejection(promise: Promise<unknown>): Promise<{ code: string; message: string } | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error instanceof AccountError ? { code: error.code, message: error.message } : { code: 'unexpected', message: String(error) };
  }
}

describe('readJson', () => {
  it('should read a JSON object of exactly the byte limit', async () => {
    await expect(readJson(post(UMLAUT_BODY), UMLAUT_BODY_BYTES)).resolves.toEqual({ name: 'ü'.repeat(10) });
  });

  it('should count the limit in UTF-8 bytes, not characters', async () => {
    expect(await rejection(readJson(post(UMLAUT_BODY), UMLAUT_BODY_BYTES - 1))).toEqual({ code: 'invalid_input', message: 'body too large' });
  });

  it('should refuse arrays, scalars, invalid JSON and an empty body as invalid_input', async () => {
    const outcomes = await Promise.all(['[1]', '"text"', 'null', '{oops', undefined].map((body) => rejection(readJson(post(body)))));
    expect(outcomes).toEqual(outcomes.map(() => ({ code: 'invalid_input', message: 'expected a JSON object' })));
    expect(outcomes).toHaveLength(5);
  });
});
