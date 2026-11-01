'use client';

import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';
import { SEASONAL_ORNAMENT_COLORS } from '@/presentation/config/seasonal-ambience.config';
import { useActiveTheme } from './useActiveTheme';

/** Non-seasonal themes follow the remapped amber scale, so ornaments match the theme's text. */
const FALLBACK_COLORS = {
  primary: 'var(--color-amber-500)',
  secondary: 'var(--color-amber-700)',
};

export function useOrnamentColors(): { theme: ThemePreference; primary: string; secondary: string } {
  const theme = useActiveTheme();
  return { theme, ...(SEASONAL_ORNAMENT_COLORS[theme] ?? FALLBACK_COLORS) };
}
