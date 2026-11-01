import { passkey } from '@better-auth/passkey';
import type { BetterAuthOptions } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { haveIBeenPwned, lastLoginMethod, twoFactor } from 'better-auth/plugins';
import type { Pool } from 'pg';

import type { IEmailSender } from '@shared/application/ports/email-sender.port';

import { SITE_URL } from '@/config/deployment.config';

import { emailTemplates } from '../email/email-templates';
import { emailCodePlugin, usernamePlugin } from './identity-plugins';
import { publicProfileCacheHooks, type InvalidatePublicProfiles } from './public-profile-hooks';
import { DISABLED_AUTH_PATHS, EMAIL_VERIFICATION_REQUIRED_FIELD, signInGuards } from './sign-in-guards';
import { configuredSocialProviders } from './social-providers';
import { USERNAME_CHANGED_AT_FIELD, usernameHooks } from './username-hooks';

export const AUTH_TABLES = {
  user: 'auth_users',
  session: 'auth_sessions',
  account: 'auth_accounts',
  verification: 'auth_verifications',
  twoFactor: 'auth_two_factors',
  passkey: 'auth_passkeys',
} as const;

export const APP_NAME = 'Wizard Party';

/** Per-IP limits (window in seconds) for endpoints that send mail or check secrets. */
const AUTH_RATE_LIMIT_RULES = {
  '/sign-in/email': { window: 60, max: 8 },
  '/sign-in/username': { window: 60, max: 8 },
  '/sign-up/email': { window: 60 * 10, max: 5 },
  '/is-username-available': { window: 60, max: 30 },
  '/request-password-reset': { window: 60 * 10, max: 3 },
  '/send-verification-email': { window: 60 * 5, max: 3 },
  '/email-otp/send-verification-otp': { window: 60 * 5, max: 3 },
  '/email-otp/request-password-reset': { window: 60 * 5, max: 3 },
  '/email-otp/verify-email': { window: 60, max: 10 },
  '/email-otp/check-verification-otp': { window: 60, max: 10 },
  '/email-otp/reset-password': { window: 60, max: 10 },
  '/two-factor/verify-totp': { window: 60, max: 8 },
  '/two-factor/verify-backup-code': { window: 60, max: 5 },
  '/two-factor/send-otp': { window: 60 * 5, max: 3 },
};

/** The public origin of this deployment: production domain, preview URL or localhost. */
export function resolveBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL.replace(/\/$/, '');
  if (env.VERCEL_ENV === 'production') return SITE_URL;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export interface AuthDependencies {
  database: Pool;
  email: IEmailSender;
  rateLimitStorage?: { consume(key: string, rule: { window: number; max: number }): Promise<{ allowed: boolean; retryAfter: number | null }> };
  /**
   * Removes account data the cascades cannot handle: custom sound blobs outside the database, and
   * tournaments the user hosts (open ones are cancelled, the host's name is removed from all).
   */
  purgeExternalData(userId: string): Promise<void>;
  /** Drops cached /u/<username> pages after renames, profile edits and deletion. */
  invalidatePublicProfiles: InvalidatePublicProfiles;
}

type UserHooks = NonNullable<NonNullable<BetterAuthOptions['databaseHooks']>['user']>;

/** One name per account, the email check flag for new accounts and the public profile cache. */
function userHooks(sendMail: boolean, invalidatePublicProfiles: InvalidatePublicProfiles): UserHooks {
  const names = usernameHooks();
  const profileCache = publicProfileCacheHooks(invalidatePublicProfiles);
  return {
    create: {
      before: async (user, context) => {
        const named = await names.create.before(user, context);
        const data = named && typeof named === 'object' ? named.data : user;
        // Accounts created while codes can reach the inbox must confirm their email before a
        // password sign-in; older accounts are grandfathered (sign-in-guards.ts).
        return { data: sendMail ? { ...data, [EMAIL_VERIFICATION_REQUIRED_FIELD]: true } : data };
      },
    },
    update: {
      before: async (data, context) => {
        const named = await names.update.before(data, context);
        await profileCache.update?.before?.(data, context);
        return named;
      },
      after: profileCache.update?.after,
    },
    delete: profileCache.delete,
  };
}

/**
 * Better Auth configuration. Kept free of server-only imports so the schema can be generated
 * and checked from scripts and tests.
 */
