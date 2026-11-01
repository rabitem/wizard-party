'use client';

import { Palette } from 'lucide-react';
import { THEME_PRESETS } from './settings-presets';
import type { ThemePreference } from './settings-persistence';
import { NewBadge } from './NewBadge';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface ThemeSectionProps {
  selectedTheme: ThemePreference;
  onSelect: (theme: ThemePreference) => void;
}

export function ThemeSection({ selectedTheme, onSelect }: ThemeSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Palette className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest font-serif"
        >
          Visual Theme
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {THEME_PRESETS.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelect(theme.id)}
            className={`p-3 rounded border-2 transition-all cursor-pointer ${
              selectedTheme === theme.id
                ? 'border-amber-600/60'
                : 'border-amber-800/30 hover:border-amber-700/40'
            }`}
            style={{
              background: selectedTheme === theme.id
                ? THEME_SURFACE.SELECTED_BG
                : THEME_SURFACE.CARD_BG,
            }}
          >
            {/* Scoped theme class previews the theme's own text palette */}
            <div className={`theme-${theme.id} flex flex-col gap-2`}>
              <div className="flex items-center gap-2">
                <i
                  className={`ra ${theme.icon} text-lg`}
                  style={{ color: theme.colors.primary }}
                />
                <span
                  className="text-sm text-amber-200/90 font-serif"
                >
                  {theme.name}
                </span>
                {theme.isNew ? <NewBadge /> : null}
              </div>
              <p
                className="text-xs text-amber-500/50 text-left font-serif"
              >
                {theme.description}
              </p>
              {/* Theme color preview swatches */}
              <div className="flex gap-1 mt-1">
                <div
                  className="w-6 h-4 rounded border border-amber-900/30"
                  style={{ backgroundColor: theme.colors.background }}
                  title="Background"
                />
                <div
                  className="w-6 h-4 rounded border border-amber-900/30"
                  style={{ backgroundColor: theme.colors.accent }}
                  title="Card"
                />
                <div
                  className="w-6 h-4 rounded border border-amber-900/30"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="Primary"
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
