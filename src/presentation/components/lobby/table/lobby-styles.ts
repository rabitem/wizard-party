/**
 * Shared look of the round-table lobby. Colors come from theme tokens (--surface, --glow and the
 * remapped amber scale) so every UI theme restyles the lobby without per-theme code.
 */
export const SERIF = { fontFamily: 'Georgia, serif' } as const;

export const GOLD_BUTTON_STYLE = {
  background: 'linear-gradient(180deg, var(--color-amber-300) 0%, var(--color-amber-500) 55%, var(--color-amber-700) 100%)',
  boxShadow: '0 4px 20px var(--glow), inset 0 1px 0 rgba(255,255,255,0.25)',
  color: 'var(--color-amber-950)',
  ...SERIF,
} as const;

export const SURFACE_STYLE = {
  background: 'var(--surface)',
  borderColor: 'var(--surface-border)',
} as const;

export const FIELD_BG = 'rgba(0,0,0,0.35)';

export const CHIP_CLASS = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs';