export function buildAuthOptions(deps: AuthDependencies, env: NodeJS.ProcessEnv = process.env) {
  const baseURL = resolveBaseUrl(env);
  const { hostname } = new URL(baseURL);
  const sendMail = deps.email.canDeliver;

  return {
    appName: APP_NAME,
    baseURL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: deps.database,
    trustedOrigins: [baseURL, SITE_URL, SITE_URL.replace('://', '://www.')],
    disabledPaths: [...DISABLED_AUTH_PATHS],
    user: {
      modelName: AUTH_TABLES.user,
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => deps.purgeExternalData(user.id),
        ...(sendMail && {
          sendDeleteAccountVerification: async ({ user, url }) => deps.email.send(emailTemplates.deleteAccount(user.email, url)),
        }),
      },
      additionalFields: {
        // See EMAIL_VERIFICATION_REQUIRED_FIELD: set by the create hook below, never by clients.
        [EMAIL_VERIFICATION_REQUIRED_FIELD]: { type: 'boolean', required: false, defaultValue: false, input: false, returned: false },
        // See username-hooks.ts: set on renames, read by the client to show when the next one is allowed.
        [USERNAME_CHANGED_AT_FIELD]: { type: 'date', required: false, input: false, returned: true },
      },
    },
    databaseHooks: { user: userHooks(sendMail, deps.invalidatePublicProfiles) },
    session: {
      modelName: AUTH_TABLES.session,
      expiresIn: 60 * 60 * 24 * 60,
      updateAge: 60 * 60 * 24,
      // Signed session cookie avoids a database read on most requests.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: {
      modelName: AUTH_TABLES.account,
      // Manual linking (Security → Connected accounts) may use a provider account with another email;
      // it only happens from an authenticated session, so it cannot attach someone else's account.
      accountLinking: { enabled: true, trustedProviders: ['google', 'github', 'discord'], allowDifferentEmails: true },
    },
    verification: { modelName: AUTH_TABLES.verification },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      // Enforced per account by signInGuards() instead, so turning mail on does not lock out
      // accounts whose (never checked) address cannot receive the code.
      requireEmailVerification: false,
      // With mail, sign-up never signs in (the email is confirmed first). This also makes a
      // sign-up for an existing email answer like a new one, so emails cannot be enumerated.
      autoSignIn: !sendMail,
      // The owner of an existing account gets a note instead of a code (see signInGuards()).
      ...(sendMail && {
        onExistingUserSignUp: async ({ user }) => deps.email.send(emailTemplates.existingAccount(user.email, `${baseURL}/sign-in`)),
      }),
      resetPasswordTokenExpiresIn: 60 * 60,
      // Link-based reset, still used by "set a password" for provider-only accounts. The forgot
      // password flow uses email codes (emailOTP below).
      sendResetPassword: async ({ user, url }) => deps.email.send(emailTemplates.resetPassword(user.email, url)),
    },
    emailVerification: {
      // The mail itself comes from emailOTP (overrideDefaultEmailVerification): a 6-digit code.
      sendOnSignUp: sendMail,
      // The client sends a fresh code itself (rate limited) when a sign-in hits an unverified email.
      sendOnSignIn: false,
      // After the code the client signs in with the password again, so 2FA still applies.
      autoSignInAfterVerification: false,
    },
    socialProviders: configuredSocialProviders(env),
    rateLimit: {
      enabled: env.NODE_ENV === 'production',
      window: 60,
      max: 120,
      ...(deps.rateLimitStorage && { customStorage: deps.rateLimitStorage }),
      customRules: AUTH_RATE_LIMIT_RULES,
    },
    advanced: {
      useSecureCookies: baseURL.startsWith('https://'),
      ipAddress: { ipAddressHeaders: ['x-real-ip', 'x-forwarded-for'] },
    },
    plugins: [
      usernamePlugin(),
      emailCodePlugin(deps.email),
      // Before twoFactor(): checks the fresh session before 2FA turns it into a challenge.
      signInGuards({ enforceEmailVerification: sendMail }),
      twoFactor({
        issuer: APP_NAME,
        allowPasswordless: true,
        schema: { twoFactor: { modelName: AUTH_TABLES.twoFactor } },
        ...(sendMail && {
          otpOptions: { sendOTP: async ({ user, otp }) => deps.email.send(emailTemplates.twoFactorCode(user.email, otp)) },
        }),
      }),
      passkey({
        rpID: hostname,
        rpName: APP_NAME,
        origin: baseURL,
        schema: { passkey: { modelName: AUTH_TABLES.passkey } },
      }),
      haveIBeenPwned({ customPasswordCompromisedMessage: 'This password appeared in a data breach. Please choose another one.' }),
      lastLoginMethod({ customResolveMethod: (ctx) => (ctx.path === '/sign-in/username' ? 'email' : null) }),
      // Must stay last: lets server actions set cookies.
      nextCookies(),
    ],
  } satisfies BetterAuthOptions;
}
