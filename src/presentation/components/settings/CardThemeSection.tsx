'use client';

import { Layers } from 'lucide-react';
import { CARD_THEMES } from './settings-presets';
import { NewBadge } from './NewBadge';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface CardThemeSectionProps {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
}

export function CardThemeSection({ selectedTheme, onSelect }: CardThemeSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Layers className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Card Heraldry
        </span>
        <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-amber-600/30 text-amber-300/90 rounded border border-amber-500/40">
          Full Support Coming Soon
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
      <p
        className="text-xs text-amber-500/60 mb-3 text-center italic"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Partially supported — full theme integration coming soon
      </p>
      <div className="grid grid-cols-2 gap-3">
        {CARD_THEMES.map((theme) => (
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
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span
                  className="text-sm text-amber-200/90"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {theme.name}
                </span>
                {theme.isNew ? <NewBadge /> : null}
              </div>
              <p
                className="text-xs text-amber-500/50 text-left"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {theme.description}
              </p>
              <div className="flex justify-around mt-1">
                {Object.entries(theme.suits).map(([suitKey, suit]) => (
                  <div
                    key={`${theme.id}-${suitKey}`}
                    className="w-8 h-10 rounded flex items-center justify-center border border-amber-900/30"
                    style={{ backgroundColor: theme.artStyle === 'manga' ? suit.secondary : suit.primary }}
                    title={suit.name}
                  >
                    <i
                      className={`ra ${suit.symbol} text-lg`}
                      style={{ color: theme.artStyle === 'manga' ? suit.accent : suit.gold }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
