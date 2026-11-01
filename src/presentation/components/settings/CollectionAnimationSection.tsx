'use client';

import { Sparkles } from 'lucide-react';
import { COLLECTION_ANIMATION_PRESETS } from '@/presentation/config/collection-animation.config';
import type { CollectionAnimationMode } from './settings-persistence';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface CollectionAnimationSectionProps {
  selectedMode: CollectionAnimationMode;
  onSelect: (mode: CollectionAnimationMode) => void;
}

export function CollectionAnimationSection({
  selectedMode,
  onSelect,
}: CollectionAnimationSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Sparkles className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest font-serif"
        >
          Trick Collection
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {COLLECTION_ANIMATION_PRESETS.map((preset) => {
          const isSelected = selectedMode === preset.id;

          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className={`p-3 rounded border-2 transition-all cursor-pointer text-left ${
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
              title={preset.description}
            >
              <span
                className="block text-sm text-amber-200/90 font-serif"
              >
                {preset.name}
              </span>
              <span
                className="block text-xs text-amber-500/50 mt-1 font-serif"
              >
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
