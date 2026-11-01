'use client';

import { RefreshCw, Sparkles, X } from 'lucide-react';

import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface NewVersionNoticeProps {
  onReload: () => void;
  onDismiss: () => void;
}

/** "A new version is available" with a reload button; a reload resumes the player's seat. */
export function NewVersionNotice({ onReload, onDismiss }: NewVersionNoticeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 border-2 border-amber-700/50 text-amber-200/90 text-sm shadow-lg"
      style={{ background: THEME_SURFACE.MODAL_BG, fontFamily: 'var(--font-serif)' }}
    >
      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden />
      <span className="whitespace-nowrap">New version available</span>
      <button
        type="button"
        onClick={onReload}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-600/60 text-amber-300 hover:text-amber-100 hover:border-amber-400/80 cursor-pointer transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" aria-hidden />
        Reload
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="w-6 h-6 inline-flex items-center justify-center text-amber-300/60 hover:text-amber-100 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
