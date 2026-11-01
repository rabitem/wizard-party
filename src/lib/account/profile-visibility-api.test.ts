import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Better Auth client binds `fetch` when the module is created, so the stub (a same-origin
 * server that answers with `server.answer`) is installed before the imports run.
 */
const server = vi.hoisted(() => {
  const state = { sent: [] as Request[], answer: () => Response.json({ status: true }) };
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    state.sent.push(new Request(new URL(String(input), 'https://wizardparty.test'), init));
    return state.answer();
  });
  return state;
});

import { AuthActionError } from './auth-client';
import { changeUsername, updateProfileVisibility } from './profile-visibility-api';

let sent: Request[];

beforeEach(() => {
  server.sent = [];
  sent = server.sent;
  server.answer = () => Response.json({ status: true });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('updateProfileVisibility', () => {
  it('should PATCH the visibility flags and resolve with the stored profile', async () => {
    const profile = { userId: 'u1', tagline: null, createdAt: 1, isPublic: false, showHistory: false };
    server.answer = () => Response.json({ profile });

    await expect(updateProfileVisibility({ isPublic: false, showHistory: false })).resolves.toEqual(profile);

    expect(sent).toHaveLength(1);
    expect(sent[0].method).toBe('PATCH');
    expect(new URL(sent[0].url).pathname).toBe('/api/account');
    expect(await sent[0].json()).toEqual({ isPublic: false, showHistory: false });
  });
});

describe('changeUsername', () => {
  it('should send the lowercase handle and keep the typed casing as the display name', async () => {
    await changeUsername('  MerLin ');

    expect(sent).toHaveLength(1);
    expect(sent[0].method).toBe('POST');
    expect(new URL(sent[0].url).pathname).toBe('/api/auth/update-user');
    expect(await sent[0].json()).toMatchObject({ username: 'merlin', displayUsername: 'MerLin' });
  });

  it('should reject with the Better Auth error code, message and status', async () => {
    server.answer = () => Response.json({ code: 'USERNAME_IS_ALREADY_TAKEN', message: 'Username is already taken' }, { status: 400 });

    const error = await changeUsername('merlin').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AuthActionError);
    expect(error).toMatchObject({ code: 'USERNAME_IS_ALREADY_TAKEN', message: 'Username is already taken', status: 400 });
  });
});
