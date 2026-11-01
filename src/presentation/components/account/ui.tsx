'use client';

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';

import { FIELD_BG, PANEL_BG, PANEL_SHADOW } from './account-surfaces';

/*
 * Small design-system primitives for the account area, matching the game's parchment-and-amber
 * look (Georgia serif, amber borders, theme surfaces) so every account screen stays consistent.
 * Backgrounds come from the active UI theme (see account-surfaces.ts).
 */

export const SERIF = { fontFamily: 'Georgia, serif' } as const;

export function Panel({ children, className = '', accent = true }: { children: ReactNode; className?: string; accent?: boolean }) {
  return (
    <section
      className={`relative rounded-2xl border border-[var(--surface-border)] overflow-hidden ${className}`}
      style={{
        background: PANEL_BG,
        boxShadow: PANEL_SHADOW,
      }}
    >
      {accent ? <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" /> : null}
      {children}
    </section>
  );
}

export function SectionHeading({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-amber-100 text-base sm:text-lg" style={SERIF}>
          {icon ? <span className="text-amber-500/80 shrink-0">{icon}</span> : null}
          {title}
        </h2>
        {description ? <p className="mt-1 text-xs sm:text-sm text-amber-200/50 leading-relaxed">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-2 border-amber-600/60 text-amber-100 hover:border-amber-500/80 hover:text-white bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface-border)_100%,transparent)_0%,color-mix(in_srgb,var(--page-base)_70%,transparent)_100%)] shadow-[0_4px_20px_color-mix(in_srgb,var(--glow)_40%,transparent)]',
  secondary: 'border border-amber-700/40 text-amber-200/90 hover:border-amber-600/60 hover:bg-amber-900/25 bg-[color-mix(in_srgb,var(--page-base)_45%,transparent)]',
  ghost: 'border border-transparent text-amber-300/80 hover:text-amber-100 hover:bg-amber-900/20',
  danger: 'border border-red-800/50 text-red-300 hover:border-red-600/70 hover:bg-red-950/40 bg-[rgba(60,15,10,0.35)]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export function Button({ variant = 'secondary', loading, icon, block, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 min-h-11 text-sm transition-all cursor-pointer active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
      style={SERIF}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /**
   * For hints and errors that change while typing (e.g. availability checks): the message area
   * stays mounted as a polite live region, so screen readers announce every change, including
   * an error replacing the hint.
   */
  live?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(({ label, hint, error, live = false, id, className = '', ...rest }, ref) => {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\W+/g, '-')}`;
  const messageId = `${inputId}-message`;
  const message = error || hint || null;
  const hasMessageArea = live || message !== null;
  const describedBy = [rest['aria-describedby'], hasMessageArea ? messageId : null].filter(Boolean).join(' ') || undefined;
  return (
    <label htmlFor={inputId} className={`block ${className}`}>
      <span className="block mb-1.5 text-[11px] uppercase tracking-wider text-amber-400/70" style={SERIF}>
        {label}
      </span>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        {...rest}
        aria-describedby={describedBy}
        className="wp-field w-full px-4 py-3 rounded-xl border border-amber-700/25 placeholder-amber-600/30 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/10 transition-all text-amber-50 text-base sm:text-sm aria-[invalid=true]:border-red-700/60"
        style={{ background: FIELD_BG }}
      />
      {hasMessageArea ? (
        <span
          id={messageId}
          aria-live={live ? 'polite' : undefined}
          className={`block text-xs ${message ? 'mt-1.5' : ''} ${error ? 'text-red-300/90' : 'text-amber-200/40'}`}
        >
          {message}
        </span>
      ) : null}
    </label>
  );
});
Field.displayName = 'Field';

type NoticeTone = 'info' | 'success' | 'error' | 'warning';

const NOTICE: Record<NoticeTone, { className: string; icon: ReactNode }> = {
  info: { className: 'border-amber-600/30 bg-amber-900/15 text-amber-200/85', icon: <Info className="w-4 h-4" /> },
  warning: { className: 'border-amber-500/40 bg-amber-800/20 text-amber-200', icon: <AlertTriangle className="w-4 h-4" /> },
  success: { className: 'border-emerald-700/40 bg-emerald-950/30 text-emerald-200/90', icon: <CheckCircle2 className="w-4 h-4" /> },
  error: { className: 'border-red-800/50 bg-red-950/35 text-red-200/90', icon: <AlertTriangle className="w-4 h-4" /> },
};

export function Notice({ tone = 'info', children, className = '' }: { tone?: NoticeTone; children: ReactNode; className?: string }) {
  const { className: toneClass, icon } = NOTICE[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 items-start rounded-xl border px-3.5 py-3 text-xs sm:text-sm leading-relaxed ${toneClass} ${className}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-amber-700/20" />
      {label ? <span className="text-amber-600/50 text-[11px] uppercase tracking-wider" style={SERIF}>{label}</span> : null}
      <div className="flex-1 h-px bg-amber-700/20" />
    </div>
  );
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-2 rounded-full bg-black/40 border border-amber-900/40 overflow-hidden ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-300 transition-[width] duration-700" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Labelled on/off switch row used by the account settings panels. */
export function Toggle({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-full min-h-11 flex items-center justify-between gap-4 rounded-xl border border-amber-800/25 px-3 py-3 text-left transition-colors hover:border-amber-700/50 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
      style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 45%, transparent)' }}
    >
      <span className="min-w-0">
        <span className="block text-sm text-amber-100" style={SERIF}>
          {label}
        </span>
        <span className="block mt-0.5 text-xs text-amber-200/45 leading-relaxed">{description}</span>
      </span>
      <span
        aria-hidden
        className={`relative shrink-0 w-11 h-6 rounded-full border transition-colors ${checked ? 'bg-amber-600/70 border-amber-500/70' : 'bg-black/40 border-amber-900/60'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full transition-transform ${checked ? 'translate-x-5 bg-amber-100' : 'bg-amber-200/40'}`} />
      </span>
    </button>
  );
}

/** Human readable message for errors thrown by auth or account calls. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
