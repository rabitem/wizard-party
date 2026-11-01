import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { deleteSessionCookie } from 'better-auth/cookies';

export const EMAIL_NOT_VERIFIED_CODE = 'EMAIL_NOT_VERIFIED';
export const ACCOUNT_PASSWORD_MISMATCH_CODE = 'ACCOUNT_PASSWORD_MISMATCH';

/**
 * Per-user flag (auth_users."emailVerificationRequired"), set when an account is created while
 * email delivery works. Accounts from before that keep signing in with an unconfirmed email:
 * their address was never checked, so it may not receive mail, and email changes are not offered.
 */
export const EMAIL_VERIFICATION_REQUIRED_FIELD = 'emailVerificationRequired';

/** Endpoints of the email-otp and core plugins this app does not offer. */
export const DISABLED_AUTH_PATHS = [
  // Passwordless email sign-in would skip 2FA and create accounts without a username.
  '/sign-in/email-otp',
  // Deprecated alias of /email-otp/request-password-reset.
  '/forget-password/email-otp',
  // Email changes are not offered yet.
  '/email-otp/request-email-change',
  '/email-otp/change-email',
] as const;

const PASSWORD_SIGN_IN_PATHS: ReadonlySet<string> = new Set(['/sign-in/email', '/sign-in/username']);

interface UserRow {
  id: string;
  email: string;
  emailVerified: boolean;
  [EMAIL_VERIFICATION_REQUIRED_FIELD]?: boolean | null;
}

export interface SignInGuardOptions {
  /** True when mail can be delivered; only then are new accounts asked to confirm their email. */
  enforceEmailVerification: boolean;
}

/**
 * App-specific hooks around the stock plugins. Must be registered before twoFactor(): the
 * verification check has to see the fresh session before 2FA turns it into a challenge.
 *
 * - Sign-in codes are not offered, so the generic OTP sender refuses that type.
 * - Email verification is enforced per account (see EMAIL_VERIFICATION_REQUIRED_FIELD) instead
 *   of Better Auth's global requireEmailVerification. After the password was accepted, an
 *   unconfirmed account gets its session revoked and EMAIL_NOT_VERIFIED with the account email
 *   (also for a username sign-in), so the client can show the code step.
 * - Confirming an email by code needs proof that the caller owns the account: a session of
 *   that account or its password. Otherwise anyone who signs up with a victim's address first
 *   (pre-account hijacking) would get the account confirmed by the victim, who only wanted to
 *   create their own.
 */
export function signInGuards({ enforceEmailVerification }: SignInGuardOptions): BetterAuthPlugin {
  return {
    id: 'wizard-sign-in-guards',
    hooks: {
      before: [
        {
          matcher: (context) => context.path === '/email-otp/send-verification-otp',
          handler: createAuthMiddleware(async (ctx) => {
            if ((ctx.body as { type?: unknown } | undefined)?.type === 'sign-in') {
              throw new APIError('BAD_REQUEST', { message: 'Sign-in codes are not available.' });
            }
          }),
        },
        {
          matcher: (context) => context.path === '/email-otp/verify-email',
          handler: createAuthMiddleware(async (ctx) => {
            const body = (ctx.body ?? {}) as { email?: unknown; password?: unknown };
            const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
            if (!email) return;
            const session = await getSessionFromCtx(ctx);
            if (session?.user.email.toLowerCase() === email) return;

            const record = await ctx.context.internalAdapter.findUserByEmail(email, { includeAccounts: true });
            // Unknown emails fail in the endpoint itself; provider-only accounts have no password to squat.
            const credential = record?.accounts.find((account) => account.providerId === 'credential' && account.accountId === record.user.id);
            if (!credential?.password) return;
            const password = typeof body.password === 'string' ? body.password : '';
            if (password && (await ctx.context.password.verify({ hash: credential.password, password }))) return;
            throw new APIError('FORBIDDEN', {
              message: 'This email already has an account with a different password. Sign in, or reset the password with “Forgot password”.',
              code: ACCOUNT_PASSWORD_MISMATCH_CODE,
            });
          }),
        },
      ],
      after: [
        {
          matcher: (context) => enforceEmailVerification && PASSWORD_SIGN_IN_PATHS.has(context.path ?? ''),
          handler: createAuthMiddleware(async (ctx) => {
            const fresh = ctx.context.newSession;
            if (!fresh || fresh.user.emailVerified) return;
            const user = await ctx.context.adapter.findOne<UserRow>({ model: 'user', where: [{ field: 'id', value: fresh.user.id }] });
            if (!user || user.emailVerified || user[EMAIL_VERIFICATION_REQUIRED_FIELD] !== true) return;
            // The password was right but the email is unconfirmed: no session until the code.
            deleteSessionCookie(ctx, true);
            await ctx.context.internalAdapter.deleteSession(fresh.session.token);
            ctx.context.setNewSession(null);
            throw new APIError('FORBIDDEN', { message: 'Email not verified', code: EMAIL_NOT_VERIFIED_CODE, email: user.email });
          }),
        },
      ],
    },
  };
}
