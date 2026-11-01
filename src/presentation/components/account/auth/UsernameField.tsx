'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';

import { USERNAME_RULES } from '@shared/domain/account/username';

import { Field } from '../ui';
import type { UsernameAvailability } from './useUsernameAvailability';

const DEFAULT_HINT = `Shown at the table and to friends, and used to sign in. ${USERNAME_RULES.MIN_LENGTH}–${USERNAME_RULES.MAX_LENGTH} letters, numbers, _ or .`;

function availabilityHint(availability: UsernameAvailability) {
  switch (availability.status) {
    case 'checking':
      return (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Checking availability…
        </span>
      );
    case 'available':
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-300/85">
          <CheckCircle2 className="w-3 h-3" /> Available
        </span>
      );
    case 'unknown':
      return 'Could not check availability right now. You can still try it.';
    default:
      return DEFAULT_HINT;
  }
}

function availabilityError(availability: UsernameAvailability): string | null {
  if (availability.status === 'invalid') return availability.message;
  if (availability.status === 'taken') return 'This username is already taken.';
  return null;
}

/** Live field: "taken" or "invalid" replacing the hint is announced to screen readers. */
export function UsernameField({ id = 'sign-up-username', value, onChange, availability }: { id?: string; value: string; onChange: (value: string) => void; availability: UsernameAvailability }) {
  const error = availabilityError(availability);
  return (
    <Field
      id={id}
      label="Username"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="username"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      required
      minLength={USERNAME_RULES.MIN_LENGTH}
      maxLength={USERNAME_RULES.MAX_LENGTH}
      error={error}
      hint={availabilityHint(availability)}
      live
    />
  );
}
