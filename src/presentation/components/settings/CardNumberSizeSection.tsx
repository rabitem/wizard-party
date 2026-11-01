'use client';

import { Type } from 'lucide-react';
import { CARD_NUMBER_SIZE_PRESETS } from './settings-presets';
import type { CardNumberSize } from './settings-persistence';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface CardNumberSizeSectionProps {
  selectedSize: CardNumberSize;
  onSelect: (size: CardNumberSize) => void;
}

export function CardNumberSizeSection({ selectedSize, onSelect }: CardNumberSizeSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Type className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest font-serif"
        >
          Numeral Size
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {CARD_NUMBER_SIZE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={`p-3 rounded border-2 transition-all flex flex-col items-center gap-1 cursor-pointer ${
              selectedSize === preset.id
                ? 'border-amber-600/60'
                : 'border-amber-800/30 hover:border-amber-700/40'
            }`}
            style={{
              background: selectedSize === preset.id
                ? THEME_SURFACE.SELECTED_BG
                : THEME_SURFACE.CARD_BG,
            }}
          >
            <span
              className="text-amber-200/90"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: `${12 + CARD_NUMBER_SIZE_PRESETS.indexOf(preset) * 4}px`,
              }}
            >
              XIII
            </span>
            <span
              className="text-xs text-amber-500/60 font-serif"
            >
              {preset.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
