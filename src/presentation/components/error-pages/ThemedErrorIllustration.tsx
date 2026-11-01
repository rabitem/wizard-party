'use client';

import { memo, type ComponentType } from 'react';
import type { ThemePreference } from '@/presentation/components/settings/settings-persistence';
import { useActiveTheme } from '@/presentation/components/seasonal';
import { ClassicWizard, ConfusedPumpkin, LostLeaf } from './error-art-autumnal';
import { MeltedIceCream, PuzzledSnowman, WiltedFlower } from './error-art-fresh';

const ILLUSTRATION_SIZE = 160;

const SEASONAL_ART: Partial<Record<ThemePreference, ComponentType>> = {
  halloween: ConfusedPumpkin,
  autumn: LostLeaf,
  winter: PuzzledSnowman,
  spring: WiltedFlower,
  summer: MeltedIceCream,
};

/** Seasonal mascot for the error pages; the classic wizard for non-seasonal themes. */
export const ThemedErrorIllustration = memo(() => {
  const theme = useActiveTheme();
  const Art = SEASONAL_ART[theme] ?? ClassicWizard;
  return (
    <svg
      width={ILLUSTRATION_SIZE}
      height={ILLUSTRATION_SIZE}
      viewBox="0 0 160 160"
      aria-hidden="true"
      className="mx-auto"
    >
      <Art />
    </svg>
  );
});

ThemedErrorIllustration.displayName = 'ThemedErrorIllustration';
