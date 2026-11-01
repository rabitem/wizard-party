import 'server-only';

import { AccountError, type AccountErrorCode, type AccountIdentity } from '@shared/application/use-cases/account';
import { SocialError, type SocialErrorCode } from '@shared/application/use-cases/friends';

import { readBoundedBody } from '@/app/api/telemetry/client/read-bounded-body';
import { getAccountServices, type AccountServices } from '@/infrastructure/account/account-container';
import { getSessionUser, type SessionUser } from '@/infrastructure/auth/auth';
import { isDatabaseConfigured } from '@/infrastructure/db/neon';
import { getSocialServices, type SocialServices } from '@/infrastructure/social/social-container';

const STATUS: Record<AccountErrorCode, number> = {
  invalid_input: 422,
  not_found: 404,
  conflict: 409,
  quota_exceeded: 413,
  already_imported: 409,
};

const SOCIAL_STATUS: Record<SocialErrorCode, number> = {
  invalid_input: 422,
  not_found: 404,
  forbidden: 403,
  conflict: 409,
  limit_reached: 409,
  rate_limited: 429,
};

export interface AccountRequestContext {
  req: Request;
  user: SessionUser;
  identity: AccountIdentity;
  services: AccountServices;
  /** Social context (friends, invites, presence, inbox); created on first use. */
  readonly social: SocialServices;
}

function problem(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Cookies are SameSite=Lax already; rejecting foreign origins is defense in depth against CSRF. */
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(req.url).origin;
}

/**
 * Wraps an account API handler: authenticates, maps domain errors to HTTP and logs failures.
 * Handlers stay one-liners that call a use case.
 */
export function accountRoute<P = unknown>(
  name: string,
  handler: (context: AccountRequestContext, params: P) => Promise<Response>
) {
  return async (req: Request, routeContext: { params: Promise<P> }): Promise<Response> => {
    if (!isDatabaseConfigured()) return problem(503, 'unavailable', 'accounts are not configured');
    if (MUTATING.has(req.method) && !isSameOrigin(req)) return problem(403, 'forbidden', 'cross-origin request');
    try {
      const user = await getSessionUser(req.headers);
      if (!user) return problem(401, 'unauthenticated', 'sign in required');
      const identity = { userId: user.id };
      const context: AccountRequestContext = {
        req,
        user,
        identity,
        services: getAccountServices(),
        get social() {
          return getSocialServices();
        },
      };
      const response = await handler(context, await routeContext.params);
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    } catch (error) {
      if (error instanceof AccountError) return problem(STATUS[error.code], error.code, error.message);
      if (error instanceof SocialError) return problem(SOCIAL_STATUS[error.code], error.code, error.message);
      console.error(JSON.stringify({ level: 'error', msg: 'account_route_failed', route: name, error: error instanceof Error ? error.message : String(error) }));
      return problem(500, 'internal', 'something went wrong');
    }
  };
}

/** Reads a JSON object body of at most `maxBytes` UTF-8 bytes, without buffering more than that. */
export async function readJson(req: Request, maxBytes = 256 * 1024): Promise<Record<string, unknown>> {
  const text = await readBoundedBody(req, maxBytes);
  if (text === null) throw new AccountError('invalid_input', 'body too large');
  try {
    const value = JSON.parse(text);
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value;
  } catch {
    // fall through
  }
  throw new AccountError('invalid_input', 'expected a JSON object');
}
