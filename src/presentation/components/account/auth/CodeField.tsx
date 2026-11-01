'use client';

import { Field } from '../ui';
import { AUTH_FLOW_CONFIG } from './auth-flow.config';
import { sanitizeCode } from './auth-flow.utils';

/** Numeric one-time code input; strips spaces and dashes from pasted codes. */
export function CodeField({ value, onChange, label = '6-digit code', autoFocus = true }: { value: string; onChange: (value: string) => void; label?: string; autoFocus?: boolean }) {
  return (
    <Field
      id="email-code"
      label={label}
      value={value}
      onChange={(event) => onChange(sanitizeCode(event.target.value))}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern={`[0-9]{${AUTH_FLOW_CONFIG.CODE_LENGTH}}`}
      placeholder="123456"
      maxLength={AUTH_FLOW_CONFIG.CODE_LENGTH + 4}
      autoFocus={autoFocus}
      required
      className="[&_input]:tracking-[0.4em] [&_input]:text-lg [&_input]:font-mono"
    />
  );
}
