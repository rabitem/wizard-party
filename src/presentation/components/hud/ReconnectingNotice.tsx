'use client';

import { Loader2 } from 'lucide-react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

/**
 * Non-blocking notice shown while the connection is re-established mid-game.
 * The table stays mounted underneath; commands are queued until the socket reopens.
 * Rendered into the HUD prompt region (non-interactive slot).
 */
export function ReconnectingNotice() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none"
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-2 border-amber-800/40 text-amber-200/80 text-sm"
        style={{
          background: THEME_SURFACE.MODAL_BG,
          fontFamily: 'var(--font-serif)',
        }}
      >
        <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
        <span className="whitespace-nowrap">Reconnecting…</span>
      </div>
    </div>
  );
}
