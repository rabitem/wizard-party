'use client';

import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface CooldownOverlayProps {
  secondsLeft: number;
}

/**
 * Cooldown countdown overlay for social action buttons
 */
export function CooldownOverlay({ secondsLeft }: CooldownOverlayProps) {
  return (
    <div
      className="absolute inset-0 rounded flex items-center justify-center"
      style={{
        background: THEME_SURFACE.MODAL_BG,
      }}
    >
      <span className="text-amber-400 font-bold text-sm font-serif">
        {secondsLeft}
      </span>
    </div>
  );
}
