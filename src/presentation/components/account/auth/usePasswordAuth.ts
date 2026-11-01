'use client';

import { useCallback } from 'react';

import { AuthActionError, authClient, unwrap } from '@/lib/account/auth-client';

import { parseSignInIdentifier } from './auth-flow.utils';

/** Pending email confirmation: who, when the code went out, and where to go afterwards. */
export interface PendingVerification {
  email: string;
  sentAt: number | null;
  notice: string | null;
  destination: string;
}

interface PasswordAuthOptions {
  /** Refreshes the session and navigates. */
  finish: (destination: string) => Promise<void>;
  /** Called when the email must be confirmed by code first. */
  onVerificationNeeded: (verification: PendingVerification) => void;
}

export const WELCOME_DESTINATION = '/account?welcome=1';

/**
 * A sign-up answers the same whether or not the email already has an account (no enumeration).
 * For an existing account the server mails a note instead of a code, so say so up front.
 */
export const SIGN_UP_CODE_NOTICE = 'If this email already has an account, we sent a note instead of a code: go back to sign in, or use “Forgot password”.';

function isEmailNotVerified(error: unknown): error is AuthActionError {
  return error instanceof AuthActionError && error.code === 'EMAIL_NOT_VERIFIED';
}

/** The email to confirm: typed directly, or returned by the server for a username sign-in. */
function accountEmailOf(identifier: string, error: AuthActionError): string | null {
  const parsed = parseSignInIdentifier(identifier);
  if (parsed.kind === 'email') return parsed.email;
  return typeof error.details.email === 'string' ? error.details.email : null;
}

/** Password sign-in by email or username. Returns false when the 2FA step took over. */
export async function signInWithPassword(login: string, password: string): Promise<boolean> {
  const parsed = parseSignInIdentifier(login);
  const result =
    parsed.kind === 'email'
      ? await unwrap(authClient.signIn.email({ email: parsed.email, password, rememberMe: true }))
      : await unwrap(authClient.signIn.username({ username: parsed.username, password, rememberMe: true }));
  // With 2FA enabled the response carries no session; the 2FA listener switches the view.
  return !(result && 'twoFactorRedirect' in result && result.twoFactorRedirect);
}

/** Sends a fresh verification code; a failure (e.g. rate limit) still lets the old code work. */
async function sendFreshCode(email: string): Promise<{ sentAt: number | null; notice: string }> {
  try {
    await unwrap(authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' }));
    return { sentAt: Date.now(), notice: 'Please confirm your email before your first sign-in.' };
  } catch {
    return { sentAt: null, notice: 'We could not send a new code right now. Use the code from your last email or resend in a moment.' };
  }
}

/** Sign-in, sign-up and post-verification continuation for the password form. */
export function usePasswordAuth({ finish, onVerificationNeeded }: PasswordAuthOptions) {
  const signIn = useCallback(
    async (identifier: string, password: string, destination: string) => {
      try {
        if (await signInWithPassword(identifier, password)) await finish(destination);
      } catch (err) {
        if (!isEmailNotVerified(err)) throw err;
        const email = accountEmailOf(identifier, err);
        if (!email) throw new AuthActionError('Please confirm your email first. Sign in with your email address to get a new code.');
        onVerificationNeeded({ email, ...(await sendFreshCode(email)), destination });
      }
    },
    [finish, onVerificationNeeded]
  );

  const signUp = useCallback(
    async (input: { email: string; username: string; password: string }) => {
      const email = input.email.trim();
      const handle = input.username.trim();
      // Better Auth requires a name; the server mirrors the username into it (username-hooks.ts).
      const result = await unwrap(authClient.signUp.email({ name: handle, email, password: input.password, username: handle, displayUsername: handle }));
      if (result?.token) {
        await finish(WELCOME_DESTINATION);
        return;
      }
      // Email confirmation required: the server mailed the first code (or, for an existing
      // account, a note). Confirming needs this password, so an account created by someone else
      // with this address cannot be confirmed from here.
      onVerificationNeeded({ email, sentAt: Date.now(), notice: SIGN_UP_CODE_NOTICE, destination: WELCOME_DESTINATION });
    },
    [finish, onVerificationNeeded]
  );

  /** After the code: sign in again with the password (not auto sign-in) so 2FA still applies. */
  const continueAfterVerification = useCallback(
    async (verification: PendingVerification, password: string) => {
      if (await signInWithPassword(verification.email, password)) await finish(verification.destination);
    },
    [finish]
  );

  return { signIn, signUp, continueAfterVerification };
}
