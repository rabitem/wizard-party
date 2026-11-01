import { describe, expect, it } from 'vitest';

import {
  getTrumpSelectionBackdropClass,
  getTrumpSelectionSheetBackdropClass,
} from './trump-selection-surface';

describe('trump selection surface', () => {
  it('never blurs or darkens the dealer hand behind the trump chooser (desktop and sheet)', () => {
    const backdrops = [getTrumpSelectionBackdropClass({ isDealer: true }), getTrumpSelectionSheetBackdropClass()];

    for (const backdropClass of backdrops) {
      expect(backdropClass).toContain('bg-black/25');
      expect(backdropClass).not.toContain('backdrop-blur');
      expect(backdropClass).not.toContain('bg-black/60');
    }
  });

  it('can still soften the waiting state for non-dealers', () => {
    expect(getTrumpSelectionBackdropClass({ isDealer: false })).toContain('backdrop-blur-sm');
  });
});
