'use client';

import { Sparkles } from 'lucide-react';
import { SeasonalDivider, SeasonalCorner, SeasonalEmblem } from '@/presentation/components/seasonal';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

const PARTICLE_IDS = Array.from({ length: 6 }, (_, i) => `particle-${i}`);
const DOT_IDS = ['dot-0', 'dot-1', 'dot-2'] as const;

export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: THEME_SURFACE.PAGE_BG }}
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLE_IDS.map((id, i) => (
          <div
            key={id}
            className="absolute w-1 h-1 bg-amber-500/30 rounded-full animate-pulse"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative">
        {/* Outer glow */}
        <div className="absolute -inset-8 bg-amber-900/20 rounded-full blur-2xl" />

        {/* Main container */}
        <div
          className="relative px-12 py-10 rounded-lg border-2 border-amber-700/40"
          style={{
            background: THEME_SURFACE.PANEL_BG,
            boxShadow: THEME_SURFACE.LOADING_SHADOW,
          }}
        >
          {/* Corner flourishes */}
          <SeasonalCorner position="top-left" size={28} />
          <SeasonalCorner position="top-right" size={28} />
          <SeasonalCorner position="bottom-left" size={28} />
          <SeasonalCorner position="bottom-right" size={28} />

          <div className="flex flex-col items-center gap-5">
            {/* Medieval spinner */}
            <div className="relative w-20 h-20">
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full border-2 border-amber-700/30"
                style={{ background: THEME_SURFACE.RING_GLOW }}
              />

              {/* Spinning element */}
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 border-r-amber-600/50 animate-spin" />

              {/* Inner decoration */}
              <div className="absolute inset-3 rounded-full border border-amber-800/30" />

              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-500/70 animate-pulse" />
              </div>
            </div>

            {/* Decorative divider */}
            <SeasonalDivider size={14} className="w-24" />

            {/* Text */}
            <div className="text-center">
              <div
                className="text-amber-200/80 tracking-wider"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Preparing the Table
              </div>
              <div className="flex items-center justify-center gap-1 mt-2">
                {DOT_IDS.map((id, i) => (
                  <div
                    key={id}
                    className="w-1.5 h-1.5 bg-amber-500/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Bottom flourish */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
            <SeasonalEmblem size={14} className="opacity-70" />
          </div>
        </div>
      </div>
    </div>
  );
}
