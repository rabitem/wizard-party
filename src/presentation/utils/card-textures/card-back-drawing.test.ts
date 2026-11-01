import { describe, expect, it } from 'vitest';
import {
  CARD_BACK_DESIGNS,
  DEFAULT_CARD_BACK,
  getCardBackDesign,
  getSeasonalCardStyle,
} from '@/presentation/components/settings/card-back-presets';
import { CARD_THEMES } from '@/presentation/components/settings/card-theme-presets';
import { drawCardBack, getCardBackPainter, paintClassicBack } from './card-back-drawing';
import { createRecordingContext, hashOps, type RecordedOp } from './recording-context.test-helper';

const W = 512;
const H = 768;

function drawOps(themeId: string | undefined): RecordedOp[] {
  const { ctx, ops } = createRecordingContext();
  drawCardBack(ctx, W, H, getCardBackDesign(themeId));
  return ops;
}

describe('card back designs', () => {
  it('should define a back for every card theme', () => {
    for (const theme of CARD_THEMES) {
      expect(CARD_BACK_DESIGNS[theme.id], theme.id).toBeDefined();
    }
  });

  it('should fall back to the classic blue back for unknown themes', () => {
    expect(getCardBackDesign('does-not-exist')).toBe(DEFAULT_CARD_BACK);
    expect(getCardBackDesign(undefined)).toBe(DEFAULT_CARD_BACK);
    expect(getCardBackDesign('fantasy')).toBe(DEFAULT_CARD_BACK);
    expect(getCardBackPainter(undefined)).toBe(paintClassicBack);
  });

  it('should only report seasonal styles for the seasonal decks', () => {
    expect(getSeasonalCardStyle('halloween')).toBe('halloween');
    expect(getSeasonalCardStyle('summer')).toBe('summer');
    expect(getSeasonalCardStyle('manga')).toBeNull();
    expect(getSeasonalCardStyle('fantasy')).toBeNull();
  });
});

describe('drawCardBack', () => {
  it.each(Object.keys(CARD_BACK_DESIGNS))('should draw the %s back deterministically with balanced state', (themeId) => {
    const first = drawOps(themeId);
    const second = drawOps(themeId);
    expect(first.length).toBeGreaterThan(20);
    expect(hashOps(second)).toBe(hashOps(first));
    const saves = first.filter((op) => op.name === 'save').length;
    const restores = first.filter((op) => op.name === 'restore').length;
    expect(saves).toBe(restores);
  });

  it('should give every deck with a back design its own back', () => {
    const ids = Object.keys(CARD_BACK_DESIGNS);
    const hashes = new Set(ids.map((id) => hashOps(drawOps(id))));
    expect(hashes.size).toBe(ids.length);
  });
});
