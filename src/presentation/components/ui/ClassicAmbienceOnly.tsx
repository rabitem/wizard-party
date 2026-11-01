'use client';

import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { useActiveTheme } from '@/presentation/components/seasonal/useActiveTheme';
import { SEASONAL_AMBIENCE } from '@/presentation/config/seasonal-ambience.config';

/**
 * Renders a screen's own decorative particles only when the global <SeasonalAmbience /> has no
 * particle layers for the active theme, so seasonal themes never stack two particle systems.
 * Also skipped under prefers-reduced-motion (the children are purely decorative animation).
 */
export function ClassicAmbienceOnly({ children }: { children: ReactNode }) {
  const theme = useActiveTheme();
  const reduceMotion = useReducedMotion();
  if (reduceMotion || SEASONAL_AMBIENCE[theme]?.length) return null;
  return children;
}
