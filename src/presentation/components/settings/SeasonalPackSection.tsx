'use client';

import { Check, Sparkles } from 'lucide-react';
import { NewBadge } from './NewBadge';
import { THEME_PACKS, isSeasonalThemePackActive, type SeasonalThemePack } from './seasonal-theme-packs';
import type { GameSettings } from './settings-persistence';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface SeasonalPackSectionProps {
  settings: GameSettings;
  onApply: (pack: SeasonalThemePack) => void;
}

/** One-click looks (seasonal + trend packs): each pack switches UI theme, table and card heraldry together. */
export function SeasonalPackSection({ settings, onApply }: SeasonalPackSectionProps) {
  if (THEME_PACKS.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Sparkles className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest font-serif"
        >
          Theme Packs
        </span>
        <NewBadge />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {THEME_PACKS.map((pack) => (
          <SeasonalPackButton
            key={pack.id}
            pack={pack}
            isActive={isSeasonalThemePackActive(settings, pack)}
            onApply={onApply}
          />
        ))}
      </div>
    </section>
  );
}

interface SeasonalPackButtonProps {
  pack: SeasonalThemePack;
  isActive: boolean;
  onApply: (pack: SeasonalThemePack) => void;
}

function SeasonalPackButton({ pack, isActive, onApply }: SeasonalPackButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onApply(pack)}
      aria-pressed={isActive}
      className={`p-3 rounded border-2 transition-all cursor-pointer text-left ${
        isActive ? 'border-amber-600/60' : 'border-amber-800/30 hover:border-amber-700/40'
      }`}
      style={{
        background: isActive
          ? THEME_SURFACE.SELECTED_BG
          : THEME_SURFACE.CARD_BG,
      }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <i className={`ra ${pack.icon} text-lg`} style={{ color: pack.color }} />
          <span className="text-sm text-amber-200/90 font-serif">
            {pack.name}
          </span>
          {isActive ? <Check className="w-4 h-4 ml-auto text-amber-400" aria-label="Active" /> : null}
        </div>
        <p className="text-xs text-amber-500/50 font-serif">
          {pack.tagline}
        </p>
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-serif)', color: isActive ? pack.color : 'color-mix(in srgb, var(--color-amber-600) 55%, transparent)' }}
        >
          {isActive ? 'Active' : 'Apply look'}
        </span>
      </div>
    </button>
  );
}
