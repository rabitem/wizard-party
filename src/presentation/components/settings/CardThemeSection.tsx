'use client';

import { CARD_THEMES } from './settings-presets';

interface CardThemeSectionProps {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
}

export function CardThemeSection({ selectedTheme, onSelect }: CardThemeSectionProps) {
  return (
    <section>
      <h3 className="text-xs font-medium text-amber-400/60 uppercase tracking-widest mb-4">Card Theme</h3>
      <div className="grid grid-cols-2 gap-2">
        {CARD_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 cursor-pointer ${
              selectedTheme === theme.id
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-amber-500/10 bg-[#0a0a15]/50 hover:border-amber-500/30'
            }`}
          >
            <div
              className="w-8 h-10 rounded-lg shadow-md"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
              }}
            />
            <span className="text-sm text-amber-100">{theme.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
