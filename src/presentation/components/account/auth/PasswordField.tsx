'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Field } from '../ui';
import { AUTH_FLOW_CONFIG } from './auth-flow.config';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'new-password' | 'current-password';
  hint?: string;
  id?: string;
}

export function PasswordField({ label, value, onChange, autoComplete, hint, id }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Field
        id={id}
        label={label}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        minLength={autoComplete === 'new-password' ? AUTH_FLOW_CONFIG.PASSWORD_MIN_LENGTH : undefined}
        maxLength={AUTH_FLOW_CONFIG.PASSWORD_MAX_LENGTH}
        hint={hint}
        className="[&_input]:pr-12"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-[26px] w-11 h-11 inline-flex items-center justify-center rounded-lg text-amber-600/70 hover:text-amber-300 cursor-pointer"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
