'use client';

import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface MedievalToggleProps {
  enabled: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Accessible name when the toggle has no visible label of its own. */
  label?: string;
}

/** Brass-and-leather switch used by the ruleset editors. */
export function MedievalToggle({ enabled, onClick, disabled = false, label }: MedievalToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative w-12 h-6 flex-shrink-0 rounded transition-all border border-amber-800/40 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{
        background: enabled
          ? THEME_SURFACE.ACTIVE_BG
          : THEME_SURFACE.INACTIVE_BG,
      }}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-0.5'
        }`}
        style={{
          background: enabled
            ? 'linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)'
            : 'linear-gradient(180deg, var(--accent-dim) 0%, color-mix(in srgb, var(--accent-dim), black 30%) 100%)',
          boxShadow: enabled ? '0 0 8px color-mix(in srgb, var(--accent) 40%, transparent)' : 'none',
        }}
      />
    </button>
  );
}
