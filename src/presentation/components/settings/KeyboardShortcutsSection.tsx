'use client';

import { Keyboard } from 'lucide-react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

const SHORTCUTS = [
  { action: 'Select card 1-9', key: '1-9' },
  { action: 'Play selected card', key: 'Enter' },
  { action: 'Open settings', key: 'Esc' },
  { action: 'Send emote', key: 'E' },
];

export function KeyboardShortcutsSection() {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Keyboard className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Bindings
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
      <div
        className="space-y-2 text-sm rounded p-4 border border-amber-800/30"
        style={{
          background: THEME_SURFACE.CARD_BG,
        }}
      >
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.key} className="flex justify-between items-center">
            <span
              className="text-amber-200/70"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {shortcut.action}
            </span>
            <kbd
              className="px-2.5 py-1 rounded text-amber-400/90 font-mono text-xs border border-amber-700/40"
              style={{
                background: THEME_SURFACE.SELECTED_BG,
              }}
            >
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
    </section>
  );
}
