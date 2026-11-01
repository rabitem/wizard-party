'use client';

import { memo } from 'react';
import { SeasonalGlyph } from './seasonal-glyphs';
import { useOrnamentColors } from './useOrnamentColors';
import styles from './seasonal.module.css';

const DEFAULT_GLYPH_SIZE = 18;

interface SeasonalDividerProps {
  /** Emblem size in px. */
  size?: number;
  className?: string;
}

/** Horizontal rule fading out to both sides (var(--surface-border)) with the theme emblem centered. */
export const SeasonalDivider = memo(({
  size = DEFAULT_GLYPH_SIZE,
  className = '',
}: SeasonalDividerProps) => {
  const { theme, primary, secondary } = useOrnamentColors();
  return (
    <div className={`${styles.divider} ${className}`} role="separator" aria-hidden="true">
      <span className={styles.dividerLine} />
      <svg width={size} height={size} viewBox="0 0 24 24">
        <SeasonalGlyph theme={theme} primary={primary} secondary={secondary} />
      </svg>
      <span className={styles.dividerLine} />
    </div>
  );
});

SeasonalDivider.displayName = 'SeasonalDivider';
