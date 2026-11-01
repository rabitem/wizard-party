'use client';

import { LayoutList, EyeOff, PanelLeft, PanelRight, PanelBottom } from 'lucide-react';
import type { LeaderboardPosition } from './settings-persistence';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface LeaderboardSectionProps {
  position: LeaderboardPosition;
  compact: boolean;
  onPositionChange: (position: LeaderboardPosition) => void;
  onCompactChange: (compact: boolean) => void;
}

const POSITION_OPTIONS: { id: LeaderboardPosition; label: string; icon: typeof EyeOff; description: string }[] = [
  { id: 'hidden', label: 'Hidden', icon: EyeOff, description: 'Show on demand' },
  { id: 'left', label: 'Left', icon: PanelLeft, description: 'Left sidebar' },
  { id: 'right', label: 'Right', icon: PanelRight, description: 'Right sidebar' },
  { id: 'bottom', label: 'Bottom', icon: PanelBottom, description: 'Bottom bar' },
];

export function LeaderboardSection({
  position,
  compact,
  onPositionChange,
  onCompactChange,
}: LeaderboardSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <LayoutList className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Standings
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>

      {/* Position selector */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {POSITION_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = position === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onPositionChange(option.id)}
              className={`p-2 border-2 transition-all cursor-pointer flex flex-col items-center gap-1 ${
                isSelected
                  ? 'border-amber-600/60'
                  : 'border-amber-800/30 hover:border-amber-700/40'
              }`}
              style={{
                background: isSelected
                  ? THEME_SURFACE.SELECTED_BG
                  : THEME_SURFACE.CARD_BG,
              }}
              title={option.description}
            >
              <Icon
                className={`w-5 h-5 ${isSelected ? 'text-amber-400' : 'text-amber-500/60'}`}
              />
              <span
                className={`text-[10px] ${isSelected ? 'text-amber-200' : 'text-amber-400/60'}`}
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Compact mode toggle */}
      <div
        className="flex items-center justify-between p-3 border border-amber-800/30"
        style={{
          background: THEME_SURFACE.CARD_BG,
        }}
      >
        <div>
          <span
            className="text-amber-200/80 text-sm"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Compact Mode
          </span>
          <p
            className="text-xs text-amber-500/50"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Show only names and scores
          </p>
        </div>
        <button
          onClick={() => onCompactChange(!compact)}
          className="relative w-12 h-6 transition-all cursor-pointer border border-amber-800/40 flex items-center"
          style={{
            background: compact
              ? THEME_SURFACE.ACTIVE_BG
              : THEME_SURFACE.INACTIVE_BG,
          }}
        >
          <div
            className={`w-5 h-5 rounded transition-transform ${
              compact ? 'translate-x-[26px]' : 'translate-x-0.5'
            }`}
            style={{
              background: compact
                ? 'linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)'
                : 'linear-gradient(180deg, var(--accent-dim) 0%, color-mix(in srgb, var(--accent-dim), black 30%) 100%)',
              boxShadow: compact ? '0 0 8px color-mix(in srgb, var(--accent) 40%, transparent)' : 'none',
            }}
          />
        </button>
      </div>
    </section>
  );
}
