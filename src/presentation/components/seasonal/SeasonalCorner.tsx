'use client';

import { memo } from 'react';
import { SeasonalGlyph } from './seasonal-glyphs';
import { useOrnamentColors } from './useOrnamentColors';
import styles from './seasonal.module.css';

export type SeasonalCornerPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const POSITION_CLASS: Record<SeasonalCornerPosition, string> = {
  'top-left': styles.cornerTopLeft,
  'top-right': styles.cornerTopRight,
  'bottom-left': styles.cornerBottomLeft,
  'bottom-right': styles.cornerBottomRight,
};

const DEFAULT_CORNER_SIZE = 40;
const GLYPH_SCALE = 0.55;

interface SeasonalCornerProps {
  position?: SeasonalCornerPosition;
  /** Edge length in px. */
  size?: number;
  className?: string;
}

/**
 * Decorative corner for cards/panels: a thin flourish bracket plus the theme emblem
 * (pumpkin, maple leaf, snowflake, blossom, sun; a star for non-seasonal themes).
 * Absolutely positioned, so the parent needs `position: relative`.
 */
export const SeasonalCorner = memo(({
  position = 'top-left',
  size = DEFAULT_CORNER_SIZE,
  className = '',
}: SeasonalCornerProps) => {
  const { theme, primary, secondary } = useOrnamentColors();
  return (
    <svg
      className={`${styles.corner} ${POSITION_CLASS[position]} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <path d="M2 30V8a6 6 0 0 1 6-6h22" stroke={secondary} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M6 22V11a5 5 0 0 1 5-5h11" stroke={primary} strokeOpacity="0.55" strokeWidth="0.8" fill="none" />
      <g transform={`translate(3 3) scale(${GLYPH_SCALE})`}>
        <SeasonalGlyph theme={theme} primary={primary} secondary={secondary} />
      </g>
    </svg>
  );
});

SeasonalCorner.displayName = 'SeasonalCorner';
