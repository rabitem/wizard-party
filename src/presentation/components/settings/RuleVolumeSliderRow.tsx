'use client';

import { Volume2 } from 'lucide-react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface RuleVolumeSliderRowProps {
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

function toPercent(value: number): number {
  return Math.round(value * 100);
}

export function RuleVolumeSliderRow({
  title,
  description,
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 1,
  step = 0.05,
}: RuleVolumeSliderRowProps) {
  const percentage = toPercent(value);
  const isModified = value !== 1;

  return (
    <div
      className={`p-3 rounded border transition-all ${
        isModified ? 'border-amber-600/40' : 'border-amber-800/30'
      }`}
      style={{
        background: isModified
          ? THEME_SURFACE.SELECTED_BG
          : THEME_SURFACE.CARD_BG,
      }}
    >
      <div className="flex items-start gap-3">
        <Volume2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isModified ? 'text-amber-400' : 'text-amber-500/60'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="block text-amber-200/80 font-serif">
              {title}
            </span>
            <span className="text-sm text-amber-300/80 tabular-nums font-serif">
              {percentage}%
            </span>
          </div>
          <p className="text-xs text-amber-600/60 mt-0.5 font-serif">
            {description}
          </p>
          <input
            type="range"
            min={toPercent(min)}
            max={toPercent(max)}
            step={toPercent(step)}
            value={percentage}
            onChange={(event) => onChange(Number(event.target.value) / 100)}
            disabled={disabled}
            className="mt-3 w-full h-2 bg-amber-900/30 rounded appearance-none cursor-pointer accent-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
  );
}
