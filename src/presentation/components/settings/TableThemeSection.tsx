'use client';

import { Table } from 'lucide-react';
import { TABLE_THEMES } from './settings-presets';
import { NewBadge } from './NewBadge';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface TableThemeSectionProps {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
}

export function TableThemeSection({ selectedTheme, onSelect }: TableThemeSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Table className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest font-serif"
        >
          Battle Table
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TABLE_THEMES.map((theme) => {
          const isSelected = selectedTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => onSelect(theme.id)}
              className={`p-3 rounded border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-amber-600/60'
                  : 'border-amber-800/30 hover:border-amber-700/40'
              }`}
              style={{
                background: isSelected
                  ? THEME_SURFACE.SELECTED_BG
                  : THEME_SURFACE.CARD_BG,
              }}
              aria-pressed={isSelected}
            >
              <div
                className={`w-full h-8 rounded bg-gradient-to-br ${theme.bg} mb-2 border border-amber-900/30`}
              />
              <span
                className="text-sm text-amber-200/90 font-serif"
              >
                {theme.name}
              </span>
              {theme.isNew ? <NewBadge className="ml-1.5 align-middle" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
