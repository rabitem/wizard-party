'use client';

import { passkeyClient } from '@better-auth/passkey/client';
import { emailOTPClient, lastLoginMethodClient, twoFactorClient, usernameClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

type TwoFactorListener = (methods: string[]) => void;
let onTwoFactor: TwoFactorListener | null = null;

/** The sign-in form registers here to switch to the 2FA step without a page reload. */
export function setTwoFactorListener(listener: TwoFactorListener | null): void {
  onTwoFactor = listener;
}

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect: ({ twoFactorMethods }) => {
        if (onTwoFactor) onTwoFactor(twoFactorMethods ?? ['totp']);
        else window.location.assign('/sign-in?step=two-factor');
      },
    }),
    passkeyClient(),
    usernameClient(),
    emailOTPClient(),
    lastLoginMethodClient(),
  ],
});

/** Better Auth returns `{ data, error }`; this turns errors into exceptions for simpler UI code. */
export async function unwrap<T>(promise: Promise<{ data: T | null; error: { message?: string; code?: string; status?: number } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new AuthActionError(error.message ?? 'Something went wrong', error.code, error.status, error as Record<string, unknown>);
  return data as T;
}

export class AuthActionError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
    /** The raw error body; some endpoints add fields (e.g. `email` on EMAIL_NOT_VERIFIED). */
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = 'AuthActionError';
  }
}
