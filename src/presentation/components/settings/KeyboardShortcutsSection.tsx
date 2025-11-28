'use client';

import { Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { action: 'Select card 1-9', key: '1-9' },
  { action: 'Play selected card', key: 'Enter' },
  { action: 'Open settings', key: 'Esc' },
  { action: 'Send emote', key: 'E' },
];

export function KeyboardShortcutsSection() {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-medium text-amber-400/60 uppercase tracking-widest mb-4">
        <Keyboard className="w-4 h-4" />
        Keyboard Shortcuts
      </h3>
      <div className="space-y-2 text-sm bg-[#0a0a15]/50 rounded-xl p-4 border border-amber-500/10">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.key} className="flex justify-between items-center">
            <span className="text-amber-100/70">{shortcut.action}</span>
            <kbd className="px-2.5 py-1 bg-[#15152a] border border-amber-500/20 rounded-lg text-amber-300 font-mono text-xs">
              {shortcut.key}
            </kbd>
          </div>
        ))}
      </div>
    </section>
  );
}
