import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { isEmailCategory, type EmailCategory } from '@shared/domain/social';

/** Domain separation: the derived key is used for nothing but unsubscribe links. */
const DERIVATION_LABEL = 'wizard-party/email-unsubscribe/v1';
const SIGNATURE_CHARS = 43;

/**
 * EMAIL_UNSUBSCRIBE_SECRET keeps links working when the auth secret is rotated; without it the key
 * is derived from BETTER_AUTH_SECRET.
 */
function signingKey(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.EMAIL_UNSUBSCRIBE_SECRET || env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('EMAIL_UNSUBSCRIBE_SECRET or BETTER_AUTH_SECRET is required to sign unsubscribe links');
  return createHmac('sha256', secret).update(DERIVATION_LABEL).digest('hex');
}

function sign(payload: string): string {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url').slice(0, SIGNATURE_CHARS);
}

/**
 * Stateless unsubscribe token: `<category>.<userId as base64url>.<hmac>`. It never expires, as
 * mailbox providers expect unsubscribe links to keep working, and only ever turns mail off.
 */
export function createUnsubscribeToken(userId: string, category: EmailCategory): string {
  const payload = `${category}.${Buffer.from(userId).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyUnsubscribeToken(token: unknown): { userId: string; category: EmailCategory } | null {
  if (typeof token !== 'string' || token.length > 300) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [category, encodedUser, signature] = parts;
  if (!isEmailCategory(category)) return null;
  const expected = Buffer.from(sign(`${category}.${encodedUser}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const userId = Buffer.from(encodedUser, 'base64url').toString('utf8');
  return userId ? { userId, category } : null;
}
