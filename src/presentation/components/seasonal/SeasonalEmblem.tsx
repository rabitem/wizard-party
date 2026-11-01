'use client';

import { memo } from 'react';
import { SeasonalGlyph } from './seasonal-glyphs';
import { useOrnamentColors } from './useOrnamentColors';

const DEFAULT_EMBLEM_SIZE = 14;

interface SeasonalEmblemProps {
  /** Edge length in px. */
  size?: number;
  className?: string;
}

/** The theme emblem on its own, inline (replaces the classic fleur-de-lis / floral glyphs in rules and headers). */
export const SeasonalEmblem = memo(({ size = DEFAULT_EMBLEM_SIZE, className = '' }: SeasonalEmblemProps) => {
  const { theme, primary, secondary } = useOrnamentColors();
  return (
    <svg className={`inline-block shrink-0 ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <SeasonalGlyph theme={theme} primary={primary} secondary={secondary} />
    </svg>
  );
});

SeasonalEmblem.displayName = 'SeasonalEmblem';
