'use client';

import type { FormEvent } from 'react';

import { Button, Field } from '../ui';
import { PasswordField } from './PasswordField';
import { UsernameField } from './UsernameField';
import type { UsernameAvailability } from './useUsernameAvailability';

export interface CredentialsValues {
  identifier: string;
  username: string;
  email: string;
  password: string;
}

interface CredentialsFormProps {
  mode: 'sign-in' | 'sign-up';
  values: CredentialsValues;
  onChange: (patch: Partial<CredentialsValues>) => void;
  usernameAvailability: UsernameAvailability;
  /** Sign-up will ask for an email code afterwards. */
  verifiesEmail: boolean;
  busy: boolean;
  disabled: boolean;
  onSubmit: (event: FormEvent) => void;
  onForgotPassword: () => void;
}

const PLAIN_TEXT_INPUT = { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } as const;

/** Password sign-in ("Email or username") and sign-up (username, email). */
export function CredentialsForm({ mode, values, onChange, usernameAvailability, verifiesEmail, busy, disabled, onSubmit, onForgotPassword }: CredentialsFormProps) {
  const signUp = mode === 'sign-up';
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {signUp ? (
        <>
          <UsernameField value={values.username} onChange={(username) => onChange({ username })} availability={usernameAvailability} />
          <Field id="sign-up-email" label="Email" type="email" value={values.email} onChange={(event) => onChange({ email: event.target.value })} autoComplete="email" required />
        </>
      ) : (
        <Field
          id="sign-in-identifier"
          label="Email or username"
          value={values.identifier}
          onChange={(event) => onChange({ identifier: event.target.value })}
          autoComplete="username"
          required
          {...PLAIN_TEXT_INPUT}
        />
      )}

      <PasswordField
        id={signUp ? 'sign-up-password' : 'sign-in-password'}
        label="Password"
        value={values.password}
        onChange={(password) => onChange({ password })}
        autoComplete={signUp ? 'new-password' : 'current-password'}
        hint={signUp ? 'At least 10 characters. Checked against known data breaches.' : undefined}
      />

      {signUp ? null : (
        <div className="flex justify-end -mt-2">
          <button type="button" className="min-h-11 px-1 text-xs text-amber-400/80 hover:text-amber-300 cursor-pointer" onClick={onForgotPassword}>
            Forgot password?
          </button>
        </div>
      )}

      {signUp && verifiesEmail ? <p className="text-xs text-amber-200/45 leading-relaxed">We will email you a 6-digit code to confirm your address.</p> : null}

      <Button type="submit" variant="primary" block loading={busy} disabled={disabled}>
        {signUp ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  );
}
