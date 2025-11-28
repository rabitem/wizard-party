'use client';

import { TABLE_THEMES } from './settings-presets';

interface TableThemeSectionProps {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
}

export function TableThemeSection({ selectedTheme, onSelect }: TableThemeSectionProps) {
  return (
    <section>
      <h3 className="text-xs font-medium text-amber-400/60 uppercase tracking-widest mb-4">Table Theme</h3>
      <div className="grid grid-cols-2 gap-2">
        {TABLE_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
              selectedTheme === theme.id ? 'border-amber-500' : 'border-amber-500/10 hover:border-amber-500/30'
            }`}
          >
            <div className={`w-full h-8 rounded-lg bg-gradient-to-br ${theme.bg} mb-2`} />
            <span className="text-sm text-amber-100">{theme.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
