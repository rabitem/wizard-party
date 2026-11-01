'use client';

import { useId, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';

import { FIELD_BG, INSET_BG } from '../account/account-surfaces';

/*
 * Form controls of the tournament form in the account area's look (amber hairlines, serif labels,
 * 44px touch targets). Each is labelled and keyboard operable.
 */

export function FieldLabel({ children, htmlFor, id }: { children: ReactNode; htmlFor?: string; id?: string }) {
  return (
    <label htmlFor={htmlFor} id={id} className="block mb-1.5 text-[11px] uppercase tracking-wider text-amber-400/70 font-serif">
      {children}
    </label>
  );
}

export function FieldMessage({ id, error, hint }: { id: string; error?: string | null; hint?: ReactNode }) {
  const message = error || hint;
  if (!message) return null;
  return (
    <span id={id} className={`mt-1.5 block text-xs ${error ? 'text-red-300/90' : 'text-amber-200/40'}`}>
      {message}
    </span>
  );
}

export function TextArea({ label, value, onChange, maxLength, placeholder, error, hint }: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  maxLength: number;
  placeholder?: string;
  error?: string | null;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-message`}
        className="wp-field w-full resize-y px-4 py-3 rounded-xl border border-amber-700/25 placeholder-amber-600/30 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10 transition-all text-amber-50 text-base sm:text-sm aria-[invalid=true]:border-red-700/60"
        style={{ background: FIELD_BG }}
      />
      <div className="flex justify-between gap-3">
        <FieldMessage id={`${id}-message`} error={error} hint={hint} />
        <span className="mt-1.5 ml-auto shrink-0 text-[11px] tabular-nums text-amber-200/35" aria-hidden>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}

/** − value + for small whole numbers. */
export function Stepper({ label, value, min, max, onChange, hint, suffix }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  hint?: ReactNode;
  suffix?: string;
}) {
  const id = useId();
  const buttonClass =
    'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-700/40 text-amber-200 transition-colors hover:border-amber-500/60 hover:bg-amber-900/25 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer';
  return (
    <div>
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <div className="flex items-center gap-2" role="group" aria-labelledby={`${id}-label`}>
        <button type="button" className={buttonClass} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer: ${label}`}>
          <Minus className="w-4 h-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          aria-labelledby={`${id}-label`}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="wp-field h-11 w-20 rounded-xl border border-amber-700/25 text-center text-amber-50 tabular-nums focus:outline-none focus:border-amber-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ background: FIELD_BG }}
        />
        <button type="button" className={buttonClass} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`More: ${label}`}>
          <Plus className="w-4 h-4" />
        </button>
        {suffix ? <span className="text-sm text-amber-200/50">{suffix}</span> : null}
      </div>
      <FieldMessage id={`${id}-hint`} hint={hint} />
    </div>
  );
}

export interface SegmentOption<T> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

/** Radio group drawn as pills (short labels) or cards (with descriptions). */
export function Segmented<T extends string | number | null>({ label, value, options, onChange, layout = 'pills' }: {
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (next: T) => void;
  layout?: 'pills' | 'cards';
}) {
  const id = useId();
  return (
    <div>
      <FieldLabel id={id}>{label}</FieldLabel>
      <div role="radiogroup" aria-labelledby={id} className={layout === 'cards' ? 'grid gap-2 sm:grid-cols-2' : 'flex flex-wrap gap-1.5'}>
        {options.map((option) => {
          const checked = option.value === value;
          if (layout === 'cards') {
            return (
              <button
                key={String(option.value)}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => onChange(option.value)}
                className={`flex min-h-11 items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors cursor-pointer ${checked ? 'border-amber-500/70 bg-amber-900/30' : 'border-amber-800/30 hover:border-amber-700/60'}`}
                style={checked ? undefined : { background: INSET_BG }}
              >
                {option.icon ? <span className={`mt-0.5 shrink-0 ${checked ? 'text-amber-300' : 'text-amber-600/70'}`}>{option.icon}</span> : null}
                <span className="min-w-0">
                  <span className={`font-serif block text-sm ${checked ? 'text-amber-50' : 'text-amber-100/80'}`}>
                    {option.label}
                  </span>
                  {option.description ? <span className="mt-0.5 block text-xs leading-relaxed text-amber-200/45">{option.description}</span> : null}
                </span>
              </button>
            );
          }
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(option.value)}
              className={`font-serif inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border px-4 text-sm transition-all cursor-pointer ${checked ? 'border-amber-500/60 bg-amber-900/40 text-amber-100' : 'border-amber-900/40 text-amber-200/60 hover:text-amber-100 hover:border-amber-700/50'}`}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
