import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import type { Pool } from 'pg';
import { vi } from 'vitest';

import type { EmailMessage } from '@shared/application/ports/email-sender.port';

import { AUTH_TABLES, buildAuthOptions } from './auth-options';

export const PASSWORD = 'correct-horse-battery';
export const OTHER_PASSWORD = 'squatter-password-99';

type Row = Record<string, unknown>;

function parseBody(text: string): Row | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as Row;
  } catch {
    // Disabled paths answer a plain "Not Found".
    return null;
  }
}

/** Real Better Auth with the app's options, an in-memory database and a recording mailer. */
export function createTestAuth({ canDeliver }: { canDeliver: boolean }) {
  const mail: EmailMessage[] = [];
  const invalidatePublicProfiles = vi.fn();
  const options = buildAuthOptions(
    {
      database: {} as Pool,
      email: { canDeliver, send: async (message) => void mail.push(message) },
      purgeExternalData: async () => {},
      invalidatePublicProfiles,
    },
    { BETTER_AUTH_SECRET: 'test-secret-'.padEnd(48, 'x'), BETTER_AUTH_URL: 'http://localhost:3000', NODE_ENV: 'test' } as NodeJS.ProcessEnv
  );
  const db: Record<string, Row[]> = Object.fromEntries(Object.values(AUTH_TABLES).map((table) => [table, []]));
  // The breached-password check calls an external API; everything else runs as in production.
  const plugins = options.plugins.filter((plugin) => plugin.id !== 'have-i-been-pwned');
  const auth = betterAuth({ ...options, database: memoryAdapter(db), plugins });

  const users = () => db[AUTH_TABLES.user];
  const userByEmail = (email: string) => users().find((user) => user.email === email);
  /** Edits a stored user directly, e.g. to model rows from before a migration. */
  const patchUser = (email: string, patch: Row) => {
    const user = userByEmail(email);
    if (!user) throw new Error(`No user ${email}`);
    Object.assign(user, patch);
  };
  const lastCode = (email: string) => {
    const message = [...mail].reverse().find((item) => item.to === email && /\b\d{6}\b/.test(item.text));
    return message?.text.match(/\b(\d{6})\b/)?.[1] ?? null;
  };

  const post = async (path: string, body: Record<string, unknown>, cookie?: string) => {
    const response = await auth.handler(
      new Request(`http://localhost:3000/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3000', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      })
    );
    return { status: response.status, body: parseBody(await response.text()), cookies: response.headers.getSetCookie() };
  };

  const signUp = (email: string, username: string, password = PASSWORD) =>
    post('/sign-up/email', { name: username, email, password, username, displayUsername: username });

  return { db, mail, users, userByEmail, patchUser, lastCode, post, signUp, invalidatePublicProfiles };
}

/** "name=value" pairs of the cookies a response set (expired ones left out). */
export function liveCookies(cookies: string[]): string {
  return cookies
    .filter((cookie) => !/max-age=0/i.test(cookie))
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}
