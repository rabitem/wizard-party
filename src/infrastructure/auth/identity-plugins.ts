import { emailOTP, username } from 'better-auth/plugins';

import type { IEmailSender } from '@shared/application/ports/email-sender.port';
import { USERNAME_RULES, normalizeUsername, validateUsername } from '@shared/domain/account/username';

import { emailTemplates } from '../email/email-templates';

/** One-time email codes (verification and password reset). */
export const EMAIL_CODE = {
  LENGTH: 6,
  EXPIRES_IN_SECONDS: 10 * 60,
  ALLOWED_ATTEMPTS: 5,
} as const;

const isValidUsername = (value: string) => validateUsername(value) === null;

/** Unique handle for sign-in and /u/<username>; rules shared with the client (domain layer). */
export function usernamePlugin() {
  return username({
    minUsernameLength: USERNAME_RULES.MIN_LENGTH,
    maxUsernameLength: USERNAME_RULES.MAX_LENGTH,
    usernameValidator: isValidUsername,
    usernameNormalization: normalizeUsername,
    displayUsernameValidator: isValidUsername,
    displayUsernameNormalization: (value) => value.trim(),
  });
}

/**
 * 6-digit email codes for email verification (replacing verification links) and password reset.
 * Passwordless code sign-in stays off (see DISABLED_AUTH_PATHS) so 2FA cannot be skipped.
 */
export function emailCodePlugin(email: IEmailSender) {
  return emailOTP({
    otpLength: EMAIL_CODE.LENGTH,
    expiresIn: EMAIL_CODE.EXPIRES_IN_SECONDS,
    allowedAttempts: EMAIL_CODE.ALLOWED_ATTEMPTS,
    storeOTP: 'hashed',
    disableSignUp: true,
    overrideDefaultEmailVerification: true,
    sendVerificationOTP: async ({ email: to, otp, type }) =>
      email.send(emailTemplates.emailCode(to, type, otp, Math.round(EMAIL_CODE.EXPIRES_IN_SECONDS / 60))),
  });
}
